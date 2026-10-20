# Changelog

All notable changes to **ContentFlow** are documented in this file.

## [1.17.0] - 2026-10-20

### Added
- **Poise-Spec 6-Tab Dark-First Admin Workshop (`/admin`, `POST /api/v1/admin`)**:
  - Added dark-first workshop theme (`#0B0B0D` background, `#151518` surface, `#1A1A1E` cards) with 1-click Light Mode toggle and inline `Enter Admin` sign-in gate when unauthenticated.
  - Added 6 primary tabs (`Control`, `Testers`, `Notices`, `Promo Codes`, `Subscriptions`, `System`) plus direct views (`Users`, `Quotas`, `Moderation`, `Audit & System`).
  - Added `POST /api/v1/admin` server wall with rate limiting (`60 req / 60s`), server-verified Admin identity (`johnpaulonovo@gmail.com`), account lookup (`ACCOUNT FOUND`), stacked tier grants (`CREATOR`, `PRO`, `AGENCY`, `Permanent`), 8-hour `See as normal user` override, masked tier dry-run & repair, remote config (`maintenance`, `paymentsLive`, `minBuild`, `latestBuild`, `downloadUrl`), synthetic QA tester minting (`@testers.contentflow.app`), in-app broadcast notices, promo code lifecycle manager, and 7/3/1-day UTC subscription expiry reminder sweeps.
- **1-Month (30-Day) Free Trial & 1-Click FTC Cancellation (`/api/v1/payments/trial`)**:
  - Creators can start a 1-time 30-day free trial on `CREATOR` or `PRO` with zero card required upfront and cancel in 1 click at any time in **Settings -> Billing**.
- **Promo Code Redemption**:
  - Creators can redeem case-insensitive promo/VIP codes in **Settings -> Billing** to unlock `CREATOR`, `PRO`, or `AGENCY` plans.
- **Segmented 6-Box OTP & Passphrase Generator (`SegmentedOtpInput`)**:
  - Added 1-digit-per-box OTP verification input with paste/arrow-key support and strong passphrase suggestion on `/signup` and **Settings -> Security**.
- **Mobile Bottom Navigation & 193-Item Quality Bar (v41.0)**:
  - Added fixed 5-tab thumb-zone mobile navigation bar (`Dashboard`, `Create`, `Queue`, `Settings`, `Admin`), 8-item numbered `NO. 01`–`NO. 08` FAQ with bold `YES:`/`NO:` lead-ins and `FAQPage` JSON-LD, `public/llms.txt`, custom `src/app/not-found.tsx`, security & cache headers in `next.config.mjs`, and full removal of viewer-visible `superuser` copy and em/en-dashes.

### Fixed
- **Initial Admin Login Recovery & Server-Side Logout Revocation**:
  - `POST /api/v1/auth/login` now recovers initial Admin credentials (`johnpaulonovo@gmail.com`) even when the account was first created via Magic Link, Google OAuth, or PostgREST sync, and falls back to `supabaseSignInWithPassword`.
  - `POST /api/v1/auth/logout` now revokes the active session token server-side so replayed cookies immediately return `401` on `/api/v1/auth/me`.
