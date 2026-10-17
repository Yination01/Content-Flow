import { NextResponse } from "next/server";
import { evaluatePlatformBudget } from "@/lib/policy";
import { getApiStore, persistApiStore } from "@/lib/server/store";

export async function POST(_request: Request) {
  const store = getApiStore();
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();

  // 1. Purge expired AI cache entries
  let purgedCacheEntries = 0;
  for (const [key, entry] of Array.from(store.aiCache.entries())) {
    if (entry.expiresAt <= nowMs) {
      store.aiCache.delete(key);
      purgedCacheEntries += 1;
    }
  }

  // 2. Claim up to 10 eligible pending jobs (scheduledAt is null or <= now)
  const eligibleJobs = Array.from(store.jobs.values())
    .filter((job) => {
      if (job.status !== "pending") return false;
      if (job.attempts >= job.maxAttempts) return false;
      if (!job.scheduledAt) return true;
      const dueTime = Date.parse(job.scheduledAt);
      return !Number.isNaN(dueTime) && dueTime <= nowMs;
    })
    .sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return (a.scheduledAt || a.createdAt).localeCompare(
        b.scheduledAt || b.createdAt
      );
    })
    .slice(0, 10);

  const processedJobIds: string[] = [];
  for (const job of eligibleJobs) {
    // Check free-tier API budget before calling external social APIs
    if (job.platform === "YouTube") {
      const ytEval = evaluatePlatformBudget(
        "YOUTUBE_API",
        store.platformUsage.youtubeUnits,
        "PRO"
      );
      if (!ytEval.allowCentralProvider) {
        continue;
      }
      store.platformUsage.youtubeUnits += 50;
    } else {
      const ttEval = evaluatePlatformBudget(
        "TIKTOK_API",
        store.platformUsage.tiktokCalls,
        "PRO"
      );
      if (!ttEval.allowCentralProvider) {
        continue;
      }
      store.platformUsage.tiktokCalls += 1;
    }

    job.status = "completed";
    job.attempts += 1;
    job.startedAt = nowIso;
    job.completedAt = nowIso;
    processedJobIds.push(job.id);

    if (job.contentId) {
      const content = store.contents.get(job.contentId);
      if (content) {
        content.status = "posted";
        content.updatedAt = nowIso;
      }
    }
  }

  // 3. Evaluate 80% / 95% platform budget alerts
  const u = store.platformUsage;
  const evaluations = [
    evaluatePlatformBudget("CF_AI", u.cloudflareAiNeurons, "FREE"),
    evaluatePlatformBudget("HUGGINGFACE_API", u.huggingfaceCalls, "FREE"),
    evaluatePlatformBudget("R2_READS", u.r2Reads, "FREE"),
    evaluatePlatformBudget("R2_WRITES", u.r2Writes, "FREE"),
    evaluatePlatformBudget("YOUTUBE_API", u.youtubeUnits, "FREE"),
    evaluatePlatformBudget("TIKTOK_API", u.tiktokCalls, "FREE"),
  ];
  const budgetAlerts = evaluations.filter((e) => e.alertSuperuser);

  persistApiStore();

  return NextResponse.json({
    claimedCount: processedJobIds.length,
    processedJobIds,
    purgedCacheEntries,
    budgetAlerts,
    timestamp: nowIso,
  });
}
