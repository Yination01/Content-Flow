import crypto from "node:crypto";
import {
  encryptApiKey,
  type EncryptedKeyEnvelope,
  type JobLifecycleStatus,
  type ServerRole,
  type SubscriptionTier,
  type UsageSnapshot,
} from "@/lib/policy";

export interface ContentRecord {
  id: string;
  userId: string;
  title: string;
  contentType: "text" | "image" | "video";
  originalText: string;
  generatedScript: string;
  mediaUrl?: string;
  metadata: Record<string, unknown>;
  status: "draft" | "ready" | "posted" | "failed";
  createdAt: string;
  updatedAt: string;
}

export interface JobRecord {
  id: string;
  userId: string;
  jobType: "cross_post" | "video_render" | "scheduled_publish" | "content_repurpose";
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
  tier: SubscriptionTier;
  roles: ServerRole[];
  status: "Active" | "Review" | "Suspended";
  joinedAt: string;
  usage: UsageSnapshot;
  encryptedByok?: Record<string, EncryptedKeyEnvelope>;
  connectedPlatforms: Record<
    string,
    { connected: boolean; handle: string; expiresAt: string; encryptedTokenRef: string }
  >;
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

interface DemoApiStore {
  users: Map<string, UserAccountRecord>;
  contents: Map<string, ContentRecord>;
  jobs: Map<string, JobRecord>;
  aiCache: Map<string, CachedAiResponse>;
  oauthStates: Map<string, OAuthStatePending>;
  processedWebhooks: Set<string>;
  auditLogs: AuditLogEntry[];
}

function createInitialStore(): DemoApiStore {
  const users = new Map<string, UserAccountRecord>([
    [
      "user-1",
      {
        id: "user-1",
        name: "Maya Chen",
        email: "maya@example.com",
        tier: "CREATOR",
        roles: ["creator"],
        status: "Active",
        joinedAt: "2026-06-21T00:00:00.000Z",
        usage: {
          dailyAiGenerations: 3,
          monthlyPostsCreated: 18,
          monthlyCrossPosts: 12,
          storageUsedMb: 120,
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
        email: "jon@example.com",
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
        connectedPlatforms: {},
      },
    ],
    [
      "user-free-1",
      {
        id: "user-free-1",
        name: "Priya Shah",
        email: "priya@example.com",
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
        metadata: { youtubeTitle: "How to Create Consistently Without Burning Out" },
        status: "draft",
        createdAt: "2026-10-17T08:00:00.000Z",
        updatedAt: "2026-10-17T10:00:00.000Z",
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
        payload: { scheduleLabel: "Tomorrow, 9:00 AM" },
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
        contentId: "1",
        contentTitle: "3 habits that improved my focus",
        platform: "TikTok",
        payload: { scheduleLabel: "Today, 4:30 PM" },
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
        payload: { scheduleLabel: "Jun 18, 10:00 AM" },
        status: "failed",
        priority: 1,
        attempts: 2,
        maxAttempts: 3,
        errorMessage: "Demo connection token expired",
        scheduledAt: null,
        createdAt: "2026-06-18T10:00:00.000Z",
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
    auditLogs: [],
  };
}

let store: DemoApiStore = createInitialStore();

export function getDemoApiStore(): DemoApiStore {
  return store;
}

export function resetDemoApiStore(): void {
  store = createInitialStore();
}

export function extractActorFromRequest(request: Request): {
  userId: string;
  tier: SubscriptionTier;
  roles: ServerRole[];
  userRecord: UserAccountRecord;
} {
  const userId = request.headers.get("x-demo-user-id") || "user-1";
  const tierHeader = request.headers.get("x-demo-tier") as SubscriptionTier | null;
  const rolesHeader = request.headers.get("x-demo-roles");

  let userRecord = store.users.get(userId);
  if (!userRecord) {
    userRecord = {
      id: userId,
      name: "Demo Creator",
      email: `${userId}@example.com`,
      tier: tierHeader || "FREE",
      roles: ["creator"],
      status: "Active",
      joinedAt: new Date().toISOString(),
      usage: {
        dailyAiGenerations: 0,
        monthlyPostsCreated: 0,
        monthlyCrossPosts: 0,
        storageUsedMb: 0,
      },
      connectedPlatforms: {},
    };
    store.users.set(userId, userRecord);
  }

  if (tierHeader && ["FREE", "CREATOR", "PRO", "AGENCY"].includes(tierHeader)) {
    userRecord.tier = tierHeader;
  }

  const aiUsedOverride = request.headers.get("x-demo-ai-used");
  if (aiUsedOverride !== null && !Number.isNaN(Number(aiUsedOverride))) {
    userRecord.usage.dailyAiGenerations = Number(aiUsedOverride);
  }

  const roles: ServerRole[] = rolesHeader
    ? (rolesHeader
        .split(",")
        .map((r) => r.trim())
        .filter((r) => ["creator", "moderator", "superuser"].includes(r)) as ServerRole[])
    : userRecord.roles;

  return {
    userId,
    tier: userRecord.tier,
    roles,
    userRecord,
  };
}

export function createEncryptedOAuthRef(rawToken: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || "demo-server-envelope-key-secret-2026";
  const env = encryptApiKey(rawToken, secret);
  return `${env.version}:${env.iv}:${env.authTag}:${env.ciphertext}`;
}

export function generatePkceChallenge(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");
  return { codeVerifier, codeChallenge };
}
