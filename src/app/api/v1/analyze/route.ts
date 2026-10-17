import { NextResponse } from "next/server";
import { analyzeCreatorDraft } from "@/lib/seo/analyzer";
import { getApiStore } from "@/lib/server/store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const store = getApiStore();

    let title = typeof body?.title === "string" ? body.title : "";
    let script = typeof body?.script === "string" ? body.script : "";
    let youtubeTitle =
      typeof body?.youtubeTitle === "string" ? body.youtubeTitle : "";
    let youtubeTags =
      typeof body?.youtubeTags === "string" ? body.youtubeTags : "";
    let tiktokCaption =
      typeof body?.tiktokCaption === "string" ? body.tiktokCaption : "";

    if (typeof body?.contentId === "string" && body.contentId.trim()) {
      const item = store.contents.get(body.contentId.trim());
      if (!item) {
        return NextResponse.json(
          { error: "Content draft not found." },
          { status: 404 }
        );
      }
      title = title || item.title;
      script = script || item.generatedScript || item.originalText;
      youtubeTitle = youtubeTitle || item.metadata?.youtubeTitle || item.title;
      youtubeTags = youtubeTags || item.metadata?.youtubeTags || "";
      tiktokCaption =
        tiktokCaption || item.metadata?.tiktokCaption || item.title;
    }

    const analysis = analyzeCreatorDraft({
      title,
      script,
      youtubeTitle,
      youtubeTags,
      tiktokCaption,
    });

    return NextResponse.json({
      costUsd: 0,
      quotaConsumed: false,
      analysis,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid analysis payload." },
      { status: 400 }
    );
  }
}
