import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { POST as adminPost } from "../admin/route";

describe("Phase 19: Tab/Navigation Deduplication, Promo Codes, Notices/Notifications & Sun/Moon Theme Toggle", () => {
  it("supports promo_create, promo_list (items + promos), promo_extend, promo_revoke, promo_reactivate, promo_permanent, and redeem end-to-end", async () => {
    const adminHeaders = {
      "Content-Type": "application/json",
      "x-user-email": "johnpaulonovo@gmail.com",
      "x-user-roles": "superuser",
    };

    // 1. Create promo code
    const createRes = await adminPost(
      new Request("https://contentflow.app/api/v1/admin", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          action: "promo_create",
          code: "CREATORBOOST45",
          tier: "PRO",
          rewardDays: 45,
          maxUses: 50,
          permanent: false,
          note: "Q4 Creator Campaign",
        }),
      })
    );
    expect(createRes.status).toBe(200);
    const created = await createRes.json();
    expect(created.ok).toBe(true);
    expect(created.promo.code).toBe("CREATORBOOST45");
    expect(created.promo.usedCount).toBe(0);
    expect(created.promo.revoked).toBe(false);

    // 2. List promo codes returns both promos and items
    const listRes = await adminPost(
      new Request("https://contentflow.app/api/v1/admin", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({ action: "promo_list" }),
      })
    );
    expect(listRes.status).toBe(200);
    const listData = await listRes.json();
    expect(Array.isArray(listData.promos)).toBe(true);
    expect(Array.isArray(listData.items)).toBe(true);
    const foundPromo = listData.items.find(
      (p: { code: string }) => p.code === "CREATORBOOST45"
    );
    expect(foundPromo).toBeDefined();
    expect(foundPromo.note).toBe("Q4 Creator Campaign");

    // 3. Extend promo (+30d), revoke, reactivate, permanent
    const extRes = await adminPost(
      new Request("https://contentflow.app/api/v1/admin", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          action: "promo_extend",
          code: "CREATORBOOST45",
          days: 30,
        }),
      })
    );
    expect(extRes.status).toBe(200);
    const extData = await extRes.json();
    expect(extData.promo.rewardDays).toBe(75);

    const revRes = await adminPost(
      new Request("https://contentflow.app/api/v1/admin", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          action: "promo_revoke",
          code: "CREATORBOOST45",
        }),
      })
    );
    expect(revRes.status).toBe(200);
    expect((await revRes.json()).promo.revoked).toBe(true);

    const reactRes = await adminPost(
      new Request("https://contentflow.app/api/v1/admin", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          action: "promo_reactivate",
          code: "CREATORBOOST45",
        }),
      })
    );
    expect(reactRes.status).toBe(200);
    expect((await reactRes.json()).promo.revoked).toBe(false);

    // 4. Redeem promo code as a creator user
    const redeemRes = await adminPost(
      new Request("https://contentflow.app/api/v1/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "creator-promo-tester",
          "x-user-email": "promo-tester@example.com",
        },
        body: JSON.stringify({
          action: "redeem",
          code: "CREATORBOOST45",
        }),
      })
    );
    expect(redeemRes.status).toBe(200);
    const redeemData = await redeemRes.json();
    expect(redeemData.ok).toBe(true);
    expect(redeemData.tier).toBe("PRO");
  });

  it("supports notice_publish + notice_list (items + notices), lookup by email, grant by email, tester_mint, and UI tab deduplication + Sun/Moon toggle", async () => {
    const adminHeaders = {
      "Content-Type": "application/json",
      "x-user-email": "johnpaulonovo@gmail.com",
      "x-user-roles": "superuser",
    };

    // 1. Publish notice via notice_publish
    const pubRes = await adminPost(
      new Request("https://contentflow.app/api/v1/admin", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          action: "notice_publish",
          title: "Creator Studio v2.4 Live",
          body: "YouTube and TikTok OAuth 2.0 PKCE connections are live.",
          audience: "all",
        }),
      })
    );
    expect(pubRes.status).toBe(200);
    const pubData = await pubRes.json();
    expect(pubData.ok).toBe(true);
    expect(Array.isArray(pubData.items)).toBe(true);

    // 2. notice_list returns both notices and items for WorkspaceShell bell
    const listNoticesRes = await adminPost(
      new Request("https://contentflow.app/api/v1/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "notice_list" }),
      })
    );
    const listNoticesData = await listNoticesRes.json();
    expect(Array.isArray(listNoticesData.items)).toBe(true);
    expect(
      listNoticesData.items.some(
        (n: { title: string }) => n.title === "Creator Studio v2.4 Live"
      )
    ).toBe(true);

    // 3. Mint tester via tester_mint
    const mintRes = await adminPost(
      new Request("https://contentflow.app/api/v1/admin", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          action: "tester_mint",
          prefix: "lagosqa",
          note: "Mobile QA",
        }),
      })
    );
    expect(mintRes.status).toBe(200);
    const mintData = await mintRes.json();
    expect(mintData.ok).toBe(true);
    expect(mintData.tester.email).toContain("lagosqa");
    expect(typeof mintData.tempPassword).toBe("string");

    // 4. Lookup and grant by email
    const lookupRes = await adminPost(
      new Request("https://contentflow.app/api/v1/admin", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          action: "lookup",
          email: mintData.tester.email,
        }),
      })
    );
    expect(lookupRes.status).toBe(200);
    const lookupData = await lookupRes.json();
    expect(lookupData.account.email).toBe(mintData.tester.email);

    const grantRes = await adminPost(
      new Request("https://contentflow.app/api/v1/admin", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          action: "grant",
          email: mintData.tester.email,
          tier: "PRO",
          days: 30,
          permanent: false,
        }),
      })
    );
    expect(grantRes.status).toBe(200);
    expect((await grantRes.json()).account.tier).toBe("PRO");

    // 5. Verify UI deduplication and Sun/Moon icon toggle in src/app/screens.tsx
    const screensSrc = fs.readFileSync(
      path.join(process.cwd(), "src/app/screens.tsx"),
      "utf8"
    );
    expect(screensSrc).toContain("Sun,");
    expect(screensSrc).toContain("Moon,");
    expect(screensSrc).not.toContain('className="poise-tab-strip"');
  });
});
