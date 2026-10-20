# ContentFlow

**ContentFlow** is an AI-powered content creation and cross-platform distribution platform built with **Next.js 14 App Router**, **TypeScript**, and **Tailwind CSS v4**, engineered to run on a strict **$0.00/month infrastructure budget** across Web/PWA, Chrome Extension, and Expo Mobile clients.

---

## Architecture & Key Capabilities

### 1. App Router Pages (`src/app/`) & PWA (`src/app/manifest.ts`, `public/sw.js`)
- `/` — Marketing landing page with hero, features, workflow, canonical pricing tiers, FAQ, and `SoftwareApplication` + `FAQPage` JSON-LD.
- `/login` & `/signup` — Authenticated account registration and sign-in with `scrypt` password hashing, `HttpOnly` signed session cookies, blur-then-live validation, and password visibility toggle.
- `/dashboard` — Creator workspace overview with UTC quota progress, recent drafts, and publishing activity.
- `/create` — AI content creation studio wired to `POST /api/v1/generate` and `POST /api/v1/content` with prompt character limits (`<= 1,000`), example chips, modality/tone/format controls, editable draft preview, and **Zero-Cost Client Video Storyboard Preview** (rendered in-browser at `$0` server compute).
- `/content/[id]` — Draft editor (`PATCH / DELETE /api/v1/content/[id]`), YouTube/TikTok variant adaptation tabs, and cross-post scheduling controls (`POST /api/v1/cross-post`).
- `/jobs` — Distribution queue (`GET /api/v1/jobs`) with status filtering (`all`, `pending`, `processing`, `completed`, `failed`, `cancelled`), detail drawer, pending-only cancellation (`POST /api/v1/jobs/[id]/cancel`), individual job retry (`POST /api/v1/jobs/[id]/retry`), and batch worker execution (`POST /api/v1/worker/tick`).
- `/settings` - Profile management, BYOK (`AES-256-GCM` server-side envelope encryption), OAuth 2.0 PKCE connections (with signed `cf_platforms` cookie persistence and browser `302` callback redirect), Billing (`USD` display + `NGN`/`USD` Paystack tables, 1-click 30-day Free Trial on Creator/Pro, Promo Code redemption, and 1-click FTC cancellation), and Security (segmented 6-box OTP + passphrase generator).
- `/admin` - Protected 6-Tab Dark-First Admin Workshop (`Control`, `Testers`, `Notices`, `Promo Codes`, `Subscriptions`, `System`) with scoped dark/light theme variables, inline `Enter Admin` sign-in gate, and visible `Back to Dashboard` navigation on desktop and mobile.
- Global Light & Dark Mode toggle (`data-theme="light" | "dark"`, persisted in `localStorage`) across landing, workspace, settings, and admin surfaces, plus full-height fixed desktop sidebar (`100dvh`) and zero-cutoff mobile responsive grids (`overflow-x: clip` + `minmax(0, 1fr)`).
- `/privacy`, `/terms`, `/notes` — Legal, trust, and product architecture documentation routes.
- `/manifest.webmanifest`, `/sw.js`, `/robots.txt`, `/sitemap.xml`, `/llms.txt` — Installable PWA manifest, service worker, SEO, and AI discoverability metadata.

### 2. Zero-Dollar Budget Guardrails, Domain Policy & Providers (`src/lib/`)
- **Canonical Subscription Tiers (`src/lib/policy/index.ts`)**:
  - `FREE`: 5 posts/month · 10 AI generations/day · 10 cross-posts/month · Video rendering: `false` · 100 MB storage
  - `CREATOR`: 50 posts/month · 100 AI generations/day · 100 cross-posts/month · Video rendering: `true` · 1,000 MB storage
  - `PRO`: Unlimited (`-1`) posts/month · 500 AI generations/day · Unlimited (`-1`) cross-posts/month · Video rendering: `true` · 10,000 MB storage
  - `AGENCY`: Unlimited (`-1`) posts/month · 2,000 AI generations/day · Unlimited (`-1`) cross-posts/month · Video rendering: `true` · 50,000 MB storage
- **Live `$0.00`-Budget Free-Tier Ceilings (`store.platformUsage`)**:
  - Hard-stops 20% below provider free-tier limits so overage charges are impossible (`CF_AI_DAILY_LIMIT: 8,000` vs 10,000 free, `R2_MONTHLY_WRITES_LIMIT: 800,000` vs 1,000,000 free, `YOUTUBE_API_DAILY_LIMIT: 8,000` vs 10,000 free, `TIKTOK_API_DAILY_LIMIT: 800`, `HUGGINGFACE_DAILY_LIMIT: 2,000`).
  - Alerts superuser at **80%** utilization; triggers **Emergency Mode at 95%** (routing Free-tier AI requests away from Cloudflare Workers AI to Plan C Hugging Face or Plan D graceful degradation, and blocking R2 uploads at 100% of the 800,000 cap).
- **AI Provider Fallback Chain (`src/lib/providers/index.ts`)**:
  - `Plan A`: User BYOK (`OpenAI` / `Replicate`) encrypted with server-side `AES-256-GCM` or passed per-request (`$0` platform cost).
  - `Plan B`: Cloudflare Workers AI Free Tier (`$0`).
  - `Plan C`: Hugging Face Inference API Free Tier (`$0`).
  - Built-in ContentFlow Engine (`$0` local execution when external provider keys are not yet added to `.env`).

### 3. Versioned API Surface (`src/app/api/v1/`)
- `POST /api/v1/auth/signup`, `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`
- `POST /api/v1/generate`
- `GET /api/v1/content`, `POST /api/v1/content`, `GET /api/v1/content/:id`, `PATCH /api/v1/content/:id`, `DELETE /api/v1/content/:id`
- `POST /api/v1/cross-post`
- `GET /api/v1/jobs`, `GET /api/v1/jobs/:id`, `POST /api/v1/jobs/:id/cancel`, `POST /api/v1/jobs/:id/retry`
- `POST /api/v1/worker/tick` (Zero-cost scheduled job runner & expired cache cleaner)
- `GET /api/v1/settings`, `PATCH /api/v1/settings`
- `POST /api/v1/storage/upload-url`
- `POST /api/v1/payments/upgrade`, `POST /api/v1/payments/webhook`
- `GET /api/v1/admin/users`, `PATCH /api/v1/admin/users/:id/tier`, `GET /api/v1/admin/quota`, `GET /api/v1/admin/moderation`, `POST /api/v1/admin/moderation`
- `POST /api/v1/platforms/connect`, `DELETE /api/v1/platforms/connect`, `GET /api/v1/platforms/callback`

### 4. Multi-Platform Zero-Cost Clients
- **Chrome Extension Manifest V3 (`extension/`)**: Unpacked extension (`extension/manifest.json`, `popup.html`, `popup.js`) for capturing ideas from any webpage and generating/saving drafts via `/api/v1/*`.
- **Expo Mobile Client (`mobile/`)**: React Native / Expo scaffold (`mobile/src/api.ts`, `mobile/App.tsx`, `mobile/package.json`, `mobile/app.json`) targeting Android & iOS via `/api/v1/*`.

### 5. Database Schema & `pg_cron` Workers (`supabase/migrations/`)
- `0001_contentflow_init.sql`: Full PostgreSQL DDL with Row-Level Security (RLS), separated `daily_usage` and `monthly_usage` tables, `user_roles`, isolated `oauth_connections`, `payment_events` idempotency table, and `claim_eligible_jobs()` using `FOR UPDATE SKIP LOCKED`.
- `0002_pg_cron_workers.sql`: Zero-cost Supabase `pg_cron` schedules for daily `platform_usage` initialization (`0 0 * * *`), expired AI cache cleanup (`0 0 * * *`), and hourly 80%/95% budget alert evaluation (`0 * * * *`).

---

## Getting Started

```bash
# Install dependencies
npm install

# Run unit, provider, API, zero-budget worker, and UI test suites (Vitest)
npm test

# Run TypeScript check
npm run typecheck

# Build for production
npm run build

# Start server on 0.0.0.0:3000
npm run start
```
