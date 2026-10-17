-- ContentFlow Initial Hardened Schema Migration (PostgreSQL / Supabase)
-- Includes RLS, separated daily/monthly usage aggregates, user_roles,
-- isolated OAuth secret storage, user-scoped AI cache, payment webhook idempotency,
-- and SKIP LOCKED worker job claiming with leases.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Enums
DO $$ BEGIN
  CREATE TYPE subscription_tier AS ENUM ('FREE', 'CREATOR', 'PRO', 'AGENCY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('creator', 'moderator', 'superuser');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE content_modality AS ENUM ('text', 'image', 'video');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE content_status AS ENUM ('draft', 'ready', 'posted', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE job_type_enum AS ENUM ('cross_post', 'video_render', 'scheduled_publish', 'content_repurpose');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE job_status_enum AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE moderator_action_enum AS ENUM (
    'content_approved',
    'content_rejected',
    'user_suspended',
    'user_banned',
    'tier_mutated'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. User Profiles (Sensitive fields mutated only via service_role)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  creator_niche TEXT,
  subscription_tier subscription_tier NOT NULL DEFAULT 'FREE',
  paystack_customer_code TEXT,
  paystack_subscription_code TEXT,
  encrypted_api_keys JSONB NOT NULL DEFAULT '{}'::jsonb,
  connected_platforms JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 3. Server-Managed User Roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'creator',
  granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (user_id, role)
);

-- 4. Isolated Encrypted OAuth Connections (Server-only access)
CREATE TABLE IF NOT EXISTS public.oauth_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('youtube', 'tiktok')),
  account_handle TEXT,
  encrypted_access_token TEXT NOT NULL,
  encrypted_refresh_token TEXT,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (user_id, platform)
);

-- 5. Daily Usage (UTC Date-Keyed) & Monthly Usage (UTC Year-Month Keyed)
CREATE TABLE IF NOT EXISTS public.daily_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT (timezone('utc', now()))::date,
  ai_generations INTEGER NOT NULL DEFAULT 0 CHECK (ai_generations >= 0),
  posts_created INTEGER NOT NULL DEFAULT 0 CHECK (posts_created >= 0),
  cross_posts INTEGER NOT NULL DEFAULT 0 CHECK (cross_posts >= 0),
  storage_used_mb NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (storage_used_mb >= 0),
  UNIQUE (user_id, date)
);

CREATE TABLE IF NOT EXISTS public.monthly_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year_month TEXT NOT NULL DEFAULT to_char(timezone('utc', now()), 'YYYY-MM'),
  posts_created INTEGER NOT NULL DEFAULT 0 CHECK (posts_created >= 0),
  cross_posts INTEGER NOT NULL DEFAULT 0 CHECK (cross_posts >= 0),
  storage_used_mb NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (storage_used_mb >= 0),
  UNIQUE (user_id, year_month)
);

-- 6. Platform Usage (Includes Hugging Face & Explicit Units)
CREATE TABLE IF NOT EXISTS public.platform_usage (
  date DATE PRIMARY KEY DEFAULT (timezone('utc', now()))::date,
  cloudflare_ai_neurons INTEGER NOT NULL DEFAULT 0,
  huggingface_calls INTEGER NOT NULL DEFAULT 0,
  r2_reads INTEGER NOT NULL DEFAULT 0,
  r2_writes INTEGER NOT NULL DEFAULT 0,
  youtube_units INTEGER NOT NULL DEFAULT 0,
  tiktok_calls INTEGER NOT NULL DEFAULT 0,
  vercel_invocations INTEGER NOT NULL DEFAULT 0,
  bandwidth_gb NUMERIC(10,3) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 7. Content
CREATE TABLE IF NOT EXISTS public.content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_type content_modality NOT NULL DEFAULT 'text',
  original_text TEXT,
  generated_script TEXT,
  media_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status content_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 8. Durable Background Jobs Queue (with SKIP LOCKED lease & partial multi-platform tracking)
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_type job_type_enum NOT NULL,
  content_id UUID REFERENCES public.content(id) ON DELETE SET NULL,
  idempotency_key TEXT UNIQUE,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  platform_results JSONB NOT NULL DEFAULT '{}'::jsonb,
  status job_status_enum NOT NULL DEFAULT 'pending',
  priority INTEGER NOT NULL DEFAULT 1,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  worker_id TEXT,
  locked_until TIMESTAMPTZ,
  error_message TEXT,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_jobs_eligible
  ON public.jobs (status, priority DESC, scheduled_at ASC, created_at ASC)
  WHERE status = 'pending';

-- 9. User-Scoped AI Cache (Prevents cross-user prompt/response leakage)
CREATE TABLE IF NOT EXISTS public.ai_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt_hash TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  response JSONB NOT NULL,
  provider TEXT NOT NULL,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  hit_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE (user_id, prompt_hash)
);

-- 10. Payment Events (Paystack Webhook Idempotency)
CREATE TABLE IF NOT EXISTS public.payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'paystack',
  event_id TEXT NOT NULL,
  reference TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_tier subscription_tier NOT NULL,
  amount_subunits BIGINT NOT NULL,
  currency TEXT NOT NULL,
  raw_payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (provider, event_id)
);

-- 11. Moderator & Admin Audit Actions
CREATE TABLE IF NOT EXISTS public.moderator_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moderator_id UUID NOT NULL REFERENCES auth.users(id),
  action_type moderator_action_enum NOT NULL,
  target_content_id UUID REFERENCES public.content(id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 12. Quota Check & Atomic Usage Increment Functions
CREATE OR REPLACE FUNCTION public.check_user_quota(p_user_id UUID, p_action TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier subscription_tier;
  v_daily_ai INTEGER := 0;
  v_monthly_posts INTEGER := 0;
  v_monthly_cross INTEGER := 0;
  v_today DATE := (timezone('utc', now()))::date;
  v_ym TEXT := to_char(timezone('utc', now()), 'YYYY-MM');
BEGIN
  SELECT subscription_tier INTO v_tier FROM public.user_profiles WHERE id = p_user_id;
  IF v_tier IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT COALESCE(ai_generations, 0) INTO v_daily_ai
    FROM public.daily_usage WHERE user_id = p_user_id AND date = v_today;

  SELECT COALESCE(posts_created, 0), COALESCE(cross_posts, 0)
    INTO v_monthly_posts, v_monthly_cross
    FROM public.monthly_usage WHERE user_id = p_user_id AND year_month = v_ym;

  IF p_action = 'ai_generation' THEN
    RETURN CASE v_tier
      WHEN 'FREE' THEN v_daily_ai < 10
      WHEN 'CREATOR' THEN v_daily_ai < 100
      WHEN 'PRO' THEN v_daily_ai < 500
      WHEN 'AGENCY' THEN v_daily_ai < 2000
    END;
  ELSIF p_action = 'create_post' THEN
    RETURN CASE v_tier
      WHEN 'FREE' THEN v_monthly_posts < 5
      WHEN 'CREATOR' THEN v_monthly_posts < 50
      WHEN 'PRO' THEN TRUE
      WHEN 'AGENCY' THEN TRUE
    END;
  ELSIF p_action = 'cross_post' THEN
    RETURN CASE v_tier
      WHEN 'FREE' THEN v_monthly_cross < 10
      WHEN 'CREATOR' THEN v_monthly_cross < 100
      WHEN 'PRO' THEN TRUE
      WHEN 'AGENCY' THEN TRUE
    END;
  ELSIF p_action = 'video_render' THEN
    RETURN v_tier IN ('CREATOR', 'PRO', 'AGENCY');
  END IF;

  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_usage(p_user_id UUID, p_action TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := (timezone('utc', now()))::date;
  v_ym TEXT := to_char(timezone('utc', now()), 'YYYY-MM');
BEGIN
  IF NOT public.check_user_quota(p_user_id, p_action) THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.daily_usage (user_id, date)
    VALUES (p_user_id, v_today)
    ON CONFLICT (user_id, date) DO NOTHING;

  INSERT INTO public.monthly_usage (user_id, year_month)
    VALUES (p_user_id, v_ym)
    ON CONFLICT (user_id, year_month) DO NOTHING;

  IF p_action = 'ai_generation' THEN
    UPDATE public.daily_usage
      SET ai_generations = ai_generations + 1
      WHERE user_id = p_user_id AND date = v_today;
  ELSIF p_action = 'create_post' THEN
    UPDATE public.daily_usage
      SET posts_created = posts_created + 1
      WHERE user_id = p_user_id AND date = v_today;
    UPDATE public.monthly_usage
      SET posts_created = posts_created + 1
      WHERE user_id = p_user_id AND year_month = v_ym;
  ELSIF p_action = 'cross_post' THEN
    UPDATE public.daily_usage
      SET cross_posts = cross_posts + 1
      WHERE user_id = p_user_id AND date = v_today;
    UPDATE public.monthly_usage
      SET cross_posts = cross_posts + 1
      WHERE user_id = p_user_id AND year_month = v_ym;
  END IF;

  RETURN TRUE;
END;
$$;

-- 13. Transactional SKIP LOCKED Worker Claim Function
CREATE OR REPLACE FUNCTION public.claim_eligible_jobs(
  p_worker_id TEXT,
  p_batch_size INTEGER DEFAULT 10,
  p_lease_seconds INTEGER DEFAULT 120
)
RETURNS SETOF public.jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH claimed AS (
    SELECT id
    FROM public.jobs
    WHERE status = 'pending'
      AND (scheduled_at IS NULL OR scheduled_at <= timezone('utc', now()))
      AND (locked_until IS NULL OR locked_until < timezone('utc', now()))
      AND attempts < max_attempts
    ORDER BY priority DESC, scheduled_at ASC NULLS FIRST, created_at ASC
    LIMIT LEAST(p_batch_size, 10)
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.jobs j
  SET status = 'processing',
      worker_id = p_worker_id,
      started_at = timezone('utc', now()),
      locked_until = timezone('utc', now()) + make_interval(secs => p_lease_seconds),
      attempts = j.attempts + 1
  FROM claimed c
  WHERE j.id = c.id
  RETURNING j.*;
END;
$$;

-- 14. Row-Level Security (RLS)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderator_actions ENABLE ROW LEVEL SECURITY;

-- Owner read policies (sensitive mutations restricted to server service_role)
CREATE POLICY user_profiles_select_own ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY user_roles_select_own ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY daily_usage_select_own ON public.daily_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY monthly_usage_select_own ON public.monthly_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY content_select_own ON public.content
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY content_insert_own ON public.content
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY content_update_own ON public.content
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY content_delete_own ON public.content
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY jobs_select_own ON public.jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY ai_cache_select_own ON public.ai_cache
  FOR SELECT USING (auth.uid() = user_id);
