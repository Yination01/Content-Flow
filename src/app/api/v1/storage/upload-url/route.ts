import { NextResponse } from "next/server";
import { evaluatePlatformBudget } from "@/lib/policy";
import { createR2PresignedUploadUrl } from "@/lib/providers";
import {
  extractActorFromRequest,
  getApiStore,
  persistApiStore,
} from "@/lib/server/store";

export async function POST(request: Request) {
  try {
    const actor = extractActorFromRequest(request);
    const store = getApiStore();

    // Enforce $0-budget Cloudflare R2 free-tier ceiling before issuing upload URL
    const r2Budget = evaluatePlatformBudget(
      "R2_WRITES",
      store.platformUsage.r2Writes,
      actor.tier
    );
    if (!r2Budget.allowCentralProvider) {
      return NextResponse.json(
        {
          error:
            "Platform R2 monthly free-tier write ceiling reached. Uploads are paused to guarantee $0 overage.",
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const fileName =
      typeof body?.fileName === "string" ? body.fileName.trim() : "";
    const contentType =
      typeof body?.contentType === "string" ? body.contentType.trim() : "";
    const fileSizeBytes = Number(body?.fileSizeBytes || 0);

    if (!fileName || !contentType || fileSizeBytes <= 0) {
      return NextResponse.json(
        { error: "fileName, contentType, and fileSizeBytes are required." },
        { status: 400 }
      );
    }

    const result = createR2PresignedUploadUrl({
      userId: actor.userId,
      fileName,
      contentType,
      fileSizeBytes,
      tier: actor.tier,
      currentStorageUsedMb: actor.userRecord.usage.storageUsedMb,
    });

    if (!result.allowed) {
      return NextResponse.json({ error: result.reason }, { status: 400 });
    }

    store.platformUsage.r2Writes += 1;
    persistApiStore();

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Invalid upload URL request." },
      { status: 400 }
    );
  }
}
