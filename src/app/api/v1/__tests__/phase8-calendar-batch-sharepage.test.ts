import { beforeEach, describe, expect, it } from "vitest";
import { getApiStore, resetApiStoreForTests } from "@/lib/server/store";
import { buildIcsCalendarFromJobs } from "@/lib/calendar/ics";
import { GET as calendarGet } from "@/app/api/v1/calendar.ics/route";
import { POST as batchJobsPost } from "@/app/api/v1/jobs/batch/route";

describe("Phase 8: $0 RFC 5545 .ics Schedule Feed & Batch Queue Operations", () => {
  beforeEach(() => {
    resetApiStoreForTests();
  });

  it("generates a valid RFC 5545 .ics calendar feed from creator jobs via GET /api/v1/calendar.ics", async () => {
    const store = getApiStore();
    const jobs = Array.from(store.jobs.values());
    const ics = buildIcsCalendarFromJobs(jobs, "Maya's ContentFlow Queue");

    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("VERSION:2.0");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("END:VCALENDAR");

    const res = await calendarGet(
      new Request("http://localhost:3000/api/v1/calendar.ics", {
        headers: { "x-user-id": "user-1" },
      })
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/calendar");
    const body = await res.text();
    expect(body).toContain("BEGIN:VCALENDAR");
    expect(body).toContain("YouTube");
  });

  it("executes batch cancel_pending and retry_failed queue operations via POST /api/v1/jobs/batch", async () => {
    const cancelRes = await batchJobsPost(
      new Request("http://localhost:3000/api/v1/jobs/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "user-1",
        },
        body: JSON.stringify({ action: "cancel_pending" }),
      })
    );
    expect(cancelRes.status).toBe(200);
    const cancelData = await cancelRes.json();
    expect(cancelData.action).toBe("cancel_pending");
    expect(cancelData.affectedCount).toBeGreaterThanOrEqual(1);

    const retryRes = await batchJobsPost(
      new Request("http://localhost:3000/api/v1/jobs/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "user-1",
        },
        body: JSON.stringify({ action: "retry_failed" }),
      })
    );
    expect(retryRes.status).toBe(200);
    const retryData = await retryRes.json();
    expect(retryData.action).toBe("retry_failed");
    expect(retryData.affectedCount).toBeGreaterThanOrEqual(1);
  });
});
