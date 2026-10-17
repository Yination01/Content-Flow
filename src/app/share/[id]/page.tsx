import Link from "next/link";
import {
  analyzeCreatorDraft,
  renderOpenGraphCardSvgDataUrl,
} from "@/lib/seo/analyzer";
import { getApiStore } from "@/lib/server/store";

export default function SharePreviewPage({
  params,
}: {
  params: { id: string };
}) {
  const store = getApiStore();
  const item = store.contents.get(params.id) || store.contents.get("1");
  const title = item?.title || "A creator's guide to consistent content";
  const script =
    item?.generatedScript ||
    item?.originalText ||
    "Consistency is not about showing up every day; it is about building a creative rhythm you can return to.";
  const status = item?.status || "draft";
  const owner = item ? store.users.get(item.userId) : undefined;
  const authorName = owner?.name || "Maya Chen";

  const analysis = analyzeCreatorDraft({
    title,
    script,
    youtubeTitle: item?.metadata?.youtubeTitle || title,
    youtubeTags: item?.metadata?.youtubeTags || "",
    tiktokCaption: item?.metadata?.tiktokCaption || title,
  });

  const ogSvgUrl = renderOpenGraphCardSvgDataUrl({
    title,
    status,
    overallScore: analysis.overallScore,
    authorName,
  });

  return (
    <main className="legal-page" style={{ maxWidth: "860px", margin: "0 auto", padding: "40px 20px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <span className="eyebrow">Read-Only Sponsor &amp; Collaborator Preview ($0 Seat Cost)</span>
          <h1 style={{ margin: "6px 0 0" }}>{title}</h1>
        </div>
        <div className="button-row">
          <a
            className="button button--secondary"
            href={`/api/v1/export?format=srt&contentId=${item?.id || "1"}`}
            download={`contentflow-${item?.id || "1"}.srt`}
          >
            Download .srt Subtitles
          </a>
          <Link className="button button--primary" href="/dashboard">
            Open Creator Workspace
          </Link>
        </div>
      </header>

      <img
        src={ogSvgUrl}
        alt={`${title} OpenGraph preview card`}
        style={{ width: "100%", borderRadius: "16px", marginBottom: "24px", border: "1px solid #e4e2dc" }}
      />

      <section className="card" style={{ padding: "24px", marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
          <strong>Script &amp; Multi-Platform Draft</strong>
          <span>
            Hook Score: <strong>{analysis.hookScore}/100</strong> · Readiness:{" "}
            <strong>{analysis.overallScore}/100</strong> · {analysis.wordCount} words (~{analysis.estimatedSpeakSeconds}s)
          </span>
        </div>
        <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", lineHeight: 1.65, margin: 0 }}>
          {script}
        </pre>
      </section>
    </main>
  );
}
