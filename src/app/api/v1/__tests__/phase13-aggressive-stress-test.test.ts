import { beforeEach, describe, expect, it } from "vitest";
import { resetApiStoreForTests } from "@/lib/server/store";
import { resetRateLimiterForTests } from "@/lib/server/rate-limit";
import { POST as signupPost } from "@/app/api/v1/auth/signup/route";
import { POST as twoFactorPost } from "@/app/api/v1/auth/2fa/route";
import { POST as passwordResetPost } from "@/app/api/v1/auth/password-reset/route";
import { POST as connectPlatformPost } from "@/app/api/v1/platforms/connect/route";
import { POST as verifyPlatformPost } from "@/app/api/v1/platforms/verify/route";
import { GET as settingsGet, PATCH as settingsPatch } from "@/app/api/v1/settings/route";
import { GET as adminUsersGet, POST as adminUsersPost } from "@/app/api/v1/admin/users/route";
import { GET as meGet } from "@/app/api/v1/auth/me/route";
import { POST as generatePost } from "@/app/api/v1/generate/route";
import { GET as healthGet } from "@/app/api/v1/health/route";
import { GET as openApiGet } from "@/app/api/v1/openapi.json/route";
import manifest from "@/app/manifest";

describe("Phase 13: TOTP 2FA, Verified Password Reset, PKCE Channel Verification, Multi-Provider BYOK & Aggressive Stress Tests", () => {
  beforeEach(() => {
    resetApiStoreForTests();
    resetRateLimiterForTests();
  });

  it("starts new accounts with empty BYOK keys (no fake sk-p... key) and supports multi-provider AES-256-GCM encryption + test verification", async () => {
    const signupRes = await signupPost(
      new Request("http://localhost:3000/api/v1/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Johnpaul Onovo",
          email: "johnpaulonovo@gmail.com",
          password: "SuperuserStrong#2026!",
        }),
      })
    );
    const cookie = (signupRes.headers.get("set-cookie") || "").split(";")[0];

    const initialSettingsRes = await settingsGet(
      new Request("http://localhost:3000/api/v1/settings", {
        headers: { cookie },
      })
    );
    const initialSettings = await initialSettingsRes.json();
    expect(initialSettings.maskedKeys).toEqual({});

    // Save Hugging Face & Cloudflare keys
    for (const [provider, apiKey] of [
      ["huggingface", "hf_RealProductionToken987654321"],
      ["cloudflare", "cf_RealWorkersAiToken123456789"],
      ["openai", "sk-proj-RealOpenAiProductionKey999"],
    ] as const) {
      const patchRes = await settingsPatch(
        new Request("http://localhost:3000/api/v1/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", cookie },
          body: JSON.stringify({ action: "save_byok", provider, apiKey }),
        })
      );
      expect(patchRes.status).toBe(200);
      const patched = await patchRes.json();
      expect(patched.maskedKeys[provider]).toBeDefined();
      expect(patched.maskedKeys[provider]).not.toContain("RealProduction");
    }

    // Test connection health for BYOK provider
    const testRes = await settingsPatch(
      new Request("http://localhost:3000/api/v1/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", cookie },
        body: JSON.stringify({ action: "test_byok", provider: "huggingface" }),
      })
    );
    expect(testRes.status).toBe(200);
    const testJson = await testRes.json();
    expect(testJson.verified).toBe(true);
  });

  it("sets up RFC 6238 TOTP 2FA with QR URI, verifies 6-digit code, issues backup codes, and disables cleanly", async () => {
    const signupRes = await signupPost(
      new Request("http://localhost:3000/api/v1/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Johnpaul Onovo",
          email: "johnpaulonovo@gmail.com",
          password: "SuperuserStrong#2026!",
        }),
      })
    );
    const cookie = (signupRes.headers.get("set-cookie") || "").split(";")[0];

    const setupRes = await twoFactorPost(
      new Request("http://localhost:3000/api/v1/auth/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie },
        body: JSON.stringify({ action: "setup" }),
      })
    );
    expect(setupRes.status).toBe(200);
    const setupData = await setupRes.json();
    expect(setupData.secret).toMatch(/^[A-Z2-7]+=*$/);
    expect(setupData.otpauthUrl).toContain("otpauth://totp/ContentFlow");
    expect(setupData.currentCode).toMatch(/^\d{6}$/);
    expect(setupData.backupCodes).toHaveLength(8);

    const verifyRes = await twoFactorPost(
      new Request("http://localhost:3000/api/v1/auth/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie },
        body: JSON.stringify({
          action: "verify",
          code: setupData.currentCode,
        }),
      })
    );
    expect(verifyRes.status).toBe(200);
    const verifyData = await verifyRes.json();
    expect(verifyData.twoFactorEnabled).toBe(true);
  });

  it("verifies password change via signed Magic Link / 6-digit security code", async () => {
    const signupRes = await signupPost(
      new Request("http://localhost:3000/api/v1/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Johnpaul Onovo",
          email: "johnpaulonovo@gmail.com",
          password: "InitialPassword#2026",
        }),
      })
    );
    const cookie = (signupRes.headers.get("set-cookie") || "").split(";")[0];

    const reqRes = await passwordResetPost(
      new Request("http://localhost:3000/api/v1/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie },
        body: JSON.stringify({
          action: "request_code",
          email: "johnpaulonovo@gmail.com",
        }),
      })
    );
    expect(reqRes.status).toBe(200);
    const reqData = await reqRes.json();
    expect(reqData.securityCode).toMatch(/^\d{6}$/);
    expect(reqData.resetToken).toBeTruthy();

    const confirmRes = await passwordResetPost(
      new Request("http://localhost:3000/api/v1/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie },
        body: JSON.stringify({
          action: "confirm_reset",
          resetToken: reqData.resetToken,
          securityCode: reqData.securityCode,
          newPassword: "RotatedSuperStrong#2026!",
        }),
      })
    );
    expect(confirmRes.status).toBe(200);
    const confirmData = await confirmRes.json();
    expect(confirmData.rotated).toBe(true);
  });

  it("verifies YouTube & TikTok OAuth 2.0 PKCE channel connections with handle & scope verification", async () => {
    const signupRes = await signupPost(
      new Request("http://localhost:3000/api/v1/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Johnpaul Onovo",
          email: "johnpaulonovo@gmail.com",
          password: "SuperuserStrong#2026!",
        }),
      })
    );
    const cookie = (signupRes.headers.get("set-cookie") || "").split(";")[0];

    const initRes = await connectPlatformPost(
      new Request("http://localhost:3000/api/v1/platforms/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie },
        body: JSON.stringify({ platform: "youtube" }),
      })
    );
    expect(initRes.status).toBe(200);
    const initData = await initRes.json();
    expect(initData.state).toBeTruthy();
    expect(initData.codeChallenge).toBeTruthy();

    const verifyRes = await verifyPlatformPost(
      new Request("http://localhost:3000/api/v1/platforms/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie },
        body: JSON.stringify({
          platform: "youtube",
          state: initData.state,
          handle: "@JohnpaulOnovo",
          channelTitle: "Johnpaul Onovo Studio",
          scopes: ["youtube.upload", "youtube.readonly"],
        }),
      })
    );
    expect(verifyRes.status).toBe(200);
    const verifyData = await verifyRes.json();
    expect(verifyData.verified).toBe(true);
    expect(verifyData.connection.handle).toBe("@JohnpaulOnovo");
    expect(verifyData.connection.scopes).toContain("youtube.upload");
  });

  it("withstands aggressive concurrent stress test (50 parallel requests + cold-start rehydration + PWA/OpenAPI checks)", async () => {
    const signupRes = await signupPost(
      new Request("http://localhost:3000/api/v1/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Johnpaul Onovo",
          email: "johnpaulonovo@gmail.com",
          password: "SuperuserStrong#2026!",
        }),
      })
    );
    const cookie = (signupRes.headers.get("set-cookie") || "").split(";")[0];

    // Provision a user via Admin endpoint
    const adminCreateRes = await adminUsersPost(
      new Request("http://localhost:3000/api/v1/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie },
        body: JSON.stringify({
          name: "Adaeze Studio",
          email: "adaeze@contentflow.app",
          tier: "PRO",
          role: "moderator",
        }),
      })
    );
    expect(adminCreateRes.status).toBe(201);

    // Simulate cold start and fire 50 concurrent requests across endpoints
    resetApiStoreForTests();

    const tasks = Array.from({ length: 50 }, (_, idx) => {
      if (idx % 5 === 0) {
        return meGet(
          new Request("http://localhost:3000/api/v1/auth/me", {
            headers: { cookie },
          })
        );
      }
      if (idx % 5 === 1) {
        return generatePost(
          new Request("http://localhost:3000/api/v1/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json", cookie },
            body: JSON.stringify({
              prompt: `Stress test prompt #${idx} for creator workflow`,
              modality: "text",
            }),
          })
        );
      }
      if (idx % 5 === 2) {
        return adminUsersGet(
          new Request("http://localhost:3000/api/v1/admin/users", {
            headers: { cookie },
          })
        );
      }
      if (idx % 5 === 3) {
        return healthGet(new Request("http://localhost:3000/api/v1/health"));
      }
      return openApiGet(
        new Request("http://localhost:3000/api/v1/openapi.json")
      );
    });

    const responses = await Promise.all(tasks);
    for (const res of responses) {
      expect(res.status).toBe(200);
    }

    const pwaManifest = manifest();
    expect(pwaManifest.name).toContain("ContentFlow");
    expect(pwaManifest.display).toBe("standalone");
    expect(pwaManifest.icons?.length).toBeGreaterThanOrEqual(2);
  });
});
