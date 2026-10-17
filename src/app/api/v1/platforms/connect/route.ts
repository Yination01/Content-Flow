import { NextResponse } from "next/server";
import crypto from "node:crypto";
import {
  extractActorFromRequest,
  generatePkceChallenge,
  getDemoApiStore,
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
    const store = getDemoApiStore();

    store.oauthStates.set(state, {
      state,
      userId: actor.userId,
      platform,
      codeVerifier: pkce.codeVerifier,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 min single-use state
    });

    return NextResponse.json({
      demo: true,
      platform,
      state,
      codeChallengeMethod: "S256",
      authorizationUrl: `/api/v1/platforms/callback?state=${state}&code=demo_code`,
    });
  } catch {
    return NextResponse.json({ error: "Invalid platform connect request." }, { status: 400 });
  }
}
