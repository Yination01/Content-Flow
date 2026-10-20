import { NextResponse } from "next/server";
import {
  createSessionCookieHeader,
  formatCreatorDisplayName,
  hashPassword,
  isSuperuserEmail,
  signSessionToken,
  verifyMagicLinkToken,
} from "@/lib/server/auth";
import { getApiStore, persistApiStore } from "@/lib/server/store";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state") || "";
  const verified = verifyMagicLinkToken(state);

  const email = (
    verified?.email ||
    url.searchParams.get("email") ||
    ""
  )
    .trim()
    .toLowerCase();

  if (!email || email === "oauth-pending@contentflow.app") {
    return NextResponse.json(
      { error: "Valid email identity required to complete OAuth sign-in." },
      { status: 400 }
    );
  }
  const name = formatCreatorDisplayName(
    verified?.name || url.searchParams.get("name")?.trim(),
    email
  );

  const store = getApiStore();
  let user = Array.from(store.users.values()).find(
    (u) => u.email.toLowerCase() === email
  );
  const isSuper = isSuperuserEmail(email);

  if (!user) {
    const userId = `user-${Buffer.from(email).toString("base64url").slice(0, 12)}`;
    const roles = isSuper
      ? (["creator", "superuser"] as const)
      : (["creator"] as const);
    user = {
      id: userId,
      name,
      email,
      niche: "Multi-channel content creation",
      passwordHash: hashPassword(`google-oauth-${Date.now()}`),
      tier: isSuper ? "AGENCY" : "FREE",
      roles: [...roles],
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
    store.users.set(userId, user);
    persistApiStore();
  } else {
    if (name && user.id !== "user-1") {
      user.name = name;
    }
    if (isSuper) {
      user.tier = "AGENCY";
      if (!user.roles.includes("superuser")) {
        user.roles.push("superuser");
      }
    }
  }

  const sessionToken = signSessionToken({
    userId: user.id,
    email: user.email,
    name: user.name,
    tier: user.tier,
    roles: user.roles,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });

  const wantsJson =
    request.headers.get("accept")?.includes("application/json") ||
    url.searchParams.get("format") === "json";

  if (wantsJson) {
    const res = NextResponse.json({
      authenticated: true,
      provider: "google",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        niche: user.niche,
        tier: user.tier,
        roles: user.roles,
        usage: user.usage,
      },
    });
    res.headers.set("set-cookie", createSessionCookieHeader(sessionToken));
    return res;
  }

  const redirectRes = NextResponse.redirect(new URL("/dashboard", url.origin), 302);
  redirectRes.headers.set("set-cookie", createSessionCookieHeader(sessionToken));
  return redirectRes;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const accessToken =
      typeof body?.accessToken === "string" ? body.accessToken.trim() : "";

    let email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    let rawName = typeof body?.name === "string" ? body.name.trim() : "";

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (accessToken && supabaseUrl && supabaseAnonKey) {
      const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: supabaseAnonKey,
        },
      });
      if (userRes.ok) {
        const sbUser = await userRes.json();
        if (typeof sbUser?.email === "string") {
          email = sbUser.email.trim().toLowerCase();
        }
        rawName =
          sbUser?.user_metadata?.full_name ||
          sbUser?.user_metadata?.name ||
          rawName;
      }
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Unable to verify Supabase OAuth user email." },
        { status: 400 }
      );
    }

    const name = formatCreatorDisplayName(rawName, email);
    const store = getApiStore();
    let user = Array.from(store.users.values()).find(
      (u) => u.email.toLowerCase() === email
    );
    const isSuper = isSuperuserEmail(email);

    if (!user) {
      const userId = `user-${Buffer.from(email).toString("base64url").slice(0, 12)}`;
      const roles = isSuper
        ? (["creator", "superuser"] as const)
        : (["creator"] as const);
      user = {
        id: userId,
        name,
        email,
        niche: "Multi-channel content creation",
        passwordHash: hashPassword(`supabase-oauth-${Date.now()}`),
        tier: isSuper ? "AGENCY" : "FREE",
        roles: [...roles],
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
      store.users.set(userId, user);
      persistApiStore();
    } else {
      user.name = name;
      if (isSuper) {
        user.tier = "AGENCY";
        if (!user.roles.includes("superuser")) {
          user.roles.push("superuser");
        }
      }
    }

    const sessionToken = signSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      tier: user.tier,
      roles: user.roles,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });

    const res = NextResponse.json({
      authenticated: true,
      provider: "supabase_oauth",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        niche: user.niche,
        tier: user.tier,
        roles: user.roles,
        usage: user.usage,
      },
    });
    res.headers.set("set-cookie", createSessionCookieHeader(sessionToken));
    return res;
  } catch {
    return NextResponse.json(
      { error: "Invalid OAuth callback request." },
      { status: 400 }
    );
  }
}

