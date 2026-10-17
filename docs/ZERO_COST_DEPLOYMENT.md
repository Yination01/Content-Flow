# ContentFlow — $0.00/Month Production Deployment Runbook

This guide walks through deploying **ContentFlow** across **Web/PWA, Chrome Extension, and Mobile (Expo)** while keeping monthly infrastructure spend strictly at **$0.00/month**.

---

## 1. Free-Tier Stack & Hard-Stop Guardrails

| Layer | Provider | Free-Tier Allowance | ContentFlow Hard-Stop (80% Alert / 95% Emergency / 100% Cap) | Monthly Cost |
|---|---|---|---|---|
| **Web & API Hosting** | Vercel Hobby / Cloudflare Pages | 100 GB bandwidth, 100k invocations | Caches AI & static assets; zero paid cron | **$0.00** |
| **PostgreSQL + Auth + Cron** | Supabase Free Tier | 500 MB DB, 50,000 MAU, `pg_cron` | `40,000` MAU cap, automatic cache purge via `0002_pg_cron_workers.sql` | **$0.00** |
| **Primary AI (`Plan B`)** | Cloudflare Workers AI | 10,000 Neurons / day | Alerts at `6,400`, Free-tier bypass at `7,600`, hard cap at `8,000` | **$0.00** |
| **Fallback AI (`Plan C`)** | Hugging Face Inference API | Free serverless inference | Alerts at `1,600`, hard cap at `2,000` calls/day | **$0.00** |
| **User BYOK (`Plan A`)** | User's OpenAI / Replicate key | Paid by end-user | Encrypted via `AES-256-GCM`; $0 platform cost | **$0.00** |
| **Object Storage** | Cloudflare R2 Free Tier | 10 GB storage, 1M Class A writes/mo | Hard-stops presigned PUT URLs at `800,000` writes/mo (`429`) | **$0.00** |
| **Video Rendering** | Client-Side Browser Renderer | User's device CPU/GPU (`src/lib/video/client-renderer.ts`) | 100% client-side 9:16 & 16:9 storyboard/frame rendering | **$0.00** |
| **Billing** | Paystack | $0 monthly subscription | Only charges transaction fee when a user pays you | **$0.00** |

---

## 2. Step-by-Step Deployment Checklist

### Step 1: Supabase Database & `pg_cron` ($0)
1. Create a free project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** and run:
   - `supabase/migrations/0001_contentflow_init.sql` (creates tables, RLS policies, atomic quota functions, and `claim_eligible_jobs()`).
   - `supabase/migrations/0002_pg_cron_workers.sql` (schedules daily `platform_usage` initialization, expired AI cache cleanup, and hourly quota alerts at `$0` compute cost).
3. Copy `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.

### Step 2: Cloudflare Workers AI & R2 Storage ($0)
1. In your free Cloudflare dashboard, enable **Workers AI** and copy `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`.
2. Create an R2 bucket named `contentflow-media` and generate an S3 API token (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`).

### Step 3: Vercel Hobby Deployment ($0)
1. Import `Yination01/Content-Flow` into Vercel (Hobby — Free).
2. Paste the environment variables from `.env.example`.
3. Deploy — your Web App, API v1 (`/api/v1/*`), and installable PWA (`/manifest.webmanifest`) will be live immediately.

### Step 4: Chrome Extension & Mobile Clients ($0)
- **Chrome Extension**: Open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select the `extension/` folder.
- **Expo Mobile (Android / iOS)**: Run `cd mobile && npm install && npx expo start` and scan the QR code with the free **Expo Go** app.
