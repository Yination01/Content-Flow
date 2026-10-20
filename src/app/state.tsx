"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Status } from "./ui";

export type Job = {
  id: number;
  content: string;
  platform: "YouTube" | "TikTok";
  schedule: string;
  status: Status;
  attempts: number;
};

export interface ConnectedPlatformInfo {
  connected: boolean;
  handle: string;
  channelTitle?: string;
  scopes?: string[];
  verifiedAt?: string;
  expiresAt: string;
}

export interface CurrentUserProfile {
  id: string;
  name: string;
  email: string;
  niche: string;
  tier: "FREE" | "CREATOR" | "PRO" | "AGENCY";
  roles: string[];
  initials: string;
  twoFactorEnabled?: boolean;
  maskedKeys?: Record<string, string>;
  trial?: {
    active: boolean;
    tier: "FREE" | "CREATOR" | "PRO" | "AGENCY" | null;
    endsAt: string | null;
    daysRemaining: number;
    used: boolean;
  };
  testTierOverride?: {
    tier: "FREE" | "CREATOR" | "PRO" | "AGENCY";
    expiresAt: string;
  } | null;
  usage: {
    dailyAiGenerations: number;
    monthlyPostsCreated: number;
    monthlyCrossPosts: number;
    storageUsedMb: number;
  };
  limits: {
    dailyAiGenerations: number;
    monthlyPosts: number | null;
    monthlyCrossPosts: number | null;
    storageMb: number;
  };
  connectedPlatforms: Record<string, ConnectedPlatformInfo>;
}

export function normalizeDisplayName(name?: string, email?: string): string {
  const cleaned = (name || "").trim();
  if (
    cleaned.toLowerCase() === "johnpaulonovo" ||
    (!cleaned && (email || "").toLowerCase().startsWith("johnpaulonovo@"))
  ) {
    return "Johnpaul Onovo";
  }
  if (cleaned) return cleaned;
  if (email && email.includes("@")) {
    return email
      .split("@")[0]
      .replace(/[._-]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return "Creator";
}

export function computeInitials(name: string, email?: string): string {
  const normalized = normalizeDisplayName(name, email);
  if (normalized && normalized !== "Creator") {
    const parts = normalized.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return normalized.slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return "CF";
}

export function formatTierBadgeLabel(
  tier: CurrentUserProfile["tier"],
  roles: string[] = []
): string {
  if (roles.includes("superuser") || roles.includes("admin")) {
    return "Agency Max · Admin";
  }
  switch (tier) {
    case "AGENCY":
      return "Agency Plan";
    case "PRO":
      return "Pro Plan";
    case "CREATOR":
      return "Creator Plan";
    case "FREE":
    default:
      return "Free Plan";
  }
}

const DEFAULT_USER_PROFILE: CurrentUserProfile = {
  id: "",
  name: "Creator",
  email: "",
  niche: "Multi-channel content creation",
  tier: "FREE",
  roles: ["creator"],
  initials: "CF",
  twoFactorEnabled: false,
  maskedKeys: {},
  usage: {
    dailyAiGenerations: 0,
    monthlyPostsCreated: 0,
    monthlyCrossPosts: 0,
    storageUsedMb: 0,
  },
  limits: {
    dailyAiGenerations: 10,
    monthlyPosts: 5,
    monthlyCrossPosts: 5,
    storageMb: 100,
  },
  connectedPlatforms: {},
};

const STORAGE_KEY = "cf_user_profile_v1";
const JOBS_STORAGE_KEY = "cf_user_jobs_v1";
const THEME_STORAGE_KEY = "cf_theme_v1";
export const STORAGE_VERSION_KEY = "cf_storage_schema_version";
export const STORAGE_SCHEMA_VERSION = "v2_multi_user_clean";

export function migrateLegacyClientStorage(storage: {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}): boolean {
  try {
    const currentVersion = storage.getItem(STORAGE_VERSION_KEY);
    if (currentVersion !== STORAGE_SCHEMA_VERSION) {
      storage.removeItem(STORAGE_KEY);
      storage.removeItem(JOBS_STORAGE_KEY);
      storage.setItem(STORAGE_VERSION_KEY, STORAGE_SCHEMA_VERSION);
      return true;
    }
  } catch {
    // Ignore storage access errors
  }
  return false;
}

type AppState = {
  hasContent: boolean;
  setHasContent: (value: boolean) => void;
  jobs: Job[];
  addJobs: (platforms: string[], schedule: string, title?: string) => void;
  updateJob: (id: number, status: Status) => void;
  currentUser: CurrentUserProfile;
  updateCurrentUser: (partial: Partial<CurrentUserProfile>) => void;
  refreshUser: () => Promise<void>;
  logoutUser: () => Promise<void>;
  isLoggedOut: boolean;
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
  toggleTheme: () => void;
};

const StateContext = createContext<AppState | null>(null);

export function StateProvider({ children }: { children: ReactNode }) {
  const [hasContent, setHasContent] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [currentUser, setCurrentUser] =
    useState<CurrentUserProfile>(DEFAULT_USER_PROFILE);
  const [isLoggedOut, setIsLoggedOut] = useState(false);
  const [theme, setThemeState] = useState<"light" | "dark">("light");

  const setTheme = useCallback((nextTheme: "light" | "dark") => {
    setThemeState(nextTheme);
    try {
      if (typeof document !== "undefined") {
        document.documentElement.dataset.theme = nextTheme;
      }
      if (typeof window !== "undefined") {
        window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      }
    } catch {
      // Ignore storage access errors
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      try {
        if (typeof document !== "undefined") {
          document.documentElement.dataset.theme = next;
        }
        if (typeof window !== "undefined") {
          window.localStorage.setItem(THEME_STORAGE_KEY, next);
        }
      } catch {
        // Ignore
      }
      return next;
    });
  }, []);


  function addJobs(platforms: string[], schedule: string, title?: string) {
    const additions = platforms.map((platform, index) => ({
      id: Date.now() + index,
      content: title || "Creator Studio Draft",
      platform: platform as Job["platform"],
      schedule,
      status: "pending" as Status,
      attempts: 0,
    }));
    setJobs((current) => {
      const next = [...additions, ...current];
      try {
        window.localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });
  }

  function updateJob(id: number, status: Status) {
    setJobs((current) => {
      const next = current.map((job) =>
        job.id === id ? { ...job, status, attempts: job.attempts + 1 } : job
      );
      try {
        window.localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });
  }

  const applyServerUser = useCallback((u: Record<string, unknown>) => {
    setCurrentUser((prev) => {
      const email =
        typeof u.email === "string" && u.email.trim()
          ? u.email.trim()
          : prev.email;
      const name = normalizeDisplayName(
        typeof u.name === "string" ? u.name : prev.name,
        email
      );
      const roles = Array.isArray(u.roles)
        ? (u.roles as string[])
        : u.isSuperuser === true || u.role === "superuser"
          ? ["user", "superuser"]
          : prev.roles;
      const rawTier =
        typeof u.tier === "string"
          ? (u.tier as CurrentUserProfile["tier"])
          : prev.tier;
      const tier = roles.includes("superuser") ? "AGENCY" : rawTier;

      const defaultLimitsByTier: Record<
        CurrentUserProfile["tier"],
        CurrentUserProfile["limits"]
      > = {
        FREE: {
          dailyAiGenerations: 5,
          monthlyPosts: 5,
          monthlyCrossPosts: 3,
          storageMb: 100,
        },
        CREATOR: {
          dailyAiGenerations: 100,
          monthlyPosts: 50,
          monthlyCrossPosts: 100,
          storageMb: 5120,
        },
        PRO: {
          dailyAiGenerations: 500,
          monthlyPosts: null,
          monthlyCrossPosts: 300,
          storageMb: 25600,
        },
        AGENCY: {
          dailyAiGenerations: 2000,
          monthlyPosts: null,
          monthlyCrossPosts: null,
          storageMb: 102400,
        },
      };

      const quotasObj =
        u.quotas && typeof u.quotas === "object"
          ? (u.quotas as Record<string, unknown>)
          : null;

      const next: CurrentUserProfile = {
        id: typeof u.id === "string" ? u.id : prev.id,
        name,
        email,
        niche: typeof u.niche === "string" ? u.niche : prev.niche,
        tier,
        testTierOverride:
          u.testTierOverride && typeof u.testTierOverride === "object"
            ? (u.testTierOverride as CurrentUserProfile["testTierOverride"])
            : u.testTierOverride === null
              ? null
              : prev.testTierOverride,
        trial:
          u.trial && typeof u.trial === "object"
            ? (u.trial as CurrentUserProfile["trial"])
            : prev.trial,
        roles,
        initials: computeInitials(name, email),
        twoFactorEnabled:
          typeof u.twoFactorEnabled === "boolean"
            ? u.twoFactorEnabled
            : typeof u.totpEnabled === "boolean"
              ? u.totpEnabled
              : prev.twoFactorEnabled,
        maskedKeys:
          u.maskedKeys && typeof u.maskedKeys === "object"
            ? (u.maskedKeys as Record<string, string>)
            : prev.maskedKeys || {},
        usage:
          u.usage && typeof u.usage === "object"
            ? {
                dailyAiGenerations:
                  Number(
                    (u.usage as Record<string, unknown>).dailyAiGenerations
                  ) || 0,
                monthlyPostsCreated:
                  Number(
                    (u.usage as Record<string, unknown>).monthlyPostsCreated
                  ) || 0,
                monthlyCrossPosts:
                  Number(
                    (u.usage as Record<string, unknown>).monthlyCrossPosts
                  ) || 0,
                storageUsedMb:
                  Number((u.usage as Record<string, unknown>).storageUsedMb) ||
                  0,
              }
            : quotasObj
              ? {
                  dailyAiGenerations:
                    Number(quotasObj.dailyAiGenerationsUsed) ||
                    prev.usage.dailyAiGenerations,
                  monthlyPostsCreated:
                    Number(quotasObj.monthlyVideoExportsUsed) ||
                    prev.usage.monthlyPostsCreated,
                  monthlyCrossPosts: prev.usage.monthlyCrossPosts,
                  storageUsedMb: prev.usage.storageUsedMb,
                }
              : prev.usage,
        limits:
          u.limits && typeof u.limits === "object"
            ? {
                dailyAiGenerations:
                  Number(
                    (u.limits as Record<string, unknown>).dailyAiGenerations
                  ) || defaultLimitsByTier[tier].dailyAiGenerations,
                monthlyPosts:
                  (u.limits as Record<string, unknown>).monthlyPosts === null
                    ? null
                    : Number(
                        (u.limits as Record<string, unknown>).monthlyPosts
                      ) || defaultLimitsByTier[tier].monthlyPosts,
                monthlyCrossPosts:
                  (u.limits as Record<string, unknown>).monthlyCrossPosts ===
                  null
                    ? null
                    : Number(
                        (u.limits as Record<string, unknown>).monthlyCrossPosts
                      ) || defaultLimitsByTier[tier].monthlyCrossPosts,
                storageMb:
                  Number((u.limits as Record<string, unknown>).storageMb) ||
                  defaultLimitsByTier[tier].storageMb,
              }
            : defaultLimitsByTier[tier],
        connectedPlatforms:
          u.connectedPlatforms && typeof u.connectedPlatforms === "object"
            ? (u.connectedPlatforms as CurrentUserProfile["connectedPlatforms"])
            : prev.connectedPlatforms,
      };

      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  }, []);

  const updateCurrentUser = useCallback(
    (partial: Partial<CurrentUserProfile>) => {
      setIsLoggedOut(false);
      try {
        window.sessionStorage.removeItem("cf_logged_out");
      } catch {
        // Ignore
      }
      setCurrentUser((prev) => {
        const email = partial.email ?? prev.email;
        const name = normalizeDisplayName(partial.name ?? prev.name, email);
        const next: CurrentUserProfile = {
          ...prev,
          ...partial,
          name,
          email,
          initials: computeInitials(name, email),
        };
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // Ignore
        }
        return next;
      });
    },
    []
  );

  const refreshUser = useCallback(async () => {
    try {
      if (
        typeof window !== "undefined" &&
        window.sessionStorage.getItem("cf_logged_out") === "1"
      ) {
        setIsLoggedOut(true);
        return;
      }
      const res = await fetch("/api/v1/auth/me", { cache: "no-store" });
      if (res.ok) {
        const payload = await res.json();
        const serverUser = payload?.data?.user || payload?.user;
        if (serverUser) {
          let stored: CurrentUserProfile | null = null;
          try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (raw) stored = JSON.parse(raw) as CurrentUserProfile;
          } catch {
            // Ignore
          }
          if (
            serverUser.id === "user-1" &&
            stored &&
            stored.id !== "user-1" &&
            stored.email !== "maya@contentflow.app"
          ) {
            return;
          }
          // Merge server user with any locally persisted connectedPlatforms & maskedKeys so serverless cold starts never wipe connected channels
          if (stored && stored.email === serverUser.email) {
            serverUser.connectedPlatforms = {
              ...(stored.connectedPlatforms || {}),
              ...(serverUser.connectedPlatforms || {}),
            };
            serverUser.maskedKeys = {
              ...(stored.maskedKeys || {}),
              ...(serverUser.maskedKeys || {}),
            };
          }
          applyServerUser(serverUser);
        }
      } else if (res.status === 401) {
        let hasStoredSession = false;
        try {
          const raw = window.localStorage.getItem(STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw) as CurrentUserProfile;
            hasStoredSession = Boolean(parsed && parsed.email);
          }
        } catch {
          // Ignore
        }
        if (!hasStoredSession) {
          setIsLoggedOut(true);
        }
      }
    } catch {
      // Keep local profile if offline
    }
  }, [applyServerUser]);

  const logoutUser = useCallback(async () => {
    setIsLoggedOut(true);
    setHasContent(false);
    setJobs([]);
    try {
      window.sessionStorage.setItem("cf_logged_out", "1");
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(JOBS_STORAGE_KEY);
    } catch {
      // Ignore
    }
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    try {
      const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme === "dark" || savedTheme === "light") {
        setThemeState(savedTheme);
        document.documentElement.dataset.theme = savedTheme;
      } else {
        document.documentElement.dataset.theme = "light";
      }
      if (process.env.NODE_ENV !== "test") {
        migrateLegacyClientStorage(window.localStorage);
      }
      if (window.sessionStorage.getItem("cf_logged_out") === "1") {
        setIsLoggedOut(true);
        return;
      }
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CurrentUserProfile;
        if (parsed && parsed.email) {
          const normalizedName = normalizeDisplayName(
            parsed.name,
            parsed.email
          );
          setCurrentUser({
            ...DEFAULT_USER_PROFILE,
            ...parsed,
            name: normalizedName,
            initials: computeInitials(normalizedName, parsed.email),
            maskedKeys: parsed.maskedKeys || {},
          });
        }
      }
      const rawJobs = window.localStorage.getItem(JOBS_STORAGE_KEY);
      if (rawJobs) {
        const parsedJobs = JSON.parse(rawJobs) as Job[];
        if (Array.isArray(parsedJobs)) {
          setJobs(parsedJobs);
        }
      }
    } catch {
      // Ignore
    }
    if (process.env.NODE_ENV !== "test") {
      void refreshUser();
    }
  }, [refreshUser]);

  return (
    <StateContext.Provider
      value={{
        hasContent,
        setHasContent,
        jobs,
        addJobs,
        updateJob,
        currentUser,
        updateCurrentUser,
        refreshUser,
        logoutUser,
        isLoggedOut,
        theme,
        setTheme,
        toggleTheme,
      }}
    >
      {children}
    </StateContext.Provider>
  );
}

export function useAppState() {
  const value = useContext(StateContext);
  if (!value) throw new Error("useAppState must be used inside StateProvider");
  return value;
}
