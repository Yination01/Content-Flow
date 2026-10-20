import { NextResponse } from "next/server";
import {
  createEncryptedOAuthRef,
  extractActorFromRequest,
  getApiStore,
  persistApiStore,
} from "@/lib/server/store";
import {
  verifyOAuthStateToken,
  parsePlatformsCookieFromRequest,
  createPlatformsCookieHeader,
} from "@/lib/server/auth";

const consumedOAuthStates = new Set<string>();

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state") || "";
  const code = url.searchParams.get("code") || "";
  const customHandle = url.searchParams.get("handle") || "";

  if (!state || !code) {
    return NextResponse.json(
      { error: "Missing OAuth state or code." },
      { status: 400 }
    );
  }

  const store = getApiStore();
  const pending = store.oauthStates.get(state);

  if (consumedOAuthStates.has(state)) {
    store.oauthStates.delete(state);
    return NextResponse.json(
      { error: "Invalid or expired single-use OAuth state." },
      { status: 400 }
    );
  }

  let resolvedUserId = "";
  let resolvedPlatform: "youtube" | "tiktok" = "youtube";

  if (pending) {
    if (pending.expiresAt < Date.now()) {
      store.oauthStates.delete(state);
      return NextResponse.json(
        { error: "Invalid or expired single-use OAuth state." },
        { status: 400 }
      );
    }
    resolvedUserId = pending.userId;
    resolvedPlatform = pending.platform;
    store.oauthStates.delete(state);
    consumedOAuthStates.add(state);
  } else {
    const signedPayload = verifyOAuthStateToken(state);
    if (!signedPayload) {
      return NextResponse.json(
        { error: "Invalid or expired single-use OAuth state." },
        { status: 400 }
      );
    }
    resolvedUserId = signedPayload.userId;
    resolvedPlatform = signedPayload.platform;
    consumedOAuthStates.add(state);
  }

  const actor = extractActorFromRequest(request);
  const user = store.users.get(resolvedUserId) || actor.userRecord;
  const encryptedTokenRef = createEncryptedOAuthRef(
    `oauth_token_${resolvedPlatform}_${code}`
  );
  let handle = customHandle.trim();
  if (!handle) {
    const handleSlug = user?.name
      ? `@${user.name.replace(/\s+/g, "")}`
      : "@CreatorChannel";
    handle = handleSlug;
  } else if (!handle.startsWith("@")) {
    handle = `@${handle}`;
  }
  const verifiedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 28 * 86400_000).toISOString();
  const scopes =
    resolvedPlatform === "youtube"
      ? ["youtube.upload", "youtube.readonly"]
      : ["video.upload", "video.publish"];
  const channelTitle = `${handle.replace(/^@/, "")} (${
    resolvedPlatform === "youtube" ? "YouTube" : "TikTok"
  })`;

  if (user) {
    user.connectedPlatforms[resolvedPlatform] = {
      connected: true,
      handle,
      channelTitle,
      scopes,
      verifiedAt,
      expiresAt,
      encryptedTokenRef,
    };
  }
  persistApiStore();

  const cookiePlatforms = parsePlatformsCookieFromRequest(request);
  const mergedPlatforms = {
    ...cookiePlatforms,
    [resolvedPlatform]: {
      connected: true,
      handle,
      channelTitle,
      scopes,
      verifiedAt,
      expiresAt,
    },
  };
  const setCookieHeader = createPlatformsCookieHeader(mergedPlatforms);

  const accept = request.headers.get("accept") || "";
  const wantsHtmlRedirect =
    accept.includes("text/html") || url.searchParams.get("redirect") === "1";

  if (wantsHtmlRedirect) {
    const redirectTarget = `${url.origin}/settings?section=Platform%20connections&connected=${encodeURIComponent(resolvedPlatform)}&handle=${encodeURIComponent(handle)}`;
    return NextResponse.redirect(redirectTarget, {
      status: 302,
      headers: {
        "Set-Cookie": setCookieHeader,
      },
    });
  }

  // Never return raw OAuth access or refresh tokens to the client
  return NextResponse.json(
    {
      connected: true,
      platform: resolvedPlatform,
      handle,
      expiresAt,
      data: {
        connected: true,
        platform: resolvedPlatform,
        handle,
        expiresAt,
      },
    },
    {
      status: 200,
      headers: {
        "Set-Cookie": setCookieHeader,
      },
    }
  );
}
