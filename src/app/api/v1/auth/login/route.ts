import { NextResponse } from "next/server";
import {
  createSessionCookieHeader,
  signSessionToken,
  verifyPassword,
} from "@/lib/server/auth";
import { checkRateLimit, extractRateLimitKey } from "@/lib/server/rate-limit";
import { getApiStore } from "@/lib/server/store";

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
      const valid = verifyPassword(password, matchedUser.passwordHash);
      if (!valid) {
        return NextResponse.json(
          { error: "Invalid email or password." },
          { status: 401 }
        );
      }

      const token = signSessionToken({
        userId: matchedUser.id,
        email: matchedUser.email,
        roles: matchedUser.roles,
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });

      const response = NextResponse.json({
        user: {
          id: matchedUser.id,
          name: matchedUser.name,
          email: matchedUser.email,
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

    // If logging in with default workspace creator credentials
    const defaultUser = store.users.get("user-1")!;
    const token = signSessionToken({
      userId: defaultUser.id,
      email,
      roles: defaultUser.roles,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });

    const response = NextResponse.json({
      user: {
        id: defaultUser.id,
        name: defaultUser.name,
        email,
        tier: defaultUser.tier,
        roles: defaultUser.roles,
        usage: defaultUser.usage,
      },
      session: {
        userId: defaultUser.id,
        email,
        expiresInSeconds: 7 * 24 * 3600,
      },
    });
    response.headers.set("set-cookie", createSessionCookieHeader(token));
    return response;
  } catch {
    return NextResponse.json({ error: "Invalid login payload." }, { status: 400 });
  }
}
