export interface CreatorTemplate {
  id: string;
  name: string;
  category: "educational" | "storytelling" | "repurpose";
  modality: "text" | "video" | "image";
  platforms: Array<"YouTube" | "TikTok">;
  promptTemplate: string;
  description: string;
}

export interface RepurposedCampaign {
  title: string;
  youtubeLongScript: string;
  tiktokHooks: [string, string, string];
  youtubeCommunityPoll: {
    question: string;
    options: [string, string, string];
  };
  keyTakeaways: string[];
  estimatedReadSeconds: number;
}

export const CREATOR_TEMPLATES: CreatorTemplate[] = [
  {
    id: "tpl-edu-framework",
    name: "3-Step Creator Framework",
    category: "educational",
    modality: "video",
    platforms: ["YouTube", "TikTok"],
    promptTemplate:
      "Break down [topic] into 3 actionable steps with a clear counter-intuitive hook and a 10-second recap.",
    description:
      "High-retention educational structure for tutorials and how-to breakdowns.",
  },
  {
    id: "tpl-edu-mythbuster",
    name: "Common Myth vs Reality",
    category: "educational",
    modality: "text",
    platforms: ["YouTube", "TikTok"],
    promptTemplate:
      "Explain the biggest misconception about [topic], why creators fall for it, and what works instead.",
    description:
      "Contrarian educational opener designed to stop the scroll in the first 3 seconds.",
  },
  {
    id: "tpl-story-behind-scenes",
    name: "Behind-the-Scenes Build Log",
    category: "storytelling",
    modality: "video",
    platforms: ["YouTube", "TikTok"],
    promptTemplate:
      "Share the honest story of building [project], the obstacle that almost stalled it, and the lesson learned.",
    description:
      "Authentic creator storytelling format that builds trust across YouTube and TikTok.",
  },
  {
    id: "tpl-repurpose-pillar",
    name: "Pillar Article to Short-Form Sprint",
    category: "repurpose",
    modality: "text",
    platforms: ["YouTube", "TikTok"],
    promptTemplate:
      "Extract 3 punchy 30-second TikTok scripts and 1 YouTube community poll from this long-form draft: [paste draft].",
    description:
      "Zero-cost multi-channel repurposing template for turning one essay into a week of posts.",
  },
];

export function repurposeContentIntoCampaign(
  sourceText: string,
  rawTitle?: string
): RepurposedCampaign {
  const title = rawTitle?.trim() || "Creator Campaign";
  const paragraphs = sourceText
    .split(/\n\s*\n+/)
    .map((p) => p.replace(/^#+\s*/, "").trim())
    .filter(Boolean);

  const basePoints =
    paragraphs.length >= 3
      ? paragraphs.slice(0, 4)
      : [
          paragraphs[0] || title,
          `Focus on one repeatable system around ${title.toLowerCase()}.`,
          "Shape the hook for each platform's native pacing before queueing.",
        ];

  const keyTakeaways = basePoints.map((pt, i) => `Takeaway ${i + 1}: ${pt}`);

  const tiktokHooks: [string, string, string] = [
    `Stop scrolling if you care about ${title.toLowerCase()} — here is the 30-second breakdown: ${basePoints[0]}`,
    `Most creators get ${title.toLowerCase()} backwards. Do this instead: ${basePoints[1] || basePoints[0]}`,
    `3 things I wish I knew earlier about ${title.toLowerCase()}: ${basePoints.slice(0, 3).join(" | ")}`,
  ];

  const youtubeLongScript = [
    `# ${title} — YouTube Deep-Dive Script`,
    `[00:00 - Hook] ${tiktokHooks[0]}`,
    ...basePoints.map(
      (pt, idx) => `[0${idx + 1}:00 - Section ${idx + 1}] ${pt}`
    ),
    `[Outro & CTA] Which of these steps are you trying this week? Vote in the community poll and subscribe for the next breakdown.`,
  ].join("\n\n");

  const words = sourceText.trim().split(/\s+/).filter(Boolean).length;
  const estimatedReadSeconds = Math.max(10, Math.round((words / 150) * 60));

  return {
    title,
    youtubeLongScript,
    tiktokHooks,
    youtubeCommunityPoll: {
      question: `Which part of "${title}" is your biggest focus right now?`,
      options: [
        "Building a consistent weekly rhythm",
        "Sharpening hooks for YouTube & TikTok",
        "Automating my cross-platform queue",
      ],
    },
    keyTakeaways,
    estimatedReadSeconds,
  };
}
