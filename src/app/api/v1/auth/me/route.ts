import { NextResponse } from "next/server";
import { getUtcResetWindows, TIER_LIMITS } from "@/lib/policy";
import { extractActorFromRequest } from "@/lib/server/store";

export async function GET(request: Request) {
  const actor = extractActorFromRequest(request);
  const maskedKeys: Record<string, string> = {};
  for (const [provider, env] of Object.entries(actor.userRecord.encryptedByok || {})) {
    maskedKeys[provider] = env.maskedPreview;
  }

  const connectedPlatforms: Record<
    string,
    { connected: boolean; handle: string; expiresAt: string }
  > = {};
  for (const [platform, info] of Object.entries(actor.userRecord.connectedPlatforms)) {
    connectedPlatforms[platform] = {
      connected: info.connected,
      handle: info.handle,
      expiresAt: info.expiresAt,
    };
  }

  return NextResponse.json({
    user: {
      id: actor.userRecord.id,
      name: actor.userRecord.name,
      email: actor.userRecord.email,
      niche: actor.userRecord.niche,
      tier: actor.userRecord.tier,
      roles: actor.roles,
      usage: actor.userRecord.usage,
      limits: TIER_LIMITS[actor.userRecord.tier],
      maskedKeys,
      connectedPlatforms,
      resetWindows: getUtcResetWindows(),
    },
  });
}
