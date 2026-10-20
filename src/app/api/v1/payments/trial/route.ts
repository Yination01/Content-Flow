import { NextResponse } from "next/server";
import { type SubscriptionTier } from "@/lib/policy";
import {
  extractActorFromRequest,
  getApiStore,
  persistApiStore,
} from "@/lib/server/store";
import { syncUserToSupabaseRest } from "@/lib/server/supabase-sync";

const TRIAL_DURATION_DAYS = 30;
const ELIGIBLE_TRIAL_TIERS = new Set<SubscriptionTier>(["CREATOR", "PRO"]);

export async function POST(request: Request) {
  try {
    const actor = extractActorFromRequest(request);
    const body = await request.json().catch(() => ({}));
    const requestedTier = (
      typeof body?.tier === "string" ? body.tier.toUpperCase() : "PRO"
    ) as SubscriptionTier;

    if (!ELIGIBLE_TRIAL_TIERS.has(requestedTier)) {
      return NextResponse.json(
        {
          error:
            "Free trials are available for Creator and Pro plans. Choose Creator or Pro to start your 30-day free trial.",
        },
        { status: 400 }
      );
    }

    if (actor.userRecord.trialUsed) {
      return NextResponse.json(
        {
          error:
            "Your 1-time 30-day free trial has already been used on this account. Upgrade with Paystack or redeem a promo code to continue.",
        },
        { status: 409 }
      );
    }

    const now = new Date();
    const endsAt = new Date(
      now.getTime() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000
    );

    actor.userRecord.trialUsed = true;
    actor.userRecord.trialTier = requestedTier;
    actor.userRecord.trialStartedAt = now.toISOString();
    actor.userRecord.trialEndsAt = endsAt.toISOString();
    if (!actor.roles.includes("superuser")) {
      actor.userRecord.tier = requestedTier;
      actor.userRecord.tierExpiresAt = endsAt.toISOString();
    }

    const store = getApiStore();
    store.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      actorId: actor.userId,
      actionType: "billing.trial_started",
      targetUserId: actor.userId,
      reason: `Started 30-day free trial on ${requestedTier} until ${endsAt.toISOString()}`,
      createdAt: now.toISOString(),
    });
    persistApiStore();

    void syncUserToSupabaseRest({
      id: actor.userRecord.id,
      email: actor.userRecord.email,
      name: actor.userRecord.name,
      niche: actor.userRecord.niche,
      tier: actor.userRecord.tier,
      roles: actor.userRecord.roles,
      status: actor.userRecord.status,
      joinedAt: actor.userRecord.joinedAt,
    });

    return NextResponse.json({
      trial: {
        active: true,
        tier: requestedTier,
        startedAt: actor.userRecord.trialStartedAt,
        endsAt: actor.userRecord.trialEndsAt,
        daysRemaining: TRIAL_DURATION_DAYS,
      },
      user: {
        id: actor.userRecord.id,
        tier: actor.userRecord.tier,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to activate 30-day free trial. Please try again." },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
  const actor = extractActorFromRequest(request);
  const now = new Date().toISOString();

  actor.userRecord.trialEndsAt = now;
  actor.userRecord.trialTier = undefined;
  if (!actor.roles.includes("superuser")) {
    actor.userRecord.tier = "FREE";
    actor.userRecord.tierExpiresAt = undefined;
  }

  const store = getApiStore();
  store.auditLogs.unshift({
    id: `audit-${Date.now()}`,
    actorId: actor.userId,
    actionType: "billing.trial_cancelled",
    targetUserId: actor.userId,
    reason: "1-click FTC trial/subscription cancellation completed",
    createdAt: now,
  });
  persistApiStore();

  return NextResponse.json({
    cancelled: true,
    trial: {
      active: false,
      tier: null,
      endsAt: now,
      daysRemaining: 0,
    },
    user: {
      id: actor.userRecord.id,
      tier: actor.userRecord.tier,
    },
  });
}
