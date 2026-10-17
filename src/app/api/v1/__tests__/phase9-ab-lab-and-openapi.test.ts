import { beforeEach, describe, expect, it } from "vitest";
import { getApiStore, resetApiStoreForTests } from "@/lib/server/store";
import { generateAbVariantsAndScore } from "@/lib/ab/variant-lab";
import { POST as abTestPost } from "@/app/api/v1/ab-test/route";
import { GET as openApiGet } from "@/app/api/v1/openapi.json/route";

describe("Phase 9: $0 A/B/C Hook & Title Variant Lab and OpenAPI 3.1 Specification", () => {
  beforeEach(() => {
    resetApiStoreForTests();
  });

  it("generates 3 distinct A/B/C YouTube Title and TikTok Hook variants and identifies the highest-scoring winner at $0 cost", () => {
    const result = generateAbVariantsAndScore({
      title: "Consistent Creator Systems",
      script:
        "Building a creative rhythm is simpler when you capture ideas once and adapt them for every channel.",
    });

    expect(result.costUsd).toBe(0);
    expect(result.variants.length).toBe(3);
    expect(result.variants.map((v) => v.id)).toEqual(["A", "B", "C"]);
    expect(["A", "B", "C"]).toContain(result.winningVariantId);

    const winners = result.variants.filter((v) => v.winner);
    expect(winners.length).toBe(1);
    expect(winners[0].id).toBe(result.winningVariantId);
    expect(winners[0].youtubeTitle.length).toBeLessThanOrEqual(100);
  });

  it("evaluates A/B/C variants via POST /api/v1/ab-test and optionally applies the winning variant to a draft", async () => {
    const res = await abTestPost(
      new Request("http://localhost:3000/api/v1/ab-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "user-1",
        },
        body: JSON.stringify({
          contentId: "1",
          applyWinner: true,
        }),
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.costUsd).toBe(0);
    expect(data.quotaConsumed).toBe(false);
    expect(data.variants.length).toBe(3);
    expect(data.appliedToContentId).toBe("1");

    const updatedDraft = getApiStore().contents.get("1")!;
    expect(updatedDraft.metadata?.youtubeTitle).toBe(
      data.winningVariant.youtubeTitle
    );
  });

  it("serves a valid OpenAPI 3.1.0 specification document at GET /api/v1/openapi.json", async () => {
    const res = await openApiGet(
      new Request("http://localhost:3000/api/v1/openapi.json")
    );
    expect(res.status).toBe(200);
    const spec = await res.json();
    expect(spec.openapi).toBe("3.1.0");
    expect(spec.info.title).toContain("ContentFlow");
    expect(spec.paths["/api/v1/generate"]).toBeDefined();
    expect(spec.paths["/api/v1/ab-test"]).toBeDefined();
    expect(spec.paths["/api/v1/worker/tick"]).toBeDefined();
  });
});
