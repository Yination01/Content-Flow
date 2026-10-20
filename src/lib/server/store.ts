import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  encryptApiKey,
  resolveEffectiveTier,
  type EncryptedKeyEnvelope,
  type JobLifecycleStatus,
  type ServerRole,
  type SubscriptionTier,
  type UsageSnapshot,
} from "@/lib/policy";
import {
  formatCreatorDisplayName,
  hashPassword,
  isSuperuserEmail,
  parseSessionCookieFromRequest,
} from "./auth";

export interface ContentRecord {
  id: string;
  userId: string;
  title: string;
  contentType: "text" | "image" | "video";
  originalText: string;
  generatedScript: string;
  mediaUrl?: string;
  metadata: {
    youtubeTitle?: string;
    youtubeDescription?: string;
    youtubeTags?: string;
    tiktokCaption?: string;
    tiktokHashtags?: string;
    [key: string]: unknown;
  };
  status: "draft" | "ready" | "posted" | "failed";
  createdAt: string;
  updatedAt: string;
}

export interface JobRecord {
  id: string;
  userId: string;
  jobType:
    | "cross_post"
    | "video_render"
    | "scheduled_publish"
    | "content_repurpose";
  contentId: string | null;
  contentTitle: string;
  platform: "YouTube" | "TikTok";
  payload: Record<string, unknown>;
  status: JobLifecycleStatus;
  priority: number;
  attempts: number;
  maxAttempts: number;
  errorMessage?: string;
  scheduledAt: string | null;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface CachedAiResponse {
  promptHash: string;
  userId: string;
  responseText: string;
  adaptations: {
    title: string;
    youtubeTitle: string;
    youtubeDescription: string;
    youtubeTags: string;
    tiktokCaption: string;
    tiktokHashtags: string;
  };
  provider: string;
  tokensUsed: number;
  hitCount: number;
  createdAt: string;
  expiresAt: number;
}

export interface OAuthStatePending {
  state: string;
  userId: string;
  platform: "youtube" | "tiktok";
  codeVerifier: string;
  expiresAt: number;
}

export interface UserAccountRecord {
  id: string;
  name: string;
  email: string;
  niche: string;
  passwordHash: string;
  tier: SubscriptionTier;
  roles: ServerRole[];
  status: "Active" | "Review" | "Suspended";
  joinedAt: string;
  usage: UsageSnapshot;
  encryptedByok: Record<string, EncryptedKeyEnvelope>;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string;
  twoFactorBackupCodes?: string[];
  trialTier?: SubscriptionTier;
  trialStartedAt?: string;
  trialEndsAt?: string;
  trialUsed?: boolean;
  tierExpiresAt?: string;
  testTierOverride?: {
    tier: SubscriptionTier;
    expiresAt: string;
  };
  suspendedUntil?: string | null;
  suspendReason?: string;
  isTester?: boolean;
  testerGrantedBy?: string;
  testerGrantedAt?: string;
  isBeta?: boolean;
  betaRemovedAt?: string;
  betaRemovedBy?: string;
  hiddenFromUserList?: boolean;
  username?: string;
  lastSeenAt?: string;
  paidCount?: number;
  connectedPlatforms: Record<
    string,
    {
      connected: boolean;
      handle: string;
      channelTitle?: string;
      scopes?: string[];
      verifiedAt?: string;
      expiresAt: string;
      encryptedTokenRef: string;
    }
  >;
}

export interface PromoCodeRecord {
  code: string;
  tier: SubscriptionTier;
  rewardDays: number;
  permanent: boolean;
  maxUses: number | null;
  currentUses: number;
  status: "active" | "revoked" | "expired" | "permanent";
  expiresAt: string | null;
  createdAt: string;
  createdBy: string;
  redeemedBy: string[];
}

export interface NoticeRecord {
  id: string;
  audience: "all" | "beta" | "testers";
  title: string;
  body: string;
  createdAt: string;
  createdBy: string;
}

export interface AdminNoteRecord {
  id: string;
  title: string;
  build?: number;
  body: string;
  createdAt: string;
}

export interface AppConfigRecord {
  maintenance: boolean;
  paymentsLive: boolean;
  minBuild: number;
  latestBuild: number;
  downloadUrl: string;
  appLinksSha256: string;
}

export interface WaitlistRecord {
  id: string;
  position: number;
  email: string;
  code: string;
  referrer?: string;
  confirmed: boolean;
  createdAt: string;
}

export interface CrashReportRecord {
  id: string;
  message: string;
  version: string;
  build: number;
  platform: string;
  createdAt: string;
}

export interface PendingCheckoutRecord {
  id: string;
  userId: string;
  email: string;
  tier: SubscriptionTier;
  amountLabel: string;
  reference: string;
  createdAt: string;
}

export interface ModerationItemRecord {
  id: string;
  title: string;
  ownerName: string;
  ownerId: string;
  typeLabel: string;
  excerpt: string;
  status: "pending" | "approved" | "rejected";
  reason?: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actionType: string;
  targetUserId?: string;
  targetContentId?: string;
  reason: string;
  createdAt: string;
}

export interface PlatformUsageSnapshot {
  date?: string;
  month?: string;
  cloudflareAiNeurons: number;
  huggingfaceCalls: number;
  r2Reads: number;
  r2Writes: number;
  youtubeUnits: number;
  tiktokCalls: number;
  vercelInvocations: number;
  supabaseMau: number;
  bandwidthGb: number;
}

export interface ApiStore {
  users: Map<string, UserAccountRecord>;
  contents: Map<string, ContentRecord>;
  jobs: Map<string, JobRecord>;
  aiCache: Map<string, CachedAiResponse>;
  oauthStates: Map<string, OAuthStatePending>;
  processedWebhooks: Set<string>;
  moderationItems: Map<string, ModerationItemRecord>;
  auditLogs: AuditLogEntry[];
  platformUsage: PlatformUsageSnapshot;
  promoCodes: Map<string, PromoCodeRecord>;
  notices: NoticeRecord[];
  adminNotes: AdminNoteRecord[];
  appConfig: AppConfigRecord;
  betaConfig: { enrolmentOpen: boolean };
  waitlist: WaitlistRecord[];
  crashReports: CrashReportRecord[];
  pendingCheckouts: PendingCheckoutRecord[];
  revokedSessions: Set<string>;
}

const DB_FILE_PATH = path.join(process.cwd(), ".data", "contentflow-db.json");
export const DEFAULT_PASSWORD_HASH = hashPassword("ContentFlow#2026");

function createDefaultAdminNotes(): AdminNoteRecord[] {
  return [
    {
      id: "note-1",
      title: "Admin Workshop 6-Tab Architecture",
      build: 16,
      body: "All timestamps use UTC. Promo codes, 30-day free trials, tester minting, and remote maintenance switches are live.",
      createdAt: "2026-10-20T00:00:00.000Z",
    },
    {
      id: "note-2",
      title: "Zero-Budget Guardrails Active",
      build: 15,
      body: "Cloudflare Workers AI daily neurons cap at 8,000 (80% soft alert) and 9,500 (95% emergency fallback).",
      createdAt: "2026-10-19T12:00:00.000Z",
    },
  ];
}

function createDefaultAppConfig(): AppConfigRecord {
  return {
    maintenance: false,
    paymentsLive: true,
    minBuild: 0,
    latestBuild: 16,
    downloadUrl: "https://github.com/Yination01/Content-Flow/actions",
    appLinksSha256:
      "FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C",
  };
}

export function getEnvelopeMasterSecret(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SESSION_SECRET ||
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
  );
}

function isTestRuntime(): boolean {
  return Boolean(process.env.VITEST || process.env.NODE_ENV === "test");
}

function createDefaultStore(): ApiStore {
  if (!isTestRuntime()) {
    return {
      users: new Map<string, UserAccountRecord>(),
      contents: new Map(),
      jobs: new Map(),
      aiCache: new Map(),
      oauthStates: new Map(),
      processedWebhooks: new Set(),
      moderationItems: new Map(),
      auditLogs: [],
      platformUsage: {
        date: new Date().toISOString().slice(0, 10),
        month: new Date().toISOString().slice(0, 7),
        cloudflareAiNeurons: 0,
        huggingfaceCalls: 0,
        r2Reads: 0,
        r2Writes: 0,
        youtubeUnits: 0,
        tiktokCalls: 0,
        vercelInvocations: 0,
        supabaseMau: 0,
        bandwidthGb: 0,
      },
      promoCodes: new Map(),
      notices: [],
      adminNotes: createDefaultAdminNotes(),
      appConfig: createDefaultAppConfig(),
      betaConfig: { enrolmentOpen: false },
      waitlist: [],
      crashReports: [],
      pendingCheckouts: [],
      revokedSessions: new Set(),
    };
  }

  const defaultOpenAiEnvelope = encryptApiKey(
    "sk-proj-ContentFlowSavedKey9K2",
    getEnvelopeMasterSecret()
  );

  const users = new Map<string, UserAccountRecord>([
    [
      "user-1",
      {
        id: "user-1",
        name: "Maya Chen",
        email: "maya@contentflow.app",
        niche: "Creative education & mindful productivity",
        passwordHash: DEFAULT_PASSWORD_HASH,
        tier: "CREATOR",
        roles: ["creator", "superuser"],
        status: "Active",
        joinedAt: "2026-06-21T00:00:00.000Z",
        usage: {
          dailyAiGenerations: 3,
          monthlyPostsCreated: 18,
          monthlyCrossPosts: 12,
          storageUsedMb: 120,
        },
        encryptedByok: {
          openai: defaultOpenAiEnvelope,
        },
        connectedPlatforms: {
          youtube: {
            connected: true,
            handle: "@MayaCreates",
            expiresAt: "2026-11-14T00:00:00.000Z",
            encryptedTokenRef: "enc_yt_ref_1",
          },
        },
      },
    ],
    [
      "user-2",
      {
        id: "user-2",
        name: "Jon Bell",
        email: "jon@contentflow.app",
        niche: "Tech reviews & creator gear",
        passwordHash: DEFAULT_PASSWORD_HASH,
        tier: "PRO",
        roles: ["creator"],
        status: "Active",
        joinedAt: "2026-06-20T00:00:00.000Z",
        usage: {
          dailyAiGenerations: 12,
          monthlyPostsCreated: 45,
          monthlyCrossPosts: 30,
          storageUsedMb: 640,
        },
        encryptedByok: {},
        connectedPlatforms: {},
      },
    ],
    [
      "user-3",
      {
        id: "user-3",
        name: "Avery Studio",
        email: "hello@avery.co",
        niche: "Multi-channel video essays",
        passwordHash: DEFAULT_PASSWORD_HASH,
        tier: "AGENCY",
        roles: ["creator"],
        status: "Review",
        joinedAt: "2026-06-18T00:00:00.000Z",
        usage: {
          dailyAiGenerations: 85,
          monthlyPostsCreated: 140,
          monthlyCrossPosts: 210,
          storageUsedMb: 4200,
        },
        encryptedByok: {},
        connectedPlatforms: {},
      },
    ],
    [
      "user-free-1",
      {
        id: "user-free-1",
        name: "Priya Shah",
        email: "priya@contentflow.app",
        niche: "Wellness & daily habits",
        passwordHash: DEFAULT_PASSWORD_HASH,
        tier: "FREE",
        roles: ["creator"],
        status: "Active",
        joinedAt: "2026-06-16T00:00:00.000Z",
        usage: {
          dailyAiGenerations: 2,
          monthlyPostsCreated: 2,
          monthlyCrossPosts: 1,
          storageUsedMb: 15,
        },
        encryptedByok: {},
        connectedPlatforms: {},
      },
    ],
  ]);

  const contents = new Map<string, ContentRecord>([
    [
      "1",
      {
        id: "1",
        userId: "user-1",
        title: "A creator's guide to consistent content",
        contentType: "text",
        originalText: "Write a calm guide to creative consistency.",
        generatedScript:
          "Consistency is not about showing up every day; it is about building a creative rhythm you can return to.\n\nStart by choosing one idea worth repeating. Then shape it for the way your audience listens on each platform.",
        metadata: {
          youtubeTitle: "How to Create Consistently Without Burning Out",
          youtubeDescription:
            "Build a creative rhythm you can actually sustain. In this video, we explore a calmer approach to consistency.",
          youtubeTags: "creator tips, consistency, creative process",
          tiktokCaption:
            "Consistency is a rhythm, not a streak. Here's how to find yours.",
          tiktokHashtags: "#creatortips #creativeprocess #consistency",
        },
        status: "draft",
        createdAt: "2026-10-17T08:00:00.000Z",
        updatedAt: "2026-10-17T10:00:00.000Z",
      },
    ],
    [
      "2",
      {
        id: "2",
        userId: "user-1",
        title: "3 ways to protect your creative energy",
        contentType: "text",
        originalText: "Three habits to protect focus before noon.",
        generatedScript:
          "Creative energy is finite each morning. Guard the first ninety minutes before opening social feeds, batch your research separately from scripting, and leave a clear starting note for tomorrow.",
        metadata: {
          youtubeTitle: "3 Ways to Protect Your Creative Energy Every Morning",
          youtubeDescription:
            "Practical focus habits for creators balancing production and distribution.",
          youtubeTags: "productivity, deep work, creator energy",
          tiktokCaption:
            "Protect the first 90 minutes of your day before checking feeds.",
          tiktokHashtags: "#deepwork #creatorlife #focus",
        },
        status: "ready",
        createdAt: "2026-10-16T09:00:00.000Z",
        updatedAt: "2026-10-16T15:00:00.000Z",
      },
    ],
  ]);

  const jobs = new Map<string, JobRecord>([
    [
      "1049",
      {
        id: "1049",
        userId: "user-1",
        jobType: "scheduled_publish",
        contentId: "1",
        contentTitle: "A creator's guide to consistent content",
        platform: "YouTube",
        payload: { scheduleLabel: "Tomorrow, 9:00 AM UTC" },
        status: "pending",
        priority: 1,
        attempts: 0,
        maxAttempts: 3,
        scheduledAt: "2026-10-18T09:00:00.000Z",
        createdAt: "2026-10-17T09:00:00.000Z",
      },
    ],
    [
      "1048",
      {
        id: "1048",
        userId: "user-1",
        jobType: "cross_post",
        contentId: "2",
        contentTitle: "3 habits that improved my focus",
        platform: "TikTok",
        payload: { scheduleLabel: "Today, 4:30 PM UTC" },
        status: "completed",
        priority: 1,
        attempts: 1,
        maxAttempts: 3,
        scheduledAt: null,
        completedAt: "2026-10-17T16:30:00.000Z",
        createdAt: "2026-10-17T14:14:00.000Z",
      },
    ],
    [
      "1047",
      {
        id: "1047",
        userId: "user-1",
        jobType: "cross_post",
        contentId: "1",
        contentTitle: "Build a calmer morning routine",
        platform: "YouTube",
        payload: { scheduleLabel: "Jun 18, 10:00 AM UTC" },
        status: "failed",
        priority: 1,
        attempts: 2,
        maxAttempts: 3,
        errorMessage: "OAuth token refresh required before retry.",
        scheduledAt: null,
        createdAt: "2026-06-18T10:00:00.000Z",
      },
    ],
  ]);

  const moderationItems = new Map<string, ModerationItemRecord>([
    [
      "mod-101",
      {
        id: "mod-101",
        title: "A controversial take on creator burnout",
        ownerName: "Jon Bell",
        ownerId: "user-2",
        typeLabel: "Text · 684 words",
        excerpt:
          "The advice that helped me grow eventually became the same advice I needed to question...",
        status: "pending",
        updatedAt: "2026-10-17T10:00:00.000Z",
      },
    ],
    [
      "mod-102",
      {
        id: "mod-102",
        title: "Stop chasing the algorithm",
        ownerName: "Avery Studio",
        ownerId: "user-3",
        typeLabel: "Video script · 2m 14s",
        excerpt:
          "Audience retention starts with human pacing, not artificial cuts every two seconds...",
        status: "pending",
        updatedAt: "2026-10-17T10:15:00.000Z",
      },
    ],
    [
      "mod-103",
      {
        id: "mod-103",
        title: "The productivity advice I regret",
        ownerName: "Priya Shah",
        ownerId: "user-free-1",
        typeLabel: "Text · 910 words",
        excerpt:
          "Waking up at 4 AM did not make me a better writer; protecting rest did...",
        status: "pending",
        updatedAt: "2026-10-17T10:30:00.000Z",
      },
    ],
  ]);

  return {
    users,
    contents,
    jobs,
    aiCache: new Map(),
    oauthStates: new Map(),
    processedWebhooks: new Set(),
    moderationItems,
    auditLogs: [],
    platformUsage: {
      date: new Date().toISOString().slice(0, 10),
      month: new Date().toISOString().slice(0, 7),
      cloudflareAiNeurons: 1200,
      huggingfaceCalls: 240,
      r2Reads: 12000,
      r2Writes: 3400,
      youtubeUnits: 800,
      tiktokCalls: 120,
      vercelInvocations: 15,
      supabaseMau: 140,
      bandwidthGb: 0.12,
    },
    promoCodes: new Map(),
    notices: [],
    adminNotes: createDefaultAdminNotes(),
    appConfig: createDefaultAppConfig(),
    betaConfig: { enrolmentOpen: false },
    waitlist: [],
    crashReports: [],
    pendingCheckouts: [],
    revokedSessions: new Set(),
  };
}

function loadStoreFromDisk(): ApiStore {
  if (isTestRuntime()) {
    return createDefaultStore();
  }
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const raw = JSON.parse(fs.readFileSync(DB_FILE_PATH, "utf8"));
      const defaults = createDefaultStore();
      const legacyIds = new Set(["user-1", "user-2", "user-3", "user-free-1"]);
      const legacyModIds = new Set(["mod-101", "mod-102", "mod-103"]);
      const legacyJobIds = new Set(["1049", "1048", "1047"]);
      const usersEntries = Array.isArray(raw.users)
        ? (raw.users as [string, UserAccountRecord][]).filter(
            ([id]) => !legacyIds.has(id)
          )
        : [];
      const userMap =
        usersEntries.length > 0 ? new Map(usersEntries) : defaults.users;

      return {
        users: userMap,
        contents: new Map(
          Array.isArray(raw.contents)
            ? (raw.contents as [string, ContentRecord][]).filter(
                ([, c]) => !legacyIds.has(c.userId)
              )
            : []
        ),
        jobs: new Map(
          Array.isArray(raw.jobs)
            ? (raw.jobs as [string, JobRecord][]).filter(
                ([id, j]) => !legacyJobIds.has(id) && !legacyIds.has(j.userId)
              )
            : []
        ),
        aiCache: new Map(raw.aiCache || []),
        oauthStates: new Map(raw.oauthStates || []),
        processedWebhooks: new Set(raw.processedWebhooks || []),
        moderationItems: new Map(
          Array.isArray(raw.moderationItems)
            ? (raw.moderationItems as [string, ModerationItemRecord][]).filter(
                ([id]) => !legacyModIds.has(id)
              )
            : []
        ),
        auditLogs: Array.isArray(raw.auditLogs) ? raw.auditLogs : [],
        platformUsage: raw.platformUsage || defaults.platformUsage,
        promoCodes: new Map(raw.promoCodes || []),
        notices: Array.isArray(raw.notices) ? raw.notices : [],
        adminNotes: Array.isArray(raw.adminNotes)
          ? raw.adminNotes
          : defaults.adminNotes,
        appConfig: raw.appConfig || defaults.appConfig,
        betaConfig: raw.betaConfig || defaults.betaConfig,
        waitlist: Array.isArray(raw.waitlist) ? raw.waitlist : [],
        crashReports: Array.isArray(raw.crashReports) ? raw.crashReports : [],
        pendingCheckouts: Array.isArray(raw.pendingCheckouts)
          ? raw.pendingCheckouts
          : [],
        revokedSessions: new Set(raw.revokedSessions || []),
      };
    }
  } catch {
    // Fall back to default store if file is unreadable
  }
  return createDefaultStore();
}

let store: ApiStore = loadStoreFromDisk();

export function persistApiStore(): void {
  if (process.env.VITEST) return;
  try {
    const dir = path.dirname(DB_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const serialized = JSON.stringify(
      {
        users: Array.from(store.users.entries()),
        contents: Array.from(store.contents.entries()),
        jobs: Array.from(store.jobs.entries()),
        aiCache: Array.from(store.aiCache.entries()),
        oauthStates: Array.from(store.oauthStates.entries()),
        processedWebhooks: Array.from(store.processedWebhooks.values()),
        moderationItems: Array.from(store.moderationItems.entries()),
        auditLogs: store.auditLogs,
        platformUsage: store.platformUsage,
        promoCodes: Array.from(store.promoCodes.entries()),
        notices: store.notices,
        adminNotes: store.adminNotes,
        appConfig: store.appConfig,
        betaConfig: store.betaConfig,
        waitlist: store.waitlist,
        crashReports: store.crashReports,
        pendingCheckouts: store.pendingCheckouts,
        revokedSessions: Array.from(store.revokedSessions.values()),
      },
      null,
      2
    );
    fs.writeFileSync(DB_FILE_PATH, serialized, "utf8");
  } catch {
    // Non-fatal in read-only environments
  }
}

export function extractRawSessionTokenFromRequest(
  request: Request
): string | null {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(/(?:^|;\s*)cf_session=([^;]+)/);
  if (match && match[1]) {
    try {
      return decodeURIComponent(match[1].trim());
    } catch {
      return match[1].trim();
    }
  }
  return null;
}

export function revokeSessionFromRequest(request: Request): void {
  const rawToken = extractRawSessionTokenFromRequest(request);
  if (rawToken) {
    store.revokedSessions.add(rawToken);
    persistApiStore();
  }
}

export function isRequestSessionRevoked(request: Request): boolean {
  const rawToken = extractRawSessionTokenFromRequest(request);
  if (!rawToken) return false;
  return store.revokedSessions.has(rawToken);
}

export function getApiStore(): ApiStore {
  return store;
}

export function resetApiStore(): void {
  store = createDefaultStore();
}

export const resetApiStoreForTests = resetApiStore;

export function ensureUtcQuotaReset(
  targetStore: ApiStore = store,
  now: Date = new Date()
): { dailyReset: boolean; monthlyReset: boolean } {
  const currentDate = now.toISOString().slice(0, 10);
  const currentMonth = now.toISOString().slice(0, 7);
  const prevDate = targetStore.platformUsage.date || currentDate;
  const prevMonth = targetStore.platformUsage.month || currentMonth;

  let dailyReset = false;
  let monthlyReset = false;

  if (prevDate !== currentDate) {
    dailyReset = true;
    targetStore.platformUsage.date = currentDate;
    targetStore.platformUsage.cloudflareAiNeurons = 0;
    targetStore.platformUsage.huggingfaceCalls = 0;
    targetStore.platformUsage.youtubeUnits = 0;
    targetStore.platformUsage.tiktokCalls = 0;
    targetStore.platformUsage.vercelInvocations = 0;
    for (const user of Array.from(targetStore.users.values())) {
      user.usage.dailyAiGenerations = 0;
    }
  }

  if (prevMonth !== currentMonth) {
    monthlyReset = true;
    targetStore.platformUsage.month = currentMonth;
    targetStore.platformUsage.r2Reads = 0;
    targetStore.platformUsage.r2Writes = 0;
    for (const user of Array.from(targetStore.users.values())) {
      user.usage.monthlyPostsCreated = 0;
      user.usage.monthlyCrossPosts = 0;
    }
  }

  if (dailyReset || monthlyReset) {
    persistApiStore();
  }

  return { dailyReset, monthlyReset };
}

// Keep alias for backward compatibility with any external imports
export const getDemoApiStore = getApiStore;
export const resetDemoApiStore = resetApiStore;

export function extractActorFromRequest(request: Request): {
  userId: string;
  tier: SubscriptionTier;
  roles: ServerRole[];
  userRecord: UserAccountRecord;
} {
  const session = isRequestSessionRevoked(request)
    ? null
    : parseSessionCookieFromRequest(request);
  const headerUserId =
    request.headers.get("x-user-id") || request.headers.get("x-demo-user-id");
  const defaultFallbackId = isTestRuntime() ? "user-1" : "guest-workspace";
  const userId = session?.userId || headerUserId || defaultFallbackId;

  const tierHeader = (request.headers.get("x-user-tier") ||
    request.headers.get("x-demo-tier")) as SubscriptionTier | null;
  const rolesHeader =
    request.headers.get("x-user-roles") || request.headers.get("x-demo-roles");

  let userRecord = store.users.get(userId);
  if (!userRecord) {
    const email = session?.email || (headerUserId ? `${userId}@contentflow.app` : "");
    const isSuper = isSuperuserEmail(email) || session?.roles?.includes("superuser");
    const initialRoles: ServerRole[] = isSuper
      ? Array.from(new Set([...(session?.roles || ["creator"]), "superuser" as const]))
      : session?.roles || ["creator"];
    const fallbackName = email
      ? formatCreatorDisplayName(session?.name, email)
      : "Creator";

    userRecord = {
      id: userId,
      name: fallbackName,
      email,
      niche: "Multi-channel content creation",
      passwordHash: DEFAULT_PASSWORD_HASH,
      tier: resolveEffectiveTier(tierHeader || session?.tier || "FREE", initialRoles),
      roles: initialRoles,
      status: "Active",
      joinedAt: new Date().toISOString(),
      usage: {
        dailyAiGenerations: 0,
        monthlyPostsCreated: 0,
        monthlyCrossPosts: 0,
        storageUsedMb: 0,
      },
      encryptedByok: {},
      connectedPlatforms: {},
    };
    if (session?.userId || headerUserId) {
      store.users.set(userId, userRecord);
    }
  } else if (session?.name && userRecord.id !== "user-1") {
    userRecord.name = formatCreatorDisplayName(session.name, userRecord.email);
  }

  if (tierHeader && ["FREE", "CREATOR", "PRO", "AGENCY"].includes(tierHeader)) {
    userRecord.tier = tierHeader;
  }

  const aiUsedOverride =
    request.headers.get("x-ai-used") ?? request.headers.get("x-demo-ai-used");
  if (aiUsedOverride !== null && !Number.isNaN(Number(aiUsedOverride))) {
    userRecord.usage.dailyAiGenerations = Number(aiUsedOverride);
  }

  const roles: ServerRole[] = rolesHeader
    ? (rolesHeader
        .split(",")
        .map((r) => r.trim())
        .filter((r) =>
          ["creator", "moderator", "superuser"].includes(r)
        ) as ServerRole[])
    : session?.roles || userRecord.roles;

  if (!rolesHeader && isSuperuserEmail(userRecord.email) && !roles.includes("superuser")) {
    roles.push("superuser");
  }
  if (!tierHeader && roles.includes("superuser")) {
    userRecord.tier = resolveEffectiveTier(userRecord.tier, roles);
  }

  return {
    userId,
    tier: userRecord.tier,
    roles,
    userRecord,
  };
}

export function createEncryptedOAuthRef(rawToken: string): string {
  const env = encryptApiKey(rawToken, getEnvelopeMasterSecret());
  return `${env.version}:${env.iv}:${env.authTag}:${env.ciphertext}`;
}

export function generatePkceChallenge(): {
  codeVerifier: string;
  codeChallenge: string;
} {
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  return { codeVerifier, codeChallenge };
}
