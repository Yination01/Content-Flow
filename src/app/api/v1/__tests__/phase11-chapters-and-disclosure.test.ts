import { beforeEach, describe, expect, it } from "vitest";
import { getApiStore, resetApiStoreForTests } from "@/lib/server/store";
import {
  checkAndEnforceDisclosure,
  generateYouTubeChaptersAndDescription,
} from "@/lib/seo/chapters";
import { POST as chaptersPost } from "@/app/api/v1/chapters/route";

describe("Phase 11: $0 YouTube Timestamp Chapters Builder & FTC Sponsor/Affiliate Disclosure Guard", () => {
  beforeEach(() => {
    resetApiStoreForTests();
  });

  it("generates YouTube-compliant chapters starting at 00:00 with >= 3 chapters and >= 10s spacing at $0 cost", () => {
    const result = generateYouTubeChaptersAndDescription({
      title: "Creator Publishing System",
      script: [
        "Hook: Why most creators burn out after 30 days of daily posting.",
        "Step 1: Capture your core ideas in a single frictionless inbox every Monday morning.",
        "Step 2: Adapt the hook and pacing for YouTube long-form retention and TikTok short-form discovery.",
        "Step 3: Queue and batch-schedule your posts so your distribution runs on autopilot.",
      ].join("\n\n"),
    });

    expect(result.costUsd).toBe(0);
    expect(result.chapters.length).toBeGreaterThanOrEqual(3);
    expect(result.chapters[0].timestamp).toBe("00:00");
    expect(result.chapters[0].startSeconds).toBe(0);

    for (let i = 1; i < result.chapters.length; i++) {
      expect(
        result.chapters[i].startSeconds - result.chapters[i - 1].startSeconds
      ).toBeGreaterThanOrEqual(10);
    }

    expect(result.youtubeDescription).toContain("00:00");
    expect(result.youtubeDescription).toContain("Creator Publishing System");
  });

  it("detects undisclosed affiliate/sponsor links and injects FTC-compliant YouTube & TikTok disclosures", () => {
    const undisclosed = checkAndEnforceDisclosure({
      text: "Check out my favorite camera gear at https://example.com/gear?ref=maya or use discount code MAYA20.",
      tiktokCaption: "My studio camera setup for 2026",
    });

    expect(undisclosed.requiresDisclosure).toBe(true);
    expect(undisclosed.compliant).toBe(false);
    expect(undisclosed.patchedYoutubeDescription).toContain("FTC Disclosure:");
    expect(undisclosed.patchedTiktokCaption).toContain("#ad");

    const alreadyDisclosed = checkAndEnforceDisclosure({
      text: "Use my affiliate link https://example.com?ref=maya — FTC Disclosure: This post contains affiliate links (#ad).",
      tiktokCaption: "My studio setup #ad #sponsored",
    });
    expect(alreadyDisclosed.requiresDisclosure).toBe(true);
    expect(alreadyDisclosed.compliant).toBe(true);
  });

  it("generates chapters and updates draft metadata via POST /api/v1/chapters", async () => {
    const res = await chaptersPost(
      new Request("http://localhost:3000/api/v1/chapters", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "user-1",
        },
        body: JSON.stringify({
          contentId: "1",
          applyToDraft: true,
        }),
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.costUsd).toBe(0);
    expect(data.chapters.length).toBeGreaterThanOrEqual(3);
    expect(data.appliedToContentId).toBe("1");

    const updated = getApiStore().contents.get("1")!;
    expect(updated.metadata?.youtubeDescription).toContain("00:00");
  });
});
