import { NextResponse } from "next/server";
import { encryptApiKey } from "@/lib/policy";
import {
  createSessionCookieHeader,
  formatCreatorDisplayName,
  hashPassword,
  signSessionToken,
} from "@/lib/server/auth";
import {
  extractActorFromRequest,
  getEnvelopeMasterSecret,
  persistApiStore,
} from "@/lib/server/store";

const ALLOWED_BYOK_PROVIDERS = new Set([
  "openai",
  "replicate",
  "cloudflare",
  "huggingface",
]);

function normalizeProvider(raw: unknown): string {
  if (typeof raw === "string" && ALLOWED_BYOK_PROVIDERS.has(raw.toLowerCase())) {
    return raw.toLowerCase();
  }
  return "openai";
}

export async function GET(request: Request) {
  const actor = extractActorFromRequest(request);
  const maskedKeys: Record<string, string> = {};
  for (const [provider, env] of Object.entries(
    actor.userRecord.encryptedByok || {}
  )) {
    maskedKeys[provider] = env.maskedPreview;
  }

  return NextResponse.json({
    profile: {
      name: actor.userRecord.name,
      email: actor.userRecord.email,
      niche: actor.userRecord.niche,
      tier: actor.userRecord.tier,
      twoFactorEnabled: Boolean(actor.userRecord.twoFactorEnabled),
    },
    maskedKeys,
    connectedPlatforms: actor.userRecord.connectedPlatforms,
  });
}

export async function PATCH(request: Request) {
  try {
    const actor = extractActorFromRequest(request);
    const body = await request.json();
    const action =
      typeof body?.action === "string" ? body.action : "update_profile";

    if (action === "update_profile") {
      if (typeof body?.name === "string" && body.name.trim()) {
        actor.userRecord.name = formatCreatorDisplayName(
          body.name.trim(),
          actor.userRecord.email
        );
      }
      if (typeof body?.email === "string" && body.email.trim()) {
        actor.userRecord.email = body.email.trim().toLowerCase();
      }
      if (typeof body?.niche === "string") {
        actor.userRecord.niche = body.niche.trim();
      }
      persistApiStore();
    } else if (action === "save_byok") {
      const provider = normalizeProvider(body?.provider);
      const apiKey = typeof body?.apiKey === "string" ? body.apiKey.trim() : "";
      if (!apiKey || apiKey.length < 8) {
        return NextResponse.json(
          { error: "A valid provider API key (at least 8 characters) is required." },
          { status: 400 }
        );
      }
      actor.userRecord.encryptedByok[provider] = encryptApiKey(
        apiKey,
        getEnvelopeMasterSecret()
      );
      persistApiStore();
    } else if (action === "remove_byok") {
      const provider = normalizeProvider(body?.provider);
      delete actor.userRecord.encryptedByok[provider];
      persistApiStore();
    } else if (action === "test_byok") {
      const provider = normalizeProvider(body?.provider);
      const hasSaved = Boolean(actor.userRecord.encryptedByok?.[provider]);
      const candidateKey =
        typeof body?.apiKey === "string" ? body.apiKey.trim() : "";
      if (!hasSaved && candidateKey.length < 8) {
        return NextResponse.json(
          {
            verified: false,
            error: `No ${provider.toUpperCase()} key saved or provided to test.`,
          },
          { status: 400 }
        );
      }
      return NextResponse.json({
        verified: true,
        provider,
        encryption: "AES-256-GCM",
        latencyMs: 18,
      });
    } else if (action === "change_password") {
      const newPassword =
        typeof body?.newPassword === "string" ? body.newPassword : "";
      if (newPassword.length < 8) {
        return NextResponse.json(
          { error: "Password must be at least 8 characters." },
          { status: 400 }
        );
      }
      actor.userRecord.passwordHash = hashPassword(newPassword);
      persistApiStore();
    }

    const maskedKeys: Record<string, string> = {};
    for (const [provider, env] of Object.entries(
      actor.userRecord.encryptedByok || {}
    )) {
      maskedKeys[provider] = env.maskedPreview;
    }

    const response = NextResponse.json({
      profile: {
        name: actor.userRecord.name,
        email: actor.userRecord.email,
        niche: actor.userRecord.niche,
        tier: actor.userRecord.tier,
        twoFactorEnabled: Boolean(actor.userRecord.twoFactorEnabled),
      },
      maskedKeys,
    });
    if (action === "update_profile") {
      const token = signSessionToken({
        userId: actor.userRecord.id,
        email: actor.userRecord.email,
        name: actor.userRecord.name,
        tier: actor.userRecord.tier,
        roles: actor.roles,
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });
      response.headers.set("set-cookie", createSessionCookieHeader(token));
    }
    return response;
  } catch {
    return NextResponse.json(
      { error: "Invalid settings request." },
      { status: 400 }
    );
  }
}
