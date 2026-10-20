import { NextResponse } from "next/server";
import {
  createEncryptedOAuthRef,
  getApiStore,
  persistApiStore,
} from "@/lib/server/store";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state") || "";
  const code = url.searchParams.get("code") || "";

  if (!state || !code) {
    return NextResponse.json(
      { error: "Missing OAuth state or code." },
      { status: 400 }
    );
  }

  const store = getApiStore();
  const pending = store.oauthStates.get(state);

  if (!pending || pending.expiresAt < Date.now()) {
    store.oauthStates.delete(state);
    return NextResponse.json(
      { error: "Invalid or expired single-use OAuth state." },
      { status: 400 }
    );
  }

  // Consume single-use state immediately
  store.oauthStates.delete(state);

  const user = store.users.get(pending.userId);
  const encryptedTokenRef = createEncryptedOAuthRef(
    `oauth_token_${pending.platform}_${code}`
  );
  const handleSlug = user?.name
    ? `@${user.name.replace(/\s+/g, "")}`
    : "@CreatorChannel";
  const handle = handleSlug;
  const expiresAt = new Date(Date.now() + 28 * 86400_000).toISOString();

  if (user) {
    user.connectedPlatforms[pending.platform] = {
      connected: true,
      handle,
      expiresAt,
      encryptedTokenRef,
    };
  }
  persistApiStore();

  // Never return raw OAuth access or refresh tokens to the client
  return NextResponse.json({
    connected: true,
    platform: pending.platform,
    handle,
    expiresAt,
  });
}
