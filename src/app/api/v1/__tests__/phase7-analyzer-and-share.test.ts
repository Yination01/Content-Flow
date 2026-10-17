import { beforeEach, describe, expect, it } from "vitest";
import { resetApiStoreForTests } from "@/lib/server/store";
import { analyzeCreatorDraft } from "@/lib/seo/analyzer";
import { POST as analyzePost } from "@/app/api/v1/analyze/route";
import { GET as shareGet } from "@/app/api/v1/share/[id]/route";

describe("Phase 7: $0 Hook & Platform Compliance Analyzer and Shareable Draft Previews", () => {
  beforeEach(() => {
    resetApiStoreForTests();
  });

  it("scores hook retention, readability, and YouTube/TikTok platform limits at $0 AI cost", () => {
    const strongReport = analyzeCreatorDraft({
      title: "3 Ways to Double Your Creator Consistency Without Burnout",
      script:
        "Stop trying to write from scratch every single day. Here are 3 systems that top creators use to publish consistently.\n\nFirst, capture ideas when energy is high.\n\nSecond, adapt hooks per platform.",
      youtubeTitle: "3 Ways to Double Your Creator Consistency Without Burnout",
      youtubeTags: "creator economy, youtube growth, tiktok hooks, productivity",
      tiktokCaption:
        "Stop writing from scratch every day #creator #youtubetips #tiktokgrowth #productivity",
    });

    expect(strongReport.hookScore).toBeGreaterThanOrEqual(75);
    expect(strongReport.overallScore).toBeGreaterThanOrEqual(75);
    expect(strongReport.costUsd).toBe(0);
    expect(strongReport.checks.every((c) => c.passed)).toBe(true);

    // Over-limit YouTube title (>100 chars) should flag compliance check
    const overLimitReport = analyzeCreatorDraft({
      title: "X".repeat(120),
      script: "Short note.",
      youtubeTitle: "X".repeat(120),
    });
    const ytTitleCheck = overLimitReport.checks.find(
      (c) => c.id === "youtube_title_limit"
    );
    expect(ytTitleCheck?.passed).toBe(false);
    expect(overLimitReport.suggestions.length).toBeGreaterThanOrEqual(1);
  });

  it("analyzes a workspace draft via POST /api/v1/analyze with zero quota consumption", async () => {
    const res = await analyzePost(
      new Request("http://localhost:3000/api/v1/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "user-1",
        },
        body: JSON.stringify({ contentId: "1" }),
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.costUsd).toBe(0);
    expect(json.quotaConsumed).toBe(false);
    expect(typeof json.analysis.overallScore).toBe("number");
    expect(Array.isArray(json.analysis.checks)).toBe(true);
  });

  it("serves a sanitized read-only share preview and OpenGraph SVG card via GET /api/v1/share/[id]", async () => {
    const okRes = await shareGet(
      new Request("http://localhost:3000/api/v1/share/1"),
      { params: { id: "1" } }
    );
    expect(okRes.status).toBe(200);
    const shared = await okRes.json();
    expect(shared.preview.id).toBe("1");
    expect(shared.preview.title).toContain("consistent content");
    expect(
      shared.preview.openGraphSvgDataUrl.startsWith("data:image/svg+xml;utf8,")
    ).toBe(true);
    expect(shared.preview.encryptedByok).toBeUndefined();

    const missingRes = await shareGet(
      new Request("http://localhost:3000/api/v1/share/99999"),
      { params: { id: "99999" } }
    );
    expect(missingRes.status).toBe(404);
  });
});
