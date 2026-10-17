import { NextResponse } from "next/server";
import { authorizeResourceAccess, canCancelJob } from "@/lib/policy";
import { extractActorFromRequest, getDemoApiStore } from "@/lib/server/store";

export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  const actor = extractActorFromRequest(request);
  const store = getDemoApiStore();
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

  if (!canCancelJob(job.status)) {
    return NextResponse.json(
      {
        error: `Cannot cancel job in '${job.status}' state. Only pending jobs can be cancelled.`,
      },
      { status: 409 }
    );
  }

  job.status = "cancelled";
  job.completedAt = new Date().toISOString();

  return NextResponse.json({ demo: true, job });
}
