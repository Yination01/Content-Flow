import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { buildSocialOAuthUrl } from "@/lib/providers";
import {
  extractActorFromRequest,
  generatePkceChallenge,
  getApiStore,
  persistApiStore,
} from "@/lib/server/store";

export async function POST(request: Request) {
  try {
    const actor = extractActorFromRequest(request);
    const body = await request.json();
    const platform =
      typeof body?.platform === "string" ? body.platform.toLowerCase() : "";

    if (platform !== "youtube" && platform !== "tiktok") {
      return NextResponse.json(
        { error: "Platform must be youtube or tiktok." },
        { status: 400 }
      );
    }

    const state = crypto.randomBytes(24).toString("hex");
    const pkce = generatePkceChallenge();
    const store = getApiStore();

    store.oauthStates.set(state, {
      state,
      userId: actor.userId,
      platform,
      codeVerifier: pkce.codeVerifier,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });
    persistApiStore();

    const url = new URL(request.url);
    const oauthInfo = buildSocialOAuthUrl({
      platform,
      state,
      codeChallenge: pkce.codeChallenge,
      origin: url.origin,
    });

    return NextResponse.json({
      platform,
      state,
      codeChallengeMethod: "S256",
      authorizationUrl: oauthInfo.authorizationUrl,
      externalOAuth: oauthInfo.externalOAuth,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid platform connect request." },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const actor = extractActorFromRequest(request);
    const body = await request.json();
    const platform =
      typeof body?.platform === "string" ? body.platform.toLowerCase() : "";

    if (platform !== "youtube" && platform !== "tiktok") {
      return NextResponse.json(
        { error: "Platform must be youtube or tiktok." },
        { status: 400 }
      );
    }

    delete actor.userRecord.connectedPlatforms[platform];
    persistApiStore();

    return NextResponse.json({
      disconnected: true,
      platform,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid disconnect request." },
      { status: 400 }
    );
  }
}
