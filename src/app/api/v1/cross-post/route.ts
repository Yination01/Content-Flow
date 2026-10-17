import { NextResponse } from "next/server";
import { authorizeResourceAccess, checkUserQuota } from "@/lib/policy";
import {
  extractActorFromRequest,
  getApiStore,
  persistApiStore,
} from "@/lib/server/store";

export async function POST(request: Request) {
  try {
    const actor = extractActorFromRequest(request);
    const body = await request.json();
    const contentId = String(body?.contentId || "1");
    const platforms: string[] = Array.isArray(body?.platforms)
      ? body.platforms
      : ["YouTube"];
    const scheduleLabel: string =
      typeof body?.scheduleLabel === "string"
        ? body.scheduleLabel
        : "Today at 4:30 PM UTC";
    const immediate =
      scheduleLabel.toLowerCase().includes("now") || body?.scheduledAt === null;
    const scheduledAt: string | null = immediate
      ? null
      : typeof body?.scheduledAt === "string"
        ? body.scheduledAt
        : new Date(Date.now() + 3600_000).toISOString();

    const store = getApiStore();
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

    const quota = checkUserQuota(
      actor.tier,
      actor.userRecord.usage,
      "cross_post"
    );
    if (!quota.allowed) {
      return NextResponse.json({ error: quota.reason }, { status: 429 });
    }

    const createdJobs = platforms.map((platform, idx) => {
      const id = String(Date.now() + idx);
      const status = immediate ? ("completed" as const) : ("pending" as const);
      const job = {
        id,
        userId: actor.userId,
        jobType: scheduledAt
          ? ("scheduled_publish" as const)
          : ("cross_post" as const),
        contentId,
        contentTitle: content.title,
        platform: (platform === "TikTok" ? "TikTok" : "YouTube") as
          | "YouTube"
          | "TikTok",
        payload: { platforms, scheduleLabel, scheduledAt },
        status,
        priority: 1,
        attempts: immediate ? 1 : 0,
        maxAttempts: 3,
        scheduledAt,
        completedAt: immediate ? new Date().toISOString() : undefined,
        createdAt: new Date().toISOString(),
      };
      store.jobs.set(id, job);
      actor.userRecord.usage.monthlyCrossPosts += 1;
      return job;
    });

    if (immediate) {
      content.status = "posted";
      content.updatedAt = new Date().toISOString();
    } else {
      content.status = "ready";
      content.updatedAt = new Date().toISOString();
    }
    persistApiStore();

    return NextResponse.json({ jobs: createdJobs }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Invalid cross-post request." },
      { status: 400 }
    );
  }
}
