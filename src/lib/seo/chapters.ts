export interface YouTubeChapterEntry {
  index: number;
  startSeconds: number;
  timestamp: string;
  heading: string;
}

export interface YouTubeChaptersResult {
  costUsd: number;
  chapters: YouTubeChapterEntry[];
  youtubeDescription: string;
}

export interface DisclosureCheckResult {
  requiresDisclosure: boolean;
  compliant: boolean;
  detectedTriggers: string[];
  patchedYoutubeDescription: string;
  patchedTiktokCaption: string;
}

function formatChapterTimestamp(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function generateYouTubeChaptersAndDescription(input: {
  title?: string;
  script?: string;
  wpm?: number;
}): YouTubeChaptersResult {
  const title = (input.title || "Creator Guide").trim();
  const script = (input.script || title).trim();
  const wpm = Math.max(100, Math.min(200, input.wpm || 145));

  const rawBlocks = script
    .split(/\n\s*\n+/)
    .map((b) => b.replace(/^#+\s*/, "").trim())
    .filter(Boolean);

  const sections =
    rawBlocks.length >= 3
      ? rawBlocks.slice(0, 6)
      : [
          `Introduction: ${title}`,
          rawBlocks[0] || `Core breakdown of ${title}`,
          `Key Takeaways & Action Steps for ${title}`,
        ];

  let cursorSeconds = 0;
  const chapters: YouTubeChapterEntry[] = sections.map((block, idx) => {
    const startSeconds = idx === 0 ? 0 : cursorSeconds;
    const words = block.split(/\s+/).filter(Boolean).length;
    const duration = Math.max(15, Math.round((words / wpm) * 60));
    cursorSeconds = startSeconds + duration;

    const cleanHeading = block
      .replace(/^\[.*?\]\s*/, "")
      .split(/[.!?\n]/)[0]
      .trim()
      .slice(0, 64);

    return {
      index: idx + 1,
      startSeconds,
      timestamp: formatChapterTimestamp(startSeconds),
      heading: cleanHeading || `Section ${idx + 1}`,
    };
  });

  const chaptersText = chapters
    .map((ch) => `${ch.timestamp} ${ch.heading}`)
    .join("\n");

  const youtubeDescription = [
    `${title} — Full breakdown and practical framework for creators.`,
    "",
    "Timestamps / Chapters:",
    chaptersText,
    "",
    "#ContentFlow #CreatorEconomy #YouTubeStrategy",
  ].join("\n");

  return {
    costUsd: 0,
    chapters,
    youtubeDescription,
  };
}

const PROMO_TRIGGERS: Array<{ label: string; regex: RegExp }> = [
  { label: "ref_query_param", regex: /[?&](ref|aff|partner)=/i },
  { label: "short_affiliate_link", regex: /\b(amzn\.to|bit\.ly|geni\.us)\b/i },
  { label: "affiliate_keyword", regex: /\b(affiliate|sponsored by|partner link|discount code)\b/i },
];

export function checkAndEnforceDisclosure(input: {
  text?: string;
  tiktokCaption?: string;
}): DisclosureCheckResult {
  const text = (input.text || "").trim();
  const tiktokCaption = (input.tiktokCaption || "").trim();
  const combined = `${text} ${tiktokCaption}`;

  const detectedTriggers = PROMO_TRIGGERS.filter((t) =>
    t.regex.test(combined)
  ).map((t) => t.label);

  const requiresDisclosure = detectedTriggers.length > 0;
  const hasYoutubeDisclosure =
    /(?:^|\s)(#ad|#sponsored)\b|\b(ftc disclosure|affiliate link|paid promotion)\b/i.test(
      text
    );
  const hasTiktokDisclosure =
    /(?:^|\s)(#ad|#sponsored)\b|\bpaid partnership\b/i.test(
      tiktokCaption || text
    );

  const compliant =
    !requiresDisclosure || (hasYoutubeDisclosure && hasTiktokDisclosure);

  const patchedYoutubeDescription =
    requiresDisclosure && !hasYoutubeDisclosure
      ? `${text}\n\nFTC Disclosure: This description contains affiliate links or sponsored placement (#ad). If you purchase through these links, I may earn a small commission at no extra cost to you.`
      : text;

  const patchedTiktokCaption =
    requiresDisclosure && !hasTiktokDisclosure
      ? `${tiktokCaption} #ad #sponsored`.trim()
      : tiktokCaption;

  return {
    requiresDisclosure,
    compliant,
    detectedTriggers,
    patchedYoutubeDescription,
    patchedTiktokCaption,
  };
}
