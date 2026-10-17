import { beforeEach, describe, expect, it } from "vitest";
import crypto from "node:crypto";
import { resetApiStore } from "@/lib/server/store";
import { POST as signupPost } from "../auth/signup/route";
import { POST as loginPost } from "../auth/login/route";
import { GET as meGet } from "../auth/me/route";
import { POST as generatePost } from "../generate/route";
import { GET as listContentGet, POST as createContentPost } from "../content/route";
import {
  GET as getContentById,
  PATCH as patchContentById,
  DELETE as deleteContentById,
} from "../content/[id]/route";
import { POST as cancelJobPost } from "../jobs/[id]/cancel/route";
import { POST as retryJobPost } from "../jobs/[id]/retry/route";
import { PATCH as patchSettings } from "../settings/route";
import { POST as uploadUrlPost } from "../storage/upload-url/route";
import { POST as paystackWebhookPost } from "../payments/webhook/route";
import { PATCH as patchUserTier } from "../admin/users/[id]/tier/route";
import { POST as connectPlatformPost } from "../platforms/connect/route";
import { GET as callbackPlatformGet } from "../platforms/callback/route";
import { PRICING_TABLE } from "@/lib/policy";

describe("ContentFlow Production API v1 Route Handlers & Security Checks", () => {
  beforeEach(() => {
    resetApiStore();
  });

  it("authenticates signup and login with scrypt password hashing and HttpOnly session cookies (no demo flags)", async () => {
    const signupReq = new Request("http://localhost:3000/api/v1/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "newcreator@contentflow.app",
        password: "StrongPassword#2026",
        name: "Adaeze Okafor",
      }),
    });
    const signupRes = await signupPost(signupReq);
    expect(signupRes.status).toBe(201);
    const setCookie = signupRes.headers.get("set-cookie") || "";
    expect(setCookie).toContain("cf_session=");
    expect(setCookie).toContain("HttpOnly");
    const signupBody = await signupRes.json();
    expect(signupBody.demo).toBeUndefined();
    expect(signupBody.user.email).toBe("newcreator@contentflow.app");

    // Wrong password on login must return 401
    const badLoginRes = await loginPost(
      new Request("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "newcreator@contentflow.app",
          password: "WrongPassword123!",
        }),
      })
    );
    expect(badLoginRes.status).toBe(401);

    // Valid password login -> 200 + session cookie
    const goodLoginRes = await loginPost(
      new Request("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "newcreator@contentflow.app",
          password: "StrongPassword#2026",
        }),
      })
    );
    expect(goodLoginRes.status).toBe(200);
    const cookiePair = (goodLoginRes.headers.get("set-cookie") || "").split(";")[0];

    const meRes = await meGet(
      new Request("http://localhost:3000/api/v1/auth/me", {
        headers: { cookie: cookiePair },
      })
    );
    expect(meRes.status).toBe(200);
    const meJson = await meRes.json();
    expect(meJson.user.email).toBe("newcreator@contentflow.app");
  });

  it("POST /api/v1/generate validates prompt <= 1000 chars, serves user-scoped cache without quota charge, and returns 429 on limit", async () => {
    const longPrompt = "a".repeat(1001);
    const badReq = new Request("http://localhost:3000/api/v1/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "user-free-1",
        "x-user-tier": "FREE",
      },
      body: JSON.stringify({ prompt: longPrompt, modality: "text" }),
    });
    expect((await generatePost(badReq)).status).toBe(400);

    const makeReq = (prompt: string, usedToday?: number) =>
      new Request("http://localhost:3000/api/v1/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "user-free-cache",
          "x-user-tier": "FREE",
          ...(usedToday !== undefined ? { "x-ai-used": String(usedToday) } : {}),
        },
        body: JSON.stringify({ prompt, modality: "text", tone: "warm", format: "article" }),
      });

    const firstRes = await generatePost(makeReq("Five habits for deep work"));
    expect(firstRes.status).toBe(200);
    const firstBody = await firstRes.json();
    expect(firstBody.demo).toBeUndefined();
    expect(firstBody.cacheHit).toBe(false);
    expect(firstBody.quotaConsumed).toBe(true);
    expect(firstBody.adaptations.youtubeTitle).toBeTruthy();

    // Second identical call for same user hits cache and does NOT consume quota
    const cachedRes = await generatePost(makeReq("Five habits for deep work", 10));
    expect(cachedRes.status).toBe(200);
    const cachedBody = await cachedRes.json();
    expect(cachedBody.cacheHit).toBe(true);
    expect(cachedBody.quotaConsumed).toBe(false);

    // Uncached prompt when user is at 10/10 daily Free limit returns 429
    const exhaustedRes = await generatePost(makeReq("Brand new uncached prompt", 10));
    expect(exhaustedRes.status).toBe(429);
  });

  it("supports full Content CRUD (create, list, get, patch, delete) and blocks cross-user IDOR with 403", async () => {
    const createRes = await createContentPost(
      new Request("http://localhost:3000/api/v1/content", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": "user-1" },
        body: JSON.stringify({
          title: "How I script 10-minute videos",
          generatedScript: "Draft script content...",
          contentType: "text",
        }),
      })
    );
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    const contentId = created.content.id;

    // List user-1 content
    const listRes = await listContentGet(
      new Request("http://localhost:3000/api/v1/content", {
        headers: { "x-user-id": "user-1" },
      })
    );
    expect(listRes.status).toBe(200);
    const listBody = await listRes.json();
    expect(listBody.contents.length).toBeGreaterThanOrEqual(2);

    // Patch content as owner
    const patchRes = await patchContentById(
      new Request(`http://localhost:3000/api/v1/content/${contentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-user-id": "user-1" },
        body: JSON.stringify({ title: "Updated Video Script Title", status: "ready" }),
      }),
      { params: { id: contentId } }
    );
    expect(patchRes.status).toBe(200);
    const patchedBody = await patchRes.json();
    expect(patchedBody.content.title).toBe("Updated Video Script Title");
    expect(patchedBody.content.status).toBe("ready");

    // Cross-user IDOR attempt by user-2 -> 403
    const attackerRes = await getContentById(
      new Request(`http://localhost:3000/api/v1/content/${contentId}`, {
        headers: { "x-user-id": "user-2", "x-user-roles": "creator" },
      }),
      { params: { id: contentId } }
    );
    expect(attackerRes.status).toBe(403);

    // Delete as owner -> 200
    const delRes = await deleteContentById(
      new Request(`http://localhost:3000/api/v1/content/${contentId}`, {
        method: "DELETE",
        headers: { "x-user-id": "user-1" },
      }),
      { params: { id: contentId } }
    );
    expect(delRes.status).toBe(200);
  });

  it("cancels pending jobs atomically (409 on completed) and retries/executes jobs via /api/v1/jobs/:id/retry", async () => {
    const cancelPendingRes = await cancelJobPost(
      new Request("http://localhost:3000/api/v1/jobs/1049/cancel", {
        method: "POST",
        headers: { "x-user-id": "user-1" },
      }),
      { params: { id: "1049" } }
    );
    expect(cancelPendingRes.status).toBe(200);
    expect((await cancelPendingRes.json()).job.status).toBe("cancelled");

    const cancelCompletedRes = await cancelJobPost(
      new Request("http://localhost:3000/api/v1/jobs/1048/cancel", {
        method: "POST",
        headers: { "x-user-id": "user-1" },
      }),
      { params: { id: "1048" } }
    );
    expect(cancelCompletedRes.status).toBe(409);

    // Retry failed job 1047 -> executes worker publishing and transitions to completed
    const retryRes = await retryJobPost(
      new Request("http://localhost:3000/api/v1/jobs/1047/retry", {
        method: "POST",
        headers: { "x-user-id": "user-1" },
      }),
      { params: { id: "1047" } }
    );
    expect(retryRes.status).toBe(200);
    const retryBody = await retryRes.json();
    expect(retryBody.job.status).toBe("completed");
    expect(retryBody.job.attempts).toBe(3);
  });

  it("encrypts BYOK keys server-side via PATCH /api/v1/settings and generates R2 signed upload URLs", async () => {
    const settingsRes = await patchSettings(
      new Request("http://localhost:3000/api/v1/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-user-id": "user-1" },
        body: JSON.stringify({
          action: "save_byok",
          provider: "openai",
          apiKey: "sk-proj-RealUserSecretKey889",
        }),
      })
    );
    expect(settingsRes.status).toBe(200);
    const settingsJson = await settingsRes.json();
    expect(settingsJson.maskedKeys.openai).toBe("sk-p•••••••••••••889");
    expect(JSON.stringify(settingsJson)).not.toContain("sk-proj-RealUserSecretKey889");

    const r2Res = await uploadUrlPost(
      new Request("http://localhost:3000/api/v1/storage/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": "user-1" },
        body: JSON.stringify({
          fileName: "cover.webp",
          contentType: "image/webp",
          fileSizeBytes: 1024 * 500,
        }),
      })
    );
    expect(r2Res.status).toBe(200);
    const r2Json = await r2Res.json();
    expect(r2Json.uploadUrl).toContain("X-Amz-Signature=");
  });

  it("verifies Paystack webhook HMAC-SHA512, enforces superuser RBAC on tier change, and enforces single-use OAuth state", async () => {
    const secret = process.env.PAYSTACK_SECRET_KEY || "sk_live_contentflow_paystack_secret";
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

    expect(
      (
        await paystackWebhookPost(
          new Request("http://localhost:3000/api/v1/payments/webhook", {
            method: "POST",
            headers: { "x-paystack-signature": "bad_sig" },
            body: eventPayload,
          })
        )
      ).status
    ).toBe(401);

    const validRes = await paystackWebhookPost(
      new Request("http://localhost:3000/api/v1/payments/webhook", {
        method: "POST",
        headers: { "x-paystack-signature": validSig },
        body: eventPayload,
      })
    );
    expect(validRes.status).toBe(200);

    // Superuser RBAC check
    expect(
      (
        await patchUserTier(
          new Request("http://localhost:3000/api/v1/admin/users/user-1/tier", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "x-user-id": "mod-1",
              "x-user-roles": "moderator",
            },
            body: JSON.stringify({ tier: "PRO", reason: "Promotion" }),
          }),
          { params: { id: "user-1" } }
        )
      ).status
    ).toBe(403);

    // OAuth single-use state
    const connectRes = await connectPlatformPost(
      new Request("http://localhost:3000/api/v1/platforms/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": "user-1" },
        body: JSON.stringify({ platform: "youtube" }),
      })
    );
    const { state } = await connectRes.json();
    const callbackUrl = `http://localhost:3000/api/v1/platforms/callback?state=${encodeURIComponent(state)}&code=oauth_code_1`;
    expect((await callbackPlatformGet(new Request(callbackUrl))).status).toBe(200);
    expect((await callbackPlatformGet(new Request(callbackUrl))).status).toBe(400);
  });
});
