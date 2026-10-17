import type { JobRecord } from "@/lib/server/store";

function toIcsUtcTimestamp(isoOrNow?: string | null): string {
  const parsed = isoOrNow ? new Date(isoOrNow) : new Date();
  const safeDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  return safeDate
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function escapeIcsText(raw: string): string {
  return raw
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

export function buildIcsCalendarFromJobs(
  jobs: JobRecord[],
  calendarName = "ContentFlow Publishing Schedule"
): string {
  const nowStamp = toIcsUtcTimestamp();
  const events = jobs.map((job) => {
    const startDate = job.scheduledAt
      ? new Date(job.scheduledAt)
      : new Date(job.createdAt);
    const safeStart = Number.isNaN(startDate.getTime())
      ? new Date()
      : startDate;
    const endDate = new Date(safeStart.getTime() + 30 * 60 * 1000);

    const dtStart = toIcsUtcTimestamp(safeStart.toISOString());
    const dtEnd = toIcsUtcTimestamp(endDate.toISOString());
    const summary = escapeIcsText(`[${job.platform}] ${job.contentTitle}`);
    const description = escapeIcsText(
      `ContentFlow Job #${job.id} (${job.status}) — Schedule: ${job.scheduledAt || "Immediate"}`
    );
    const status =
      job.status === "cancelled"
        ? "CANCELLED"
        : job.status === "completed"
          ? "CONFIRMED"
          : "TENTATIVE";

    return [
      "BEGIN:VEVENT",
      `UID:contentflow-job-${job.id}@contentflow.app`,
      `DTSTAMP:${nowStamp}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      `STATUS:${status}`,
      "END:VEVENT",
    ].join("\r\n");
  });

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ContentFlow//Creator Queue//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
    ...events,
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
