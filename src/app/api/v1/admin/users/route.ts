import { NextResponse } from "next/server";
import {
  authorizeAdminAction,
  resolveEffectiveTier,
  type ServerRole,
  type SubscriptionTier,
} from "@/lib/policy";
import {
  formatCreatorDisplayName,
  hashPassword,
  isSuperuserEmail,
} from "@/lib/server/auth";
import {
  extractActorFromRequest,
  getApiStore,
  persistApiStore,
} from "@/lib/server/store";
import {
  fetchUsersFromSupabaseRest,
  syncUserToSupabaseRest,
} from "@/lib/server/supabase-sync";

export async function GET(request: Request) {
  const actor = extractActorFromRequest(request);
  if (!authorizeAdminAction(actor.roles, "user_list")) {
    return NextResponse.json(
      { error: "Forbidden: Superuser role required." },
      { status: 403 }
    );
  }

  const url = new URL(request.url);
  const limit = Math.min(
    50,
    Math.max(1, Number(url.searchParams.get("limit") || 20))
  );
  const store = getApiStore();
  const remoteUsers = await fetchUsersFromSupabaseRest();
  for (const ru of remoteUsers) {
    const existing = Array.from(store.users.values()).find(
      (u) => u.email.toLowerCase() === ru.email.toLowerCase()
    );
    if (!existing) {
      store.users.set(ru.id, {
        id: ru.id,
        name: ru.name,
        email: ru.email,
        niche: ru.niche,
        passwordHash: "",
        tier: ru.tier,
        roles: ru.roles,
        status: (ru.status as "Active" | "Review" | "Suspended") || "Active",
        joinedAt: ru.joinedAt,
        usage: {
          dailyAiGenerations: 0,
          monthlyPostsCreated: 0,
          monthlyCrossPosts: 0,
          storageUsedMb: 0,
        },
        encryptedByok: {},
        connectedPlatforms: {},
      });
    }
  }

  const users = Array.from(store.users.values())
    .slice(0, limit)
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      tier: u.tier,
      roles: u.roles,
      status: u.status,
      joinedAt: u.joinedAt,
      usage: u.usage,
    }));

  return NextResponse.json({
    users,
    items: users,
    pagination: { limit, count: users.length, total: store.users.size },
  });
}

export async function POST(request: Request) {
  const actor = extractActorFromRequest(request);
  if (!authorizeAdminAction(actor.roles, "user_list")) {
    return NextResponse.json(
      { error: "Forbidden: Superuser role required." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "A valid email address is required." },
        { status: 400 }
      );
    }

    const store = getApiStore();
    const existing = Array.from(store.users.values()).find(
      (u) => u.email.toLowerCase() === email
    );
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const name = formatCreatorDisplayName(body?.name, email);
    const requestedRole =
      body?.role === "superuser"
        ? "superuser"
        : body?.role === "moderator"
          ? "moderator"
          : "creator";
    const roles: ServerRole[] = isSuperuserEmail(email)
      ? ["creator", "superuser"]
      : requestedRole === "creator"
        ? ["creator"]
        : ["creator", requestedRole];

    const rawTier =
      typeof body?.tier === "string" &&
      ["FREE", "CREATOR", "PRO", "AGENCY"].includes(body.tier.toUpperCase())
        ? (body.tier.toUpperCase() as SubscriptionTier)
        : "FREE";
    const tier = resolveEffectiveTier(rawTier, roles);

    const newUserId = `user-${Date.now()}`;
    const newUser = {
      id: newUserId,
      name,
      email,
      niche:
        typeof body?.niche === "string" && body.niche.trim()
          ? body.niche.trim()
          : "Multi-channel content creation",
      passwordHash: hashPassword(
        typeof body?.password === "string" && body.password.length >= 8
          ? body.password
          : "ContentFlow#2026!"
      ),
      tier,
      roles,
      status: "Active" as const,
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

    store.users.set(newUserId, newUser);
    store.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      actorId: actor.userId,
      actionType: "admin.user_provisioned",
      targetUserId: newUserId,
      reason: `Provisioned ${email} (${tier}, roles: ${roles.join(",")})`,
      createdAt: new Date().toISOString(),
    });
    persistApiStore();

    await syncUserToSupabaseRest({
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      niche: newUser.niche,
      tier: newUser.tier,
      roles: newUser.roles,
      status: newUser.status,
      joinedAt: newUser.joinedAt,
    });

    return NextResponse.json(
      {
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          tier: newUser.tier,
          roles: newUser.roles,
          status: newUser.status,
          joinedAt: newUser.joinedAt,
        },
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid user creation payload." },
      { status: 400 }
    );
  }
}
