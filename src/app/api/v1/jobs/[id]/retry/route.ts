import { NextResponse } from "next/server";
import { authorizeResourceAccess } from "@/lib/policy";
import {
  extractActorFromRequest,
  getApiStore,
  persistApiStore,
} from "@/lib/server/store";

export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  const actor = extractActorFromRequest(request);
  const store = getApiStore();
  const job = store.jobs.get(context.params.id);

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  if (
    !authorizeResourceAccess({
      actorUserId: actor.userId,
      actorRoles: actor.roles,
      ownerUserId: job.userId,
    })
  ) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  job.attempts += 1;
  job.startedAt = new Date().toISOString();
  job.status = "completed";
  job.errorMessage = undefined;
  job.completedAt = new Date().toISOString();

  if (job.contentId) {
    const content = store.contents.get(job.contentId);
    if (content) {
      content.status = "posted";
      content.updatedAt = new Date().toISOString();
    }
  }
  persistApiStore();

  return NextResponse.json({ job });
}
