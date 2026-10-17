import { beforeEach, describe, expect, it } from "vitest";
import {
  ensureUtcQuotaReset,
  getApiStore,
  resetApiStoreForTests,
} from "@/lib/server/store";
import { buildSupabaseRestRequest } from "@/lib/server/supabase-adapter";
import { GET as healthGet } from "@/app/api/v1/health/route";
import { GET as analyticsGet } from "@/app/api/v1/analytics/route";
import { GET as auditLogsGet } from "@/app/api/v1/admin/audit-logs/route";
import { PATCH as updateTierPatch } from "@/app/api/v1/admin/users/[id]/tier/route";
import {
  buildVideoStoryboard,
  buildWebmRenderPlan,
} from "@/lib/video/client-renderer";

describe("Phase 4: UTC Quota Rollover, Supabase PostgREST Adapter, Telemetry APIs & WebM Renderer", () => {
  beforeEach(() => {
    resetApiStoreForTests();
  });

  it("automatically resets daily quotas at 00:00 UTC and monthly quotas on the 1st of the month at 00:00 UTC", () => {
    const store = getApiStore();
    const user = store.users.get("user-1")!;
    user.usage.dailyAiGenerations = 42;
    user.usage.monthlyPostsCreated = 18;
    user.usage.monthlyCrossPosts = 25;
    store.platformUsage.cloudflareAiNeurons = 5000;
    store.platformUsage.r2Writes = 120000;

    // Simulate store last reset on 2026-09-30 (previous day AND previous month)
    store.platformUsage.date = "2026-09-30";
    store.platformUsage.month = "2026-09";

    // Advance only the day within the same month first: 2026-09-30 -> 2026-09-30 (no reset)
    const noReset = ensureUtcQuotaReset(
      store,
      new Date("2026-09-30T18:00:00.000Z")
    );
    expect(noReset.dailyReset).toBe(false);
    expect(noReset.monthlyReset).toBe(false);
    expect(user.usage.dailyAiGenerations).toBe(42);

    // Advance into a new UTC day in the same month (simulate 2026-10-16 -> 2026-10-17)
    store.platformUsage.date = "2026-10-16";
    store.platformUsage.month = "2026-10";
    const dailyOnly = ensureUtcQuotaReset(
      store,
      new Date("2026-10-17T00:01:00.000Z")
    );
    expect(dailyOnly.dailyReset).toBe(true);
    expect(dailyOnly.monthlyReset).toBe(false);
    expect(user.usage.dailyAiGenerations).toBe(0);
    expect(store.platformUsage.cloudflareAiNeurons).toBe(0);
    // Monthly counters remain intact on a same-month daily rollover
    expect(user.usage.monthlyPostsCreated).toBe(18);
    expect(store.platformUsage.r2Writes).toBe(120000);

    // Now advance into a new UTC month (2026-10 -> 2026-11-01T00:00:05.000Z)
    const monthlyRollover = ensureUtcQuotaReset(
      store,
      new Date("2026-11-01T00:00:05.000Z")
    );
    expect(monthlyRollover.dailyReset).toBe(true);
    expect(monthlyRollover.monthlyReset).toBe(true);
    expect(user.usage.monthlyPostsCreated).toBe(0);
    expect(user.usage.monthlyCrossPosts).toBe(0);
    expect(store.platformUsage.r2Writes).toBe(0);
  });

  it("builds zero-dependency Supabase PostgREST requests when configured and falls back cleanly when unconfigured", () => {
    const disabled = buildSupabaseRestRequest("contents", "POST", { id: "1" }, {});
    expect(disabled.enabled).toBe(false);

    const enabled = buildSupabaseRestRequest(
      "platform_usage",
      "POST",
      { date: "2026-10-17", cloudflare_ai_neurons: 12 },
      {
        NEXT_PUBLIC_SUPABASE_URL: "https://demo-ref.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-secret-token",
      }
    );
    expect(enabled.enabled).toBe(true);
    expect(enabled.url).toBe(
      "https://demo-ref.supabase.co/rest/v1/platform_usage"
    );
    expect(enabled.headers?.apikey).toBe("service-role-secret-token");
    expect(enabled.headers?.Authorization).toBe(
      "Bearer service-role-secret-token"
    );
  });

  it("serves /api/v1/health, /api/v1/analytics, and superuser-protected /api/v1/admin/audit-logs", async () => {
    const healthRes = await healthGet(
      new Request("http://localhost:3000/api/v1/health")
    );
    expect(healthRes.status).toBe(200);
    const healthJson = await healthRes.json();
    expect(healthJson.status).toBe("ok");
    expect(healthJson.budgetStatus).toBe("healthy");
    expect(typeof healthJson.queueSummary.pending).toBe("number");

    const analyticsRes = await analyticsGet(
      new Request("http://localhost:3000/api/v1/analytics", {
        headers: { "x-user-id": "user-1" },
      })
    );
    expect(analyticsRes.status).toBe(200);
    const analyticsJson = await analyticsRes.json();
    expect(analyticsJson.totalDrafts).toBeGreaterThanOrEqual(2);
    expect(analyticsJson.byModality).toBeDefined();
    expect(typeof analyticsJson.remainingDailyGenerations).toBe("number");

    // Non-superuser blocked from /api/v1/admin/audit-logs
    const forbiddenAudit = await auditLogsGet(
      new Request("http://localhost:3000/api/v1/admin/audit-logs", {
        headers: { "x-user-roles": "user" },
      })
    );
    expect(forbiddenAudit.status).toBe(403);

    // Record an admin tier change and verify it appears in /api/v1/admin/audit-logs
    await updateTierPatch(
      new Request("http://localhost:3000/api/v1/admin/users/user-1/tier", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-roles": "superuser",
        },
        body: JSON.stringify({
          tier: "PRO",
          reason: "Phase 4 audit verification",
        }),
      }),
      { params: { id: "user-1" } }
    );

    const okAudit = await auditLogsGet(
      new Request("http://localhost:3000/api/v1/admin/audit-logs", {
        headers: { "x-user-roles": "superuser" },
      })
    );
    expect(okAudit.status).toBe(200);
    const auditJson = await okAudit.json();
    expect(auditJson.auditLogs.length).toBeGreaterThanOrEqual(1);
    expect(auditJson.auditLogs[0].reason).toBe("Phase 4 audit verification");
  });

  it("creates a client-side WebM render plan with frame counts and codec candidates at $0 server cost", () => {
    const board = buildVideoStoryboard(
      "Scene 1: Hook your viewer fast.\n\nScene 2: Deliver the takeaway clearly.",
      { title: "Short Form Guide", aspectRatio: "9:16" }
    );
    const plan = buildWebmRenderPlan(board, 30);
    expect(plan.fps).toBe(30);
    expect(plan.totalFrames).toBeGreaterThan(100);
    expect(plan.mimeCandidates).toContain("video/webm;codecs=vp9");
    expect(plan.sceneFrames.length).toBe(2);
  });
});
