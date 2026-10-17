import { NextResponse } from "next/server";
import { evaluatePlatformBudget, getUtcResetWindows } from "@/lib/policy";
import { ensureUtcQuotaReset, getApiStore } from "@/lib/server/store";

export async function GET(_request: Request) {
  const store = getApiStore();
  ensureUtcQuotaReset(store);

  const jobs = Array.from(store.jobs.values());
  const queueSummary = {
    pending: jobs.filter((j) => j.status === "pending").length,
    processing: jobs.filter((j) => j.status === "processing").length,
    completed: jobs.filter((j) => j.status === "completed").length,
    failed: jobs.filter((j) => j.status === "failed").length,
    cancelled: jobs.filter((j) => j.status === "cancelled").length,
  };

  const cacheEntries = Array.from(store.aiCache.values());
  const aiCacheSummary = {
    entries: cacheEntries.length,
    totalHits: cacheEntries.reduce((sum, item) => sum + item.hitCount, 0),
  };

  const u = store.platformUsage;
  const evals = [
    evaluatePlatformBudget("CF_AI", u.cloudflareAiNeurons, "FREE"),
    evaluatePlatformBudget("HUGGINGFACE_API", u.huggingfaceCalls, "FREE"),
    evaluatePlatformBudget("R2_READS", u.r2Reads, "FREE"),
    evaluatePlatformBudget("R2_WRITES", u.r2Writes, "FREE"),
    evaluatePlatformBudget("YOUTUBE_API", u.youtubeUnits, "FREE"),
    evaluatePlatformBudget("TIKTOK_API", u.tiktokCalls, "FREE"),
  ];

  const hasEmergency = evals.some((e) => e.emergencyMode);
  const hasAlert = evals.some((e) => e.alertSuperuser);
  const budgetStatus = hasEmergency
    ? "emergency_95"
    : hasAlert
      ? "alert_80"
      : "healthy";

  const persistenceMode =
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
      ? "supabase"
      : "local-disk";

  return NextResponse.json({
    status: "ok",
    persistenceMode,
    budgetStatus,
    utcWindows: getUtcResetWindows(),
    queueSummary,
    aiCacheSummary,
    platformUsage: u,
  });
}
