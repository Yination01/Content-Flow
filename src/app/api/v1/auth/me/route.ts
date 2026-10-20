import { NextResponse } from "next/server";
import { getUtcResetWindows, TIER_LIMITS } from "@/lib/policy";
import { parseSessionCookieFromRequest } from "@/lib/server/auth";
import { extractActorFromRequest } from "@/lib/server/store";

export async function GET(request: Request) {
  const session = parseSessionCookieFromRequest(request);
  const headerUserId =
    request.headers.get("x-user-id") || request.headers.get("x-demo-user-id");

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

  const connectedPlatforms: Record<
    string,
    {
      connected: boolean;
      handle: string;
      channelTitle?: string;
      scopes?: string[];
      verifiedAt?: string;
      expiresAt: string;
    }
  > = {};
  for (const [platform, info] of Object.entries(
    actor.userRecord.connectedPlatforms
  )) {
    connectedPlatforms[platform] = {
      connected: info.connected,
      handle: info.handle,
      channelTitle: info.channelTitle,
      scopes: info.scopes,
      verifiedAt: info.verifiedAt,
      expiresAt: info.expiresAt,
    };
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: actor.userRecord.id,
      name: actor.userRecord.name,
      email: actor.userRecord.email,
      niche: actor.userRecord.niche,
      tier: actor.userRecord.tier,
      roles: actor.roles,
      twoFactorEnabled: Boolean(actor.userRecord.twoFactorEnabled),
      usage: actor.userRecord.usage,
      limits: TIER_LIMITS[actor.userRecord.tier],
      maskedKeys,
      connectedPlatforms,
      resetWindows: getUtcResetWindows(),
    },
  });
}

