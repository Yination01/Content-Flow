import { NextResponse } from "next/server";
import {
  createSessionCookieHeader,
  formatCreatorDisplayName,
  hashPassword,
  isSuperuserEmail,
  signSessionToken,
  verifyPassword,
} from "@/lib/server/auth";
import { checkRateLimit, extractRateLimitKey } from "@/lib/server/rate-limit";
import {
  DEFAULT_PASSWORD_HASH,
  getApiStore,
  persistApiStore,
} from "@/lib/server/store";
import {
  supabaseSignInWithPassword,
  syncUserToSupabaseRest,
} from "@/lib/server/supabase-sync";

export async function POST(request: Request) {
  const rl = checkRateLimit(extractRateLimitKey(request, "auth-login"), 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: "Too many sign-in attempts. Please wait before trying again.",
        retryAfterSeconds: rl.retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rl.retryAfterSeconds),
          "X-RateLimit-Limit": String(rl.limit),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  try {
    const body = await request.json();
    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const store = getApiStore();
    const matchedUser = Array.from(store.users.values()).find(
      (u) => u.email.toLowerCase() === email
    );

    if (matchedUser) {
      let valid = Boolean(
        matchedUser.passwordHash &&
          verifyPassword(password, matchedUser.passwordHash)
      );

      if (!valid && isSuperuserEmail(matchedUser.email)) {
        // Recover initial Admin credentials even if account was created via Magic Link, OAuth, or PostgREST sync
        valid = verifyPassword(password, DEFAULT_PASSWORD_HASH);
      }

      if (!valid) {
        const sbAuth = await supabaseSignInWithPassword({ email, password });
        if (sbAuth.authenticated) {
          valid = true;
        }
      }

      if (!valid) {
        return NextResponse.json(
          { error: "Invalid email or password." },
          { status: 401 }
        );
      }

      matchedUser.passwordHash = hashPassword(password);
      matchedUser.lastSeenAt = new Date().toISOString();

      if (isSuperuserEmail(matchedUser.email)) {
        matchedUser.tier = "AGENCY";
        if (!matchedUser.roles.includes("superuser")) {
          matchedUser.roles.push("superuser");
        }
      }
      persistApiStore();

      const token = signSessionToken({
        userId: matchedUser.id,
        email: matchedUser.email,
        name: matchedUser.name,
        tier: matchedUser.tier,
        roles: matchedUser.roles,
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });

      const response = NextResponse.json({
        user: {
          id: matchedUser.id,
          name: matchedUser.name,
          email: matchedUser.email,
          niche: matchedUser.niche,
          tier: matchedUser.tier,
          roles: matchedUser.roles,
          usage: matchedUser.usage,
        },
        session: {
          userId: matchedUser.id,
          email: matchedUser.email,
          expiresInSeconds: 7 * 24 * 3600,
        },
      });
      response.headers.set("set-cookie", createSessionCookieHeader(token));
      return response;
    }

    // Serverless cold-start / multi-device account recovery: check Supabase Auth first, then rehydrate
    const sbAuth = await supabaseSignInWithPassword({ email, password });
    const isSuper = isSuperuserEmail(email);
    const derivedName = formatCreatorDisplayName(
      sbAuth.user?.name || body?.name,
      email
    );
    const userId =
      sbAuth.user?.id ||
      `user-${Buffer.from(email).toString("base64url").slice(0, 12)}`;
    const roles = isSuper
      ? (["creator", "superuser"] as const)
      : (["creator"] as const);
    const tier = isSuper ? ("AGENCY" as const) : ("FREE" as const);

    const recoveredUser = {
      id: userId,
      name: derivedName,
      email,
      niche: sbAuth.user?.niche || "Multi-channel content creation",
      passwordHash: hashPassword(password),
      tier,
      roles: [...roles],
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
    store.users.set(userId, recoveredUser);
    persistApiStore();
    void syncUserToSupabaseRest({
      id: recoveredUser.id,
      email: recoveredUser.email,
      name: recoveredUser.name,
      niche: recoveredUser.niche,
      tier: recoveredUser.tier,
      roles: recoveredUser.roles,
      status: recoveredUser.status,
      joinedAt: recoveredUser.joinedAt,
    });

    const token = signSessionToken({
      userId: recoveredUser.id,
      email: recoveredUser.email,
      name: recoveredUser.name,
      tier: recoveredUser.tier,
      roles: recoveredUser.roles,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });

    const response = NextResponse.json({
      user: {
        id: recoveredUser.id,
        name: recoveredUser.name,
        email: recoveredUser.email,
        niche: recoveredUser.niche,
        tier: recoveredUser.tier,
        roles: recoveredUser.roles,
        usage: recoveredUser.usage,
      },
      session: {
        userId: recoveredUser.id,
        email: recoveredUser.email,
        expiresInSeconds: 7 * 24 * 3600,
      },
    });
    response.headers.set("set-cookie", createSessionCookieHeader(token));
    return response;
  } catch {
    return NextResponse.json({ error: "Invalid login payload." }, { status: 400 });
  }
}
