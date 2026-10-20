import { NextResponse } from "next/server";

export async function GET(_request: Request) {
  const spec = {
    openapi: "3.1.0",
    info: {
      title: "ContentFlow Production API v1",
      version: "1.0.0",
      description:
        "Zero-dollar budget multi-platform creator studio REST API for Web, PWA, Chrome Extension, and Expo Mobile clients.",
    },
    components: {
      securitySchemes: {
        sessionCookie: {
          type: "apiKey",
          in: "cookie",
          name: "cf_session",
        },
      },
    },
    paths: {
      "/api/v1/health": {
        get: { summary: "Zero-cost health, queue, cache & budget readiness" },
      },
      "/api/v1/auth/login": {
        post: { summary: "Authenticate creator with scrypt & rate limiting" },
      },
      "/api/v1/auth/signup": {
        post: { summary: "Register new creator account with scrypt password" },
      },
      "/api/v1/auth/me": {
        get: { summary: "Inspect current authenticated session and UTC quotas" },
      },
      "/api/v1/generate": {
        post: {
          summary:
            "Generate multi-platform content with BYOK -> Cloudflare AI -> Hugging Face fallback",
        },
      },
      "/api/v1/content": {
        get: { summary: "List creator drafts" },
        post: { summary: "Create new draft within monthly tier post quota" },
      },
      "/api/v1/cross-post": {
        post: { summary: "Queue YouTube & TikTok publishing jobs" },
      },
      "/api/v1/jobs": {
        get: { summary: "List publishing queue jobs" },
      },
      "/api/v1/jobs/batch": {
        post: { summary: "Batch cancel_pending or retry_failed queue jobs" },
      },
      "/api/v1/worker/tick": {
        post: {
          summary:
            "Zero-cost pg_cron / GitHub Actions worker tick for due jobs & cache cleanup",
        },
      },
      "/api/v1/repurpose": {
        post: {
          summary:
            "Repurpose long-form content into YouTube script + 3 TikTok hooks + poll ($0)",
        },
      },
      "/api/v1/analyze": {
        post: {
          summary:
            "Score hook retention, readability, and YouTube/TikTok compliance ($0)",
        },
      },
      "/api/v1/ab-test": {
        post: {
          summary:
            "Generate and score 3 A/B/C YouTube Title & TikTok Hook variants ($0)",
        },
      },
      "/api/v1/export": {
        get: {
          summary:
            "Export portable workspace JSON or .srt/.vtt subtitle tracks ($0)",
        },
      },
      "/api/v1/import": {
        post: { summary: "Import portable content drafts within tier quota" },
      },
      "/api/v1/calendar.ics": {
        get: { summary: "Export RFC 5545 iCalendar publishing schedule (.ics)" },
      },
      "/api/v1/payments/trial": {
        post: {
          summary:
            "Activate a 1-time 30-day free trial on CREATOR or PRO with zero card required upfront",
        },
        delete: {
          summary:
            "1-click FTC Click-to-Cancel trial or subscription cancellation",
        },
      },
      "/api/v1/admin": {
        post: {
          summary:
            "Poise-spec 6-Tab Admin Server Wall (lookup, grant, revoke, promo_create, promo_list, redeem, tester_mint, notice_publish, app_config, sweep_now)",
        },
      },
    },
  };

  return NextResponse.json(spec);
}
