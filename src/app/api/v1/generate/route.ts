import { NextResponse } from "next/server";
import {
  checkUserQuota,
  decryptApiKey,
  getScopedCacheKey,
  getUtcResetWindows,
  selectAiProvider,
} from "@/lib/policy";
import { executeAiGeneration } from "@/lib/providers";
import {
  extractActorFromRequest,
  getApiStore,
  getEnvelopeMasterSecret,
  persistApiStore,
} from "@/lib/server/store";

export async function POST(request: Request) {
  try {
    const actor = extractActorFromRequest(request);
    const body = await request.json();
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
    const modality = (
      typeof body?.modality === "string" ? body.modality.toLowerCase() : "text"
    ) as "text" | "image" | "video";
    const format = typeof body?.format === "string" ? body.format : "Short article";
    const tone = typeof body?.tone === "string" ? body.tone : "Clear & encouraging";
    const platforms = Array.isArray(body?.platforms)
      ? body.platforms
      : ["YouTube", "TikTok"];

    if (!prompt || prompt.length > 1000) {
      return NextResponse.json(
        { error: "Prompt is required and must be 1,000 characters or fewer." },
        { status: 400 }
      );
    }

    if (!["text", "image", "video"].includes(modality)) {
      return NextResponse.json(
        { error: "Modality must be text, image, or video." },
        { status: 400 }
      );
    }

    if (modality === "video") {
      const videoCheck = checkUserQuota(
        actor.tier,
        actor.userRecord.usage,
        "video_render"
      );
      if (!videoCheck.allowed) {
        return NextResponse.json({ error: videoCheck.reason }, { status: 403 });
      }
    }

    const store = getApiStore();
    const cacheKey = getScopedCacheKey(
      actor.userId,
      prompt,
      modality,
      format,
      tone
    );
    const cached = store.aiCache.get(cacheKey);
    const nowMs = Date.now();

    if (cached && cached.expiresAt > nowMs) {
      cached.hitCount += 1;
      const quotaDecision = checkUserQuota(
        actor.tier,
        actor.userRecord.usage,
        "ai_generation",
        { isCacheHit: true }
      );
      persistApiStore();
      return NextResponse.json({
        cacheHit: true,
        quotaConsumed: Boolean(quotaDecision.quotaConsumed),
        provider: cached.provider,
        result: cached.responseText,
        adaptations: cached.adaptations,
        remainingDailyGenerations: quotaDecision.remaining,
        resetWindows: getUtcResetWindows(),
      });
    }

    const quotaDecision = checkUserQuota(
      actor.tier,
      actor.userRecord.usage,
      "ai_generation",
      { isCacheHit: false }
    );
    if (!quotaDecision.allowed) {
      return NextResponse.json(
        {
          error: quotaDecision.reason,
          remainingDailyGenerations: 0,
          resetWindows: getUtcResetWindows(),
        },
        { status: 429 }
      );
    }

    let decryptedByok: string | undefined =
      request.headers.get("x-byok-key") || undefined;
    let byokProvider: "openai" | "replicate" = "openai";

    if (!decryptedByok && actor.userRecord.encryptedByok?.openai && process.env.OPENAI_API_KEY) {
      try {
        decryptedByok = decryptApiKey(
          actor.userRecord.encryptedByok.openai,
          getEnvelopeMasterSecret()
        );
      } catch {
        decryptedByok = undefined;
      }
    }

    const providerChoice = selectAiProvider({
      tier: actor.tier,
      hasValidByok: Boolean(decryptedByok),
      byokProvider,
      cfAiHealthy: body?.simulateAllProvidersDown ? false : true,
      cfAiUsedToday: 1200,
      hfHealthy: body?.simulateAllProvidersDown ? false : true,
      hfUsedToday: 240,
    });

    if (providerChoice.fallbackRequired) {
      return NextResponse.json(
        {
          fallback_required: true,
          provider: providerChoice.provider,
          reason: providerChoice.reason,
        },
        { status: 503 }
      );
    }

    const genOutput = await executeAiGeneration({
      prompt,
      modality,
      tone,
      format,
      platforms,
      byokKey: decryptedByok,
      byokProvider,
    });

    actor.userRecord.usage.dailyAiGenerations += 1;
    const adaptations = {
      title: genOutput.title,
      youtubeTitle: genOutput.youtubeTitle,
      youtubeDescription: genOutput.youtubeDescription,
      youtubeTags: genOutput.youtubeTags,
      tiktokCaption: genOutput.tiktokCaption,
      tiktokHashtags: genOutput.tiktokHashtags,
    };

    store.aiCache.set(cacheKey, {
      promptHash: cacheKey,
      userId: actor.userId,
      responseText: genOutput.text,
      adaptations,
      provider: genOutput.provider,
      tokensUsed: genOutput.tokensUsed,
      hitCount: 0,
      createdAt: new Date().toISOString(),
      expiresAt: nowMs + 24 * 60 * 60 * 1000,
    });
    persistApiStore();

    return NextResponse.json({
      cacheHit: false,
      quotaConsumed: true,
      plan: genOutput.plan,
      provider: genOutput.provider,
      result: genOutput.text,
      adaptations,
      remainingDailyGenerations: Math.max(0, quotaDecision.remaining - 1),
      resetWindows: getUtcResetWindows(),
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid generation request." },
      { status: 400 }
    );
  }
}
