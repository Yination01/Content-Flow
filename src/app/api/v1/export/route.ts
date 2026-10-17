import { NextResponse } from "next/server";
import {
  buildSubtitlesFromStoryboard,
  buildVideoStoryboard,
} from "@/lib/video/client-renderer";
import { extractActorFromRequest, getApiStore } from "@/lib/server/store";

export async function GET(request: Request) {
  const actor = extractActorFromRequest(request);
  const store = getApiStore();
  const url = new URL(request.url);
  const format = url.searchParams.get("format");
  const contentId = url.searchParams.get("contentId");

  const userContents = Array.from(store.contents.values()).filter(
    (c) => c.userId === actor.userId
  );

  if ((format === "srt" || format === "vtt") && contentId) {
    const target = userContents.find((c) => c.id === contentId);
    if (!target) {
      return NextResponse.json({ error: "Content not found." }, { status: 404 });
    }
    const board = buildVideoStoryboard(
      target.generatedScript || target.originalText || target.title,
      { title: target.title }
    );
    const subtitleText = buildSubtitlesFromStoryboard(board, format);
    return new NextResponse(subtitleText, {
      status: 200,
      headers: {
        "Content-Type":
          format === "vtt"
            ? "text/vtt; charset=utf-8"
            : "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="contentflow-${target.id}.${format}"`,
      },
    });
  }

  const enrichedContents = userContents.map((c) => {
    const board = buildVideoStoryboard(
      c.generatedScript || c.originalText || c.title,
      { title: c.title }
    );
    return {
      ...c,
      subtitles: {
        srt: buildSubtitlesFromStoryboard(board, "srt"),
        vtt: buildSubtitlesFromStoryboard(board, "vtt"),
      },
    };
  });

  const userJobs = Array.from(store.jobs.values()).filter(
    (j) => j.userId === actor.userId
  );

  return NextResponse.json({
    version: "1.0",
    exportedAt: new Date().toISOString(),
    user: {
      id: actor.userRecord.id,
      name: actor.userRecord.name,
      email: actor.userRecord.email,
      niche: actor.userRecord.niche,
      tier: actor.userRecord.tier,
      usage: actor.userRecord.usage,
    },
    contents: enrichedContents,
    jobs: userJobs,
  });
}
