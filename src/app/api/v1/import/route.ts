import { NextResponse } from "next/server";
import { checkUserQuota } from "@/lib/policy";
import {
  extractActorFromRequest,
  getApiStore,
  persistApiStore,
} from "@/lib/server/store";

export async function POST(request: Request) {
  try {
    const actor = extractActorFromRequest(request);
    const body = await request.json();
    const incoming = Array.isArray(body?.contents) ? body.contents : [];

    if (incoming.length === 0 || incoming.length > 50) {
      return NextResponse.json(
        { error: "Provide between 1 and 50 content items to import." },
        { status: 400 }
      );
    }

    const store = getApiStore();
    const importedIds: string[] = [];
    const nowIso = new Date().toISOString();

    for (const raw of incoming) {
      const quotaDecision = checkUserQuota(
        actor.tier,
        actor.userRecord.usage,
        "create_post"
      );
      if (!quotaDecision.allowed) {
        return NextResponse.json(
          {
            error: quotaDecision.reason,
            importedCount: importedIds.length,
            importedIds,
          },
          { status: 429 }
        );
      }

      const id = `cf-${Date.now()}-${store.contents.size + 1}`;
      const title =
        typeof raw?.title === "string" && raw.title.trim()
          ? raw.title.trim().slice(0, 120)
          : "Imported Draft";
      const originalText =
        typeof raw?.originalText === "string" ? raw.originalText : title;
      const generatedScript =
        typeof raw?.generatedScript === "string"
          ? raw.generatedScript
          : originalText;
      const contentType = ["text", "image", "video"].includes(raw?.contentType)
        ? (raw.contentType as "text" | "image" | "video")
        : "text";

      store.contents.set(id, {
        id,
        userId: actor.userId,
        title,
        originalText,
        generatedScript,
        contentType,
        status: "draft",
        metadata:
          raw?.metadata && typeof raw.metadata === "object" ? raw.metadata : {},
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      actor.userRecord.usage.monthlyPostsCreated += 1;
      importedIds.push(id);
    }

    persistApiStore();

    return NextResponse.json(
      {
        importedCount: importedIds.length,
        importedIds,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid import payload." },
      { status: 400 }
    );
  }
}
