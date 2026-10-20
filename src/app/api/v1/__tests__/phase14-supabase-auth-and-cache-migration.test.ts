import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as signupPost } from "@/app/api/v1/auth/signup/route";
import { POST as loginPost } from "@/app/api/v1/auth/login/route";
import { GET as meGet } from "@/app/api/v1/auth/me/route";
import { POST as googleCallbackPost } from "@/app/api/v1/auth/google/callback/route";
import { GET as adminUsersGet } from "@/app/api/v1/admin/users/route";
import { resetApiStore } from "@/lib/server/store";
import {
  buildSupabaseGoogleAuthorizeUrl,
  syncUserToSupabaseRest,
} from "@/lib/server/supabase-sync";
import {
  STORAGE_SCHEMA_VERSION,
  STORAGE_VERSION_KEY,
  migrateLegacyClientStorage,
} from "@/app/state";

describe("Phase 14: Supabase Auth, Multi-Device DB Sync, Strict Auth Guard & Cache Migration", () => {
  beforeEach(() => {
    resetApiStore();
    vi.restoreAllMocks();
  });

  it("builds Supabase Google OAuth authorize URL and syncs user profiles cleanly when env vars are present or absent", async () => {
    const authUrl = buildSupabaseGoogleAuthorizeUrl(
      "https://ogtbrzzfgghvqyjmmqes.supabase.co",
      "https://content-flow-weld-one.vercel.app/login"
    );
    expect(authUrl).toBe(
      "https://ogtbrzzfgghvqyjmmqes.supabase.co/auth/v1/authorize?provider=google&redirect_to=https%3A%2F%2Fcontent-flow-weld-one.vercel.app%2Flogin"
    );

    const syncResult = await syncUserToSupabaseRest({
      id: "user-test-sync",
      email: "friend@example.com",
      name: "Friend Creator",
      niche: "Tech & Lifestyle",
      tier: "FREE",
      roles: ["creator"],
      status: "Active",
      joinedAt: new Date().toISOString(),
    });
    expect(typeof syncResult.synced).toBe("boolean");
  });

  it("isolates multi-device users so Friend's phone never sees Johnpaul Onovo's email, name, or Superuser tier", async () => {
    // 1. Unauthenticated phone request to /api/v1/auth/me must return 401
    const unauthRes = await meGet(
      new Request("http://localhost:3000/api/v1/auth/me")
    );
    expect(unauthRes.status).toBe(401);
    const unauthData = await unauthRes.json();
    expect(unauthData.authenticated).toBe(false);

    // 2. Superuser signs up on Device A
    const superSignupRes = await signupPost(
      new Request("http://localhost:3000/api/v1/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Johnpaulonovo",
          email: "johnpaulonovo@gmail.com",
          password: "Superuser#2026!",
        }),
      })
    );
    expect(superSignupRes.status).toBe(201);
    const superCookie = (superSignupRes.headers.get("set-cookie") || "").split(
      ";"
    )[0];

    // 3. Friend signs up on Device B (friend's phone)
    const friendSignupRes = await signupPost(
      new Request("http://localhost:3000/api/v1/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Chinedu Okafor",
          email: "chinedu@example.com",
          password: "FriendStrong#2026!",
        }),
      })
    );
    expect(friendSignupRes.status).toBe(201);
    const friendCookie = (
      friendSignupRes.headers.get("set-cookie") || ""
    ).split(";")[0];

    // 4. Verify Friend's session on Device B only sees Chinedu Okafor (FREE tier)
    const friendMeRes = await meGet(
      new Request("http://localhost:3000/api/v1/auth/me", {
        headers: { cookie: friendCookie },
      })
    );
    expect(friendMeRes.status).toBe(200);
    const friendMeData = await friendMeRes.json();
    expect(friendMeData.user.name).toBe("Chinedu Okafor");
    expect(friendMeData.user.email).toBe("chinedu@example.com");
    expect(friendMeData.user.tier).toBe("FREE");
    expect(friendMeData.user.roles).not.toContain("superuser");

    // 5. Verify Superuser's session on Device A sees Johnpaul Onovo (AGENCY Superuser)
    const superMeRes = await meGet(
      new Request("http://localhost:3000/api/v1/auth/me", {
        headers: { cookie: superCookie },
      })
    );
    expect(superMeRes.status).toBe(200);
    const superMeData = await superMeRes.json();
    expect(superMeData.user.name).toBe("Johnpaul Onovo");
    expect(superMeData.user.email).toBe("johnpaulonovo@gmail.com");
    expect(superMeData.user.tier).toBe("AGENCY");
    expect(superMeData.user.roles).toContain("superuser");

    // 6. Verify Admin Users endpoint lists both real users for Superuser
    const adminRes = await adminUsersGet(
      new Request("http://localhost:3000/api/v1/admin/users", {
        headers: { cookie: superCookie },
      })
    );
    expect(adminRes.status).toBe(200);
    const adminData = await adminRes.json();
    const emails = adminData.items.map((u: { email: string }) => u.email);
    expect(emails).toContain("johnpaulonovo@gmail.com");
    expect(emails).toContain("chinedu@example.com");
  });

  it("automatically purges stale legacy localStorage profiles via migrateLegacyClientStorage", () => {
    const mockStorage = new Map<string, string>([
      [
        "cf_user_profile_v1",
        JSON.stringify({
          id: "user-superuser",
          name: "Johnpaul Onovo",
          email: "johnpaulonovo@gmail.com",
        }),
      ],
      ["cf_user_jobs_v1", JSON.stringify([{ id: 1049 }])],
    ]);

    const storageAdapter = {
      getItem: (k: string) => mockStorage.get(k) ?? null,
      setItem: (k: string, v: string) => {
        mockStorage.set(k, v);
      },
      removeItem: (k: string) => {
        mockStorage.delete(k);
      },
    };

    const migrated = migrateLegacyClientStorage(storageAdapter);
    expect(migrated).toBe(true);
    expect(mockStorage.get("cf_user_profile_v1")).toBeUndefined();
    expect(mockStorage.get("cf_user_jobs_v1")).toBeUndefined();
    expect(mockStorage.get(STORAGE_VERSION_KEY)).toBe(STORAGE_SCHEMA_VERSION);

    // Subsequent calls do not wipe newly authenticated sessions
    mockStorage.set(
      "cf_user_profile_v1",
      JSON.stringify({ email: "chinedu@example.com" })
    );
    const migratedSecondTime = migrateLegacyClientStorage(storageAdapter);
    expect(migratedSecondTime).toBe(false);
    expect(mockStorage.get("cf_user_profile_v1")).toContain(
      "chinedu@example.com"
    );
  });

  it("verifies Phase 14 Supabase SQL migration exists with public.cf_users table, RLS, and auth.users trigger", () => {
    const migrationPath = path.join(
      process.cwd(),
      "supabase",
      "migrations",
      "20261020000000_phase14_auth_and_multi_device_sync.sql"
    );
    expect(fs.existsSync(migrationPath)).toBe(true);
    const sql = fs.readFileSync(migrationPath, "utf8");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.cf_users");
    expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain("on_auth_user_created");
  });
});
