import crypto from "node:crypto";

export type SubscriptionTier = "FREE" | "CREATOR" | "PRO" | "AGENCY";

export type QuotaAction =
  | "ai_generation"
  | "create_post"
  | "cross_post"
  | "video_render"
  | "storage_upload";

export interface TierLimitConfig {
  posts_per_month: number; // -1 means unlimited
  ai_generations_per_day: number;
  cross_posts_per_month: number; // -1 means unlimited
  video_rendering: boolean;
  storage_mb: number;
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimitConfig> = {
  FREE: {
    posts_per_month: 5,
    ai_generations_per_day: 10,
    cross_posts_per_month: 10,
    video_rendering: false,
    storage_mb: 100,
  },
  CREATOR: {
    posts_per_month: 50,
    ai_generations_per_day: 100,
    cross_posts_per_month: 100,
    video_rendering: true,
    storage_mb: 1000,
  },
  PRO: {
    posts_per_month: -1,
    ai_generations_per_day: 500,
    cross_posts_per_month: -1,
    video_rendering: true,
    storage_mb: 10000,
  },
  AGENCY: {
    posts_per_month: -1,
    ai_generations_per_day: 2000,
    cross_posts_per_month: -1,
    video_rendering: true,
    storage_mb: 50000,
  },
};

export interface UsageSnapshot {
  dailyAiGenerations: number;
  monthlyPostsCreated: number;
  monthlyCrossPosts: number;
  storageUsedMb: number;
}

export interface QuotaCheckResult {
  allowed: boolean;
  remaining: number; // -1 if unlimited
  unlimited: boolean;
  limit: number;
  resetPeriod: "daily_utc" | "monthly_utc" | "capability" | "storage";
  quotaConsumed?: boolean;
  reason?: string;
}

export function resolveEffectiveTier(
  tier: SubscriptionTier,
  roles?: readonly string[]
): SubscriptionTier {
  if (roles?.includes("superuser")) {
    return "AGENCY";
  }
  return tier;
}

export function checkUserQuota(
  tier: SubscriptionTier,
  usage: UsageSnapshot,
  action: QuotaAction,
  options?: {
    isCacheHit?: boolean;
    additionalStorageMb?: number;
    roles?: readonly string[];
  }
): QuotaCheckResult {
  if (options?.roles?.includes("superuser")) {
    return {
      allowed: true,
      remaining: -1,
      unlimited: true,
      limit: -1,
      resetPeriod:
        action === "ai_generation"
          ? "daily_utc"
          : action === "video_render"
            ? "capability"
            : action === "storage_upload"
              ? "storage"
              : "monthly_utc",
      quotaConsumed: false,
    };
  }

  const effectiveTier = resolveEffectiveTier(tier, options?.roles);
  const limits = TIER_LIMITS[effectiveTier];

  if (action === "ai_generation") {
    const limit = limits.ai_generations_per_day;
    if (options?.isCacheHit) {
      return {
        allowed: true,
        remaining: Math.max(0, limit - usage.dailyAiGenerations),
        unlimited: false,
        limit,
        resetPeriod: "daily_utc",
        quotaConsumed: false,
      };
    }
    const allowed = usage.dailyAiGenerations < limit;
    return {
      allowed,
      remaining: Math.max(0, limit - usage.dailyAiGenerations),
      unlimited: false,
      limit,
      resetPeriod: "daily_utc",
      quotaConsumed: allowed,
      reason: allowed ? undefined : "Daily AI generation quota reached (resets at 00:00 UTC).",
    };
  }

  if (action === "create_post") {
    const limit = limits.posts_per_month;
    if (limit === -1) {
      return {
        allowed: true,
        remaining: -1,
        unlimited: true,
        limit: -1,
        resetPeriod: "monthly_utc",
      };
    }
    const allowed = usage.monthlyPostsCreated < limit;
    return {
      allowed,
      remaining: Math.max(0, limit - usage.monthlyPostsCreated),
      unlimited: false,
      limit,
      resetPeriod: "monthly_utc",
      reason: allowed ? undefined : "Monthly posts quota reached (resets on the 1st at 00:00 UTC).",
    };
  }

  if (action === "cross_post") {
    const limit = limits.cross_posts_per_month;
    if (limit === -1) {
      return {
        allowed: true,
        remaining: -1,
        unlimited: true,
        limit: -1,
        resetPeriod: "monthly_utc",
      };
    }
    const allowed = usage.monthlyCrossPosts < limit;
    return {
      allowed,
      remaining: Math.max(0, limit - usage.monthlyCrossPosts),
      unlimited: false,
      limit,
      resetPeriod: "monthly_utc",
      reason: allowed
        ? undefined
        : "Monthly cross-post quota reached (resets on the 1st at 00:00 UTC).",
    };
  }

  if (action === "video_render") {
    const allowed = limits.video_rendering;
    return {
      allowed,
      remaining: allowed ? 1 : 0,
      unlimited: allowed,
      limit: allowed ? 1 : 0,
      resetPeriod: "capability",
      reason: allowed ? undefined : "Video rendering requires Creator, Pro, or Agency plan.",
    };
  }

  const limit = limits.storage_mb;
  const requested = options?.additionalStorageMb ?? 0;
  const allowed = usage.storageUsedMb + requested <= limit;
  return {
    allowed,
    remaining: Math.max(0, limit - usage.storageUsedMb),
    unlimited: false,
    limit,
    resetPeriod: "storage",
    reason: allowed ? undefined : "Storage quota exceeded for your current plan.",
  };
}

export interface UtcResetWindows {
  dateKeyUtc: string;
  monthKeyUtc: string;
  dailyResetIso: string;
  monthlyResetIso: string;
}

export function getUtcResetWindows(now: Date = new Date()): UtcResetWindows {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const day = now.getUTCDate();

  const nextDayUtc = new Date(Date.UTC(year, month, day + 1, 0, 0, 0, 0));
  const nextMonthUtc = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0));

  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");

  return {
    dateKeyUtc: `${year}-${mm}-${dd}`,
    monthKeyUtc: `${year}-${mm}`,
    dailyResetIso: nextDayUtc.toISOString(),
    monthlyResetIso: nextMonthUtc.toISOString(),
  };
}

export const PLATFORM_BUDGET_LIMITS = {
  CF_AI_DAILY_LIMIT: 8000,
  CF_AI_ALERT_THRESHOLD: 6400,
  R2_READS_MONTHLY_LIMIT: 800000,
  R2_WRITES_MONTHLY_LIMIT: 800000,
  R2_ALERT_THRESHOLD: 640000,
  SUPABASE_MAU_LIMIT: 40000,
  SUPABASE_BANDWIDTH_GB: 1.6,
  SUPABASE_ALERT_THRESHOLD: 32000,
  VERCEL_BANDWIDTH_GB: 80,
  VERCEL_INVOCATIONS_DAILY: 80,
  VERCEL_ALERT_THRESHOLD: 64,
  YOUTUBE_API_DAILY_LIMIT: 8000,
  YOUTUBE_ALERT_THRESHOLD: 6400,
  TIKTOK_API_DAILY_LIMIT: 800,
  TIKTOK_ALERT_THRESHOLD: 640,
  HUGGINGFACE_DAILY_LIMIT: 2000,
  HUGGINGFACE_ALERT_THRESHOLD: 1600,
} as const;

export type PlatformMetricKey =
  | "CF_AI"
  | "R2_READS"
  | "R2_WRITES"
  | "SUPABASE_MAU"
  | "VERCEL_INVOCATIONS"
  | "YOUTUBE_API"
  | "TIKTOK_API"
  | "HUGGINGFACE_API";

const METRIC_CAP_MAP: Record<PlatformMetricKey, number> = {
  CF_AI: PLATFORM_BUDGET_LIMITS.CF_AI_DAILY_LIMIT,
  R2_READS: PLATFORM_BUDGET_LIMITS.R2_READS_MONTHLY_LIMIT,
  R2_WRITES: PLATFORM_BUDGET_LIMITS.R2_WRITES_MONTHLY_LIMIT,
  SUPABASE_MAU: PLATFORM_BUDGET_LIMITS.SUPABASE_MAU_LIMIT,
  VERCEL_INVOCATIONS: PLATFORM_BUDGET_LIMITS.VERCEL_INVOCATIONS_DAILY,
  YOUTUBE_API: PLATFORM_BUDGET_LIMITS.YOUTUBE_API_DAILY_LIMIT,
  TIKTOK_API: PLATFORM_BUDGET_LIMITS.TIKTOK_API_DAILY_LIMIT,
  HUGGINGFACE_API: PLATFORM_BUDGET_LIMITS.HUGGINGFACE_DAILY_LIMIT,
};

export interface PlatformBudgetEvaluation {
  metric: PlatformMetricKey;
  used: number;
  limit: number;
  ratio: number;
  status: "healthy" | "warning_80" | "emergency_95" | "exhausted";
  alertSuperuser: boolean;
  emergencyMode: boolean;
  allowCentralProvider: boolean;
}

export function evaluatePlatformBudget(
  metric: PlatformMetricKey,
  used: number,
  userTier: SubscriptionTier
): PlatformBudgetEvaluation {
  const limit = METRIC_CAP_MAP[metric];
  const ratio = limit > 0 ? used / limit : 1;
  const alertSuperuser = ratio >= 0.8;
  const emergencyMode = ratio >= 0.95;
  const exhausted = ratio >= 1;

  const status: PlatformBudgetEvaluation["status"] = exhausted
    ? "exhausted"
    : emergencyMode
      ? "emergency_95"
      : alertSuperuser
        ? "warning_80"
        : "healthy";

  // Emergency mode (>= 95%) restricts FREE-tier provider usage server-side
  const allowCentralProvider = !exhausted && !(emergencyMode && userTier === "FREE");

  return {
    metric,
    used,
    limit,
    ratio,
    status,
    alertSuperuser,
    emergencyMode,
    allowCentralProvider,
  };
}

export function getScopedCacheKey(
  userId: string,
  prompt: string,
  modality: string,
  format: string = "default",
  tone: string = "default"
): string {
  const normalized = JSON.stringify({
    scope: "user",
    userId: userId.trim(),
    prompt: prompt.trim(),
    modality: modality.trim().toLowerCase(),
    format: format.trim().toLowerCase(),
    tone: tone.trim().toLowerCase(),
  });
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

export interface AiProviderSelectionInput {
  tier: SubscriptionTier;
  hasValidByok: boolean;
  byokProvider?: "openai" | "replicate";
  cfAiHealthy: boolean;
  cfAiUsedToday: number;
  hfHealthy: boolean;
  hfUsedToday: number;
}

export interface AiProviderSelectionResult {
  plan: "A" | "B" | "C" | "D";
  provider:
    | "byok_openai"
    | "byok_replicate"
    | "cloudflare_workers_ai"
    | "huggingface_inference"
    | "client_transformers_js";
  fallbackRequired: boolean;
  reason: string;
}

export function selectAiProvider(input: AiProviderSelectionInput): AiProviderSelectionResult {
  if (input.hasValidByok) {
    const provider = input.byokProvider === "replicate" ? "byok_replicate" : "byok_openai";
    return {
      plan: "A",
      provider,
      fallbackRequired: false,
      reason: "Using user-supplied BYOK provider key.",
    };
  }

  const cfEval = evaluatePlatformBudget("CF_AI", input.cfAiUsedToday, input.tier);
  if (input.cfAiHealthy && cfEval.allowCentralProvider) {
    return {
      plan: "B",
      provider: "cloudflare_workers_ai",
      fallbackRequired: false,
      reason: "Using primary Cloudflare Workers AI provider.",
    };
  }

  const hfEval = evaluatePlatformBudget("HUGGINGFACE_API", input.hfUsedToday, input.tier);
  if (input.hfHealthy && hfEval.allowCentralProvider) {
    return {
      plan: "C",
      provider: "huggingface_inference",
      fallbackRequired: false,
      reason: "Using Hugging Face Inference fallback provider.",
    };
  }

  return {
    plan: "D",
    provider: "client_transformers_js",
    fallbackRequired: true,
    reason:
      "All central AI providers are unavailable or restricted by emergency budget guardrails; explicit client-side transformers.js fallback required.",
  };
}

export interface EncryptedKeyEnvelope {
  version: "v1";
  iv: string;
  authTag: string;
  ciphertext: string;
  maskedPreview: string;
}

export function maskApiKey(rawKey: string): string {
  const trimmed = rawKey.trim();
  if (trimmed.length <= 8) {
    return "••••••••";
  }
  const prefix = trimmed.slice(0, 4);
  const suffix = trimmed.slice(-3);
  return `${prefix}•••••••••••••${suffix}`;
}

function deriveKeyBuffer(secretHexOrString: string): Buffer {
  if (/^[0-9a-fA-F]{64}$/.test(secretHexOrString)) {
    return Buffer.from(secretHexOrString, "hex");
  }
  return crypto.createHash("sha256").update(secretHexOrString).digest();
}

export function encryptApiKey(rawKey: string, masterSecret: string): EncryptedKeyEnvelope {
  const key = deriveKeyBuffer(masterSecret);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(rawKey, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    version: "v1",
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    ciphertext: encrypted.toString("base64"),
    maskedPreview: maskApiKey(rawKey),
  };
}

export function decryptApiKey(envelope: EncryptedKeyEnvelope, masterSecret: string): string {
  const key = deriveKeyBuffer(masterSecret);
  const iv = Buffer.from(envelope.iv, "base64");
  const authTag = Buffer.from(envelope.authTag, "base64");
  const ciphertext = Buffer.from(envelope.ciphertext, "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
}

export interface TierPriceSpec {
  displayUsd: string;
  USD: { amountSubunits: number; currency: "USD" };
  NGN: { amountSubunits: number; currency: "NGN" };
}

export const PRICING_TABLE: Record<SubscriptionTier, TierPriceSpec> = {
  FREE: {
    displayUsd: "$0",
    USD: { amountSubunits: 0, currency: "USD" },
    NGN: { amountSubunits: 0, currency: "NGN" },
  },
  CREATOR: {
    displayUsd: "$9",
    USD: { amountSubunits: 900, currency: "USD" },
    NGN: { amountSubunits: 1450000, currency: "NGN" }, // 14,500 NGN in kobo
  },
  PRO: {
    displayUsd: "$29",
    USD: { amountSubunits: 2900, currency: "USD" },
    NGN: { amountSubunits: 4650000, currency: "NGN" }, // 46,500 NGN in kobo
  },
  AGENCY: {
    displayUsd: "$99",
    USD: { amountSubunits: 9900, currency: "USD" },
    NGN: { amountSubunits: 15800000, currency: "NGN" }, // 158,000 NGN in kobo
  },
};

export function verifyPaystackSignature(
  rawBody: string,
  signatureHeader: string,
  secretKey: string
): boolean {
  if (!rawBody || !signatureHeader || !secretKey) return false;
  const computed = crypto.createHmac("sha512", secretKey).update(rawBody).digest("hex");
  const sigBuf = Buffer.from(signatureHeader);
  const compBuf = Buffer.from(computed);
  if (sigBuf.length !== compBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, compBuf);
}

export interface PaystackWebhookPayload {
  event: string;
  data: {
    id?: number | string;
    reference: string;
    status: string;
    amount: number;
    currency: "NGN" | "USD" | string;
    metadata?: {
      userId?: string;
      targetTier?: SubscriptionTier;
    };
  };
}

export interface PaystackEventValidationResult {
  valid: boolean;
  idempotentDuplicate: boolean;
  targetTier?: SubscriptionTier;
  userId?: string;
  reference?: string;
  reason?: string;
}

export function validatePaystackChargeEvent(
  payload: PaystackWebhookPayload,
  processedReferences: Set<string>
): PaystackEventValidationResult {
  if (payload.event !== "charge.success" || payload.data?.status !== "success") {
    return { valid: false, idempotentDuplicate: false, reason: "Unsupported or non-success event." };
  }

  const reference = payload.data.reference;
  const targetTier = payload.data.metadata?.targetTier;
  const userId = payload.data.metadata?.userId;

  if (!reference || !targetTier || !userId || !(targetTier in PRICING_TABLE)) {
    return {
      valid: false,
      idempotentDuplicate: false,
      reason: "Missing reference, userId, or valid targetTier in webhook metadata.",
    };
  }

  if (processedReferences.has(reference)) {
    return {
      valid: true,
      idempotentDuplicate: true,
      targetTier,
      userId,
      reference,
    };
  }

  const tierPrice = PRICING_TABLE[targetTier];
  const currency = payload.data.currency;
  const expectedAmount =
    currency === "NGN"
      ? tierPrice.NGN.amountSubunits
      : currency === "USD"
        ? tierPrice.USD.amountSubunits
        : null;

  if (expectedAmount === null || payload.data.amount !== expectedAmount) {
    return {
      valid: false,
      idempotentDuplicate: false,
      reason: `Webhook amount (${payload.data.amount} ${currency}) does not match server price table (${expectedAmount}).`,
    };
  }

  processedReferences.add(reference);
  return {
    valid: true,
    idempotentDuplicate: false,
    targetTier,
    userId,
    reference,
  };
}

export type JobLifecycleStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export function canCancelJob(status: JobLifecycleStatus): boolean {
  return status === "pending";
}

export function computeRetryBackoffMs(attempt: number, jitterRatio: number = 0.1): number {
  const baseMs = 15_000; // 15s base
  const maxMs = 3_600_000; // 1 hour cap
  const exponential = Math.min(maxMs, baseMs * Math.pow(2, Math.max(0, attempt - 1)));
  const clampedJitter = Math.max(0, Math.min(0.5, jitterRatio));
  return Math.min(maxMs, Math.round(exponential * (1 + clampedJitter)));
}

export interface PlatformAttemptState {
  status: "completed" | "failed" | "pending";
  externalPostId?: string;
  error?: string;
  retryable?: boolean;
}

export interface MultiPlatformOutcome {
  overallStatus: "completed" | "pending_retry" | "failed";
  completedPlatforms: string[];
  platformsToRetry: string[];
  permanentFailedPlatforms: string[];
}

export function resolveMultiPlatformJobOutcome(
  platformResults: Record<string, PlatformAttemptState>
): MultiPlatformOutcome {
  const completedPlatforms: string[] = [];
  const platformsToRetry: string[] = [];
  const permanentFailedPlatforms: string[] = [];

  for (const [platform, state] of Object.entries(platformResults)) {
    if (state.status === "completed") {
      completedPlatforms.push(platform);
    } else if (state.status === "failed" && state.retryable) {
      platformsToRetry.push(platform);
    } else if (state.status === "failed") {
      permanentFailedPlatforms.push(platform);
    }
  }

  const overallStatus: MultiPlatformOutcome["overallStatus"] =
    platformsToRetry.length > 0
      ? "pending_retry"
      : permanentFailedPlatforms.length > 0
        ? "failed"
        : "completed";

  return {
    overallStatus,
    completedPlatforms,
    platformsToRetry,
    permanentFailedPlatforms,
  };
}

export type ServerRole = "creator" | "moderator" | "superuser";

export function authorizeResourceAccess(params: {
  actorUserId: string;
  actorRoles: ServerRole[];
  ownerUserId: string;
}): boolean {
  if (!params.actorUserId) return false;
  if (params.actorUserId === params.ownerUserId) return true;
  return (
    params.actorRoles.includes("superuser") || params.actorRoles.includes("moderator")
  );
}

export function authorizeAdminAction(
  actorRoles: ServerRole[],
  action: "tier_mutation" | "quota_overview" | "user_list" | "moderation_review"
): boolean {
  if (actorRoles.includes("superuser")) return true;
  if (action === "moderation_review" && actorRoles.includes("moderator")) return true;
  return false;
}
