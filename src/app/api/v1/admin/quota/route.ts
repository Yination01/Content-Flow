import { NextResponse } from "next/server";
import {
  authorizeAdminAction,
  evaluatePlatformBudget,
  PLATFORM_BUDGET_LIMITS,
} from "@/lib/policy";
import {
  extractActorFromRequest,
  getApiStore,
  persistApiStore,
} from "@/lib/server/store";

export async function GET(request: Request) {
  const actor = extractActorFromRequest(request);
  if (!authorizeAdminAction(actor.roles, "quota_overview")) {
    return NextResponse.json(
      { error: "Forbidden: Superuser role required." },
      { status: 403 }
    );
  }

  const store = getApiStore();
  const u = store.platformUsage;

  return NextResponse.json({
    limits: PLATFORM_BUDGET_LIMITS,
    usage: u,
    metrics: [
      evaluatePlatformBudget("CF_AI", u.cloudflareAiNeurons, "PRO"),
      evaluatePlatformBudget("R2_READS", u.r2Reads, "PRO"),
      evaluatePlatformBudget("R2_WRITES", u.r2Writes, "PRO"),
      evaluatePlatformBudget("YOUTUBE_API", u.youtubeUnits, "PRO"),
      evaluatePlatformBudget("TIKTOK_API", u.tiktokCalls, "PRO"),
      evaluatePlatformBudget("HUGGINGFACE_API", u.huggingfaceCalls, "PRO"),
    ],
  });
}

export async function POST(request: Request) {
  const actor = extractActorFromRequest(request);
  if (!authorizeAdminAction(actor.roles, "quota_overview")) {
    return NextResponse.json(
      { error: "Forbidden: Superuser role required." },
      { status: 403 }
    );
  }

  const store = getApiStore();
  store.platformUsage.cloudflareAiNeurons = 0;
  store.platformUsage.huggingfaceCalls = 0;
  store.platformUsage.youtubeUnits = 0;
  store.platformUsage.tiktokCalls = 0;
  store.auditLogs.unshift({
    id: `audit-${Date.now()}`,
    actorId: actor.userId,
    actionType: "admin.quota_reset",
    reason: "Manual superuser reset of daily $0-budget provider counters",
    createdAt: new Date().toISOString(),
  });
  persistApiStore();

  return NextResponse.json({
    reset: true,
    usage: store.platformUsage,
  });
}
