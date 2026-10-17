import { beforeEach, describe, expect, it } from "vitest";
import { resetApiStoreForTests } from "@/lib/server/store";
import {
  DEFAULT_BRAND_VOICE,
  applyBrandVoiceToScript,
} from "@/lib/voice/brand-voice";
import { buildTeleprompterPlan } from "@/lib/teleprompter/pacing";
import {
  GET as brandVoiceGet,
  POST as brandVoicePost,
} from "@/app/api/v1/brand-voice/route";

describe("Phase 10: $0 Brand Voice Cliché Filter & In-Browser Teleprompter Engine", () => {
  beforeEach(() => {
    resetApiStoreForTests();
  });

  it("strips generic AI clichés and appends creator signature sign-off at $0 token cost", () => {
    const raw =
      "In today's fast-paced world, we will delve into why consistent systems are a game-changer for creators.";

    const result = applyBrandVoiceToScript(raw, {
      ...DEFAULT_BRAND_VOICE,
      bannedWords: ["delve into", "game-changer"],
      signatureSignOff: "Keep building with intention.",
    });

    expect(result.removedClichesCount).toBeGreaterThanOrEqual(2);
    expect(result.cleanedScript.toLowerCase()).not.toContain("delve into");
    expect(result.cleanedScript.toLowerCase()).not.toContain("game-changer");
    expect(result.cleanedScript).toContain("Keep building with intention.");
    expect(result.appliedSignOff).toBe(true);
  });

  it("reads and updates brand voice profile and cleans draft text via /api/v1/brand-voice", async () => {
    const getRes = await brandVoiceGet(
      new Request("http://localhost:3000/api/v1/brand-voice", {
        headers: { "x-user-id": "user-1" },
      })
    );
    expect(getRes.status).toBe(200);
    const getJson = await getRes.json();
    expect(getJson.profile.targetWpm).toBe(145);

    const postRes = await brandVoicePost(
      new Request("http://localhost:3000/api/v1/brand-voice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "user-1",
        },
        body: JSON.stringify({
          signatureSignOff: "See you in the next creative sprint.",
          targetWpm: 155,
          script: "In today's fast-paced world, let us delve into creator habits.",
        }),
      })
    );
    expect(postRes.status).toBe(200);
    const postJson = await postRes.json();
    expect(postJson.costUsd).toBe(0);
    expect(postJson.profile.targetWpm).toBe(155);
    expect(postJson.cleaned?.cleanedScript).toContain(
      "See you in the next creative sprint."
    );
  });

  it("builds a timed teleprompter cue plan with WPM pacing and camera/b-roll markers at $0 server cost", () => {
    const script = [
      "[LOOK AT CAMERA] Welcome back to the studio.",
      "[B-ROLL] Show workspace timeline and notes.",
      "Capture one core idea every Monday and shape it for YouTube and TikTok.",
    ].join("\n\n");

    const plan = buildTeleprompterPlan(script, 150);
    expect(plan.wpm).toBe(150);
    expect(plan.cues.length).toBe(3);
    expect(plan.cues[0].cueType).toBe("camera");
    expect(plan.cues[1].cueType).toBe("broll");
    expect(plan.totalDurationSeconds).toBeGreaterThan(4);
  });
});
