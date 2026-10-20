import { NextResponse } from "next/server";
import { signMagicLinkToken } from "@/lib/server/auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const emailHint = (url.searchParams.get("email") || "").trim().toLowerCase();
  const nameHint =
    url.searchParams.get("name")?.trim() ||
    (emailHint
      ? emailHint
          .split("@")[0]
          .replace(/[._-]+/g, " ")
          .replace(/\b\w/g, (c: string) => c.toUpperCase())
      : "");

  const stateToken = signMagicLinkToken({
    email: emailHint || "oauth-pending@contentflow.app",
    name: nameHint || undefined,
    exp: Date.now() + 15 * 60 * 1000,
  });

  const callbackUrl = `${url.origin}/api/v1/auth/google/callback?state=${encodeURIComponent(stateToken)}`;

  // 1. Direct Google OAuth 2.0 Client ID if configured with a valid .apps.googleusercontent.com ID
  const googleClientId = (process.env.GOOGLE_CLIENT_ID || "").trim();
  if (
    googleClientId.endsWith(".apps.googleusercontent.com") &&
    !googleClientId.includes("placeholder") &&
    !googleClientId.includes("your-")
  ) {
    const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    googleAuthUrl.searchParams.set("client_id", googleClientId);
    googleAuthUrl.searchParams.set(
      "redirect_uri",
      `${url.origin}/api/v1/auth/google/callback`
    );
    googleAuthUrl.searchParams.set("response_type", "code");
    googleAuthUrl.searchParams.set("scope", "openid email profile");
    googleAuthUrl.searchParams.set("state", stateToken);
    googleAuthUrl.searchParams.set("prompt", "select_account");
    if (emailHint) {
      googleAuthUrl.searchParams.set("login_hint", emailHint);
    }
    return NextResponse.json({
      provider: "google",
      externalOAuth: true,
      authorizationUrl: googleAuthUrl.toString(),
      callbackUrl,
    });
  }

  // 2. Supabase Auth Google OAuth provider if NEXT_PUBLIC_SUPABASE_URL is configured and no emailHint override was passed
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl && !emailHint) {
    const sbAuthUrl = new URL(`${supabaseUrl}/auth/v1/authorize`);
    sbAuthUrl.searchParams.set("provider", "google");
    sbAuthUrl.searchParams.set("redirect_to", `${url.origin}/login`);
    return NextResponse.json({
      provider: "google",
      externalOAuth: true,
      supabaseOAuth: true,
      authorizationUrl: sbAuthUrl.toString(),
      callbackUrl,
    });
  }

  return NextResponse.json({
    provider: "google",
    externalOAuth: false,
    authorizationUrl: callbackUrl,
    callbackUrl,
  });
}

