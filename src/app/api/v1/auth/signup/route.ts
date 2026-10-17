import { NextResponse } from "next/server";
import {
  createSessionCookieHeader,
  hashPassword,
  signSessionToken,
} from "@/lib/server/auth";
import { getApiStore, persistApiStore } from "@/lib/server/store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const name =
      typeof body?.name === "string" && body.name.trim()
        ? body.name.trim()
        : email.split("@")[0] || "Creator";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "A valid email address is required." },
        { status: 400 }
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long." },
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

    const userId = `user-${Date.now()}`;
    const superuserEmails = new Set([
      "johnpaulonovo@gmail.com",
      "maya@contentflow.app",
      ...(process.env.SUPERUSER_EMAIL
        ? [process.env.SUPERUSER_EMAIL.trim().toLowerCase()]
        : []),
    ]);
    const isBootstrapSuperuser = superuserEmails.has(email);

    const roles = isBootstrapSuperuser
      ? (["creator", "superuser"] as const)
      : (["creator"] as const);

    const newUser = {
      id: userId,
      name,
      email,
      niche: "Multi-channel content creation",
      passwordHash: hashPassword(password),
      tier: isBootstrapSuperuser ? ("AGENCY" as const) : ("FREE" as const),
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

    store.users.set(userId, newUser);
    persistApiStore();

    const token = signSessionToken({
      userId,
      email,
      roles: newUser.roles,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });

    const response = NextResponse.json(
      {
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          tier: newUser.tier,
          roles: newUser.roles,
          usage: newUser.usage,
        },
      },
      { status: 201 }
    );
    response.headers.set("set-cookie", createSessionCookieHeader(token));
    return response;
  } catch {
    return NextResponse.json(
      { error: "Invalid signup request payload." },
      { status: 400 }
    );
  }
}
