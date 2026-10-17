import { NextResponse } from "next/server";
import {
  authorizeAdminAction,
  evaluatePlatformBudget,
  PLATFORM_BUDGET_LIMITS,
} from "@/lib/policy";
import { extractActorFromRequest } from "@/lib/server/store";

export async function GET(request: Request) {
  const actor = extractActorFromRequest(request);
  if (!authorizeAdminAction(actor.roles, "quota_overview")) {
    return NextResponse.json({ error: "Forbidden: Superuser role required." }, { status: 403 });
  }

  return NextResponse.json({
    demo: true,
    limits: PLATFORM_BUDGET_LIMITS,
    metrics: [
      evaluatePlatformBudget("CF_AI", 5760, "PRO"),
      evaluatePlatformBudget("R2_READS", 296000, "PRO"),
      evaluatePlatformBudget("YOUTUBE_API", 6720, "PRO"),
      evaluatePlatformBudget("TIKTOK_API", 340, "PRO"),
      evaluatePlatformBudget("HUGGINGFACE_API", 420, "PRO"),
    ],
  });
}
