export interface BrandVoiceProfile {
  toneKeywords: string[];
  bannedWords: string[];
  signatureSignOff: string;
  targetWpm: number;
}

export interface BrandVoiceApplicationResult {
  cleanedScript: string;
  removedClichesCount: number;
  appliedSignOff: boolean;
}

export const DEFAULT_BRAND_VOICE: BrandVoiceProfile = {
  toneKeywords: ["calm", "actionable", "creator-first"],
  bannedWords: [
    "in today's fast-paced world",
    "delve into",
    "game-changer",
    "testament to",
  ],
  signatureSignOff: "Keep creating at a sustainable pace.",
  targetWpm: 145,
};

const CLICHE_REPLACEMENTS: Record<string, string> = {
  "in today's fast-paced world,": "",
  "in today's fast-paced world": "Right now",
  "delve into": "explore",
  "game-changer": "high-leverage shift",
  "testament to": "proof of",
};

export function applyBrandVoiceToScript(
  script: string,
  profile: BrandVoiceProfile = DEFAULT_BRAND_VOICE
): BrandVoiceApplicationResult {
  let working = script.trim();
  let removedClichesCount = 0;

  const phrases = Array.from(
    new Set([
      ...DEFAULT_BRAND_VOICE.bannedWords,
      ...(profile.bannedWords || []),
    ])
  );

  for (const phrase of phrases) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`${escaped},?`, "gi");
    if (regex.test(working)) {
      removedClichesCount += 1;
      const replacement =
        CLICHE_REPLACEMENTS[phrase.toLowerCase()] ?? "focus on";
      working = working.replace(regex, replacement);
    }
  }

  working = working
    .replace(/\s{2,}/g, " ")
    .replace(/^\s*,\s*/, "")
    .trim();

  if (working.length > 0) {
    working = working[0].toUpperCase() + working.slice(1);
  }

  const signOff = (profile.signatureSignOff || "").trim();
  let appliedSignOff = false;
  if (signOff && !working.includes(signOff)) {
    working = `${working}\n\n${signOff}`;
    appliedSignOff = true;
  }

  return {
    cleanedScript: working,
    removedClichesCount,
    appliedSignOff,
  };
}
