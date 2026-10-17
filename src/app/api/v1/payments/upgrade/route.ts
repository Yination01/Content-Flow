import { NextResponse } from "next/server";
import { PRICING_TABLE, type SubscriptionTier } from "@/lib/policy";
import { initializePaystackTransaction } from "@/lib/providers";
import {
  extractActorFromRequest,
  persistApiStore,
} from "@/lib/server/store";

export async function POST(request: Request) {
  try {
    const actor = extractActorFromRequest(request);
    const body = await request.json();
    const targetTier = (
      typeof body?.tier === "string" ? body.tier.toUpperCase() : ""
    ) as SubscriptionTier;
    const currency = body?.currency === "USD" ? "USD" : "NGN";

    if (
      !targetTier ||
      !(targetTier in PRICING_TABLE) ||
      targetTier === "FREE"
    ) {
      return NextResponse.json(
        {
          error:
            "Valid paid target tier (CREATOR, PRO, or AGENCY) is required.",
        },
        { status: 400 }
      );
    }

    const tx = await initializePaystackTransaction({
      userId: actor.userId,
      email: actor.userRecord.email,
      targetTier,
      currency,
    });

    if (!tx.liveProvider && body?.applyImmediately) {
      actor.userRecord.tier = targetTier;
      persistApiStore();
    }

    return NextResponse.json({
      checkout: tx,
      tier: actor.userRecord.tier,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid upgrade payload." },
      { status: 400 }
    );
  }
}
