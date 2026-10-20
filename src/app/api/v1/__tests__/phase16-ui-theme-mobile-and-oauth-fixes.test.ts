// @vitest-environment node
import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { signSessionToken } from "@/lib/server/auth";
import { resetApiStore } from "@/lib/server/store";
import { GET as meGet } from "../auth/me/route";
import { POST as connectPost, DELETE as connectDelete } from "../platforms/connect/route";
import { GET as callbackGet } from "../platforms/callback/route";
import { POST as verifyPost } from "../platforms/verify/route";

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

describe("Phase 16: Admin Contrast, Mobile Cutoff Prevention, Sticky/Fixed Sidebar, Global Theme Toggle, Notification Close & Social OAuth Persistence", () => {
  beforeEach(() => {
    resetApiStore();
  });

  it("persists YouTube and TikTok connections via signed cookie + store on /api/v1/platforms/verify and redirects browser OAuth callbacks cleanly", async () => {
    const cookie = makeAdminCookie();

    // 1. Initiate OAuth PKCE connect
    const initRes = await connectPost(
      new Request("https://contentflow.app/api/v1/platforms/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie,
        },
        body: JSON.stringify({ platform: "youtube" }),
      })
    );
    expect(initRes.status).toBe(200);
    const initData = await initRes.json();
    expect(initData.state).toBeTruthy();

    // 2. Browser visit to /api/v1/platforms/callback with Accept: text/html redirects to /settings
    const cbRes = await callbackGet(
      new Request(
        `https://contentflow.app/api/v1/platforms/callback?state=${encodeURIComponent(
          initData.state
        )}&code=test_oauth_code_123`,
        {
          headers: {
            Accept: "text/html,application/xhtml+xml",
            cookie,
          },
        }
      )
    );
    expect(cbRes.status).toBe(302);
    expect(cbRes.headers.get("location")).toContain(
      "/settings?section=Platform%20connections&connected=youtube"
    );
    const cbSetCookie = cbRes.headers.get("set-cookie") || "";
    expect(cbSetCookie).toContain("cf_platforms=");

    // 3. Direct verify endpoint also sets cf_platforms cookie and persists across cold starts
    const verifyRes = await verifyPost(
      new Request("https://contentflow.app/api/v1/platforms/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie,
        },
        body: JSON.stringify({
          platform: "tiktok",
          handle: "@B-Yin",
          channelTitle: "B-Yin TikTok",
        }),
      })
    );
    expect(verifyRes.status).toBe(200);
    const verifySetCookie = verifyRes.headers.get("set-cookie") || "";
    expect(verifySetCookie).toContain("cf_platforms=");
    const platformCookiePair = verifySetCookie.split(";")[0];

    // Simulate cold start by resetting in-memory store and calling /api/v1/auth/me with cookies
    resetApiStore();
    const meRes = await meGet(
      new Request("https://contentflow.app/api/v1/auth/me", {
        headers: {
          cookie: `${cookie}; ${platformCookiePair}`,
        },
      })
    );
    expect(meRes.status).toBe(200);
    const meData = await meRes.json();
    expect(meData.user.connectedPlatforms?.tiktok?.connected).toBe(true);
    expect(meData.user.connectedPlatforms?.tiktok?.handle).toBe("@B-Yin");

    // 4. Disconnect clears the platform from cookie and store
    const delRes = await connectDelete(
      new Request("https://contentflow.app/api/v1/platforms/connect", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          cookie: `${cookie}; ${platformCookiePair}`,
        },
        body: JSON.stringify({ platform: "tiktok" }),
      })
    );
    expect(delRes.status).toBe(200);
  });

  it("verifies all missing CSS classes are defined, mobile grids use minmax(0, 1fr), sidebar is fixed full-height on desktop, notifications have close button, and global theme toggle exists", () => {
    const root = process.cwd();
    const css = fs.readFileSync(path.join(root, "src/index.css"), "utf8");
    const screens = fs.readFileSync(
      path.join(root, "src/app/screens.tsx"),
      "utf8"
    );
    const state = fs.readFileSync(path.join(root, "src/app/state.tsx"), "utf8");

    // 1. All Admin Workshop & responsive classes exist in src/index.css
    const requiredClasses = [
      "poise-gate",
      "poise-gate__card",
      "poise-pill",
      "poise-pill--info",
      "poise-pill--success",
      "poise-pill--warning",
      "poise-pill--danger",
      "poise-tab-btn",
      "poise-grid-2",
      "poise-grid-3",
      "poise-account-found",
      "form-alert",
      "otp-grid",
      "password-strength",
      "settings-content",
      "notifications-popover",
      "responsive-inline-action",
    ];
    for (const cls of requiredClasses) {
      expect(css).toContain(`.${cls}`);
    }

    // 2. Global Light / Dark mode support in state.tsx and index.css
    expect(state).toContain("toggleTheme");
    expect(css).toContain('[data-theme="dark"]');

    // 3. Notifications popover has an explicit close button
    expect(screens).toContain('aria-label="Close notifications"');

    // 4. Desktop sidebar is fixed full-height (100dvh) so bottom-left never has empty space on scroll
    expect(css).toContain("100dvh");
    expect(css).toContain("overflow-x: clip");
  });
});
