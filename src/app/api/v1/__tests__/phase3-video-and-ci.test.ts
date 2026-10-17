import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  buildVideoStoryboard,
  renderSceneToSvgDataUrl,
} from "@/lib/video/client-renderer";

describe("Phase 3: $0 Client Video Renderer, Free GitHub Actions CI & Deployment Kit", () => {
  it("builds a timed 9:16 TikTok and 16:9 YouTube storyboard from a generated script at $0 server cost", () => {
    const script = [
      "Hook: Stop trying to write from scratch for every platform.",
      "Point 1: Capture one core idea when your energy is highest.",
      "Point 2: Shape the hook for YouTube retention and TikTok pacing.",
      "Call to action: Save this workflow for your next publishing sprint.",
    ].join("\n\n");

    const tiktokBoard = buildVideoStoryboard(script, {
      title: "Creator Workflow",
      aspectRatio: "9:16",
    });

    expect(tiktokBoard.aspectRatio).toBe("9:16");
    expect(tiktokBoard.width).toBe(720);
    expect(tiktokBoard.height).toBe(1280);
    expect(tiktokBoard.scenes.length).toBe(4);
    expect(tiktokBoard.totalDurationMs).toBeGreaterThan(8000);
    expect(tiktokBoard.scenes[0].startMs).toBe(0);
    expect(tiktokBoard.scenes[0].endMs).toBeGreaterThan(0);

    const svgUrl = renderSceneToSvgDataUrl(tiktokBoard.scenes[0], tiktokBoard);
    expect(svgUrl.startsWith("data:image/svg+xml;utf8,")).toBe(true);
    expect(decodeURIComponent(svgUrl)).toContain("Stop trying to write from scratch");

    const youtubeBoard = buildVideoStoryboard(script, {
      title: "Creator Workflow",
      aspectRatio: "16:9",
    });
    expect(youtubeBoard.width).toBe(1280);
    expect(youtubeBoard.height).toBe(720);
  });

  it("includes a valid GitHub Actions Free Tier CI workflow (.github/workflows/ci.yml)", () => {
    const ciPath = path.join(process.cwd(), ".github", "workflows", "ci.yml");
    expect(fs.existsSync(ciPath)).toBe(true);
    const content = fs.readFileSync(ciPath, "utf8");
    expect(content).toContain("npm test");
    expect(content).toContain("npm run typecheck");
    expect(content).toContain("npm run build");
  });

  it("includes .env.example and docs/ZERO_COST_DEPLOYMENT.md with $0 free-tier configuration", () => {
    const envExamplePath = path.join(process.cwd(), ".env.example");
    const deployDocPath = path.join(
      process.cwd(),
      "docs",
      "ZERO_COST_DEPLOYMENT.md"
    );
    expect(fs.existsSync(envExamplePath)).toBe(true);
    expect(fs.existsSync(deployDocPath)).toBe(true);

    const envContent = fs.readFileSync(envExamplePath, "utf8");
    expect(envContent).toContain("NEXT_PUBLIC_SUPABASE_URL=");
    expect(envContent).toContain("CLOUDFLARE_ACCOUNT_ID=");
    expect(envContent).toContain("HUGGINGFACE_API_KEY=");
    expect(envContent).toContain("PAYSTACK_SECRET_KEY=");
    expect(envContent).toContain("ENVELOPE_MASTER_SECRET=");
  });
});
