export interface DraftAnalysisCheck {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface DraftAnalysisReport {
  costUsd: number;
  hookScore: number;
  readabilityScore: number;
  overallScore: number;
  wordCount: number;
  estimatedSpeakSeconds: number;
  checks: DraftAnalysisCheck[];
  suggestions: string[];
}

export function analyzeCreatorDraft(input: {
  title?: string;
  script?: string;
  youtubeTitle?: string;
  youtubeTags?: string;
  tiktokCaption?: string;
}): DraftAnalysisReport {
  const title = (input.title || "").trim();
  const script = (input.script || "").trim();
  const youtubeTitle = (input.youtubeTitle || title).trim();
  const youtubeTags = (input.youtubeTags || "").trim();
  const tiktokCaption = (input.tiktokCaption || title).trim();

  const words = script ? script.split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;
  const estimatedSpeakSeconds = Math.max(
    5,
    Math.round((wordCount / 150) * 60)
  );

  const firstSentence = script.split(/[.!?\n]/)[0] || title;
  const hasPowerHook =
    /\b(stop|how|why|ways|secret|mistake|never|always|system|guide|start|build|\d+)\b/i.test(
      `${title} ${firstSentence}`
    );

  let hookScore = 65;
  if (hasPowerHook) hookScore += 20;
  if (firstSentence.length >= 20 && firstSentence.length <= 140) hookScore += 10;
  if (/\d+/.test(title)) hookScore += 5;
  hookScore = Math.min(100, hookScore);

  const sentences = script
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const avgWordsPerSentence =
    sentences.length > 0 ? wordCount / sentences.length : wordCount;
  const readabilityScore =
    avgWordsPerSentence <= 22 && wordCount >= 10
      ? 90
      : avgWordsPerSentence <= 30
        ? 78
        : 62;

  const ytTitleOk =
    youtubeTitle.length > 0 && youtubeTitle.length <= 100;
  const ytTagsOk = youtubeTags.length <= 500;
  const ttCaptionOk = tiktokCaption.length <= 2200;

  const checks: DraftAnalysisCheck[] = [
    {
      id: "hook_retention",
      label: "First 3-second hook strength",
      passed: hookScore >= 75,
      detail:
        hookScore >= 75
          ? `Strong opening hook (${hookScore}/100)`
          : "Add a clearer curiosity gap or number in the opening line.",
    },
    {
      id: "youtube_title_limit",
      label: "YouTube title length (<= 100 chars)",
      passed: ytTitleOk,
      detail: `${youtubeTitle.length} / 100 characters`,
    },
    {
      id: "youtube_tags_limit",
      label: "YouTube tags budget (<= 500 chars)",
      passed: ytTagsOk,
      detail: `${youtubeTags.length} / 500 characters`,
    },
    {
      id: "tiktok_caption_limit",
      label: "TikTok caption limit (<= 2,200 chars)",
      passed: ttCaptionOk,
      detail: `${tiktokCaption.length} / 2,200 characters`,
    },
  ];

  const suggestions: string[] = [];
  if (!ytTitleOk) {
    suggestions.push(
      "Shorten the YouTube title to 100 characters or fewer (45–70 chars is ideal)."
    );
  }
  if (!ytTagsOk) {
    suggestions.push("Trim YouTube tags below 500 total characters.");
  }
  if (!ttCaptionOk) {
    suggestions.push("Trim TikTok caption to 2,200 characters or fewer.");
  }
  if (hookScore < 75) {
    suggestions.push(
      "Start the first sentence with a direct action verb, number, or contrarian takeaway."
    );
  }

  const passedRatio =
    checks.filter((c) => c.passed).length / Math.max(1, checks.length);
  const overallScore = Math.round(
    hookScore * 0.45 + readabilityScore * 0.35 + passedRatio * 100 * 0.2
  );

  return {
    costUsd: 0,
    hookScore,
    readabilityScore,
    overallScore,
    wordCount,
    estimatedSpeakSeconds,
    checks,
    suggestions,
  };
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function renderOpenGraphCardSvgDataUrl(input: {
  title: string;
  status: string;
  overallScore: number;
  authorName?: string;
}): string {
  const safeTitle = escapeXml(input.title.slice(0, 68));
  const safeStatus = escapeXml(input.status.toUpperCase());
  const safeAuthor = escapeXml(input.authorName || "ContentFlow Creator");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
    <defs>
      <linearGradient id="ogBg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#17172a"/>
        <stop offset="60%" stop-color="#282268"/>
        <stop offset="100%" stop-color="#5b4fe9"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#ogBg)" rx="28"/>
    <text x="80" y="110" fill="#b8b2ff" font-family="DM Sans, sans-serif" font-size="24" font-weight="700">CONTENTFLOW SHARE PREVIEW · ${safeStatus}</text>
    <text x="80" y="250" fill="#ffffff" font-family="Fraunces, Georgia, serif" font-size="52" font-weight="700">${safeTitle}</text>
    <text x="80" y="530" fill="#e4e2dc" font-family="DM Sans, sans-serif" font-size="26">${safeAuthor} · Hook &amp; Readiness Score: ${input.overallScore}/100</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
