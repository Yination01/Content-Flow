import { NextResponse } from "next/server";
import { CREATOR_TEMPLATES } from "@/lib/repurpose/engine";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const category = url.searchParams.get("category")?.trim().toLowerCase();

  const templates = category
    ? CREATOR_TEMPLATES.filter((t) => t.category === category)
    : CREATOR_TEMPLATES;

  return NextResponse.json({
    total: templates.length,
    templates,
  });
}
