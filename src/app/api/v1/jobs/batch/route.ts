import { NextResponse } from "next/server";
import {
  extractActorFromRequest,
  getApiStore,
  persistApiStore,
} from "@/lib/server/store";

export async function POST(request: Request) {
  try {
    const actor = extractActorFromRequest(request);
    const body = await request.json();
    const action = body?.action;

    if (action !== "cancel_pending" && action !== "retry_failed") {
      return NextResponse.json(
        { error: "action must be cancel_pending or retry_failed." },
        { status: 400 }
      );
    }

    const store = getApiStore();
    const nowIso = new Date().toISOString();
    const jobIds: string[] = [];

    for (const job of Array.from(store.jobs.values())) {
      if (job.userId !== actor.userId) continue;

      if (action === "cancel_pending" && job.status === "pending") {
        job.status = "cancelled";
        job.completedAt = nowIso;
        jobIds.push(job.id);
      } else if (
        action === "retry_failed" &&
        job.status === "failed" &&
        job.attempts < job.maxAttempts
      ) {
        job.status = "completed";
        job.attempts += 1;
        job.errorMessage = undefined;
        job.completedAt = nowIso;
        jobIds.push(job.id);
      }
    }

    persistApiStore();

    return NextResponse.json({
      action,
      affectedCount: jobIds.length,
      jobIds,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid batch job payload." },
      { status: 400 }
    );
  }
}
