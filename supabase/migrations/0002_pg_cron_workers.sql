-- ContentFlow Zero-Cost Background Workers via Supabase pg_cron
-- Runs entirely inside Supabase PostgreSQL Free Tier ($0/mo compute cost).

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 1. Daily platform_usage row initialization at 00:00 UTC (date-keyed, non-destructive)
CREATE OR REPLACE FUNCTION public.init_daily_platform_usage()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.platform_usage (date)
  VALUES ((timezone('utc', now()))::date)
  ON CONFLICT (date) DO NOTHING;
END;
$$;

-- 2. Daily expired AI cache cleanup at 00:00 UTC
CREATE OR REPLACE FUNCTION public.purge_expired_ai_cache()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM public.ai_cache
  WHERE expires_at <= timezone('utc', now());
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- 3. Hourly 80% / 95% platform budget alert evaluator
CREATE OR REPLACE FUNCTION public.check_platform_budget_alerts()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.platform_usage;
BEGIN
  SELECT * INTO v_row
  FROM public.platform_usage
  WHERE date = (timezone('utc', now()))::date;

  IF v_row IS NULL THEN
    RETURN jsonb_build_object('status', 'healthy', 'alerts', '[]'::jsonb);
  END IF;

  RETURN jsonb_build_object(
    'date', v_row.date,
    'cf_ai_alert_80', v_row.cloudflare_ai_neurons >= 6400,
    'cf_ai_emergency_95', v_row.cloudflare_ai_neurons >= 7600,
    'youtube_alert_80', v_row.youtube_units >= 6400,
    'tiktok_alert_80', v_row.tiktok_calls >= 640
  );
END;
$$;

-- Schedule pg_cron jobs (idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'contentflow-daily-platform-usage-init',
      '0 0 * * *',
      $cron$SELECT public.init_daily_platform_usage();$cron$
    );
    PERFORM cron.schedule(
      'contentflow-ai-cache-cleanup',
      '0 0 * * *',
      $cron$SELECT public.purge_expired_ai_cache();$cron$
    );
    PERFORM cron.schedule(
      'contentflow-quota-alert-checker',
      '0 * * * *',
      $cron$SELECT public.check_platform_budget_alerts();$cron$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
