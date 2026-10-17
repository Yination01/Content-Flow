import { NextResponse } from "next/server";
import { authorizeAdminAction, type SubscriptionTier } from "@/lib/policy";
import { extractActorFromRequest, getDemoApiStore } from "@/lib/server/store";

export async function PATCH(
  request: Request,
  context: { params: { id: string } }
) {
  const actor = extractActorFromRequest(request);
  if (!authorizeAdminAction(actor.roles, "tier_mutation")) {
    return NextResponse.json(
      { error: "Forbidden: Superuser role required to mutate subscription tiers." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const newTier = (typeof body?.tier === "string"
      ? body.tier.toUpperCase()
      : "") as SubscriptionTier;
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "Admin tier update";

    if (!["FREE", "CREATOR", "PRO", "AGENCY"].includes(newTier)) {
      return NextResponse.json({ error: "Invalid subscription tier." }, { status: 400 });
    }

    const store = getDemoApiStore();
    const targetUser = store.users.get(context.params.id);
    if (!targetUser) {
      return NextResponse.json({ error: "Target user not found." }, { status: 404 });
    }

    targetUser.tier = newTier;
    const auditLog = {
      id: `audit-${Date.now()}`,
      actorId: actor.userId,
      actionType: `tier_changed_to_${newTier}`,
      targetUserId: targetUser.id,
      reason,
      createdAt: new Date().toISOString(),
    };
    store.auditLogs.push(auditLog);

    return NextResponse.json({
      demo: true,
      user: targetUser,
      auditLog,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
}
