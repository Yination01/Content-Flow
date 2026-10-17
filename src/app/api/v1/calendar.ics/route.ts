import { NextResponse } from "next/server";
import { buildIcsCalendarFromJobs } from "@/lib/calendar/ics";
import { extractActorFromRequest, getApiStore } from "@/lib/server/store";

export async function GET(request: Request) {
  const actor = extractActorFromRequest(request);
  const store = getApiStore();

  const userJobs = Array.from(store.jobs.values()).filter(
    (job) => job.userId === actor.userId
  );

  const icsPayload = buildIcsCalendarFromJobs(
    userJobs,
    `${actor.userRecord.name} — ContentFlow Schedule`
  );

  return new NextResponse(icsPayload, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="contentflow-schedule.ics"',
    },
  });
}
