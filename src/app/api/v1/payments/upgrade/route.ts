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
    const emailLower = (actor.userRecord.email || "").toLowerCase();
    if (
      emailLower.endsWith("@testers.contentflow.app") ||
      emailLower.endsWith("@testers.poise-app.vercel.app")
    ) {
      return NextResponse.json(
        {
          error:
            "Synthetic tester accounts cannot initiate card checkout. Use a standard creator account or ask an Admin to grant a plan.",
        },
        { status: 403 }
      );
    }

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
