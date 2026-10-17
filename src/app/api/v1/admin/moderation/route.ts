import { NextResponse } from "next/server";
import { authorizeAdminAction } from "@/lib/policy";
import {
  extractActorFromRequest,
  getApiStore,
  persistApiStore,
} from "@/lib/server/store";

export async function GET(request: Request) {
  const actor = extractActorFromRequest(request);
  if (!authorizeAdminAction(actor.roles, "moderation_review")) {
    return NextResponse.json(
      { error: "Forbidden: Moderator or superuser role required." },
      { status: 403 }
    );
  }

  const store = getApiStore();
  return NextResponse.json({
    items: Array.from(store.moderationItems.values()),
  });
}

export async function POST(request: Request) {
  const actor = extractActorFromRequest(request);
  if (!authorizeAdminAction(actor.roles, "moderation_review")) {
    return NextResponse.json(
      { error: "Forbidden: Moderator or superuser role required." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const id = typeof body?.id === "string" ? body.id : "";
    const decision =
      body?.decision === "rejected" ? "rejected" : "approved";
    const reason =
      typeof body?.reason === "string" && body.reason.trim()
        ? body.reason.trim()
        : `Content ${decision} by moderator`;

    const store = getApiStore();
    const item = store.moderationItems.get(id);
    if (!item) {
      return NextResponse.json(
        { error: "Moderation item not found." },
        { status: 404 }
      );
    }

    item.status = decision;
    item.reason = reason;
    item.updatedAt = new Date().toISOString();

    const auditLog = {
      id: `audit-${Date.now()}`,
      actorId: actor.userId,
      actionType:
        decision === "approved" ? "content_approved" : "content_rejected",
      targetContentId: id,
      targetUserId: item.ownerId,
      reason,
      createdAt: new Date().toISOString(),
    };
    store.auditLogs.push(auditLog);
    persistApiStore();

    return NextResponse.json({ item, auditLog });
  } catch {
    return NextResponse.json(
      { error: "Invalid moderation decision payload." },
      { status: 400 }
    );
  }
}
