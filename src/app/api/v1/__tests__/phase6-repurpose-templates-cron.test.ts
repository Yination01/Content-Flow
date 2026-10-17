import { beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { resetApiStoreForTests } from "@/lib/server/store";
import {
  CREATOR_TEMPLATES,
  repurposeContentIntoCampaign,
} from "@/lib/repurpose/engine";
import { GET as templatesGet } from "@/app/api/v1/templates/route";
import { POST as repurposePost } from "@/app/api/v1/repurpose/route";

describe("Phase 6: $0 Campaign Repurposing Engine, Creator Templates API & Free GitHub Actions Cron", () => {
  beforeEach(() => {
    resetApiStoreForTests();
  });

  it("repurposes long-form text into a YouTube script, 3 TikTok hooks, and a community poll at $0 AI cost", () => {
    const campaign = repurposeContentIntoCampaign(
      "Consistency is not about burning out.\n\nFirst, capture one core insight per week.\n\nSecond, adapt the opening hook for each channel.\n\nThird, batch your publishing queue on Sunday.",
      "Sustainable Creator Systems"
    );

    expect(campaign.title).toBe("Sustainable Creator Systems");
    expect(campaign.tiktokHooks.length).toBe(3);
    expect(campaign.keyTakeaways.length).toBeGreaterThanOrEqual(3);
    expect(campaign.youtubeLongScript).toContain("Sustainable Creator Systems");
    expect(campaign.youtubeCommunityPoll.question).toBeTruthy();
    expect(campaign.youtubeCommunityPoll.options.length).toBe(3);
    expect(campaign.estimatedReadSeconds).toBeGreaterThan(5);
  });

  it("serves curated creator templates via GET /api/v1/templates with category filtering", async () => {
    expect(CREATOR_TEMPLATES.length).toBeGreaterThanOrEqual(4);

    const allRes = await templatesGet(
      new Request("http://localhost:3000/api/v1/templates")
    );
    expect(allRes.status).toBe(200);
    const allJson = await allRes.json();
    expect(allJson.templates.length).toBe(CREATOR_TEMPLATES.length);

    const filteredRes = await templatesGet(
      new Request(
        "http://localhost:3000/api/v1/templates?category=educational"
      )
    );
    const filteredJson = await filteredRes.json();
    expect(filteredJson.templates.length).toBeGreaterThanOrEqual(1);
    expect(
      filteredJson.templates.every(
        (t: { category: string }) => t.category === "educational"
      )
    ).toBe(true);
  });

  it("repurposes an existing workspace draft via POST /api/v1/repurpose and optionally saves as a new draft", async () => {
    const res = await repurposePost(
      new Request("http://localhost:3000/api/v1/repurpose", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "user-1",
        },
        body: JSON.stringify({
          contentId: "1",
          saveAsDraft: true,
        }),
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.campaign.tiktokHooks.length).toBe(3);
    expect(data.savedDraft).toBeDefined();
    expect(data.savedDraft.title).toContain("[Repurposed]");
  });

  it("includes .github/workflows/worker-tick.yml for $0 scheduled background worker execution", () => {
    const cronPath = path.join(
      process.cwd(),
      ".github",
      "workflows",
      "worker-tick.yml"
    );
    expect(fs.existsSync(cronPath)).toBe(true);
    const yaml = fs.readFileSync(cronPath, "utf8");
    expect(yaml).toContain("schedule:");
    expect(yaml).toContain("workflow_dispatch:");
    expect(yaml).toContain("/api/v1/worker/tick");
  });
});
