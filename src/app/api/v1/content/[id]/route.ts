import { NextResponse } from "next/server";
import { authorizeResourceAccess } from "@/lib/policy";
import { extractActorFromRequest, getDemoApiStore } from "@/lib/server/store";

export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  const actor = extractActorFromRequest(request);
  const store = getDemoApiStore();
  const item = store.contents.get(context.params.id);

  if (!item) {
    return NextResponse.json({ error: "Content not found." }, { status: 404 });
  }

  const authorized = authorizeResourceAccess({
    actorUserId: actor.userId,
    actorRoles: actor.roles,
    ownerUserId: item.userId,
  });

  if (!authorized) {
    return NextResponse.json(
      { error: "Forbidden: You do not have permission to access this content." },
      { status: 403 }
    );
  }

  return NextResponse.json({ demo: true, content: item });
}

export async function POST(request: Request) {
  return NextResponse.json({ error: "Use POST /api/v1/content" }, { status: 405 });
}
