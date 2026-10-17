import { NextResponse } from "next/server";
import { authorizeAdminAction } from "@/lib/policy";
import { extractActorFromRequest, getDemoApiStore } from "@/lib/server/store";

export async function GET(request: Request) {
  const actor = extractActorFromRequest(request);
  if (!authorizeAdminAction(actor.roles, "user_list")) {
    return NextResponse.json({ error: "Forbidden: Superuser role required." }, { status: 403 });
  }

  const url = new URL(request.url);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || 20)));
  const store = getDemoApiStore();
  const users = Array.from(store.users.values()).slice(0, limit);

  return NextResponse.json({
    demo: true,
    users,
    pagination: { limit, count: users.length },
  });
}
