# ContentFlow

**ContentFlow** is an AI-powered content creation and cross-platform distribution platform built with **Next.js 14 App Router**, **TypeScript**, and **Tailwind CSS v4**. It enables creators to turn a single idea into editable drafts, shape channel-specific variants for **YouTube** and **TikTok**, and manage a durable publishing queue.

---

## Architecture & Key Capabilities

### 1. App Router Pages (`src/app/`)
- `/` — Marketing landing page with hero, features, workflow, canonical pricing tiers, FAQ, and `SoftwareApplication` + `FAQPage` JSON-LD.
- `/login` & `/signup` — Authenticated account registration and sign-in with `scrypt` password hashing, `HttpOnly` signed session cookies, blur-then-live validation, and password visibility toggle.
- `/dashboard` — Creator workspace overview with UTC quota progress, recent drafts, and publishing activity.
- `/create` — AI content creation studio wired to `POST /api/v1/generate` and `POST /api/v1/content` with prompt character limits (`<= 1,000`), example chips, modality/tone/format controls, and editable draft preview.
- `/content/[id]` — Draft editor (`PATCH / DELETE /api/v1/content/[id]`), YouTube/TikTok variant adaptation tabs, and cross-post scheduling controls (`POST /api/v1/cross-post`).
- `/jobs` — Distribution queue (`GET /api/v1/jobs`) with status filtering (`all`, `pending`, `processing`, `completed`, `failed`, `cancelled`), detail drawer, pending-only cancellation (`POST /api/v1/jobs/[id]/cancel`), and worker execution/retry (`POST /api/v1/jobs/[id]/retry`).
- `/settings` — Profile management, BYOK (`AES-256-GCM` server-side envelope encryption), OAuth 2.0 PKCE connections, Billing (`USD` display + `NGN`/`USD` Paystack tables), and Security.
- `/admin` — Protected superuser control center (`Overview`, `Users`, `Quotas`, `Moderation`).
- `/privacy`, `/terms`, `/notes` — Legal, trust, and product architecture documentation routes.
- `/robots.txt`, `/sitemap.xml`, `/llms.txt` — SEO and AI discoverability metadata.

### 2. Domain Policy, Auth & Provider Adapters (`src/lib/`)
- **Canonical Subscription Tiers (`src/lib/policy/index.ts`)**:
  - `FREE`: 5 posts/month · 10 AI generations/day · 10 cross-posts/month · Video rendering: `false` · 100 MB storage
  - `CREATOR`: 50 posts/month · 100 AI generations/day · 100 cross-posts/month · Video rendering: `true` · 1,000 MB storage
  - `PRO`: Unlimited (`-1`) posts/month · 500 AI generations/day · Unlimited (`-1`) cross-posts/month · Video rendering: `true` · 10,000 MB storage
  - `AGENCY`: Unlimited (`-1`) posts/month · 2,000 AI generations/day · Unlimited (`-1`) cross-posts/month · Video rendering: `true` · 50,000 MB storage
- **Quota Reset & Cache Policy**:
  - Daily quotas reset at `00:00 UTC`; monthly quotas reset on the 1st of the month at `00:00 UTC`.
  - User-scoped exact-match AI cache hits (`ai_cache` scoped by `user_id`) do **not** consume daily AI generation quota.
- **Platform Budget Guardrails**:
  - Alerts superuser at **80%** utilization; triggers **Emergency Mode at 95%** (restricting Free-tier central AI provider usage server-side while allowing paid tiers and BYOK).
- **AI Provider Fallback Chain (`src/lib/providers/index.ts`)**:
  - `Plan A`: User BYOK (`OpenAI` / `Replicate`) encrypted with server-side `AES-256-GCM` or passed per-request.
  - `Plan B`: Cloudflare Workers AI.
  - `Plan C`: Hugging Face Inference API fallback.
  - Built-in ContentFlow Engine for zero-configuration local execution when external provider keys are not yet added to `.env`.
- **Cloudflare R2 Presigned Uploads (`POST /api/v1/storage/upload-url`)**:
  - Generates AWS Signature V4 presigned PUT URLs after validating MIME types (`PNG`, `JPEG`, `WEBP`, `MP4`, `MOV`) and user tier storage quota.

### 3. Versioned API Surface (`src/app/api/v1/`)
- `POST /api/v1/auth/signup`, `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`
- `POST /api/v1/generate`
- `GET /api/v1/content`, `POST /api/v1/content`, `GET /api/v1/content/:id`, `PATCH /api/v1/content/:id`, `DELETE /api/v1/content/:id`
- `POST /api/v1/cross-post`
- `GET /api/v1/jobs`, `GET /api/v1/jobs/:id`, `POST /api/v1/jobs/:id/cancel`, `POST /api/v1/jobs/:id/retry`
- `GET /api/v1/settings`, `PATCH /api/v1/settings`
- `POST /api/v1/storage/upload-url`
- `POST /api/v1/payments/upgrade`, `POST /api/v1/payments/webhook`
- `GET /api/v1/admin/users`, `PATCH /api/v1/admin/users/:id/tier`, `GET /api/v1/admin/quota`, `GET /api/v1/admin/moderation`, `POST /api/v1/admin/moderation`
- `POST /api/v1/platforms/connect`, `DELETE /api/v1/platforms/connect`, `GET /api/v1/platforms/callback`

### 4. Database Schema (`supabase/migrations/0001_contentflow_init.sql`)
- Full PostgreSQL DDL with Row-Level Security (RLS), separated `daily_usage` and `monthly_usage` tables, `user_roles`, isolated `oauth_connections`, `payment_events` idempotency table, and `claim_eligible_jobs()` using `FOR UPDATE SKIP LOCKED`.

---

## Getting Started

```bash
# Install dependencies
npm install

# Run unit, provider, API, and UI test suites (Vitest)
npm test

# Run TypeScript check
npm run typecheck

# Build for production
npm run build

# Start server on 0.0.0.0:3000
npm run start
```
