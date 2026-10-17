import { describe, expect, it } from "vitest";
import crypto from "node:crypto";
import {
  TIER_LIMITS,
  PLATFORM_BUDGET_LIMITS,
  PRICING_TABLE,
  checkUserQuota,
  getUtcResetWindows,
  evaluatePlatformBudget,
  selectAiProvider,
  getScopedCacheKey,
  encryptApiKey,
  decryptApiKey,
  maskApiKey,
  verifyPaystackSignature,
  validatePaystackChargeEvent,
  canCancelJob,
  computeRetryBackoffMs,
  resolveMultiPlatformJobOutcome,
  authorizeResourceAccess,
  authorizeAdminAction,
  type SubscriptionTier,
  type UsageSnapshot,
} from "../index";

describe("ContentFlow Domain Policy & Security Engine", () => {
  describe("1. Tier Quotas & UTC Reset Semantics", () => {
    it("matches canonical tier limits from product brief", () => {
      expect(TIER_LIMITS.FREE).toEqual({
        posts_per_month: 5,
        ai_generations_per_day: 10,
        cross_posts_per_month: 10,
        video_rendering: false,
        storage_mb: 100,
      });
      expect(TIER_LIMITS.CREATOR).toEqual({
        posts_per_month: 50,
        ai_generations_per_day: 100,
        cross_posts_per_month: 100,
        video_rendering: true,
        storage_mb: 1000,
      });
      expect(TIER_LIMITS.PRO).toEqual({
        posts_per_month: -1,
        ai_generations_per_day: 500,
        cross_posts_per_month: -1,
        video_rendering: true,
        storage_mb: 10000,
      });
      expect(TIER_LIMITS.AGENCY).toEqual({
        posts_per_month: -1,
        ai_generations_per_day: 2000,
        cross_posts_per_month: -1,
        video_rendering: true,
        storage_mb: 50000,
      });
    });

    it("enforces daily AI generation and monthly post/cross-post boundaries separately", () => {
      const usageAtFreeLimit: UsageSnapshot = {
        dailyAiGenerations: 10,
        monthlyPostsCreated: 4,
        monthlyCrossPosts: 10,
        storageUsedMb: 50,
      };

      expect(checkUserQuota("FREE", usageAtFreeLimit, "ai_generation").allowed).toBe(false);
      expect(checkUserQuota("FREE", usageAtFreeLimit, "create_post").allowed).toBe(true);
      expect(checkUserQuota("FREE", usageAtFreeLimit, "cross_post").allowed).toBe(false);
      expect(checkUserQuota("FREE", usageAtFreeLimit, "video_render").allowed).toBe(false);
    });

    it("treats -1 as unlimited on PRO and AGENCY tiers for posts and cross-posts", () => {
      const highUsage: UsageSnapshot = {
        dailyAiGenerations: 499,
        monthlyPostsCreated: 25000,
        monthlyCrossPosts: 50000,
        storageUsedMb: 1000,
      };

      expect(checkUserQuota("PRO", highUsage, "create_post")).toEqual({
        allowed: true,
        remaining: -1,
        unlimited: true,
        limit: -1,
        resetPeriod: "monthly_utc",
      });
      expect(checkUserQuota("PRO", highUsage, "cross_post").allowed).toBe(true);
      expect(checkUserQuota("PRO", highUsage, "ai_generation").allowed).toBe(true);
      expect(
        checkUserQuota("PRO", { ...highUsage, dailyAiGenerations: 500 }, "ai_generation").allowed
      ).toBe(false);
    });

    it("does not consume daily AI generation quota on user-scoped exact-match cache hit", () => {
      const exhaustedUsage: UsageSnapshot = {
        dailyAiGenerations: 10,
        monthlyPostsCreated: 0,
        monthlyCrossPosts: 0,
        storageUsedMb: 0,
      };

      const cacheHitDecision = checkUserQuota("FREE", exhaustedUsage, "ai_generation", {
        isCacheHit: true,
      });
      expect(cacheHitDecision.allowed).toBe(true);
      expect(cacheHitDecision.quotaConsumed).toBe(false);
    });

    it("computes next 00:00 UTC daily and first-of-month UTC reset timestamps", () => {
      const now = new Date("2026-10-17T14:30:00.000Z");
      const windows = getUtcResetWindows(now);
      expect(windows.dailyResetIso).toBe("2026-10-18T00:00:00.000Z");
      expect(windows.monthlyResetIso).toBe("2026-11-01T00:00:00.000Z");
      expect(windows.dateKeyUtc).toBe("2026-10-17");
      expect(windows.monthKeyUtc).toBe("2026-10");
    });
  });

  describe("2. Platform Budget Guardrails (80% Alert, 95% Emergency Mode)", () => {
    it("triggers alert at 80% and emergency mode at 95% restricting FREE tier central providers", () => {
      expect(PLATFORM_BUDGET_LIMITS.CF_AI_DAILY_LIMIT).toBe(8000);
      expect(PLATFORM_BUDGET_LIMITS.CF_AI_ALERT_THRESHOLD).toBe(6400);

      const normalState = evaluatePlatformBudget("CF_AI", 5000, "FREE");
      expect(normalState.status).toBe("healthy");
      expect(normalState.alertSuperuser).toBe(false);
      expect(normalState.emergencyMode).toBe(false);
      expect(normalState.allowCentralProvider).toBe(true);

      const warningState = evaluatePlatformBudget("CF_AI", 6400, "FREE");
      expect(warningState.status).toBe("warning_80");
      expect(warningState.alertSuperuser).toBe(true);
      expect(warningState.emergencyMode).toBe(false);
      expect(warningState.allowCentralProvider).toBe(true);

      const emergencyFree = evaluatePlatformBudget("CF_AI", 7600, "FREE");
      expect(emergencyFree.status).toBe("emergency_95");
      expect(emergencyFree.alertSuperuser).toBe(true);
      expect(emergencyFree.emergencyMode).toBe(true);
      expect(emergencyFree.allowCentralProvider).toBe(false);

      const emergencyPaid = evaluatePlatformBudget("CF_AI", 7600, "CREATOR");
      expect(emergencyPaid.emergencyMode).toBe(true);
      expect(emergencyPaid.allowCentralProvider).toBe(true);
    });
  });

  describe("3. AI Provider Fallback Chain & User-Scoped Cache", () => {
    it("scopes cache keys by userId to prevent cross-user prompt/response leakage", () => {
      const keyUserA = getScopedCacheKey("user-a", "Write a focus guide", "text", "article", "warm");
      const keyUserB = getScopedCacheKey("user-b", "Write a focus guide", "text", "article", "warm");
      expect(keyUserA).not.toBe(keyUserB);
    });

    it("follows Plan A (BYOK) -> Plan B (Cloudflare AI) -> Plan C (Hugging Face) -> Plan D (fallback_required)", () => {
      // Plan A: User BYOK
      const planA = selectAiProvider({
        tier: "FREE",
        hasValidByok: true,
        byokProvider: "openai",
        cfAiHealthy: true,
        cfAiUsedToday: 100,
        hfHealthy: true,
        hfUsedToday: 50,
      });
      expect(planA.plan).toBe("A");
      expect(planA.provider).toBe("byok_openai");
      expect(planA.fallbackRequired).toBe(false);

      // Plan B: Cloudflare AI
      const planB = selectAiProvider({
        tier: "FREE",
        hasValidByok: false,
        cfAiHealthy: true,
        cfAiUsedToday: 1000,
        hfHealthy: true,
        hfUsedToday: 50,
      });
      expect(planB.plan).toBe("B");
      expect(planB.provider).toBe("cloudflare_workers_ai");

      // Plan C: Hugging Face when CF AI is in 95% emergency mode for FREE user
      const planC = selectAiProvider({
        tier: "FREE",
        hasValidByok: false,
        cfAiHealthy: true,
        cfAiUsedToday: 7700, // > 95% of 8000
        hfHealthy: true,
        hfUsedToday: 200,
      });
      expect(planC.plan).toBe("C");
      expect(planC.provider).toBe("huggingface_inference");

      // Plan D: Explicit client-side fallback required when all central providers unavailable
      const planD = selectAiProvider({
        tier: "FREE",
        hasValidByok: false,
        cfAiHealthy: false,
        cfAiUsedToday: 7900,
        hfHealthy: false,
        hfUsedToday: 1950,
      });
      expect(planD.plan).toBe("D");
      expect(planD.provider).toBe("client_transformers_js");
      expect(planD.fallbackRequired).toBe(true);
    });
  });

  describe("4. BYOK AES-256-GCM Envelope Encryption & Masking", () => {
    it("encrypts and decrypts API keys with AES-256-GCM and masks display safely", () => {
      const masterSecret = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
      const rawKey = "sk-proj-testSecretKeyValue9K2";
      const envelope = encryptApiKey(rawKey, masterSecret);

      expect(envelope.version).toBe("v1");
      expect(envelope.ciphertext).not.toContain(rawKey);
      expect(envelope.maskedPreview).toBe("sk-p•••••••••••••9K2");

      const decrypted = decryptApiKey(envelope, masterSecret);
      expect(decrypted).toBe(rawKey);
      expect(maskApiKey(rawKey)).toBe("sk-p•••••••••••••9K2");
    });
  });

  describe("5. Paystack Webhook Verification & Pricing Validation", () => {
    it("verifies HMAC-SHA512 signature and validates amount, currency, and idempotency", () => {
      const secret = "sk_test_paystack_secret";
      const payload = JSON.stringify({
        event: "charge.success",
        data: {
          id: 987654,
          reference: "cf_ref_1001",
          status: "success",
          amount: PRICING_TABLE.CREATOR.NGN.amountSubunits,
          currency: "NGN",
          metadata: { userId: "user-123", targetTier: "CREATOR" },
        },
      });
      const validSig = crypto.createHmac("sha512", secret).update(payload).digest("hex");

      expect(verifyPaystackSignature(payload, validSig, secret)).toBe(true);
      expect(verifyPaystackSignature(payload, "invalid_signature", secret)).toBe(false);

      const processedRefs = new Set<string>();
      const firstResult = validatePaystackChargeEvent(JSON.parse(payload), processedRefs);
      expect(firstResult.valid).toBe(true);
      expect(firstResult.idempotentDuplicate).toBe(false);
      expect(firstResult.targetTier).toBe("CREATOR");

      // Duplicate replay with same reference must be marked idempotentDuplicate
      const duplicateResult = validatePaystackChargeEvent(JSON.parse(payload), processedRefs);
      expect(duplicateResult.valid).toBe(true);
      expect(duplicateResult.idempotentDuplicate).toBe(true);

      // Tampered amount must be rejected
      const tamperedPayload = {
        event: "charge.success",
        data: {
          id: 987655,
          reference: "cf_ref_1002",
          status: "success",
          amount: 100, // wrong amount
          currency: "NGN",
          metadata: { userId: "user-123", targetTier: "PRO" as SubscriptionTier },
        },
      };
      const tamperedResult = validatePaystackChargeEvent(tamperedPayload, processedRefs);
      expect(tamperedResult.valid).toBe(false);
      expect(tamperedResult.reason).toContain("amount");
    });
  });

  describe("6. Job Queue Cancellation, Backoff & Partial Multi-Platform Success", () => {
    it("permits cancellation only when job is in pending status", () => {
      expect(canCancelJob("pending")).toBe(true);
      expect(canCancelJob("processing")).toBe(false);
      expect(canCancelJob("completed")).toBe(false);
      expect(canCancelJob("failed")).toBe(false);
      expect(canCancelJob("cancelled")).toBe(false);
    });

    it("computes bounded exponential backoff and preserves already-succeeded platforms on retry", () => {
      const attempt1 = computeRetryBackoffMs(1, 0);
      const attempt3 = computeRetryBackoffMs(3, 0);
      const attempt10 = computeRetryBackoffMs(10, 0);
      expect(attempt3).toBeGreaterThan(attempt1);
      expect(attempt10).toBeLessThanOrEqual(3600_000); // bounded max 1 hour

      const outcome = resolveMultiPlatformJobOutcome({
        YouTube: { status: "completed", externalPostId: "yt-99" },
        TikTok: { status: "failed", error: "token_expired", retryable: true },
      });
      expect(outcome.overallStatus).toBe("pending_retry");
      expect(outcome.platformsToRetry).toEqual(["TikTok"]);
      expect(outcome.completedPlatforms).toEqual(["YouTube"]);
    });
  });

  describe("7. Server-Side Ownership & Role Authorization", () => {
    it("enforces owner or privileged role for resource access and restricts admin endpoints to superuser", () => {
      expect(
        authorizeResourceAccess({ actorUserId: "u1", actorRoles: ["creator"], ownerUserId: "u1" })
      ).toBe(true);
      expect(
        authorizeResourceAccess({ actorUserId: "u2", actorRoles: ["creator"], ownerUserId: "u1" })
      ).toBe(false);
      expect(
        authorizeResourceAccess({ actorUserId: "mod1", actorRoles: ["moderator"], ownerUserId: "u1" })
      ).toBe(true);

      expect(authorizeAdminAction(["creator"], "tier_mutation")).toBe(false);
      expect(authorizeAdminAction(["moderator"], "tier_mutation")).toBe(false);
      expect(authorizeAdminAction(["superuser"], "tier_mutation")).toBe(true);
      expect(authorizeAdminAction(["moderator"], "moderation_review")).toBe(true);
    });
  });
});
