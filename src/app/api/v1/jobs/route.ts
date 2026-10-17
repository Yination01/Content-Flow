import { NextResponse } from "next/server";
import { extractActorFromRequest, getApiStore } from "@/lib/server/store";

export async function GET(request: Request) {
  const actor = extractActorFromRequest(request);
  const store = getApiStore();
  const isPrivileged =
    actor.roles.includes("superuser") || actor.roles.includes("moderator");

  const jobs = Array.from(store.jobs.values())
    .filter((job) => isPrivileged || job.userId === actor.userId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return NextResponse.json({ jobs });
}
