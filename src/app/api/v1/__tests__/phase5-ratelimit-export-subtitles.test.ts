import { beforeEach, describe, expect, it } from "vitest";
import { resetApiStoreForTests } from "@/lib/server/store";
import {
  checkRateLimit,
  resetRateLimiterForTests,
} from "@/lib/server/rate-limit";
import {
  buildVideoStoryboard,
  buildSubtitlesFromStoryboard,
} from "@/lib/video/client-renderer";
import { POST as loginPost } from "@/app/api/v1/auth/login/route";
import { GET as exportGet } from "@/app/api/v1/export/route";
import { POST as importPost } from "@/app/api/v1/import/route";

describe("Phase 5: $0 Sliding-Window Rate Limiter, SRT/VTT Subtitle Generator & Workspace Export/Import", () => {
  beforeEach(() => {
    resetApiStoreForTests();
    resetRateLimiterForTests();
  });

  it("enforces sliding-window rate limits in memory at $0 cost and recovers after window expiry", () => {
    const t0 = 1_700_000_000_000;
    const r1 = checkRateLimit("ip:1.2.3.4:login", 2, 60_000, t0);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(1);

    const r2 = checkRateLimit("ip:1.2.3.4:login", 2, 60_000, t0 + 1000);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(0);

    const r3 = checkRateLimit("ip:1.2.3.4:login", 2, 60_000, t0 + 2000);
    expect(r3.allowed).toBe(false);
    expect(r3.remaining).toBe(0);
    expect(r3.retryAfterSeconds).toBeGreaterThan(0);

    // After 60 seconds, window slides and requests are permitted again
    const r4 = checkRateLimit("ip:1.2.3.4:login", 2, 60_000, t0 + 61_000);
    expect(r4.allowed).toBe(true);
    expect(r4.remaining).toBe(1);
  });

  it("protects POST /api/v1/auth/login against brute-force bursts with 429 and Retry-After header", async () => {
    for (let i = 0; i < 10; i++) {
      const res = await loginPost(
        new Request("http://localhost:3000/api/v1/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-forwarded-for": "203.0.113.55",
          },
          body: JSON.stringify({
            email: "maya@contentflow.app",
            password: "wrong-password-123",
          }),
        })
      );
      expect(res.status).toBe(401);
    }

    const blocked = await loginPost(
      new Request("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "203.0.113.55",
        },
        body: JSON.stringify({
          email: "maya@contentflow.app",
          password: "wrong-password-123",
        }),
      })
    );
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBeTruthy();
  });

  it("generates standards-compliant .srt and .vtt subtitle tracks from a video storyboard at $0 server cost", () => {
    const board = buildVideoStoryboard(
      "Hook: Capture your best idea once.\n\nBody: Adapt it for YouTube and TikTok in seconds.",
      { title: "Subtitle Demo", aspectRatio: "9:16" }
    );

    const srt = buildSubtitlesFromStoryboard(board, "srt");
    expect(srt).toContain("1\n00:00:00,000 -->");
    expect(srt).toContain("Hook: Capture your best idea once.");
    expect(srt).toContain("2\n00:00:");

    const vtt = buildSubtitlesFromStoryboard(board, "vtt");
    expect(vtt.startsWith("WEBVTT")).toBe(true);
    expect(vtt).toContain("00:00:00.000 -->");
    expect(vtt).toContain("Body: Adapt it for YouTube and TikTok in seconds.");
  });

  it("exports portable workspace JSON or direct .srt/.vtt files and imports drafts within tier limits", async () => {
    const exportRes = await exportGet(
      new Request("http://localhost:3000/api/v1/export", {
        headers: { "x-user-id": "user-1" },
      })
    );
    expect(exportRes.status).toBe(200);
    const bundle = await exportRes.json();
    expect(bundle.version).toBe("1.0");
    expect(Array.isArray(bundle.contents)).toBe(true);
    expect(bundle.contents.length).toBeGreaterThanOrEqual(2);
    expect(bundle.contents[0].subtitles.srt).toContain("00:00:00,000 -->");

    // Direct .srt subtitle file export
    const srtRes = await exportGet(
      new Request(
        `http://localhost:3000/api/v1/export?format=srt&contentId=${bundle.contents[0].id}`,
        { headers: { "x-user-id": "user-1" } }
      )
    );
    expect(srtRes.status).toBe(200);
    expect(srtRes.headers.get("Content-Type")).toContain("text/plain");
    const srtText = await srtRes.text();
    expect(srtText).toContain("00:00:00,000 -->");

    // Import portable drafts via POST /api/v1/import
    const importRes = await importPost(
      new Request("http://localhost:3000/api/v1/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "user-1",
        },
        body: JSON.stringify({
          contents: [
            {
              title: "Imported Creator Playbook",
              originalText: "Core imported note",
              generatedScript: "Full imported script for YouTube and TikTok.",
              contentType: "text",
            },
          ],
        }),
      })
    );
    expect(importRes.status).toBe(201);
    const importedData = await importRes.json();
    expect(importedData.importedCount).toBe(1);
    expect(importedData.importedIds.length).toBe(1);
  });
});
