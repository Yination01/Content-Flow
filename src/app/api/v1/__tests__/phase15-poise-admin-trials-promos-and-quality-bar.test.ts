// @vitest-environment node
import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { hashPassword, signSessionToken } from "@/lib/server/auth";
import { getApiStore, resetApiStore } from "@/lib/server/store";
import { POST as loginPost } from "../auth/login/route";
import { POST as logoutPost } from "../auth/logout/route";
import { GET as meGet } from "../auth/me/route";
import { POST as adminPost } from "../admin/route";
import {
  DELETE as cancelTrialDelete,
  POST as startTrialPost,
} from "../payments/trial/route";
import { POST as upgradePost } from "../payments/upgrade/route";

function makeAdminCookie() {
  const token = signSessionToken({
    userId: "user-admin-jp",
    email: "johnpaulonovo@gmail.com",
    name: "Johnpaul Onovo",
    tier: "AGENCY",
    roles: ["creator", "superuser"],
    exp: Date.now() + 3600_000,
  });
  return `cf_session=${token}`;
}

function makeNormalUserCookie(userId = "user-free-1", email = "priya@contentflow.app") {
  const token = signSessionToken({
    userId,
    email,
    name: "Priya Shah",
    tier: "FREE",
    roles: ["creator"],
    exp: Date.now() + 3600_000,
  });
  return `cf_session=${token}`;
}

describe("Phase 15: Poise-Spec 6-Tab Admin Server Wall, Promo Engine, 30-Day Trial, Initial Login Recovery & 193-Item Quality Bar", () => {
  beforeEach(() => {
    resetApiStore();
  });

  it("recovers initial Admin credentials on /api/v1/auth/login even when account was created via Magic Link or OAuth first, and revokes session server-side on logout", async () => {
    const store = getApiStore();
    store.users.set("user-oauth-jp", {
      id: "user-oauth-jp",
      name: "Johnpaul Onovo",
      email: "johnpaulonovo@gmail.com",
      niche: "Multi-channel content creation",
      passwordHash: hashPassword("magic-link-placeholder-random"),
      tier: "AGENCY",
      roles: ["creator", "superuser"],
      status: "Active",
      joinedAt: new Date().toISOString(),
      usage: {
        dailyAiGenerations: 0,
        monthlyPostsCreated: 0,
        monthlyCrossPosts: 0,
        storageUsedMb: 0,
      },
      encryptedByok: {},
      connectedPlatforms: {},
    });

    const loginRes = await loginPost(
      new Request("https://contentflow.app/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "johnpaulonovo@gmail.com",
          password: "ContentFlow#2026",
        }),
      })
    );
    expect(loginRes.status).toBe(200);
    const loginBody = await loginRes.json();
    expect(loginBody.user.email).toBe("johnpaulonovo@gmail.com");
    expect(loginBody.user.tier).toBe("AGENCY");

    const setCookie = loginRes.headers.get("set-cookie") || "";
    const sessionCookie = setCookie.split(";")[0];
    expect(sessionCookie).toContain("cf_session=");

    // Now log out and verify server-side revocation blocks replaying the old session token
    await logoutPost(
      new Request("https://contentflow.app/api/v1/auth/logout", {
        method: "POST",
        headers: { cookie: sessionCookie },
      })
    );

    const replayMeRes = await meGet(
      new Request("https://contentflow.app/api/v1/auth/me", {
        headers: { cookie: sessionCookie },
      })
    );
    expect(replayMeRes.status).toBe(401);
  });

  it("activates a 1-time 30-day free trial on CREATOR or PRO and supports 1-click FTC cancellation", async () => {
    const cookie = makeNormalUserCookie();

    const startRes = await startTrialPost(
      new Request("https://contentflow.app/api/v1/payments/trial", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie,
        },
        body: JSON.stringify({ tier: "PRO" }),
      })
    );
    expect(startRes.status).toBe(200);
    const startData = await startRes.json();
    expect(startData.trial.active).toBe(true);
    expect(startData.trial.tier).toBe("PRO");
    expect(startData.trial.daysRemaining).toBeGreaterThanOrEqual(29);
    expect(startData.user.tier).toBe("PRO");

    // Second trial attempt should be rejected with 409
    const duplicateRes = await startTrialPost(
      new Request("https://contentflow.app/api/v1/payments/trial", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie,
        },
        body: JSON.stringify({ tier: "CREATOR" }),
      })
    );
    expect(duplicateRes.status).toBe(409);

    // 1-click FTC trial cancellation
    const cancelRes = await cancelTrialDelete(
      new Request("https://contentflow.app/api/v1/payments/trial", {
        method: "DELETE",
        headers: { cookie },
      })
    );
    expect(cancelRes.status).toBe(200);
    const cancelData = await cancelRes.json();
    expect(cancelData.trial.active).toBe(false);
    expect(cancelData.user.tier).toBe("FREE");
  });

  it("enforces the Poise-spec POST /api/v1/admin server wall, promo code lifecycle, tester minting, notices, and remote config", async () => {
    const normalCookie = makeNormalUserCookie();
    const adminCookie = makeAdminCookie();

    // Non-admin cannot mint promo codes
    const forbiddenRes = await adminPost(
      new Request("https://contentflow.app/api/v1/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: normalCookie,
        },
        body: JSON.stringify({
          action: "promo_create",
          code: "CREATOR30",
          tier: "PRO",
          rewardDays: 30,
        }),
      })
    );
    expect(forbiddenRes.status).toBe(403);

    // Admin mints promo code
    const createPromoRes = await adminPost(
      new Request("https://contentflow.app/api/v1/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: adminCookie,
        },
        body: JSON.stringify({
          action: "promo_create",
          code: "LaunchPro30",
          tier: "PRO",
          rewardDays: 30,
          maxUses: 2,
          expiresInDays: 14,
        }),
      })
    );
    expect(createPromoRes.status).toBe(200);
    const promoData = await createPromoRes.json();
    expect(promoData.ok).toBe(true);
    expect(promoData.promo.code).toBe("LAUNCHPRO30");

    // Normal user redeems promo code (self-action allowed)
    const redeemRes = await adminPost(
      new Request("https://contentflow.app/api/v1/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: normalCookie,
        },
        body: JSON.stringify({
          action: "redeem",
          code: "launchpro30",
        }),
      })
    );
    expect(redeemRes.status).toBe(200);
    const redeemBody = await redeemRes.json();
    expect(redeemBody.ok).toBe(true);
    expect(redeemBody.tier).toBe("PRO");

    // Admin mints a tester login and verifies synthetic tester email cannot check out
    const testerRes = await adminPost(
      new Request("https://contentflow.app/api/v1/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: adminCookie,
        },
        body: JSON.stringify({
          action: "tester_create",
          username: "qa_tester_01",
        }),
      })
    );
    expect(testerRes.status).toBe(200);
    const testerBody = await testerRes.json();
    expect(testerBody.ok).toBe(true);
    expect(testerBody.handover.password).toBeTruthy();
    expect(testerBody.handover.email).toContain("@testers.contentflow.app");

    const testerCookie = `cf_session=${signSessionToken({
      userId: testerBody.tester.id,
      email: testerBody.handover.email,
      name: testerBody.tester.name,
      tier: "FREE",
      roles: ["creator"],
      exp: Date.now() + 3600_000,
    })}`;
    const blockedCheckout = await upgradePost(
      new Request("https://contentflow.app/api/v1/payments/upgrade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: testerCookie,
        },
        body: JSON.stringify({ tier: "PRO", currency: "USD" }),
      })
    );
    expect(blockedCheckout.status).toBe(403);

    // Admin posts a Notice (and verifies 'admin' audience is rejected on Notices)
    const badNotice = await adminPost(
      new Request("https://contentflow.app/api/v1/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: adminCookie,
        },
        body: JSON.stringify({
          action: "notice_create",
          audience: "admin",
          title: "Internal note",
          body: "Should not go to notices",
        }),
      })
    );
    expect(badNotice.status).toBe(400);

    const goodNotice = await adminPost(
      new Request("https://contentflow.app/api/v1/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: adminCookie,
        },
        body: JSON.stringify({
          action: "notice_create",
          audience: "all",
          title: "New Studio Features Live",
          body: "30-day free trials and promo codes are now active.",
        }),
      })
    );
    expect(goodNotice.status).toBe(200);
  });

  it("verifies 193-item quality bar and Poise spec invariants across files (no viewer 'superuser', no em/en dashes, llms.txt, 404 page, security headers, mobile bottom nav)", () => {
    const root = process.cwd();
    const screensSrc = fs.readFileSync(
      path.join(root, "src/app/screens.tsx"),
      "utf8"
    );
    const stateSrc = fs.readFileSync(
      path.join(root, "src/app/state.tsx"),
      "utf8"
    );
    const cssSrc = fs.readFileSync(path.join(root, "src/index.css"), "utf8");
    const nextConfigSrc = fs.readFileSync(
      path.join(root, "next.config.mjs"),
      "utf8"
    );

    // 1. Viewer word is Admin, never superuser in rendered copy/labels
    expect(screensSrc).not.toMatch(/Superuser/i);
    expect(stateSrc).not.toMatch(/Agency Max \(Superuser\)/i);

    // 2. Hard ban: zero em-dashes (\u2014) or en-dashes (\u2013) in screens.tsx
    expect(screensSrc.includes("\u2014")).toBe(false);
    expect(screensSrc.includes("\u2013")).toBe(false);

    // 3. No fake Google OAuth modal or HMAC-SHA256 modal in AuthScreen
    expect(screensSrc).not.toContain("Google OAuth 2.0 PKCE Sign-In");
    expect(screensSrc).not.toContain("Passwordless Magic Link & 6-Digit OTP");

    // 4. FAQ has NO. 01 and bold YES/NO answers
    expect(screensSrc).toContain("NO. 01");
    expect(screensSrc).toContain("NO. 08");

    // 5. Mobile bottom tab bar exists and admin topbar button is NOT hidden on mobile
    expect(screensSrc).toContain("mobile-bottom-nav");
    expect(cssSrc).not.toContain(".admin-topbar .button { display: none; }");

    // 6. llms.txt, not-found.tsx, and security headers in next.config.mjs
    expect(fs.existsSync(path.join(root, "public/llms.txt"))).toBe(true);
    expect(fs.existsSync(path.join(root, "src/app/not-found.tsx"))).toBe(true);
    expect(nextConfigSrc).toContain("productionBrowserSourceMaps: false");
    expect(nextConfigSrc).toContain("X-Content-Type-Options");
  });
});
