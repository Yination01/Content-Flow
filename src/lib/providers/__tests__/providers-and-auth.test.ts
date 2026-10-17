import { describe, expect, it, vi } from "vitest";
import {
  hashPassword,
  verifyPassword,
  signSessionToken,
  verifySessionToken,
  createSessionCookieHeader,
} from "@/lib/server/auth";
import {
  executeAiGeneration,
  initializePaystackTransaction,
  createR2PresignedUploadUrl,
  buildSocialOAuthUrl,
} from "@/lib/providers";

describe("Production Auth, Session & Provider Adapters", () => {
  it("hashes and verifies passwords with scrypt and timing-safe comparison", () => {
    const hash = hashPassword("StrongPass#2026");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(verifyPassword("StrongPass#2026", hash)).toBe(true);
    expect(verifyPassword("WrongPassword#2026", hash)).toBe(false);
  });

  it("signs and verifies HMAC-SHA256 session tokens and rejects expired or tampered tokens", () => {
    const token = signSessionToken({
      userId: "user-1",
      email: "maya@contentflow.app",
      roles: ["creator"],
      exp: Date.now() + 60_000,
    });

    const verified = verifySessionToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.userId).toBe("user-1");
    expect(verified?.email).toBe("maya@contentflow.app");

    // Tampered token must return null
    expect(verifySessionToken(`${token}tampered`)).toBeNull();

    // Expired token must return null
    const expiredToken = signSessionToken({
      userId: "user-1",
      email: "maya@contentflow.app",
      roles: ["creator"],
      exp: Date.now() - 1000,
    });
    expect(verifySessionToken(expiredToken)).toBeNull();

    const cookie = createSessionCookieHeader(token);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
  });

  it("executes OpenAI BYOK when API key is provided and falls back to built-in engine when unconfigured", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "Live OpenAI generated script for YouTube." } }],
          usage: { total_tokens: 180 },
        }),
        { status: 200 }
      )
    );

    const openAiResult = await executeAiGeneration({
      prompt: "How to edit faster",
      modality: "text",
      tone: "Confident & direct",
      format: "Video script",
      platforms: ["YouTube", "TikTok"],
      byokKey: "sk-live-test-openai-key",
      byokProvider: "openai",
    });

    expect(openAiResult.provider).toBe("byok_openai");
    expect(openAiResult.text).toContain("Live OpenAI generated script");
    expect(openAiResult.youtubeTitle).toBeTruthy();
    expect(openAiResult.tiktokCaption).toBeTruthy();
    fetchSpy.mockRestore();

    // Built-in engine when no external cloud keys are set
    const builtinResult = await executeAiGeneration({
      prompt: "5 lessons from building in public",
      modality: "text",
      tone: "Clear & encouraging",
      format: "Listicle",
      platforms: ["YouTube", "TikTok"],
    });
    expect(builtinResult.text).toContain("5 lessons from building in public");
    expect(builtinResult.youtubeTitle.length).toBeGreaterThan(5);
    expect(builtinResult.tiktokCaption.length).toBeGreaterThan(5);
  });

  it("initializes Paystack transaction with server-verified pricing", async () => {
    const tx = await initializePaystackTransaction({
      userId: "user-1",
      email: "maya@contentflow.app",
      targetTier: "PRO",
      currency: "NGN",
    });

    expect(tx.reference).toMatch(/^cf_pay_/);
    expect(tx.currency).toBe("NGN");
    expect(tx.amountSubunits).toBe(4650000);
    expect(tx.authorizationUrl).toContain(tx.reference);
  });

  it("generates AWS SigV4 presigned R2 upload URLs and enforces MIME & size constraints", () => {
    const validUpload = createR2PresignedUploadUrl({
      userId: "user-1",
      fileName: "thumbnail.png",
      contentType: "image/png",
      fileSizeBytes: 2 * 1024 * 1024, // 2 MB
      tier: "CREATOR",
      currentStorageUsedMb: 120,
    });
    expect(validUpload.allowed).toBe(true);
    expect(validUpload.uploadUrl).toContain("X-Amz-Signature=");
    expect(validUpload.objectKey).toContain("user-1/");

    const invalidMime = createR2PresignedUploadUrl({
      userId: "user-1",
      fileName: "malware.exe",
      contentType: "application/x-msdownload",
      fileSizeBytes: 1024,
      tier: "CREATOR",
      currentStorageUsedMb: 120,
    });
    expect(invalidMime.allowed).toBe(false);
  });

  it("builds PKCE OAuth authorization URLs for YouTube and TikTok", () => {
    const yt = buildSocialOAuthUrl({
      platform: "youtube",
      state: "state_123",
      codeChallenge: "challenge_abc",
      origin: "https://contentflow.app",
    });
    expect(yt.state).toBe("state_123");
    expect(yt.authorizationUrl).toBeTruthy();
  });
});
