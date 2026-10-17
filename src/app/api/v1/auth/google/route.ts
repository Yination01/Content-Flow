import { NextResponse } from "next/server";
import { signMagicLinkToken } from "@/lib/server/auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const emailHint = (
    url.searchParams.get("email") || "johnpaulonovo@gmail.com"
  )
    .trim()
    .toLowerCase();
  const nameHint =
    url.searchParams.get("name")?.trim() ||
    emailHint
      .split("@")[0]
      .replace(/[._-]+/g, " ")
      .replace(/\b\w/g, (c: string) => c.toUpperCase());

  const stateToken = signMagicLinkToken({
    email: emailHint,
    name: nameHint,
    exp: Date.now() + 15 * 60 * 1000,
  });

  const callbackUrl = `${url.origin}/api/v1/auth/google/callback?state=${encodeURIComponent(stateToken)}`;

  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  if (googleClientId) {
    const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    googleAuthUrl.searchParams.set("client_id", googleClientId);
    googleAuthUrl.searchParams.set(
      "redirect_uri",
      `${url.origin}/api/v1/auth/google/callback`
    );
    googleAuthUrl.searchParams.set("response_type", "code");
    googleAuthUrl.searchParams.set("scope", "openid email profile");
    googleAuthUrl.searchParams.set("state", stateToken);
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

  return NextResponse.json({
    provider: "google",
    externalOAuth: false,
    authorizationUrl: callbackUrl,
    callbackUrl,
  });
}
