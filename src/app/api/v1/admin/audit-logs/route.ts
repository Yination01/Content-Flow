import { NextResponse } from "next/server";
import { authorizeAdminAction } from "@/lib/policy";
import { extractActorFromRequest, getApiStore } from "@/lib/server/store";

export async function GET(request: Request) {
  const actor = extractActorFromRequest(request);
  if (!authorizeAdminAction(actor.roles, "user_list")) {
    return NextResponse.json(
      { error: "Forbidden: Superuser role required." },
      { status: 403 }
    );
  }

  const store = getApiStore();
  return NextResponse.json({
    total: store.auditLogs.length,
    auditLogs: [...store.auditLogs].reverse(),
  });
}
