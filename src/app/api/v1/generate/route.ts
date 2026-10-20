import { NextResponse } from "next/server";
import {
  checkUserQuota,
  decryptApiKey,
  getAllowedPlatformsForTier,
  getScopedCacheKey,
  getUtcResetWindows,
  selectAiProvider,
  type GatedSocialPlatform,
} from "@/lib/policy";
import { executeAiGeneration, type ConnectedChannelContext } from "@/lib/providers";
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
    const rawContentType =
      typeof body?.contentType === "string" ? body.contentType : "";
    const modality = (
      typeof body?.modality === "string"
        ? body.modality.toLowerCase()
        : rawContentType
          ? rawContentType.toLowerCase()
          : "text"
    ) as "text" | "image" | "video";
    const videoFormat =
      typeof body?.videoFormat === "string" ? body.videoFormat : undefined;
    const visualStyle =
      typeof body?.visualStyle === "string" ? body.visualStyle : undefined;
    const format =
      videoFormat ||
      (typeof body?.format === "string" ? body.format : "Short article");
    const tone =
      typeof body?.tone === "string" ? body.tone : "Clear & encouraging";
    const allowedForTier = getAllowedPlatformsForTier(actor.tier, actor.roles);
    const rawTargets = Array.isArray(body?.targetPlatforms)
      ? (body.targetPlatforms as string[])
      : Array.isArray(body?.platforms)
        ? (body.platforms as string[])
        : ["youtube", "tiktok"];
    const targetPlatforms = rawTargets
      .map((p) => String(p).toLowerCase() as GatedSocialPlatform)
      .filter((p) => allowedForTier.includes(p));
    const platforms = Array.isArray(body?.platforms)
      ? body.platforms
      : targetPlatforms.length > 0
        ? targetPlatforms
        : ["YouTube", "TikTok"];

    // Merge actor's connected channels with any request-provided connectedChannels
    const connectedChannels: Record<string, ConnectedChannelContext> = {};
    for (const [k, v] of Object.entries(actor.userRecord.connectedPlatforms || {})) {
      if (v?.connected && v.handle) {
        connectedChannels[k] = {
          handle: v.handle,
          channelTitle: v.channelTitle,
          followersCount: v.analytics?.followersCount,
        };
      }
    }
    if (body?.connectedChannels && typeof body.connectedChannels === "object") {
      for (const [k, v] of Object.entries(
        body.connectedChannels as Record<string, ConnectedChannelContext>
      )) {
        if (v && typeof v === "object") {
          connectedChannels[k.toLowerCase()] = {
            ...connectedChannels[k.toLowerCase()],
            ...v,
          };
        }
      }
    }

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
        "video_render",
        { roles: actor.roles }
      );
      if (!videoCheck.allowed) {
        return NextResponse.json({ error: videoCheck.reason }, { status: 403 });
      }
    }

    const store = getApiStore();
    const channelHashPart = JSON.stringify(connectedChannels);
    const cacheKey = getScopedCacheKey(
      actor.userId,
      `${prompt}|${channelHashPart}|${visualStyle || ""}`,
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
        { isCacheHit: true, roles: actor.roles }
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
        data: {
          result: cached.responseText,
          adaptations: cached.adaptations,
        },
      });
    }

    const quotaDecision = checkUserQuota(
      actor.tier,
      actor.userRecord.usage,
      "ai_generation",
      { isCacheHit: false, roles: actor.roles }
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
    const byokProvider: "openai" | "replicate" = "openai";

    if (
      !decryptedByok &&
      actor.userRecord.encryptedByok?.openai &&
      process.env.OPENAI_API_KEY
    ) {
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
      cfAiUsedToday: store.platformUsage.cloudflareAiNeurons,
      hfHealthy: body?.simulateAllProvidersDown ? false : true,
      hfUsedToday: store.platformUsage.huggingfaceCalls,
    });

    if (providerChoice.fallbackRequired && body?.simulateAllProvidersDown) {
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
      videoFormat,
      visualStyle,
      tone,
      format,
      platforms,
      targetPlatforms,
      connectedChannels,
      byokKey: decryptedByok,
      byokProvider,
    });

    if (providerChoice.plan === "B") {
      store.platformUsage.cloudflareAiNeurons += 1;
    } else if (providerChoice.plan === "C") {
      store.platformUsage.huggingfaceCalls += 1;
    }

    actor.userRecord.usage.dailyAiGenerations += 1;
    const adaptations = {
      title: genOutput.title,
      youtubeTitle: genOutput.youtubeTitle,
      youtubeDescription: genOutput.youtubeDescription,
      youtubeTags: genOutput.youtubeTags,
      tiktokCaption: genOutput.tiktokCaption,
      tiktokHashtags: genOutput.tiktokHashtags,
      instagramCaption: genOutput.instagramCaption,
      instagramHashtags: genOutput.instagramHashtags,
      xThread: genOutput.xThread,
      linkedinPost: genOutput.linkedinPost,
      facebookPost: genOutput.facebookPost,
    };

    store.aiCache.set(cacheKey, {
      promptHash: cacheKey,
      userId: actor.userId,
      responseText: genOutput.text,
      adaptations,
      provider: providerChoice.provider,
      tokensUsed: genOutput.tokensUsed,
      hitCount: 0,
      createdAt: new Date().toISOString(),
      expiresAt: nowMs + 24 * 60 * 60 * 1000,
    });
    persistApiStore();

    return NextResponse.json({
      cacheHit: false,
      quotaConsumed: true,
      plan: providerChoice.plan,
      provider: providerChoice.provider,
      result: genOutput.text,
      adaptations,
      platformDrafts: genOutput.platformDrafts,
      storyboardScenes: genOutput.storyboardScenes,
      remainingDailyGenerations: Math.max(0, quotaDecision.remaining - 1),
      resetWindows: getUtcResetWindows(),
      data: {
        result: genOutput.text,
        adaptations,
        platformDrafts: genOutput.platformDrafts,
        storyboardScenes: genOutput.storyboardScenes,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid generation request." },
      { status: 400 }
    );
  }
}
