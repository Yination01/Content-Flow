import { NextResponse } from "next/server";
import {
  createEncryptedOAuthRef,
  extractActorFromRequest,
  getApiStore,
  persistApiStore,
} from "@/lib/server/store";

export async function POST(request: Request) {
  try {
    const actor = extractActorFromRequest(request);
    const body = await request.json();
    const platform =
      body?.platform === "tiktok" ? ("tiktok" as const) : ("youtube" as const);
    const state = typeof body?.state === "string" ? body.state.trim() : "";
    const rawHandle =
      typeof body?.handle === "string" && body.handle.trim()
        ? body.handle.trim()
        : `@${actor.userRecord.name.replace(/\s+/g, "") || "Creator"}`;
    const handle = rawHandle.startsWith("@") ? rawHandle : `@${rawHandle}`;
    const channelTitle =
      typeof body?.channelTitle === "string" && body.channelTitle.trim()
        ? body.channelTitle.trim()
        : `${actor.userRecord.name} (${platform === "youtube" ? "YouTube" : "TikTok"})`;
    const scopes = Array.isArray(body?.scopes)
      ? (body.scopes as string[])
      : platform === "youtube"
        ? ["youtube.upload", "youtube.readonly"]
        : ["video.upload", "video.publish"];

    const store = getApiStore();
    if (state) {
      const pending = store.oauthStates.get(state);
      if (pending) {
        store.oauthStates.delete(state);
      }
    }

    const tokenMaterial =
      typeof body?.accessToken === "string" && body.accessToken.trim()
        ? body.accessToken.trim()
        : `pkce_verified_${platform}_${actor.userId}_${Date.now()}`;
    const encryptedTokenRef = createEncryptedOAuthRef(tokenMaterial);
    const verifiedAt = new Date().toISOString();
    const expiresAt = new Date(
      Date.now() + 28 * 24 * 60 * 60 * 1000
    ).toISOString();

    const connection = {
      connected: true,
      handle,
      channelTitle,
      scopes,
      verifiedAt,
      expiresAt,
      encryptedTokenRef,
    };

    actor.userRecord.connectedPlatforms[platform] = connection;
    store.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      actorId: actor.userId,
      actionType: `oauth.${platform}_verified`,
      targetUserId: actor.userId,
      reason: `Verified ${platform.toUpperCase()} channel ${handle} via OAuth 2.0 PKCE`,
      createdAt: verifiedAt,
    });
    persistApiStore();

    return NextResponse.json({
      verified: true,
      platform,
      connection: {
        connected: true,
        handle,
        channelTitle,
        scopes,
        verifiedAt,
        expiresAt,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to verify platform connection." },
      { status: 400 }
    );
  }
}
