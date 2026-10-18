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
  const token = url.searchParams.get("token") || "";
  const codeParam = url.searchParams.get("code")?.trim();
  const verified = verifyMagicLinkToken(token);

  if (!verified || (codeParam && verified.otpCode && verified.otpCode !== codeParam)) {
    return NextResponse.json(
      { error: "Invalid or expired magic link verification code." },
      { status: 401 }
    );
  }

  const email = verified.email.toLowerCase();
  const store = getApiStore();
  let user = Array.from(store.users.values()).find(
    (u) => u.email.toLowerCase() === email
  );

  const isSuper = isSuperuserEmail(email);
  const derivedName = formatCreatorDisplayName(verified.name, email);

  if (!user) {
    const userId = `user-${Buffer.from(email).toString("base64url").slice(0, 12)}`;
    const roles = isSuper
      ? (["creator", "superuser"] as const)
      : (["creator"] as const);
    user = {
      id: userId,
      name: derivedName,
      email,
      niche: "Multi-channel content creation",
      passwordHash: hashPassword(`magic-${Date.now()}`),
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
    if (verified.name && user.id !== "user-1") {
      user.name = derivedName;
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
      verified: true,
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
