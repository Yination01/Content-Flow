import { NextResponse } from "next/server";
import { authorizeResourceAccess } from "@/lib/policy";
import {
  extractActorFromRequest,
  getApiStore,
  persistApiStore,
} from "@/lib/server/store";

export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  const actor = extractActorFromRequest(request);
  const store = getApiStore();
  const item = store.contents.get(context.params.id);

  if (!item) {
    return NextResponse.json({ error: "Content not found." }, { status: 404 });
  }

  if (
    !authorizeResourceAccess({
      actorUserId: actor.userId,
      actorRoles: actor.roles,
      ownerUserId: item.userId,
    })
  ) {
    return NextResponse.json(
      { error: "Forbidden: You do not have permission to access this content." },
      { status: 403 }
    );
  }

  return NextResponse.json({ content: item });
}

export async function PATCH(
  request: Request,
  context: { params: { id: string } }
) {
  const actor = extractActorFromRequest(request);
  const store = getApiStore();
  const item = store.contents.get(context.params.id);

  if (!item) {
    return NextResponse.json({ error: "Content not found." }, { status: 404 });
  }

  if (
    !authorizeResourceAccess({
      actorUserId: actor.userId,
      actorRoles: actor.roles,
      ownerUserId: item.userId,
    })
  ) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const body = await request.json();
    if (typeof body?.title === "string" && body.title.trim()) {
      item.title = body.title.trim();
    }
    if (typeof body?.generatedScript === "string") {
      item.generatedScript = body.generatedScript;
    }
    if (
      body?.status &&
      ["draft", "ready", "posted", "failed"].includes(body.status)
    ) {
      item.status = body.status;
    }
    if (typeof body?.metadata === "object" && body.metadata) {
      item.metadata = { ...item.metadata, ...body.metadata };
    }
    item.updatedAt = new Date().toISOString();
    persistApiStore();

    return NextResponse.json({ content: item });
  } catch {
    return NextResponse.json({ error: "Invalid update payload." }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: { id: string } }
) {
  const actor = extractActorFromRequest(request);
  const store = getApiStore();
  const item = store.contents.get(context.params.id);

  if (!item) {
    return NextResponse.json({ error: "Content not found." }, { status: 404 });
  }

  if (
    !authorizeResourceAccess({
      actorUserId: actor.userId,
      actorRoles: actor.roles,
      ownerUserId: item.userId,
    })
  ) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  store.contents.delete(context.params.id);
  persistApiStore();
  return NextResponse.json({ deleted: true, id: context.params.id });
}
