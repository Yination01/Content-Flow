import { beforeEach, describe, expect, it } from "vitest";
import { resetApiStoreForTests } from "@/lib/server/store";
import { resetRateLimiterForTests } from "@/lib/server/rate-limit";
import { evaluatePasswordStrength } from "@/lib/server/auth";
import { POST as signupPost } from "@/app/api/v1/auth/signup/route";
import { GET as meGet } from "@/app/api/v1/auth/me/route";
import { POST as magicLinkPost } from "@/app/api/v1/auth/magic-link/route";
import { GET as magicLinkVerifyGet } from "@/app/api/v1/auth/magic-link/verify/route";
import { GET as googleAuthGet } from "@/app/api/v1/auth/google/route";

describe("Phase 12: Password Strength, Magic Links, Google OAuth & Serverless User State Continuity", () => {
  beforeEach(() => {
    resetApiStoreForTests();
    resetRateLimiterForTests();
  });

  it("evaluates password strength (0-4 score, Weak/Fair/Good/Strong) and rule checks accurately", () => {
    const weak = evaluatePasswordStrength("12345");
    expect(weak.score).toBeLessThanOrEqual(1);
    expect(weak.label).toBe("Weak");
    expect(weak.checks.minLength).toBe(false);

    const common = evaluatePasswordStrength("password123!");
    expect(common.checks.notCommon).toBe(false);

    const strong = evaluatePasswordStrength("CreatorStudio#2026!");
    expect(strong.score).toBe(4);
    expect(strong.label).toBe("Strong");
    expect(strong.percent).toBe(100);
    expect(strong.checks.minLength).toBe(true);
    expect(strong.checks.hasMixedCase).toBe(true);
    expect(strong.checks.hasNumber).toBe(true);
    expect(strong.checks.hasSymbol).toBe(true);
  });

  it("preserves the signed-up user's name, email, AGENCY superuser tier, and roles across serverless cold starts", async () => {
    const signupRes = await signupPost(
      new Request("http://localhost:3000/api/v1/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Johnpaul Onovo",
          email: "johnpaulonovo@gmail.com",
          password: "StrongSuperuser#2026",
        }),
      })
    );
    expect(signupRes.status).toBe(201);
    const cookiePair = (signupRes.headers.get("set-cookie") || "").split(";")[0];

    // Simulate a Vercel serverless cold start (wiping in-memory Map)
    resetApiStoreForTests();

    const meRes = await meGet(
      new Request("http://localhost:3000/api/v1/auth/me", {
        headers: { cookie: cookiePair },
      })
    );
    expect(meRes.status).toBe(200);
    const meJson = await meRes.json();
    expect(meJson.user.name).toBe("Johnpaul Onovo");
    expect(meJson.user.email).toBe("johnpaulonovo@gmail.com");
    expect(meJson.user.tier).toBe("AGENCY");
    expect(meJson.user.roles).toContain("superuser");
  });

  it("issues and verifies a signed 15-minute passwordless Magic Link via /api/v1/auth/magic-link", async () => {
    const sendRes = await magicLinkPost(
      new Request("http://localhost:3000/api/v1/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "johnpaulonovo@gmail.com",
          name: "Johnpaul Onovo",
        }),
      })
    );
    expect(sendRes.status).toBe(200);
    const sendData = await sendRes.json();
    expect(sendData.sent).toBe(true);
    expect(sendData.magicLinkUrl).toContain("/api/v1/auth/magic-link/verify?token=");

    const verifyRes = await magicLinkVerifyGet(
      new Request(sendData.magicLinkUrl)
    );
    expect([200, 302, 307]).toContain(verifyRes.status);
    const setCookie = verifyRes.headers.get("set-cookie") || "";
    expect(setCookie).toContain("cf_session=");
  });

  it("initiates Google OAuth 2.0 sign-in via GET /api/v1/auth/google", async () => {
    const res = await googleAuthGet(
      new Request("http://localhost:3000/api/v1/auth/google?email=johnpaulonovo@gmail.com&name=Johnpaul+Onovo")
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.authorizationUrl).toBeTruthy();
  });
});
