import { NextResponse } from "next/server";
import { generateAbVariantsAndScore } from "@/lib/ab/variant-lab";
import { getApiStore, persistApiStore } from "@/lib/server/store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const store = getApiStore();

    let title = typeof body?.title === "string" ? body.title.trim() : "";
    let script = typeof body?.script === "string" ? body.script.trim() : "";
    const contentId =
      typeof body?.contentId === "string" ? body.contentId.trim() : "";

    const existing = contentId ? store.contents.get(contentId) : undefined;
    if (contentId && !existing) {
      return NextResponse.json(
        { error: "Content draft not found." },
        { status: 404 }
      );
    }

    if (existing) {
      title = title || existing.title;
      script = script || existing.generatedScript || existing.originalText;
    }

    if (!title && !script) {
      return NextResponse.json(
        { error: "Provide contentId or title/script to run A/B Hook Lab." },
        { status: 400 }
      );
    }

    const labResult = generateAbVariantsAndScore({ title, script });

    let appliedToContentId: string | undefined = undefined;
    if (body?.applyWinner && existing) {
      existing.metadata = {
        ...existing.metadata,
        youtubeTitle: labResult.winningVariant.youtubeTitle,
        tiktokCaption: labResult.winningVariant.tiktokHook,
      };
      existing.updatedAt = new Date().toISOString();
      appliedToContentId = existing.id;
      persistApiStore();
    }

    return NextResponse.json({
      costUsd: 0,
      quotaConsumed: false,
      winningVariantId: labResult.winningVariantId,
      winningVariant: labResult.winningVariant,
      variants: labResult.variants,
      appliedToContentId,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid A/B test payload." },
      { status: 400 }
    );
  }
}
