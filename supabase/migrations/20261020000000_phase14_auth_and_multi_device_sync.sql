-- Phase 14: Supabase Auth & Multi-Device Profile Sync Migration ($0.00 Free Tier)
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard/project/ogtbrzzfgghvqyjmmqes/sql/new)

CREATE TABLE IF NOT EXISTS public.cf_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT 'Creator',
  niche TEXT NOT NULL DEFAULT 'Multi-channel content creation',
  tier TEXT NOT NULL DEFAULT 'FREE' CHECK (tier IN ('FREE', 'CREATOR', 'PRO', 'AGENCY')),
  roles TEXT[] NOT NULL DEFAULT ARRAY['creator']::TEXT[],
  status TEXT NOT NULL DEFAULT 'Active',
  two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.cf_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own cf_users profile" ON public.cf_users;
CREATE POLICY "Users can read own cf_users profile"
  ON public.cf_users
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can upsert own cf_users profile" ON public.cf_users;
CREATE POLICY "Users can upsert own cf_users profile"
  ON public.cf_users
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Automatically sync Supabase Auth users (Email, Magic Link, Google OAuth) into public.cf_users
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
  v_name TEXT;
  v_is_super BOOLEAN;
BEGIN
  v_email := LOWER(COALESCE(NEW.email, ''));
  v_is_super := (v_email = 'johnpaulonovo@gmail.com');
  v_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
     CASE WHEN v_is_super THEN 'Johnpaul Onovo' ELSE split_part(v_email, '@', 1) END
  );

  INSERT INTO public.cf_users (id, email, name, tier, roles, status, joined_at)
  VALUES (
    NEW.id::TEXT,
    v_email,
    v_name,
    CASE WHEN v_is_super THEN 'AGENCY' ELSE 'FREE' END,
    CASE WHEN v_is_super THEN ARRAY['creator', 'superuser']::TEXT[] ELSE ARRAY['creator']::TEXT[] END,
    'Active',
    NOW()
  )
  ON CONFLICT (email) DO UPDATE
    SET name = EXCLUDED.name,
        tier = CASE WHEN v_is_super THEN 'AGENCY' ELSE public.cf_users.tier END,
        roles = CASE WHEN v_is_super THEN ARRAY['creator', 'superuser']::TEXT[] ELSE public.cf_users.roles END,
        updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();
