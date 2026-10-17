import { NextResponse } from "next/server";
import {
  checkUserQuota,
  getScopedCacheKey,
  getUtcResetWindows,
  selectAiProvider,
} from "@/lib/policy";
import { extractActorFromRequest, getDemoApiStore } from "@/lib/server/store";

export async function POST(request: Request) {
  try {
    const actor = extractActorFromRequest(request);
    const body = await request.json();
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
    const modality = typeof body?.modality === "string" ? body.modality.toLowerCase() : "text";
    const format = typeof body?.format === "string" ? body.format : "article";
    const tone = typeof body?.tone === "string" ? body.tone : "warm";

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
      const videoCheck = checkUserQuota(actor.tier, actor.userRecord.usage, "video_render");
      if (!videoCheck.allowed) {
        return NextResponse.json({ error: videoCheck.reason }, { status: 403 });
      }
    }

    const store = getDemoApiStore();
    const cacheKey = getScopedCacheKey(actor.userId, prompt, modality, format, tone);
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
      return NextResponse.json({
        demo: true,
        cacheHit: true,
        quotaConsumed: Boolean(quotaDecision.quotaConsumed),
        provider: cached.provider,
        result: cached.responseText,
        remainingDailyGenerations: quotaDecision.remaining,
        resetWindows: getUtcResetWindows(),
      });
    }

    const quotaDecision = checkUserQuota(actor.tier, actor.userRecord.usage, "ai_generation", {
      isCacheHit: false,
    });
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

    const ephemeralByok = request.headers.get("x-byok-key");
    const providerChoice = selectAiProvider({
      tier: actor.tier,
      hasValidByok: Boolean(ephemeralByok),
      byokProvider: "openai",
      cfAiHealthy: body?.simulateAllProvidersDown ? false : true,
      cfAiUsedToday: 1200,
      hfHealthy: body?.simulateAllProvidersDown ? false : true,
      hfUsedToday: 240,
    });

    if (providerChoice.fallbackRequired) {
      return NextResponse.json(
        {
          demo: true,
          fallback_required: true,
          provider: providerChoice.provider,
          reason: providerChoice.reason,
        },
        { status: 503 }
      );
    }

    actor.userRecord.usage.dailyAiGenerations += 1;
    const generatedText = `Consistency is not about showing up every day; it is about building a creative rhythm you can return to.\n\nDrafted from prompt: "${prompt.slice(0, 120)}"\n\nStart by choosing one core idea worth repeating, then adapt the framing for YouTube and TikTok without losing your voice.`;

    store.aiCache.set(cacheKey, {
      promptHash: cacheKey,
      userId: actor.userId,
      responseText: generatedText,
      provider: providerChoice.provider,
      tokensUsed: 148,
      hitCount: 0,
      createdAt: new Date().toISOString(),
      expiresAt: nowMs + 24 * 60 * 60 * 1000,
    });

    return NextResponse.json({
      demo: true,
      cacheHit: false,
      quotaConsumed: true,
      plan: providerChoice.plan,
      provider: providerChoice.provider,
      result: generatedText,
      remainingDailyGenerations: Math.max(0, quotaDecision.remaining - 1),
      resetWindows: getUtcResetWindows(),
    });
  } catch {
    return NextResponse.json({ error: "Invalid generation request." }, { status: 400 });
  }
}
