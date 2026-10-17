import { NextResponse } from "next/server";
import { checkUserQuota } from "@/lib/policy";
import {
  extractActorFromRequest,
  getApiStore,
  persistApiStore,
} from "@/lib/server/store";

export async function GET(request: Request) {
  const actor = extractActorFromRequest(request);
  const store = getApiStore();
  const isPrivileged =
    actor.roles.includes("superuser") || actor.roles.includes("moderator");

  const contents = Array.from(store.contents.values())
    .filter((item) => isPrivileged || item.userId === actor.userId)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

  return NextResponse.json({ contents });
}

export async function POST(request: Request) {
  try {
    const actor = extractActorFromRequest(request);
    const quota = checkUserQuota(
      actor.tier,
      actor.userRecord.usage,
      "create_post"
    );
    if (!quota.allowed) {
      return NextResponse.json({ error: quota.reason }, { status: 429 });
    }

    const body = await request.json();
    const title =
      typeof body?.title === "string" && body.title.trim()
        ? body.title.trim()
        : "Untitled draft";
    const generatedScript =
      typeof body?.generatedScript === "string" ? body.generatedScript : "";
    const contentType =
      body?.contentType === "image" || body?.contentType === "video"
        ? body.contentType
        : "text";

    const store = getApiStore();
    const id = String(Date.now());
    const now = new Date().toISOString();
    const record = {
      id,
      userId: actor.userId,
      title,
      contentType: contentType as "text" | "image" | "video",
      originalText:
        typeof body?.originalText === "string" ? body.originalText : title,
      generatedScript,
      metadata:
        typeof body?.metadata === "object" && body.metadata
          ? body.metadata
          : {},
      status: "draft" as const,
      createdAt: now,
      updatedAt: now,
    };

    store.contents.set(id, record);
    actor.userRecord.usage.monthlyPostsCreated += 1;
    persistApiStore();

    return NextResponse.json({ content: record }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Invalid content payload." },
      { status: 400 }
    );
  }
}
