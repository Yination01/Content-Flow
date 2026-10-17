# ContentFlow

**ContentFlow** is an AI-powered content creation and cross-platform distribution platform built with **Next.js 14 App Router**, **TypeScript**, and **Tailwind CSS v4**. It enables creators to turn a single idea into editable drafts, shape channel-specific variants for **YouTube** and **TikTok**, and manage a durable publishing queue.

> **Demo Mode Transparency**: When external provider credentials (`Supabase`, `Paystack`, `Cloudflare Workers AI`, `YouTube`, `TikTok`) are not configured, ContentFlow runs in an interactive **Demo Mode**. All simulated AI generations, account connections, admin controls, and publishing jobs are explicitly badged as **Demo mode** and never misrepresented as live external operations.

---

## Architecture & Key Capabilities

### 1. App Router Pages (`src/app/`)
- `/` — Marketing landing page with hero, features, workflow, canonical pricing tiers, FAQ, and `SoftwareApplication` + `FAQPage` JSON-LD.
- `/login` & `/signup` — Accessible authentication flows with blur-then-live validation and password visibility toggle.
- `/dashboard` — Creator workspace overview with UTC quota progress, recent drafts, and publishing activity.
- `/create` — AI content creation studio with prompt character limits (`<= 1,000`), example chips, modality/tone/format controls, and editable draft preview.
- `/content/[id]` — Draft editor, YouTube/TikTok variant adaptation tabs, and cross-post scheduling controls.
- `/jobs` — Distribution queue with status filtering (`all`, `pending`, `processing`, `completed`, `failed`, `cancelled`), detail drawer, and pending-only cancellation.
- `/settings` — Profile, BYOK (`AES-256-GCM` server-side envelope encryption), OAuth connections, Billing (`USD` display + `NGN`/`USD` Paystack tables), and Security.
- `/admin` — Protected superuser control center (`Overview`, `Users`, `Quotas`, `Moderation`).
- `/privacy`, `/terms`, `/notes` — Legal, trust, and product architecture documentation routes.
- `/robots.txt`, `/sitemap.xml`, `/llms.txt` — SEO and AI discoverability metadata.

### 2. Domain Policy & Security Engine (`src/lib/policy/`)
- **Canonical Subscription Tiers**:
  - `FREE`: 5 posts/month · 10 AI generations/day · 10 cross-posts/month · Video rendering: `false` · 100 MB storage
  - `CREATOR`: 50 posts/month · 100 AI generations/day · 100 cross-posts/month · Video rendering: `true` · 1,000 MB storage
  - `PRO`: Unlimited (`-1`) posts/month · 500 AI generations/day · Unlimited (`-1`) cross-posts/month · Video rendering: `true` · 10,000 MB storage
  - `AGENCY`: Unlimited (`-1`) posts/month · 2,000 AI generations/day · Unlimited (`-1`) cross-posts/month · Video rendering: `true` · 50,000 MB storage
- **Quota Reset & Cache Policy**:
  - Daily quotas reset at `00:00 UTC`; monthly quotas reset on the 1st of the month at `00:00 UTC`.
  - User-scoped exact-match AI cache hits (`ai_cache` scoped by `user_id`) do **not** consume daily AI generation quota.
- **Platform Budget Guardrails**:
  - Alerts superuser at **80%** utilization; triggers **Emergency Mode at 95%** (restricting Free-tier central AI provider usage server-side while allowing paid tiers and BYOK).
- **AI Provider Fallback Chain**:
  - `Plan A`: User BYOK (`OpenAI` / `Replicate`) encrypted with server-side `AES-256-GCM` or passed per-request.
  - `Plan B`: Cloudflare Workers AI.
  - `Plan C`: Hugging Face Inference API fallback.
  - `Plan D`: Explicit client-side `transformers.js` `fallback_required` response.

### 3. Versioned API Surface (`src/app/api/v1/`)
- `POST /api/v1/auth/signup` & `POST /api/v1/auth/login`
- `POST /api/v1/generate`
- `POST /api/v1/content` & `GET /api/v1/content/:id`
- `POST /api/v1/cross-post`
- `GET /api/v1/jobs`, `GET /api/v1/jobs/:id`, `POST /api/v1/jobs/:id/cancel`
- `POST /api/v1/payments/upgrade` & `POST /api/v1/payments/webhook`
- `GET /api/v1/admin/users`, `PATCH /api/v1/admin/users/:id/tier`, `GET /api/v1/admin/quota`
- `POST /api/v1/platforms/connect` & `GET /api/v1/platforms/callback`

### 4. Database Schema (`supabase/migrations/0001_contentflow_init.sql`)
- Full PostgreSQL DDL with Row-Level Security (RLS), separated `daily_usage` and `monthly_usage` tables, `user_roles`, isolated `oauth_connections`, `payment_events` idempotency table, and `claim_eligible_jobs()` using `FOR UPDATE SKIP LOCKED`.

---

## Getting Started

```bash
# Install dependencies
npm install

# Run unit, API, and component test suite (Vitest)
npm test

# Run TypeScript check
npm run typecheck

# Build for production
npm run build

# Start development server on 0.0.0.0:3000
npm run dev
```
