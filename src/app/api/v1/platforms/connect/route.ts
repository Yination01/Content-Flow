import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { buildSocialOAuthUrl } from "@/lib/providers";
import {
  extractActorFromRequest,
  generatePkceChallenge,
  getApiStore,
  persistApiStore,
} from "@/lib/server/store";
import {
  signOAuthStateToken,
  parsePlatformsCookieFromRequest,
  createPlatformsCookieHeader,
} from "@/lib/server/auth";

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

    const exp = Date.now() + 10 * 60 * 1000;
    const state = signOAuthStateToken({
      nonce: crypto.randomBytes(12).toString("hex"),
      userId: actor.userId,
      platform,
      exp,
    });
    const pkce = generatePkceChallenge();
    const store = getApiStore();

    store.oauthStates.set(state, {
      state,
      userId: actor.userId,
      platform,
      codeVerifier: pkce.codeVerifier,
      expiresAt: exp,
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
      codeChallenge: pkce.codeChallenge,
      codeChallengeMethod: "S256",
      authorizationUrl: oauthInfo.authorizationUrl,
      externalOAuth: oauthInfo.externalOAuth,
      data: {
        platform,
        state,
        codeChallengeMethod: "S256",
        authorizationUrl: oauthInfo.authorizationUrl,
      },
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
    const url = new URL(request.url);
    let platform = (url.searchParams.get("platform") || "").toLowerCase();
    if (!platform) {
      const body = await request.json().catch(() => ({}));
      platform =
        typeof body?.platform === "string" ? body.platform.toLowerCase() : "";
    }

    if (platform !== "youtube" && platform !== "tiktok") {
      return NextResponse.json(
        { error: "Platform must be youtube or tiktok." },
        { status: 400 }
      );
    }

    delete actor.userRecord.connectedPlatforms[platform];
    persistApiStore();

    const cookiePlatforms = parsePlatformsCookieFromRequest(request);
    delete cookiePlatforms[platform];
    const merged: Record<
      string,
      {
        connected: boolean;
        handle: string;
        channelTitle?: string;
        scopes?: string[];
        verifiedAt?: string;
        expiresAt: string;
      }
    > = { ...cookiePlatforms };
    for (const [k, v] of Object.entries(actor.userRecord.connectedPlatforms)) {
      if (v) {
        merged[k] = {
          connected: v.connected,
          handle: v.handle,
          channelTitle: v.channelTitle,
          scopes: v.scopes,
          verifiedAt: v.verifiedAt,
          expiresAt: v.expiresAt,
        };
      }
    }
    delete merged[platform];

    return NextResponse.json(
      {
        disconnected: true,
        platform,
        data: {
          platform,
          connected: false,
          connectedPlatforms: merged,
        },
      },
      {
        status: 200,
        headers: {
          "Set-Cookie": createPlatformsCookieHeader(merged),
        },
      }
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid disconnect request." },
      { status: 400 }
    );
  }
}
