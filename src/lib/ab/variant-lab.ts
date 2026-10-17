import { analyzeCreatorDraft } from "@/lib/seo/analyzer";

export interface AbVariantItem {
  id: "A" | "B" | "C";
  angle: string;
  youtubeTitle: string;
  tiktokHook: string;
  hookScore: number;
  overallScore: number;
  predictedCtrTier: "High" | "Medium-High" | "Standard";
  winner: boolean;
}

export interface AbVariantLabResult {
  costUsd: number;
  winningVariantId: "A" | "B" | "C";
  winningVariant: AbVariantItem;
  variants: [AbVariantItem, AbVariantItem, AbVariantItem];
}

export function generateAbVariantsAndScore(input: {
  title?: string;
  script?: string;
}): AbVariantLabResult {
  const baseTitle = (input.title || "Creator Workflow").trim().slice(0, 56);
  const script = (input.script || baseTitle).trim();

  const rawCandidates: Array<{
    id: "A" | "B" | "C";
    angle: string;
    youtubeTitle: string;
    tiktokHook: string;
  }> = [
    {
      id: "A",
      angle: "Curiosity Gap",
      youtubeTitle: `Why Most Creators Struggle With ${baseTitle} (And How to Fix It)`.slice(
        0,
        100
      ),
      tiktokHook: `Stop doing ${baseTitle.toLowerCase()} the hard way — here is the system that actually works.`,
    },
    {
      id: "B",
      angle: "Contrarian / Myth-Buster",
      youtubeTitle: `Stop Following Outdated Advice on ${baseTitle} — Do This Instead`.slice(
        0,
        100
      ),
      tiktokHook: `Everything you were told about ${baseTitle.toLowerCase()} is backwards. Try this 3-step shift instead.`,
    },
    {
      id: "C",
      angle: "Outcome & Actionable Numbers",
      youtubeTitle: `3 Ways to Master ${baseTitle} in 15 Minutes a Day (Step-by-Step Guide)`.slice(
        0,
        100
      ),
      tiktokHook: `3 ways to build ${baseTitle.toLowerCase()} in 15 minutes a day without burning out: 1) Start small.`,
    },
  ];

  const scored = rawCandidates.map((cand) => {
    const report = analyzeCreatorDraft({
      title: cand.youtubeTitle,
      script: `${cand.tiktokHook}\n\n${script}`,
      youtubeTitle: cand.youtubeTitle,
      tiktokCaption: cand.tiktokHook,
    });
    const predictedCtrTier: "High" | "Medium-High" | "Standard" =
      report.overallScore >= 88
        ? "High"
        : report.overallScore >= 78
          ? "Medium-High"
          : "Standard";

    return {
      ...cand,
      hookScore: report.hookScore,
      overallScore: report.overallScore,
      predictedCtrTier,
      winner: false,
    };
  });

  // Pick the highest overallScore (tie-breaking by hookScore, then C > A > B)
  let bestIdx = 0;
  for (let i = 1; i < scored.length; i++) {
    if (
      scored[i].overallScore > scored[bestIdx].overallScore ||
      (scored[i].overallScore === scored[bestIdx].overallScore &&
        scored[i].hookScore >= scored[bestIdx].hookScore)
    ) {
      bestIdx = i;
    }
  }

  scored[bestIdx].winner = true;
  const winningVariant = scored[bestIdx];

  return {
    costUsd: 0,
    winningVariantId: winningVariant.id,
    winningVariant,
    variants: scored as [AbVariantItem, AbVariantItem, AbVariantItem],
  };
}
