import { formatCreatorDisplayName, isSuperuserEmail } from "@/lib/server/auth";
import type { ServerRole, SubscriptionTier } from "@/lib/policy";

export interface SyncableUserProfile {
  id: string;
  email: string;
  name: string;
  niche: string;
  tier: SubscriptionTier;
  roles: ServerRole[];
  status: string;
  joinedAt: string;
}

export function buildSupabaseGoogleAuthorizeUrl(
  supabaseUrl: string,
  redirectTo: string
): string {
  const base = supabaseUrl.replace(/\/+$/, "");
  const authUrl = new URL(`${base}/auth/v1/authorize`);
  authUrl.searchParams.set("provider", "google");
  authUrl.searchParams.set("redirect_to", redirectTo);
  return authUrl.toString();
}

export async function supabaseSignUpWithEmail(params: {
  email: string;
  password: string;
  name: string;
  niche: string;
}): Promise<{ synced: boolean; supabaseUserId?: string }> {
  if (process.env.VITEST || process.env.NODE_ENV === "test") {
    return { synced: false };
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return { synced: false };
  }

  try {
    const res = await fetch(`${supabaseUrl.replace(/\/+$/, "")}/auth/v1/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify({
        email: params.email,
        password: params.password,
        data: {
          full_name: params.name,
          niche: params.niche,
        },
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const sbId = data?.user?.id || data?.id;
      return { synced: true, supabaseUserId: typeof sbId === "string" ? sbId : undefined };
    }
  } catch {
    // Fallback cleanly to local store
  }
  return { synced: false };
}

export async function supabaseSignInWithPassword(params: {
  email: string;
  password: string;
}): Promise<{
  authenticated: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    niche: string;
  };
}> {
  if (process.env.VITEST || process.env.NODE_ENV === "test") {
    return { authenticated: false };
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return { authenticated: false };
  }

  try {
    const res = await fetch(
      `${supabaseUrl.replace(/\/+$/, "")}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseAnonKey,
        },
        body: JSON.stringify({
          email: params.email,
          password: params.password,
        }),
      }
    );
    if (res.ok) {
      const data = await res.json();
      const sbUser = data?.user;
      if (sbUser && typeof sbUser.email === "string") {
        const email = sbUser.email.trim().toLowerCase();
        const rawName =
          sbUser.user_metadata?.full_name || sbUser.user_metadata?.name;
        return {
          authenticated: true,
          user: {
            id: sbUser.id || `user-${Buffer.from(email).toString("base64url").slice(0, 12)}`,
            email,
            name: formatCreatorDisplayName(rawName, email),
            niche:
              sbUser.user_metadata?.niche || "Multi-channel content creation",
          },
        };
      }
    }
  } catch {
    // Fallback cleanly to local store verification
  }
  return { authenticated: false };
}

export async function syncUserToSupabaseRest(
  profile: SyncableUserProfile
): Promise<{ synced: boolean }> {
  if (process.env.VITEST || process.env.NODE_ENV === "test") {
    return { synced: false };
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const apiKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !apiKey) {
    return { synced: false };
  }

  try {
    const res = await fetch(
      `${supabaseUrl.replace(/\/+$/, "")}/rest/v1/cf_users?on_conflict=email`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: apiKey,
          Authorization: `Bearer ${apiKey}`,
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify({
          id: profile.id,
          email: profile.email.toLowerCase(),
          name: profile.name,
          niche: profile.niche,
          tier: isSuperuserEmail(profile.email) ? "AGENCY" : profile.tier,
          roles: isSuperuserEmail(profile.email)
            ? Array.from(new Set([...profile.roles, "superuser"]))
            : profile.roles,
          status: profile.status || "Active",
          joined_at: profile.joinedAt,
        }),
      }
    );
    return { synced: res.ok };
  } catch {
    return { synced: false };
  }
}

export async function fetchUsersFromSupabaseRest(): Promise<
  SyncableUserProfile[]
> {
  if (process.env.VITEST || process.env.NODE_ENV === "test") {
    return [];
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const apiKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !apiKey) {
    return [];
  }

  try {
    const res = await fetch(
      `${supabaseUrl.replace(/\/+$/, "")}/rest/v1/cf_users?select=*&order=joined_at.desc&limit=100`,
      {
        headers: {
          apikey: apiKey,
          Authorization: `Bearer ${apiKey}`,
        },
        cache: "no-store",
      }
    );
    if (!res.ok) return [];
    const rows = await res.json();
    if (!Array.isArray(rows)) return [];
    return rows
      .filter((r) => r && typeof r.email === "string")
      .map((r) => {
        const email = String(r.email).toLowerCase();
        const isSuper = isSuperuserEmail(email);
        const roles: ServerRole[] = Array.isArray(r.roles)
          ? r.roles
          : isSuper
            ? ["creator", "superuser"]
            : ["creator"];
        return {
          id: String(r.id || `user-${email}`),
          email,
          name: formatCreatorDisplayName(r.name, email),
          niche: String(r.niche || "Multi-channel content creation"),
          tier: (isSuper ? "AGENCY" : r.tier || "FREE") as SubscriptionTier,
          roles,
          status: String(r.status || "Active"),
          joinedAt: String(r.joined_at || new Date().toISOString()),
        };
      });
  } catch {
    return [];
  }
}
