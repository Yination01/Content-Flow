import { NextResponse } from "next/server";
import {
  checkAndEnforceDisclosure,
  generateYouTubeChaptersAndDescription,
} from "@/lib/seo/chapters";
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
        { error: "Provide contentId or title/script to generate chapters." },
        { status: 400 }
      );
    }

    const chapterResult = generateYouTubeChaptersAndDescription({
      title,
      script,
    });
    const disclosure = checkAndEnforceDisclosure({
      text: `${script}\n\n${chapterResult.youtubeDescription}`,
      tiktokCaption: existing?.metadata?.tiktokCaption || title,
    });

    const finalYoutubeDescription = disclosure.requiresDisclosure
      ? disclosure.patchedYoutubeDescription
      : chapterResult.youtubeDescription;

    let appliedToContentId: string | undefined = undefined;
    if (body?.applyToDraft && existing) {
      existing.metadata = {
        ...existing.metadata,
        youtubeDescription: finalYoutubeDescription,
        tiktokCaption: disclosure.patchedTiktokCaption,
      };
      existing.updatedAt = new Date().toISOString();
      appliedToContentId = existing.id;
      persistApiStore();
    }

    return NextResponse.json({
      costUsd: 0,
      quotaConsumed: false,
      chapters: chapterResult.chapters,
      youtubeDescription: finalYoutubeDescription,
      disclosure,
      appliedToContentId,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid chapters payload." },
      { status: 400 }
    );
  }
}
