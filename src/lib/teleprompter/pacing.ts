export interface TeleprompterCue {
  index: number;
  text: string;
  cueType: "camera" | "broll" | "pause";
  wordCount: number;
  durationSeconds: number;
  cumulativeSeconds: number;
}

export interface TeleprompterPlan {
  wpm: number;
  totalWords: number;
  totalDurationSeconds: number;
  cues: TeleprompterCue[];
}

export function buildTeleprompterPlan(
  script: string,
  wpm = 145
): TeleprompterPlan {
  const safeWpm = Math.max(90, Math.min(220, wpm));
  const blocks = script
    .split(/\n\s*\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const rawLines = blocks.length > 0 ? blocks : [script.trim()];
  let cumulativeSeconds = 0;
  let totalWords = 0;

  const cues: TeleprompterCue[] = rawLines.map((line, idx) => {
    const upper = line.toUpperCase();
    let cueType: "camera" | "broll" | "pause" = "camera";
    if (upper.includes("[B-ROLL]") || upper.includes("[BROLL]")) {
      cueType = "broll";
    } else if (upper.includes("[PAUSE]") || upper.includes("[BREATH]")) {
      cueType = "pause";
    }

    const words = line.split(/\s+/).filter(Boolean).length;
    totalWords += words;
    const durationSeconds = Math.max(
      2,
      Math.round((words / safeWpm) * 60)
    );
    cumulativeSeconds += durationSeconds;

    return {
      index: idx + 1,
      text: line,
      cueType,
      wordCount: words,
      durationSeconds,
      cumulativeSeconds,
    };
  });

  return {
    wpm: safeWpm,
    totalWords,
    totalDurationSeconds: cumulativeSeconds,
    cues,
  };
}
