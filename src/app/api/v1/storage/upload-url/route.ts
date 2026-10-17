import { NextResponse } from "next/server";
import { createR2PresignedUploadUrl } from "@/lib/providers";
import { extractActorFromRequest } from "@/lib/server/store";

export async function POST(request: Request) {
  try {
    const actor = extractActorFromRequest(request);
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

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Invalid upload URL request." },
      { status: 400 }
    );
  }
}
