import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { POST as adminPost } from "../admin/route";
import { POST as loginPost } from "../auth/login/route";
import { POST as verifyPlatformPost } from "../platforms/verify/route";
import { POST as generatePost } from "../generate/route";
import {
  extractActorFromRequest,
  resetApiStore,
} from "@/lib/server/store";
import { signSessionToken } from "@/lib/server/auth";

function buildAdminCookie(email = "johnpaulonovo@gmail.com") {
  const token = signSessionToken({
    userId: "admin-jp",
    email,
    name: "Johnpaul Onovo",
    tier: "AGENCY",
    roles: ["creator", "superuser"],
    exp: Date.now() + 3600_000,
  });
  return `cf_session=${token}`;
}

describe("Phase 20: 6 Social Platforms + Channel Analytics, Seamless Login Rehydration, Admin Sweep, Icon-Only Theme Toggle & Compact UI", () => {
  beforeEach(() => {
    resetApiStore();
  });

  it("allows seamless login even after extractActorFromRequest rehydrates a user record from a session cookie", async () => {
    const cookie = buildAdminCookie("johnpaulonovo@gmail.com");

    // Simulate page load hitting an endpoint that calls extractActorFromRequest first
    const dummyReq = new Request("https://contentflow.app/api/v1/auth/me", {
      method: "GET",
      headers: { cookie },
    });
    extractActorFromRequest(dummyReq);

    // Now user logs in with their own chosen password (not DEFAULT_PASSWORD_HASH)
    const loginRes = await loginPost(
      new Request("https://contentflow.app/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie },
        body: JSON.stringify({
          email: "johnpaulonovo@gmail.com",
          password: "MyCustomStudioPass!2026",
        }),
      })
    );
    expect(loginRes.status).toBe(200);
    const loginJson = await loginRes.json();
    expect(loginJson.user.email).toBe("johnpaulonovo@gmail.com");
    expect(loginJson.user.tier).toBe("AGENCY");
  });

  it("verifies all 6 social platforms (youtube, tiktok, instagram, x, linkedin, facebook) by @handle or profile URL and returns channel analytics", async () => {
    const cookie = buildAdminCookie("creator@contentflow.app");
    const platforms = [
      { platform: "youtube", input: "https://www.youtube.com/@mkbhd", expectedHandle: "@mkbhd" },
      { platform: "tiktok", input: "https://www.tiktok.com/@khaby.lame", expectedHandle: "@khaby.lame" },
      { platform: "instagram", input: "@natgeo", expectedHandle: "@natgeo" },
      { platform: "x", input: "https://x.com/vercel", expectedHandle: "@vercel" },
      { platform: "linkedin", input: "https://www.linkedin.com/in/satyanadella", expectedHandle: "@satyanadella" },
      { platform: "facebook", input: "https://www.facebook.com/nasa", expectedHandle: "@nasa" },
    ] as const;

    for (const item of platforms) {
      const res = await verifyPlatformPost(
        new Request("https://contentflow.app/api/v1/platforms/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json", cookie },
          body: JSON.stringify({
            platform: item.platform,
            handleOrUrl: item.input,
            channelTitle: `${item.expectedHandle} Official`,
          }),
        })
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.verified).toBe(true);
      expect(data.connection.handle).toBe(item.expectedHandle);
      expect(data.connection.profileUrl).toContain("https://");
      expect(data.connection.analytics).toBeDefined();
      expect(typeof data.connection.analytics.followersCount).toBe("number");
      expect(typeof data.connection.analytics.totalViews).toBe("number");
      expect(typeof data.connection.analytics.videosCount).toBe("number");
      expect(typeof data.connection.analytics.engagementRate).toBe("string");
    }
  });

  it("supports 'all', 'free', and 'paid' notice audiences in POST /api/v1/admin and generates multi-platform adaptations in POST /api/v1/generate", async () => {
    const adminCookie = buildAdminCookie();
    const noticeRes = await adminPost(
      new Request("https://contentflow.app/api/v1/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: adminCookie },
        body: JSON.stringify({
          action: "notice_publish",
          audience: "paid",
          title: "6-Platform Publishing Live",
          body: "Instagram, X, LinkedIn, and Facebook are now available alongside YouTube and TikTok.",
        }),
      })
    );
    expect(noticeRes.status).toBe(200);
    const noticeJson = await noticeRes.json();
    expect(noticeJson.notice.audience).toBe("paid");

    const genRes = await generatePost(
      new Request("https://contentflow.app/api/v1/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: adminCookie },
        body: JSON.stringify({
          prompt: "How to build a sustainable multi-platform creator workflow",
          platforms: ["youtube", "tiktok", "instagram", "x", "linkedin", "facebook"],
        }),
      })
    );
    expect(genRes.status).toBe(200);
    const genJson = await genRes.json();
    expect(genJson.adaptations).toBeDefined();
    expect(genJson.adaptations.instagramCaption).toBeDefined();
    expect(genJson.adaptations.xThread).toBeDefined();
    expect(genJson.adaptations.linkedinPost).toBeDefined();
    expect(genJson.adaptations.facebookPost).toBeDefined();
  });

  it("verifies UI invariants: icon-only Sun/Moon toggle, Admin unrelated fields swept, 6 social platforms, and compact CSS sizing", () => {
    const root = process.cwd();
    const screensSrc = fs.readFileSync(
      path.join(root, "src/app/screens.tsx"),
      "utf8"
    );
    const cssSrc = fs.readFileSync(path.join(root, "src/index.css"), "utf8");

    // 1. Admin tabs use 'Users' instead of 'Testers', and unrelated Poise fields are removed
    expect(screensSrc).not.toContain("Mint a tester login (@testers.contentflow.app)");
    expect(screensSrc).not.toContain("App Links Fingerprint (SHA-256)");
    expect(screensSrc).not.toContain("Min Android Build");
    expect(screensSrc).not.toContain("Manual Checkouts (");

    // 2. Icon-only theme toggle (no text next to Sun/Moon inside Toggle theme buttons)
    expect(screensSrc).not.toContain("Dark Workshop");
    expect(screensSrc).not.toContain("<Sun size={15} aria-hidden=\"true\" /> Light");
    expect(screensSrc).not.toContain("<Moon size={15} aria-hidden=\"true\" /> Dark");

    // 3. 6 social platforms + Channel Analytics UI in Manage modal
    expect(screensSrc).toContain("Instagram");
    expect(screensSrc).toContain("LinkedIn");
    expect(screensSrc).toContain("Facebook");
    expect(screensSrc).toContain("Live Channel Identity &amp; Analytics");

    // 4. Compact UI proportions in index.css
    expect(cssSrc).toContain("width: 224px");
  });
});
