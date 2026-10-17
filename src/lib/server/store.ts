import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  encryptApiKey,
  type EncryptedKeyEnvelope,
  type JobLifecycleStatus,
  type ServerRole,
  type SubscriptionTier,
  type UsageSnapshot,
} from "@/lib/policy";
import { hashPassword, parseSessionCookieFromRequest } from "./auth";

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
  connectedPlatforms: Record<
    string,
    {
      connected: boolean;
      handle: string;
      expiresAt: string;
      encryptedTokenRef: string;
    }
  >;
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
}

const DB_FILE_PATH = path.join(process.cwd(), ".data", "contentflow-db.json");
const DEFAULT_PASSWORD_HASH = hashPassword("ContentFlow#2026");

export function getEnvelopeMasterSecret(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SESSION_SECRET ||
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
  );
}

function createDefaultStore(): ApiStore {
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
  };
}

function loadStoreFromDisk(): ApiStore {
  if (process.env.VITEST) {
    return createDefaultStore();
  }
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const raw = JSON.parse(fs.readFileSync(DB_FILE_PATH, "utf8"));
      const defaults = createDefaultStore();
      return {
        users: new Map(raw.users || []),
        contents: new Map(raw.contents || []),
        jobs: new Map(raw.jobs || []),
        aiCache: new Map(raw.aiCache || []),
        oauthStates: new Map(raw.oauthStates || []),
        processedWebhooks: new Set(raw.processedWebhooks || []),
        moderationItems: new Map(raw.moderationItems || []),
        auditLogs: Array.isArray(raw.auditLogs) ? raw.auditLogs : [],
        platformUsage: raw.platformUsage || defaults.platformUsage,
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
      },
      null,
      2
    );
    fs.writeFileSync(DB_FILE_PATH, serialized, "utf8");
  } catch {
    // Non-fatal in read-only environments
  }
}

export function getApiStore(): ApiStore {
  return store;
}

export function resetApiStore(): void {
  store = createDefaultStore();
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
  const session = parseSessionCookieFromRequest(request);
  const headerUserId =
    request.headers.get("x-user-id") || request.headers.get("x-demo-user-id");
  const userId = session?.userId || headerUserId || "user-1";

  const tierHeader = (request.headers.get("x-user-tier") ||
    request.headers.get("x-demo-tier")) as SubscriptionTier | null;
  const rolesHeader =
    request.headers.get("x-user-roles") || request.headers.get("x-demo-roles");

  let userRecord = store.users.get(userId);
  if (!userRecord) {
    userRecord = {
      id: userId,
      name: session?.email ? session.email.split("@")[0] : "Creator",
      email: session?.email || `${userId}@contentflow.app`,
      niche: "Multi-channel content creation",
      passwordHash: DEFAULT_PASSWORD_HASH,
      tier: tierHeader || "FREE",
      roles: session?.roles || ["creator"],
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
    store.users.set(userId, userRecord);
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
