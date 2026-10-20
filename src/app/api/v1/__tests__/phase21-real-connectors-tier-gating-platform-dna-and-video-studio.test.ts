// @vitest-environment jsdom
import React from "react";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { resetApiStore } from "@/lib/server/store";
import { signSessionToken } from "@/lib/server/auth";
import * as policyModule from "@/lib/policy";
import { POST as verifyPlatformPost } from "@/app/api/v1/platforms/verify/route";
import { POST as generatePost } from "@/app/api/v1/generate/route";
import { StateProvider } from "@/app/state";
import { CreateScreen } from "@/app/screens";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/create",
  useSearchParams: () => new URLSearchParams(),
}));

describe("Phase 21: Real Social Connectors, Progressive Tier Gating (2/4/6), Platform-Native Drafts & Guided AI Video Studio", () => {
  beforeEach(() => {
    resetApiStore();
  });

  it("rejects blank @handle inputs on POST /api/v1/platforms/verify (never invents @creator_youtube) and verifies real handles", async () => {
    const adminCookie = `cf_session=${signSessionToken({
      userId: "user-admin-21",
      email: "johnpaulonovo@gmail.com",
      name: "B- Yin",
      tier: "AGENCY",
      roles: ["creator", "superuser"],
      exp: Date.now() + 3600_000,
    })}`;

    // 1. Blank handle must return 400 and NEVER invent @creator_youtube
    const blankRes = await verifyPlatformPost(
      new Request("https://content-flow-weld-one.vercel.app/api/v1/platforms/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: adminCookie,
        },
        body: JSON.stringify({
          platform: "youtube",
          handleOrUrl: "   ",
        }),
      })
    );
    expect(blankRes.status).toBe(400);
    const blankJson = await blankRes.json();
    expect(JSON.stringify(blankJson)).toContain("handle");

    // 2. Placeholder @creator_youtube must also be rejected as an auto-generated placeholder
    const placeholderRes = await verifyPlatformPost(
      new Request("https://content-flow-weld-one.vercel.app/api/v1/platforms/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: adminCookie,
        },
        body: JSON.stringify({
          platform: "youtube",
          handleOrUrl: "@creator_youtube",
        }),
      })
    );
    expect(placeholderRes.status).toBe(400);

    // 3. Real handle or profile URL succeeds and supports user-supplied or live-fetched baseline metrics
    const validRes = await verifyPlatformPost(
      new Request("https://content-flow-weld-one.vercel.app/api/v1/platforms/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: adminCookie,
        },
        body: JSON.stringify({
          platform: "youtube",
          handleOrUrl: "https://www.youtube.com/@Veritasium",
          channelTitle: "Veritasium",
          followersCount: 16500000,
          totalViews: 2450000000,
          videosCount: 412,
        }),
      })
    );
    expect(validRes.status).toBe(200);
    const validJson = await validRes.json();
    expect(validJson.data.handle).toBe("@Veritasium");
    expect(validJson.data.profileUrl).toBe("https://www.youtube.com/@Veritasium");
    expect(validJson.data.analytics.followersCount).toBe(16500000);
    expect(validJson.data.analytics.totalViews).toBe(2450000000);
    expect(validJson.data.analytics.videosCount).toBe(412);
  });

  it("enforces progressive 2 / 4 / 6 platform tier gating while keeping all 6 unlocked for Pro, Agency, and Admin", async () => {
    const getAllowedPlatformsForTier = (
      policyModule as Record<string, unknown>
    ).getAllowedPlatformsForTier as
      | ((tier: string, roles?: string[]) => string[])
      | undefined;

    expect(typeof getAllowedPlatformsForTier).toBe("function");
    expect(getAllowedPlatformsForTier!("FREE", ["creator"])).toEqual([
      "youtube",
      "tiktok",
    ]);
    expect(getAllowedPlatformsForTier!("CREATOR", ["creator"])).toEqual([
      "youtube",
      "tiktok",
      "instagram",
      "x",
    ]);
    expect(getAllowedPlatformsForTier!("PRO", ["creator"])).toEqual([
      "youtube",
      "tiktok",
      "instagram",
      "x",
      "linkedin",
      "facebook",
    ]);
    expect(getAllowedPlatformsForTier!("FREE", ["creator", "superuser"])).toEqual([
      "youtube",
      "tiktok",
      "instagram",
      "x",
      "linkedin",
      "facebook",
    ]);

    // Free user attempting to connect LinkedIn (Pro+ platform) gets 403
    const freeCookie = `cf_session=${signSessionToken({
      userId: "user-free-21",
      email: "free21@example.com",
      name: "Free Creator",
      tier: "FREE",
      roles: ["creator"],
      exp: Date.now() + 3600_000,
    })}`;
    const blockedRes = await verifyPlatformPost(
      new Request("https://content-flow-weld-one.vercel.app/api/v1/platforms/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: freeCookie,
        },
        body: JSON.stringify({
          platform: "linkedin",
          handleOrUrl: "https://www.linkedin.com/in/freecreator",
        }),
      })
    );
    expect(blockedRes.status).toBe(403);
  });

  it("shapes generated content directly by the selected platform(s), connected channel identity, and Video storyboard scenes", async () => {
    const adminCookie = `cf_session=${signSessionToken({
      userId: "user-admin-gen-21",
      email: "johnpaulonovo@gmail.com",
      name: "B- Yin",
      tier: "AGENCY",
      roles: ["creator", "superuser"],
      exp: Date.now() + 3600_000,
    })}`;

    const genRes = await generatePost(
      new Request("https://content-flow-weld-one.vercel.app/api/v1/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: adminCookie,
        },
        body: JSON.stringify({
          prompt: "Why consistency beats intensity",
          contentType: "Video",
          videoFormat: "60s Vertical Short / TikTok / Reel (9:16)",
          visualStyle: "Kinetic Captions + B-Roll Cues",
          tone: "High-Retention 3-Second Hook + Fast Pacing",
          targetPlatforms: ["tiktok", "youtube", "x"],
          connectedChannels: {
            tiktok: { handle: "@byin_creates", followersCount: 42000 },
            youtube: { handle: "@BYinStudio", followersCount: 128000 },
          },
        }),
      })
    );
    expect(genRes.status).toBe(200);
    const genJson = await genRes.json();
    expect(genJson.data.platformDrafts).toBeDefined();
    expect(genJson.data.platformDrafts.tiktok).toContain("@byin_creates");
    expect(genJson.data.platformDrafts.youtube).toContain("@BYinStudio");
    expect(Array.isArray(genJson.data.storyboardScenes)).toBe(true);
    expect(genJson.data.storyboardScenes.length).toBeGreaterThanOrEqual(4);
    expect(genJson.data.storyboardScenes[0]).toHaveProperty("visualCue");
    expect(genJson.data.storyboardScenes[0]).toHaveProperty("voiceoverScript");
  });

  it("renders context-aware Video controls on /create (instead of 'Short article') and inline AI video storyboard & player step-by-step", () => {
    const { container } = render(
      React.createElement(
        StateProvider,
        null,
        React.createElement(CreateScreen)
      )
    );

    // Click Video content type button
    const buttons = Array.from(container.querySelectorAll("button"));
    const videoBtn = buttons.find((b) => b.textContent?.trim() === "Video");
    expect(videoBtn).toBeDefined();
    fireEvent.click(videoBtn!);

    const htmlAfterVideo = container.innerHTML;
    // Should show Video-specific format options (e.g. 60s Vertical Short / TikTok / Reel (9:16)) and Visual Scene Style
    expect(htmlAfterVideo).toContain("60s Vertical Short / TikTok / Reel (9:16)");
    expect(htmlAfterVideo).toContain("Visual scene style");
    expect(htmlAfterVideo).not.toContain("<option>Short article</option>");
  });
});
