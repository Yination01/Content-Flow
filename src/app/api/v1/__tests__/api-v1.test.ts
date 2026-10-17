import { beforeEach, describe, expect, it } from "vitest";
import crypto from "node:crypto";
import { resetDemoApiStore } from "@/lib/server/store";
import { POST as generatePost } from "../generate/route";
import { GET as getContentById, POST as createContentPost } from "../content/[id]/route";
import { POST as cancelJobPost } from "../jobs/[id]/cancel/route";
import { POST as paystackWebhookPost } from "../payments/webhook/route";
import { PATCH as patchUserTier } from "../admin/users/[id]/tier/route";
import { POST as connectPlatformPost } from "../platforms/connect/route";
import { GET as callbackPlatformGet } from "../platforms/callback/route";
import { PRICING_TABLE } from "@/lib/policy";

describe("ContentFlow API v1 Route Handlers & Security Checks", () => {
  beforeEach(() => {
    resetDemoApiStore();
  });

  it("POST /api/v1/generate validates prompt <= 1000 chars and enforces video tier capability", async () => {
    const longPrompt = "a".repeat(1001);
    const badReq = new Request("http://localhost:3000/api/v1/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-demo-user-id": "user-free-1", "x-demo-tier": "FREE" },
      body: JSON.stringify({ prompt: longPrompt, modality: "text" }),
    });
    const badRes = await generatePost(badReq);
    expect(badRes.status).toBe(400);

    const videoReq = new Request("http://localhost:3000/api/v1/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-demo-user-id": "user-free-1", "x-demo-tier": "FREE" },
      body: JSON.stringify({ prompt: "Create a short reel", modality: "video" }),
    });
    const videoRes = await generatePost(videoReq);
    expect(videoRes.status).toBe(403);
  });

  it("POST /api/v1/generate serves user-scoped exact-match cache without consuming quota and returns 429 on quota exhaustion", async () => {
    const makeReq = (prompt: string, usedToday?: number) =>
      new Request("http://localhost:3000/api/v1/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-demo-user-id": "user-free-cache",
          "x-demo-tier": "FREE",
          ...(usedToday !== undefined ? { "x-demo-ai-used": String(usedToday) } : {}),
        },
        body: JSON.stringify({ prompt, modality: "text", tone: "warm", format: "article" }),
      });

    const firstRes = await generatePost(makeReq("Five habits for deep work"));
    expect(firstRes.status).toBe(200);
    const firstBody = await firstRes.json();
    expect(firstBody.demo).toBe(true);
    expect(firstBody.cacheHit).toBe(false);
    expect(firstBody.quotaConsumed).toBe(true);

    // Second identical call for same user should hit cache and NOT consume quota even if quota is at 10/10
    const cachedRes = await generatePost(makeReq("Five habits for deep work", 10));
    expect(cachedRes.status).toBe(200);
    const cachedBody = await cachedRes.json();
    expect(cachedBody.cacheHit).toBe(true);
    expect(cachedBody.quotaConsumed).toBe(false);

    // Uncached prompt when user is at 10/10 daily Free limit returns 429
    const exhaustedRes = await generatePost(makeReq("Brand new uncached prompt", 10));
    expect(exhaustedRes.status).toBe(429);
  });

  it("GET /api/v1/content/:id blocks cross-user IDOR with 403 and allows owner or moderator", async () => {
    // Owner user-1 accesses content id "1" (owned by user-1)
    const ownerReq = new Request("http://localhost:3000/api/v1/content/1", {
      headers: { "x-demo-user-id": "user-1", "x-demo-roles": "creator" },
    });
    const ownerRes = await getContentById(ownerReq, { params: { id: "1" } });
    expect(ownerRes.status).toBe(200);

    // Different user-2 attempts IDOR on content id "1"
    const attackerReq = new Request("http://localhost:3000/api/v1/content/1", {
      headers: { "x-demo-user-id": "user-2", "x-demo-roles": "creator" },
    });
    const attackerRes = await getContentById(attackerReq, { params: { id: "1" } });
    expect(attackerRes.status).toBe(403);

    // Moderator accesses content id "1"
    const modReq = new Request("http://localhost:3000/api/v1/content/1", {
      headers: { "x-demo-user-id": "mod-99", "x-demo-roles": "moderator" },
    });
    const modRes = await getContentById(modReq, { params: { id: "1" } });
    expect(modRes.status).toBe(200);
  });

  it("POST /api/v1/jobs/:id/cancel atomically cancels only pending jobs and returns 409 for non-pending", async () => {
    // Job 1049 is seeded as pending and owned by user-1
    const cancelPendingReq = new Request("http://localhost:3000/api/v1/jobs/1049/cancel", {
      method: "POST",
      headers: { "x-demo-user-id": "user-1", "x-demo-roles": "creator" },
    });
    const pendingRes = await cancelJobPost(cancelPendingReq, { params: { id: "1049" } });
    expect(pendingRes.status).toBe(200);
    const pendingBody = await pendingRes.json();
    expect(pendingBody.job.status).toBe("cancelled");

    // Job 1048 is completed; attempting to cancel must return 409 Conflict
    const cancelCompletedReq = new Request("http://localhost:3000/api/v1/jobs/1048/cancel", {
      method: "POST",
      headers: { "x-demo-user-id": "user-1", "x-demo-roles": "creator" },
    });
    const completedRes = await cancelJobPost(cancelCompletedReq, { params: { id: "1048" } });
    expect(completedRes.status).toBe(409);
  });

  it("POST /api/v1/payments/webhook verifies HMAC-SHA512 signature, amount, and idempotency", async () => {
    const secret = process.env.PAYSTACK_SECRET_KEY || "sk_test_demo_paystack_secret";
    const eventPayload = JSON.stringify({
      event: "charge.success",
      data: {
        id: 5001,
        reference: "paystack_ref_unique_01",
        status: "success",
        amount: PRICING_TABLE.PRO.NGN.amountSubunits,
        currency: "NGN",
        metadata: { userId: "user-1", targetTier: "PRO" },
      },
    });
    const validSig = crypto.createHmac("sha512", secret).update(eventPayload).digest("hex");

    // 1. Invalid signature -> 401
    const invalidSigReq = new Request("http://localhost:3000/api/v1/payments/webhook", {
      method: "POST",
      headers: { "x-paystack-signature": "bad_sig" },
      body: eventPayload,
    });
    expect((await paystackWebhookPost(invalidSigReq)).status).toBe(401);

    // 2. Valid signature -> 200
    const validReq = new Request("http://localhost:3000/api/v1/payments/webhook", {
      method: "POST",
      headers: { "x-paystack-signature": validSig },
      body: eventPayload,
    });
    const validRes = await paystackWebhookPost(validReq);
    expect(validRes.status).toBe(200);
    const validJson = await validRes.json();
    expect(validJson.idempotentDuplicate).toBe(false);
    expect(validJson.upgradedTier).toBe("PRO");

    // 3. Replayed webhook with same reference -> 200 idempotentDuplicate: true
    const replayReq = new Request("http://localhost:3000/api/v1/payments/webhook", {
      method: "POST",
      headers: { "x-paystack-signature": validSig },
      body: eventPayload,
    });
    const replayRes = await paystackWebhookPost(replayReq);
    expect(replayRes.status).toBe(200);
    const replayJson = await replayRes.json();
    expect(replayJson.idempotentDuplicate).toBe(true);
  });

  it("PATCH /api/v1/admin/users/:id/tier enforces server-side superuser role and logs audit entry", async () => {
    const nonAdminReq = new Request("http://localhost:3000/api/v1/admin/users/user-1/tier", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-demo-user-id": "mod-1",
        "x-demo-roles": "moderator",
      },
      body: JSON.stringify({ tier: "PRO", reason: "Promotion" }),
    });
    expect((await patchUserTier(nonAdminReq, { params: { id: "user-1" } })).status).toBe(403);

    const superuserReq = new Request("http://localhost:3000/api/v1/admin/users/user-1/tier", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-demo-user-id": "admin-1",
        "x-demo-roles": "superuser",
      },
      body: JSON.stringify({ tier: "AGENCY", reason: "Enterprise onboarding" }),
    });
    const superRes = await patchUserTier(superuserReq, { params: { id: "user-1" } });
    expect(superRes.status).toBe(200);
    const superBody = await superRes.json();
    expect(superBody.user.tier).toBe("AGENCY");
    expect(superBody.auditLog.actorId).toBe("admin-1");
  });

  it("OAuth connect & callback enforce single-use state and never return raw tokens to client", async () => {
    const connectReq = new Request("http://localhost:3000/api/v1/platforms/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-demo-user-id": "user-1" },
      body: JSON.stringify({ platform: "youtube" }),
    });
    const connectRes = await connectPlatformPost(connectReq);
    expect(connectRes.status).toBe(200);
    const { state } = await connectRes.json();
    expect(typeof state).toBe("string");

    const callbackUrl = `http://localhost:3000/api/v1/platforms/callback?state=${encodeURIComponent(state)}&code=demo_auth_code`;
    const callbackRes = await callbackPlatformGet(new Request(callbackUrl));
    expect(callbackRes.status).toBe(200);
    const callbackBody = await callbackRes.json();
    expect(callbackBody.connected).toBe(true);
    expect(callbackBody.accessToken).toBeUndefined();
    expect(callbackBody.refreshToken).toBeUndefined();

    // Reusing the same OAuth state must fail with 400
    const replayCallbackRes = await callbackPlatformGet(new Request(callbackUrl));
    expect(replayCallbackRes.status).toBe(400);
  });
});
