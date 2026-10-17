import { NextResponse } from "next/server";
import { authorizeResourceAccess, checkUserQuota } from "@/lib/policy";
import { extractActorFromRequest, getDemoApiStore } from "@/lib/server/store";

export async function POST(request: Request) {
  try {
    const actor = extractActorFromRequest(request);
    const body = await request.json();
    const contentId = String(body?.contentId || "1");
    const platforms: string[] = Array.isArray(body?.platforms) ? body.platforms : ["YouTube"];
    const scheduledAt: string | null =
      typeof body?.scheduledAt === "string" ? body.scheduledAt : null;

    const store = getDemoApiStore();
    const content = store.contents.get(contentId);
    if (!content) {
      return NextResponse.json({ error: "Content not found." }, { status: 404 });
    }

    if (
      !authorizeResourceAccess({
        actorUserId: actor.userId,
        actorRoles: actor.roles,
        ownerUserId: content.userId,
      })
    ) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const quota = checkUserQuota(actor.tier, actor.userRecord.usage, "cross_post");
    if (!quota.allowed) {
      return NextResponse.json({ error: quota.reason }, { status: 429 });
    }

    const createdJobs = platforms.map((platform, idx) => {
      const id = String(Date.now() + idx);
      const job = {
        id,
        userId: actor.userId,
        jobType: scheduledAt ? ("scheduled_publish" as const) : ("cross_post" as const),
        contentId,
        contentTitle: content.title,
        platform: (platform === "TikTok" ? "TikTok" : "YouTube") as "YouTube" | "TikTok",
        payload: { platforms, scheduledAt },
        status: "pending" as const,
        priority: 1,
        attempts: 0,
        maxAttempts: 3,
        scheduledAt,
        createdAt: new Date().toISOString(),
      };
      store.jobs.set(id, job);
      actor.userRecord.usage.monthlyCrossPosts += 1;
      return job;
    });

    return NextResponse.json({ demo: true, jobs: createdJobs }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid cross-post request." }, { status: 400 });
  }
}
