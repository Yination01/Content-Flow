-- ContentFlow Superuser Permanent Max Paid Tier (AGENCY) & Full Feature Unlock
-- Ensures any account with role = 'superuser' (and bootstrap owner email)
-- permanently receives subscription_tier = 'AGENCY' and unlimited feature access.

-- 1. Trigger function: whenever a user is granted 'superuser' in public.user_roles,
-- permanently promote their profile to the max paid tier ('AGENCY').
CREATE OR REPLACE FUNCTION public.enforce_superuser_agency_tier()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'superuser' THEN
    UPDATE public.user_profiles
    SET subscription_tier = 'AGENCY',
        updated_at = timezone('utc', now())
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_superuser_agency_tier ON public.user_roles;
CREATE TRIGGER trg_superuser_agency_tier
AFTER INSERT OR UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_superuser_agency_tier();

-- 2. Trigger function: prevent a superuser's user_profiles.subscription_tier
-- from ever being downgraded below 'AGENCY', and auto-promote bootstrap owner email.
CREATE OR REPLACE FUNCTION public.guard_superuser_profile_tier()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF lower(NEW.email) IN ('johnpaulonovo@gmail.com', 'maya@contentflow.app')
     OR EXISTS (
       SELECT 1 FROM public.user_roles
       WHERE user_id = NEW.id AND role = 'superuser'
     )
  THEN
    NEW.subscription_tier := 'AGENCY';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_superuser_profile_tier ON public.user_profiles;
CREATE TRIGGER trg_guard_superuser_profile_tier
BEFORE INSERT OR UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.guard_superuser_profile_tier();

-- 3. Update check_user_quota() so superusers permanently have all features enabled.
CREATE OR REPLACE FUNCTION public.check_user_quota(p_user_id UUID, p_action TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_superuser BOOLEAN;
  v_tier subscription_tier;
  v_today DATE := (timezone('utc', now()))::date;
  v_ym TEXT := to_char(timezone('utc', now()), 'YYYY-MM');
  v_daily_ai INTEGER := 0;
  v_monthly_posts INTEGER := 0;
  v_monthly_cross INTEGER := 0;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id AND role = 'superuser'
  ) INTO v_is_superuser;

  -- Superuser permanently has all features & max paid tier enabled
  IF v_is_superuser THEN
    RETURN TRUE;
  END IF;

  SELECT subscription_tier INTO v_tier
  FROM public.user_profiles
  WHERE id = p_user_id;

  IF v_tier IS NULL THEN
    v_tier := 'FREE';
  END IF;

  SELECT COALESCE(ai_generations, 0) INTO v_daily_ai
  FROM public.daily_usage
  WHERE user_id = p_user_id AND date = v_today;

  SELECT COALESCE(posts_created, 0), COALESCE(cross_posts, 0)
  INTO v_monthly_posts, v_monthly_cross
  FROM public.monthly_usage
  WHERE user_id = p_user_id AND year_month = v_ym;

  IF p_action = 'ai_generation' THEN
    RETURN (v_tier = 'FREE' AND v_daily_ai < 10)
        OR (v_tier = 'CREATOR' AND v_daily_ai < 100)
        OR (v_tier = 'PRO' AND v_daily_ai < 500)
        OR (v_tier = 'AGENCY' AND v_daily_ai < 2000);
  ELSIF p_action = 'create_post' THEN
    RETURN (v_tier = 'FREE' AND v_monthly_posts < 5)
        OR (v_tier = 'CREATOR' AND v_monthly_posts < 50)
        OR (v_tier IN ('PRO', 'AGENCY'));
  ELSIF p_action = 'cross_post' THEN
    RETURN (v_tier = 'FREE' AND v_monthly_cross < 10)
        OR (v_tier = 'CREATOR' AND v_monthly_cross < 100)
        OR (v_tier IN ('PRO', 'AGENCY'));
  ELSIF p_action = 'video_render' THEN
    RETURN v_tier IN ('CREATOR', 'PRO', 'AGENCY');
  END IF;

  RETURN FALSE;
END;
$$;
