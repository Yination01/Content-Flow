import { NextResponse } from "next/server";
import { PRICING_TABLE, type SubscriptionTier } from "@/lib/policy";
import { extractActorFromRequest } from "@/lib/server/store";

export async function POST(request: Request) {
  try {
    const actor = extractActorFromRequest(request);
    const body = await request.json();
    const targetTier = body?.tier as SubscriptionTier;
    const currency = body?.currency === "USD" ? "USD" : "NGN";

    if (!targetTier || !(targetTier in PRICING_TABLE) || targetTier === "FREE") {
      return NextResponse.json(
        { error: "Valid paid target tier (CREATOR, PRO, or AGENCY) is required." },
        { status: 400 }
      );
    }

    const tierPrice = PRICING_TABLE[targetTier];
    const priceSpec = currency === "USD" ? tierPrice.USD : tierPrice.NGN;

    return NextResponse.json({
      demo: !process.env.PAYSTACK_SECRET_KEY,
      message:
        "Paystack checkout preview initialized in Demo mode. No real charge is created.",
      checkout: {
        userId: actor.userId,
        targetTier,
        displayUsd: tierPrice.displayUsd,
        currency: priceSpec.currency,
        amountSubunits: priceSpec.amountSubunits,
        reference: `cf_demo_${Date.now()}`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid upgrade payload." }, { status: 400 });
  }
}
