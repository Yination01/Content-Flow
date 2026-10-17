import { NextResponse } from "next/server";
import {
  DEFAULT_BRAND_VOICE,
  applyBrandVoiceToScript,
  type BrandVoiceProfile,
} from "@/lib/voice/brand-voice";
import { extractActorFromRequest } from "@/lib/server/store";

const userVoiceProfiles = new Map<string, BrandVoiceProfile>();

export async function GET(request: Request) {
  const actor = extractActorFromRequest(request);
  const profile = userVoiceProfiles.get(actor.userId) || {
    ...DEFAULT_BRAND_VOICE,
  };

  return NextResponse.json({
    userId: actor.userId,
    profile,
  });
}

export async function POST(request: Request) {
  try {
    const actor = extractActorFromRequest(request);
    const body = await request.json();
    const existing = userVoiceProfiles.get(actor.userId) || {
      ...DEFAULT_BRAND_VOICE,
    };

    const updated: BrandVoiceProfile = {
      toneKeywords: Array.isArray(body?.toneKeywords)
        ? body.toneKeywords
        : existing.toneKeywords,
      bannedWords: Array.isArray(body?.bannedWords)
        ? body.bannedWords
        : existing.bannedWords,
      signatureSignOff:
        typeof body?.signatureSignOff === "string"
          ? body.signatureSignOff.trim()
          : existing.signatureSignOff,
      targetWpm:
        typeof body?.targetWpm === "number" && !Number.isNaN(body.targetWpm)
          ? Math.max(90, Math.min(220, body.targetWpm))
          : existing.targetWpm,
    };

    userVoiceProfiles.set(actor.userId, updated);

    const script =
      typeof body?.script === "string" ? body.script.trim() : undefined;
    const cleaned = script
      ? applyBrandVoiceToScript(script, updated)
      : undefined;

    return NextResponse.json({
      costUsd: 0,
      quotaConsumed: false,
      profile: updated,
      cleaned,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid brand voice payload." },
      { status: 400 }
    );
  }
}
