import { NextResponse } from "next/server";
import { getUtcResetWindows, TIER_LIMITS } from "@/lib/policy";
import {
  createSessionCookieHeader,
  parseSessionCookieFromRequest,
  parsePlatformsCookieFromRequest,
  signSessionToken,
  type PlatformChannelAnalytics,
} from "@/lib/server/auth";
import {
  extractActorFromRequest,
  isRequestSessionRevoked,
} from "@/lib/server/store";

export async function GET(request: Request) {
  if (isRequestSessionRevoked(request)) {
    return NextResponse.json(
      { authenticated: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  const session = parseSessionCookieFromRequest(request);
  const headerUserId =
    request.headers.get("x-user-id") ||
    request.headers.get("x-demo-user-id") ||
    request.headers.get("x-user-email");

  if (!session && !headerUserId) {
    return NextResponse.json(
      { authenticated: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  const actor = extractActorFromRequest(request);
  const maskedKeys: Record<string, string> = {};
  for (const [provider, env] of Object.entries(
    actor.userRecord.encryptedByok || {}
  )) {
    maskedKeys[provider] = env.maskedPreview;
  }

  const cookiePlatforms = parsePlatformsCookieFromRequest(request);
  const connectedPlatforms: Record<
    string,
    {
      connected: boolean;
      handle: string;
      channelTitle?: string;
      profileUrl?: string;
      scopes?: string[];
      verifiedAt?: string;
      expiresAt: string;
      analytics?: PlatformChannelAnalytics;
    }
  > = { ...cookiePlatforms };

  for (const [platform, info] of Object.entries(
    actor.userRecord.connectedPlatforms
  )) {
    if (info) {
      connectedPlatforms[platform] = {
        connected: info.connected,
        handle: info.handle,
        channelTitle: info.channelTitle,
        profileUrl: info.profileUrl,
        scopes: info.scopes,
        verifiedAt: info.verifiedAt,
        expiresAt: info.expiresAt,
        analytics: info.analytics,
      };
    }
  }

  const nowMs = Date.now();
  const trialEndsAt = actor.userRecord.trialEndsAt;
  const trialActive = Boolean(
    trialEndsAt && new Date(trialEndsAt).getTime() > nowMs
  );
  const daysRemaining =
    trialActive && trialEndsAt
      ? Math.max(
          1,
          Math.ceil((new Date(trialEndsAt).getTime() - nowMs) / 86_400_000)
        )
      : 0;

  const userPayload = {
    id: actor.userRecord.id,
    name: actor.userRecord.name,
    email: actor.userRecord.email,
    niche: actor.userRecord.niche,
    tier: actor.userRecord.tier,
    roles: actor.roles,
    twoFactorEnabled: Boolean(actor.userRecord.twoFactorEnabled),
    trial: {
      active: trialActive,
      tier: actor.userRecord.trialTier || null,
      endsAt: trialEndsAt || null,
      daysRemaining,
      used: Boolean(actor.userRecord.trialUsed),
    },
    testTierOverride: actor.userRecord.testTierOverride || null,
    usage: actor.userRecord.usage,
    limits: TIER_LIMITS[actor.userRecord.tier],
    maskedKeys,
    connectedPlatforms,
    resetWindows: getUtcResetWindows(),
  };

  const response = NextResponse.json({
    authenticated: true,
    user: userPayload,
    data: {
      authenticated: true,
      user: userPayload,
    },
  });

  if (session) {
    const refreshedToken = signSessionToken({
      userId: actor.userRecord.id,
      email: actor.userRecord.email,
      name: actor.userRecord.name,
      tier: actor.userRecord.tier,
      roles: actor.roles,
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
    });
    response.headers.set("set-cookie", createSessionCookieHeader(refreshedToken));
  }

  return response;
}
