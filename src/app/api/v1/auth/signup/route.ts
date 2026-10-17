import { NextResponse } from "next/server";
import { getDemoApiStore } from "@/lib/server/store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    const store = getDemoApiStore();
    const userId = `user-${Date.now()}`;
    store.users.set(userId, {
      id: userId,
      name: email.split("@")[0],
      email,
      tier: "FREE",
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
    });

    return NextResponse.json({
      demo: !process.env.NEXT_PUBLIC_SUPABASE_URL,
      message: "Demo workspace account created. No external account was provisioned.",
      user: {
        id: userId,
        email,
        tier: "FREE",
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid signup request payload." }, { status: 400 });
  }
}
