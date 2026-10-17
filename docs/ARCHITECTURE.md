# ContentFlow Technical & Security Architecture

## 1. System Overview

ContentFlow is a production Next.js 14 App Router + Tailwind CSS v4 web application with a versioned REST API (`/api/v1/*`), shared server-side policy engine (`src/lib/policy/`), live provider adapters (`src/lib/providers/`), persistent storage (`src/lib/server/store.ts`), and hardened Supabase PostgreSQL schema (`supabase/migrations/0001_contentflow_init.sql`).

---

## 2. Security, Authentication & Authorization Controls

1. **Authentication & Session Integrity (`src/lib/server/auth.ts`)**:
   - Passwords are hashed using `crypto.scryptSync` with a 16-byte cryptographic salt and verified using `crypto.timingSafeEqual`.
   - Sessions are issued as `HttpOnly`, `SameSite=Lax` cookies (`cf_session`) signed with `HMAC-SHA256`.
2. **Row-Level Security & Server Authorization**:
   - Every user-owned table enables PostgreSQL RLS (`auth.uid() = user_id`).
   - Privileged actions (`/api/v1/admin/*`, tier mutations, moderation reviews) check server-managed roles (`user_roles`), never client-editable profile JSON or hardcoded email strings alone.
3. **BYOK Threat Model & Envelope Encryption**:
   - User-supplied OpenAI/Replicate keys are either passed ephemerally per request (`x-byok-key`) or encrypted server-side using `AES-256-GCM` (`12-byte IV`, `16-byte authTag`, versioned envelope `v1`).
   - Only masked previews (`sk-p•••••••••••••9K2`) are ever returned to the UI.
4. **OAuth State & Token Isolation**:
   - `/api/v1/platforms/connect` generates a single-use expiring state token + `S256` PKCE challenge.
   - `/api/v1/platforms/callback` immediately consumes the state token (preventing replay) and stores encrypted credentials in `oauth_connections` (inaccessible to client RLS).
5. **Paystack Webhook Integrity & Idempotency**:
   - `/api/v1/payments/webhook` verifies the raw request body against `x-paystack-signature` using `HMAC-SHA512` (`crypto.timingSafeEqual`).
   - Validates transaction `status === "success"`, `currency` (`NGN` or `USD`), and exact subunit `amount` against the server-side `PRICING_TABLE` before mutating tier.
   - Deduplicates replayed webhooks via `payment_events.reference`.
6. **Durable Queue & Worker Leases**:
   - `claim_eligible_jobs()` claims up to 10 due jobs (`scheduled_at IS NULL OR scheduled_at <= now()`) atomically using `FOR UPDATE SKIP LOCKED` and sets a `locked_until` lease.
   - Multi-platform jobs record per-platform outcomes in `platform_results` so retries only target failed transient platforms and never double-publish to already-completed platforms.
   - User-initiated cancellation (`POST /api/v1/jobs/:id/cancel`) is restricted atomically to `status = 'pending'`.
