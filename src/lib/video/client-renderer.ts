export interface VideoScene {
  sceneNumber: number;
  caption: string;
  durationMs: number;
  startMs: number;
  endMs: number;
}

export interface VideoStoryboard {
  title: string;
  aspectRatio: "9:16" | "16:9";
  width: number;
  height: number;
  totalDurationMs: number;
  scenes: VideoScene[];
}

export interface WebmRenderPlan {
  fps: number;
  width: number;
  height: number;
  totalFrames: number;
  totalDurationMs: number;
  mimeCandidates: string[];
  sceneFrames: Array<{
    sceneNumber: number;
    caption: string;
    startFrame: number;
    endFrame: number;
    frameCount: number;
  }>;
}

export function buildVideoStoryboard(
  script: string,
  options?: { title?: string; aspectRatio?: "9:16" | "16:9" }
): VideoStoryboard {
  const aspectRatio = options?.aspectRatio ?? "9:16";
  const width = aspectRatio === "9:16" ? 720 : 1280;
  const height = aspectRatio === "9:16" ? 1280 : 720;
  const title = options?.title?.trim() || "ContentFlow Studio Video";

  const blocks = script
    .split(/\n\s*\n+/)
    .map((line) => line.replace(/^#+\s*/, "").trim())
    .filter((line) => line.length > 0);

  const rawScenes = blocks.length > 0 ? blocks : [script.trim() || title];
  let cursorMs = 0;

  const scenes: VideoScene[] = rawScenes.slice(0, 8).map((caption, idx) => {
    const wordCount = caption.split(/\s+/).filter(Boolean).length;
    const durationMs = Math.max(2500, Math.min(6000, wordCount * 320));
    const scene: VideoScene = {
      sceneNumber: idx + 1,
      caption,
      durationMs,
      startMs: cursorMs,
      endMs: cursorMs + durationMs,
    };
    cursorMs += durationMs;
    return scene;
  });

  return {
    title,
    aspectRatio,
    width,
    height,
    totalDurationMs: cursorMs,
    scenes,
  };
}

export function buildWebmRenderPlan(
  board: VideoStoryboard,
  fps = 30
): WebmRenderPlan {
  const safeFps = Math.max(15, Math.min(60, fps));
  let currentFrame = 0;

  const sceneFrames = board.scenes.map((scene) => {
    const frameCount = Math.max(
      1,
      Math.round((scene.durationMs / 1000) * safeFps)
    );
    const entry = {
      sceneNumber: scene.sceneNumber,
      caption: scene.caption,
      startFrame: currentFrame,
      endFrame: currentFrame + frameCount - 1,
      frameCount,
    };
    currentFrame += frameCount;
    return entry;
  });

  return {
    fps: safeFps,
    width: board.width,
    height: board.height,
    totalFrames: currentFrame,
    totalDurationMs: board.totalDurationMs,
    mimeCandidates: [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
    ],
    sceneFrames,
  };
}

function formatSubtitleTimestamp(
  ms: number,
  separator: "," | "."
): string {
  const totalMs = Math.max(0, Math.floor(ms));
  const hours = Math.floor(totalMs / 3_600_000);
  const minutes = Math.floor((totalMs % 3_600_000) / 60_000);
  const seconds = Math.floor((totalMs % 60_000) / 1000);
  const millis = totalMs % 1000;

  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  const mmm = String(millis).padStart(3, "0");
  return `${hh}:${mm}:${ss}${separator}${mmm}`;
}

export function buildSubtitlesFromStoryboard(
  board: VideoStoryboard,
  format: "srt" | "vtt" = "srt"
): string {
  const sep = format === "srt" ? "," : ".";
  const blocks = board.scenes.map((scene) => {
    const start = formatSubtitleTimestamp(scene.startMs, sep);
    const end = formatSubtitleTimestamp(scene.endMs, sep);
    return `${scene.sceneNumber}\n${start} --> ${end}\n${scene.caption}`;
  });

  if (format === "vtt") {
    return `WEBVTT\n\n${blocks.join("\n\n")}\n`;
  }
  return `${blocks.join("\n\n")}\n`;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function renderSceneToSvgDataUrl(
  scene: VideoScene,
  board: Pick<
    VideoStoryboard,
    "title" | "aspectRatio" | "width" | "height" | "scenes"
  >
): string {
  const { width, height, title, aspectRatio } = board;
  const totalScenes = board.scenes.length;
  const safeTitle = escapeXml(title.slice(0, 48));
  const safeCaption = escapeXml(scene.caption.slice(0, 140));

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#17172a"/>
        <stop offset="55%" stop-color="#2c246c"/>
        <stop offset="100%" stop-color="#5b4fe9"/>
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#bg)" rx="24"/>
    <rect x="48" y="48" width="${width - 96}" height="${height - 96}" rx="20" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="2"/>
    <text x="84" y="112" fill="#b8b2ff" font-family="DM Sans, sans-serif" font-size="22" font-weight="700">CONTENTFLOW · ${aspectRatio} · SCENE ${scene.sceneNumber}/${totalScenes}</text>
    <text x="84" y="158" fill="#ffffff" font-family="Fraunces, Georgia, serif" font-size="30" font-weight="600">${safeTitle}</text>
    <foreignObject x="84" y="${Math.round(height * 0.34)}" width="${width - 168}" height="${Math.round(height * 0.44)}">
      <div xmlns="http://www.w3.org/1999/xhtml" style="color:#ffffff;font-family:'DM Sans',sans-serif;font-size:${aspectRatio === "9:16" ? "34px" : "30px"};line-height:1.38;font-weight:600;background:rgba(15,15,28,0.52);padding:28px;border-radius:18px;border:1px solid rgba(255,255,255,0.16);">
        ${safeCaption}
      </div>
    </foreignObject>
    <text x="84" y="${height - 78}" fill="rgba(255,255,255,0.75)" font-family="JetBrains Mono, monospace" font-size="20">${(scene.startMs / 1000).toFixed(1)}s – ${(scene.endMs / 1000).toFixed(1)}s · $0 Client Render</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
