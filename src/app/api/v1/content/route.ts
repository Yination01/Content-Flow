import { NextResponse } from "next/server";
import { checkUserQuota } from "@/lib/policy";
import { extractActorFromRequest, getDemoApiStore } from "@/lib/server/store";

export async function POST(request: Request) {
  try {
    const actor = extractActorFromRequest(request);
    const quota = checkUserQuota(actor.tier, actor.userRecord.usage, "create_post");
    if (!quota.allowed) {
      return NextResponse.json({ error: quota.reason }, { status: 429 });
    }

    const body = await request.json();
    const title = typeof body?.title === "string" ? body.title.trim() : "Untitled draft";
    const generatedScript =
      typeof body?.generatedScript === "string" ? body.generatedScript : "";
    const contentType =
      body?.contentType === "image" || body?.contentType === "video"
        ? body.contentType
        : "text";

    const store = getDemoApiStore();
    const id = String(store.contents.size + 1);
    const now = new Date().toISOString();
    const record = {
      id,
      userId: actor.userId,
      title,
      contentType,
      originalText: typeof body?.originalText === "string" ? body.originalText : title,
      generatedScript,
      metadata: typeof body?.metadata === "object" && body.metadata ? body.metadata : {},
      status: "draft" as const,
      createdAt: now,
      updatedAt: now,
    };

    store.contents.set(id, record);
    actor.userRecord.usage.monthlyPostsCreated += 1;

    return NextResponse.json({ demo: true, content: record }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid content payload." }, { status: 400 });
  }
}
