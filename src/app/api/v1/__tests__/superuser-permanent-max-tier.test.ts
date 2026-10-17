import { beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { resetApiStoreForTests } from "@/lib/server/store";
import { resetRateLimiterForTests } from "@/lib/server/rate-limit";
import { checkUserQuota, resolveEffectiveTier } from "@/lib/policy";
import { POST as signupPost } from "@/app/api/v1/auth/signup/route";

describe("Superuser Permanent Max Paid Tier (AGENCY) & All Features Enabled", () => {
  beforeEach(() => {
    resetApiStoreForTests();
    resetRateLimiterForTests();
  });

  it("resolves superuser accounts permanently to AGENCY (max paid tier) and enables all features without quota blocks", () => {
    expect(resolveEffectiveTier("FREE", ["creator", "superuser"])).toBe(
      "AGENCY"
    );
    expect(resolveEffectiveTier("CREATOR", ["creator"])).toBe("CREATOR");

    const heavyUsage = {
      dailyAiGenerations: 5000,
      monthlyPostsCreated: 5000,
      monthlyCrossPosts: 5000,
      storageUsedMb: 45000,
    };

    for (const action of [
      "ai_generation",
      "create_post",
      "cross_post",
      "video_render",
      "storage_upload",
    ] as const) {
      const decision = checkUserQuota("FREE", heavyUsage, action, {
        roles: ["creator", "superuser"],
        additionalStorageMb: 100,
      });
      expect(decision.allowed).toBe(true);
    }
  });

  it("assigns permanent AGENCY tier and superuser role on signup for the bootstrap superuser email", async () => {
    const res = await signupPost(
      new Request("http://localhost:3000/api/v1/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "johnpaulonovo@gmail.com",
          password: "SuperuserPass#2026",
          name: "Johnpaul Onovo",
        }),
      })
    );

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.user.roles).toContain("superuser");
    expect(data.user.tier).toBe("AGENCY");
  });

  it("includes supabase/migrations/0003_superuser_permanent_agency.sql to enforce AGENCY tier in PostgreSQL", () => {
    const sqlPath = path.join(
      process.cwd(),
      "supabase",
      "migrations",
      "0003_superuser_permanent_agency.sql"
    );
    expect(fs.existsSync(sqlPath)).toBe(true);
    const sql = fs.readFileSync(sqlPath, "utf8");
    expect(sql).toContain("subscription_tier = 'AGENCY'");
    expect(sql).toContain("role = 'superuser'");
  });
});
