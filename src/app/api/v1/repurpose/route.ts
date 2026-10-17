import { NextResponse } from "next/server";
import { checkUserQuota } from "@/lib/policy";
import { repurposeContentIntoCampaign } from "@/lib/repurpose/engine";
import {
  extractActorFromRequest,
  getApiStore,
  persistApiStore,
} from "@/lib/server/store";

export async function POST(request: Request) {
  try {
    const actor = extractActorFromRequest(request);
    const body = await request.json();
    const store = getApiStore();

    let sourceText =
      typeof body?.sourceText === "string" ? body.sourceText.trim() : "";
    let title = typeof body?.title === "string" ? body.title.trim() : "";

    if (typeof body?.contentId === "string" && body.contentId.trim()) {
      const existing = store.contents.get(body.contentId.trim());
      if (!existing) {
        return NextResponse.json(
          { error: "Source content draft not found." },
          { status: 404 }
        );
      }
      sourceText =
        existing.generatedScript || existing.originalText || existing.title;
      title = title || existing.title;
    }

    if (!sourceText) {
      return NextResponse.json(
        { error: "Provide either contentId or sourceText to repurpose." },
        { status: 400 }
      );
    }

    const campaign = repurposeContentIntoCampaign(
      sourceText,
      title || "Repurposed Campaign"
    );

    let savedDraft = undefined;
    if (body?.saveAsDraft) {
      const quotaDecision = checkUserQuota(
        actor.tier,
        actor.userRecord.usage,
        "create_post"
      );
      if (!quotaDecision.allowed) {
        return NextResponse.json(
          { error: quotaDecision.reason, campaign },
          { status: 429 }
        );
      }

      const id = `${store.contents.size + 1}`;
      const nowIso = new Date().toISOString();
      savedDraft = {
        id,
        userId: actor.userId,
        title: `[Repurposed] ${campaign.title}`,
        originalText: sourceText,
        generatedScript: campaign.youtubeLongScript,
        contentType: "text" as const,
        status: "ready" as const,
        metadata: {
          tiktokCaption: campaign.tiktokHooks[0],
          youtubeDescription: campaign.keyTakeaways.join(" • "),
        },
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      store.contents.set(id, savedDraft);
      actor.userRecord.usage.monthlyPostsCreated += 1;
      persistApiStore();
    }

    return NextResponse.json({
      costUsd: 0,
      quotaConsumed: false,
      campaign,
      savedDraft,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid repurpose request." },
      { status: 400 }
    );
  }
}
