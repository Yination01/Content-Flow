# ContentFlow Web Application

Next.js 14 App Router + TypeScript + Tailwind CSS v4 project for ContentFlow.

## Project Structure

- `src/app/` — Next.js 14 App Router pages, layouts, metadata routes (`robots.ts`, `sitemap.ts`), and `/api/v1/*` route handlers
- `src/app/screens.tsx` — Client screen components for marketing, auth, creator workspace, settings, admin, and legal pages
- `src/app/ui.tsx` — Shared accessible UI primitives (`Button`, `Field`, `TextArea`, `Card`, `StatusBadge`, `WorkspaceBadge`, `Progress`, `Dialog`, `Tabs`, `Toast`, `Skeleton`)
- `src/app/state.tsx` — Client workspace state provider
- `src/lib/policy/index.ts` — Shared server-side domain policy engine (tier quotas, UTC reset windows, 80%/95% platform budget guardrails, AI provider fallback chain, AES-256-GCM BYOK encryption, Paystack HMAC-SHA512 verification, job state machine, and RBAC/ownership checks)
- `src/lib/providers/index.ts` — Production provider adapters (OpenAI, Replicate, Cloudflare Workers AI, Hugging Face, Paystack, Cloudflare R2 presigned uploads, YouTube/TikTok OAuth 2.0 PKCE)
- `src/lib/server/auth.ts` — `scrypt` password hashing and `HMAC-SHA256` signed `HttpOnly` session cookies
- `src/lib/server/store.ts` — Persistent database engine (disk + Supabase PostgreSQL)
- `src/index.css` — Global CSS and Tailwind CSS v4 import (`@import "tailwindcss";`)
- `supabase/migrations/0001_contentflow_init.sql` — Hardened PostgreSQL schema migration with RLS, `SKIP LOCKED` job claiming, and atomic quota functions
- `docs/ARCHITECTURE.md` — Technical and security architecture reference

## Commands

- `npm run dev` — Start Next.js development server on `0.0.0.0:3000`
- `npm run build` — Production build (`next build`)
- `npm run start` — Start production server on `0.0.0.0:3000`
- `npm test` — Run Vitest unit, provider, API, and component test suites
- `npm run typecheck` — Run TypeScript compiler verification (`tsc --noEmit`)
