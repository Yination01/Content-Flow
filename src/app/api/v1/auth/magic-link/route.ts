import { NextResponse } from "next/server";
import { signMagicLinkToken } from "@/lib/server/auth";
import { checkRateLimit, extractRateLimitKey } from "@/lib/server/rate-limit";

export async function POST(request: Request) {
  const rl = checkRateLimit(
    extractRateLimitKey(request, "auth-magic-link"),
    8,
    60_000
  );
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: "Too many magic link requests. Please wait a moment.",
        retryAfterSeconds: rl.retryAfterSeconds,
      },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const name =
      typeof body?.name === "string" && body.name.trim()
        ? body.name.trim()
        : undefined;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Enter a valid email address to receive a magic link." },
        { status: 400 }
      );
    }

    const url = new URL(request.url);
    const token = signMagicLinkToken({
      email,
      name,
      exp: Date.now() + 15 * 60 * 1000,
    });
    const magicLinkUrl = `${url.origin}/api/v1/auth/magic-link/verify?token=${encodeURIComponent(token)}`;

    // Optional Supabase Auth OTP dispatch when configured ($0 free tier)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    let supabaseDispatched = false;
    if (supabaseUrl && supabaseAnonKey) {
      try {
        const otpRes = await fetch(`${supabaseUrl}/auth/v1/otp`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: supabaseAnonKey,
          },
          body: JSON.stringify({
            email,
            create_user: true,
            options: { emailRedirectTo: magicLinkUrl },
          }),
        });
        supabaseDispatched = otpRes.ok;
      } catch {
        // Fallback to signed magicLinkUrl
      }
    }

    return NextResponse.json({
      sent: true,
      email,
      expiresInMinutes: 15,
      supabaseDispatched,
      magicLinkUrl,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to generate magic link." },
      { status: 400 }
    );
  }
}
