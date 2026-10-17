import { NextResponse } from "next/server";
import {
  analyzeCreatorDraft,
  renderOpenGraphCardSvgDataUrl,
} from "@/lib/seo/analyzer";
import { getApiStore } from "@/lib/server/store";

export async function GET(
  _request: Request,
  context: { params: { id: string } }
) {
  const store = getApiStore();
  const item = store.contents.get(context.params.id);
  if (!item) {
    return NextResponse.json(
      { error: "Shared draft not found." },
      { status: 404 }
    );
  }

  const owner = store.users.get(item.userId);
  const analysis = analyzeCreatorDraft({
    title: item.title,
    script: item.generatedScript || item.originalText,
    youtubeTitle: item.metadata?.youtubeTitle || item.title,
    youtubeTags: item.metadata?.youtubeTags || "",
    tiktokCaption: item.metadata?.tiktokCaption || item.title,
  });

  const openGraphSvgDataUrl = renderOpenGraphCardSvgDataUrl({
    title: item.title,
    status: item.status,
    overallScore: analysis.overallScore,
    authorName: owner?.name || "ContentFlow Creator",
  });

  return NextResponse.json({
    preview: {
      id: item.id,
      title: item.title,
      script: item.generatedScript || item.originalText,
      contentType: item.contentType,
      status: item.status,
      authorName: owner?.name || "ContentFlow Creator",
      updatedAt: item.updatedAt,
      analysis,
      openGraphSvgDataUrl,
    },
  });
}
