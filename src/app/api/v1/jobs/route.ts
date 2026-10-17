import { NextResponse } from "next/server";
import { extractActorFromRequest, getDemoApiStore } from "@/lib/server/store";

export async function GET(request: Request) {
  const actor = extractActorFromRequest(request);
  const store = getDemoApiStore();
  const isPrivileged =
    actor.roles.includes("superuser") || actor.roles.includes("moderator");

  const jobs = Array.from(store.jobs.values()).filter(
    (job) => isPrivileged || job.userId === actor.userId
  );

  return NextResponse.json({ demo: true, jobs });
}
