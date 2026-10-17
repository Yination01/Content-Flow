import { beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { getApiStore, resetApiStore } from "@/lib/server/store";
import { POST as generatePost } from "../generate/route";
import { POST as uploadUrlPost } from "../storage/upload-url/route";
import { POST as workerTickPost } from "../worker/tick/route";
import { GET as adminQuotaGet } from "../admin/quota/route";
import manifest from "@/app/manifest";
import { buildMobileApiEndpoints } from "../../../../../mobile/src/api";

describe("$0-Budget Guardrails, Background Worker Tick, PWA & Multi-Platform Clients", () => {
  beforeEach(() => {
    resetApiStore();
  });

  it("tracks live platform_usage and enforces 95% Free-tier emergency mode + 100% hard free-tier cap", async () => {
    const store = getApiStore();
    // Set Cloudflare AI neurons to 7,700 (>= 95% of 8,000 safe cap)
    store.platformUsage.cloudflareAiNeurons = 7700;
    store.platformUsage.huggingfaceCalls = 100;

    const freeReq = new Request("http://localhost:3000/api/v1/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "user-free-1",
        "x-user-tier": "FREE",
      },
      body: JSON.stringify({
        prompt: "Zero budget test prompt for free tier",
        modality: "text",
      }),
    });

    const freeRes = await generatePost(freeReq);
    expect(freeRes.status).toBe(200);
    const freeBody = await freeRes.json();
    // Free tier must NOT use Cloudflare AI when CF AI is in 95% emergency mode
    expect(freeBody.plan).toBe("C");
    expect(store.platformUsage.huggingfaceCalls).toBe(101);

    // When R2 writes hit the 800,000 free-tier cap, presigned upload is blocked to guarantee $0 overage
    store.platformUsage.r2Writes = 800000;
    const r2BlockedRes = await uploadUrlPost(
      new Request("http://localhost:3000/api/v1/storage/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": "user-1" },
        body: JSON.stringify({
          fileName: "video.mp4",
          contentType: "video/mp4",
          fileSizeBytes: 1024 * 1024,
        }),
      })
    );
    expect(r2BlockedRes.status).toBe(429);
  });

  it("POST /api/v1/worker/tick claims due pending jobs, skips future jobs, purges expired AI cache, and reports 80% alerts", async () => {
    const store = getApiStore();
    const now = Date.now();

    // Add a due scheduled job and a future scheduled job
    store.jobs.set("job-due-1", {
      id: "job-due-1",
      userId: "user-1",
      jobType: "scheduled_publish",
      contentId: "1",
      contentTitle: "A creator's guide to consistent content",
      platform: "YouTube",
      payload: {},
      status: "pending",
      priority: 5,
      attempts: 0,
      maxAttempts: 3,
      scheduledAt: new Date(now - 60_000).toISOString(), // 1 min in the past (due!)
      createdAt: new Date(now - 120_000).toISOString(),
    });

    store.jobs.set("job-future-1", {
      id: "job-future-1",
      userId: "user-1",
      jobType: "scheduled_publish",
      contentId: "2",
      contentTitle: "Future scheduled post",
      platform: "TikTok",
      payload: {},
      status: "pending",
      priority: 5,
      attempts: 0,
      maxAttempts: 3,
      scheduledAt: new Date(now + 86400_000).toISOString(), // 24 hours in the future
      createdAt: new Date(now).toISOString(),
    });

    // Add an expired AI cache entry
    store.aiCache.set("expired-hash", {
      promptHash: "expired-hash",
      userId: "user-1",
      responseText: "Old cached text",
      adaptations: {
        title: "Old",
        youtubeTitle: "Old",
        youtubeDescription: "Old",
        youtubeTags: "old",
        tiktokCaption: "Old",
        tiktokHashtags: "#old",
      },
      provider: "contentflow_neural_engine",
      tokensUsed: 50,
      hitCount: 0,
      createdAt: new Date(now - 100_000).toISOString(),
      expiresAt: now - 1000,
    });

    const tickRes = await workerTickPost(
      new Request("http://localhost:3000/api/v1/worker/tick", {
        method: "POST",
      })
    );
    expect(tickRes.status).toBe(200);
    const tickBody = await tickRes.json();

    expect(tickBody.claimedCount).toBeGreaterThanOrEqual(1);
    expect(store.jobs.get("job-due-1")?.status).toBe("completed");
    expect(store.contents.get("1")?.status).toBe("posted");
    // Future job must still be pending!
    expect(store.jobs.get("job-future-1")?.status).toBe("pending");
    // Expired AI cache entry must be purged!
    expect(store.aiCache.has("expired-hash")).toBe(false);

    // Check admin quota endpoint reflects live platformUsage
    const quotaRes = await adminQuotaGet(
      new Request("http://localhost:3000/api/v1/admin/quota", {
        headers: { "x-user-roles": "superuser" },
      })
    );
    expect(quotaRes.status).toBe(200);
    const quotaJson = await quotaRes.json();
    expect(quotaJson.usage.youtubeUnits).toBeGreaterThan(0);
  });

  it("provides valid PWA manifest, Chrome Extension Manifest V3, and Expo Mobile API client", () => {
    const pwa = manifest();
    expect(pwa.name).toContain("ContentFlow");
    expect(pwa.display).toBe("standalone");
    expect(pwa.start_url).toBe("/dashboard");

    const extManifestPath = path.join(process.cwd(), "extension", "manifest.json");
    expect(fs.existsSync(extManifestPath)).toBe(true);
    const extManifest = JSON.parse(fs.readFileSync(extManifestPath, "utf8"));
    expect(extManifest.manifest_version).toBe(3);
    expect(extManifest.name).toContain("ContentFlow");

    const endpoints = buildMobileApiEndpoints("https://contentflow.app");
    expect(endpoints.generate).toBe("https://contentflow.app/api/v1/generate");
    expect(endpoints.jobs).toBe("https://contentflow.app/api/v1/jobs");
  });
});
