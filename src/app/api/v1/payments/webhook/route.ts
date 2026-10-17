import { NextResponse } from "next/server";
import { validatePaystackChargeEvent, verifyPaystackSignature } from "@/lib/policy";
import { getDemoApiStore } from "@/lib/server/store";

export async function POST(request: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY || "sk_test_demo_paystack_secret";
  const signature = request.headers.get("x-paystack-signature") || "";
  const rawBody = await request.text();

  if (!verifyPaystackSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid Paystack webhook signature." }, { status: 401 });
  }

  try {
    const parsed = JSON.parse(rawBody);
    const store = getDemoApiStore();
    const validation = validatePaystackChargeEvent(parsed, store.processedWebhooks);

    if (!validation.valid) {
      return NextResponse.json({ error: validation.reason }, { status: 400 });
    }

    if (!validation.idempotentDuplicate && validation.userId && validation.targetTier) {
      const user = store.users.get(validation.userId);
      if (user) {
        user.tier = validation.targetTier;
      }
    }

    return NextResponse.json({
      received: true,
      idempotentDuplicate: validation.idempotentDuplicate,
      upgradedTier: validation.targetTier,
      reference: validation.reference,
    });
  } catch {
    return NextResponse.json({ error: "Malformed webhook JSON body." }, { status: 400 });
  }
}
