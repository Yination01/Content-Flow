import { NextResponse } from "next/server";
import { checkUserQuota, getUtcResetWindows } from "@/lib/policy";
import {
  ensureUtcQuotaReset,
  extractActorFromRequest,
  getApiStore,
} from "@/lib/server/store";

export async function GET(request: Request) {
  const store = getApiStore();
  ensureUtcQuotaReset(store);
  const actor = extractActorFromRequest(request);

  const userContents = Array.from(store.contents.values()).filter(
    (item) => item.userId === actor.userId
  );
  const userJobs = Array.from(store.jobs.values()).filter(
    (job) => job.userId === actor.userId
  );
  const userCacheEntries = Array.from(store.aiCache.values()).filter(
    (entry) => entry.userId === actor.userId
  );

  const byModality = {
    text: userContents.filter((c) => c.contentType === "text").length,
    image: userContents.filter((c) => c.contentType === "image").length,
    video: userContents.filter((c) => c.contentType === "video").length,
  };

  const byStatus = {
    draft: userContents.filter((c) => c.status === "draft").length,
    ready: userContents.filter((c) => c.status === "ready").length,
    posted: userContents.filter((c) => c.status === "posted").length,
    failed: userContents.filter((c) => c.status === "failed").length,
  };

  const completedJobs = userJobs.filter((j) => j.status === "completed").length;
  const failedJobs = userJobs.filter((j) => j.status === "failed").length;
  const finishedTotal = completedJobs + failedJobs;
  const queueSuccessRate =
    finishedTotal > 0 ? Math.round((completedJobs / finishedTotal) * 100) : 100;

  const aiCacheHitsSaved = userCacheEntries.reduce(
    (sum, item) => sum + item.hitCount,
    0
  );

  const aiQuota = checkUserQuota(
    actor.tier,
    actor.userRecord.usage,
    "ai_generation"
  );

  return NextResponse.json({
    userId: actor.userId,
    tier: actor.tier,
    totalDrafts: userContents.length,
    byModality,
    byStatus,
    queueSuccessRate,
    aiCacheHitsSaved,
    remainingDailyGenerations: aiQuota.remaining,
    usage: actor.userRecord.usage,
    resetWindows: getUtcResetWindows(),
  });
}
