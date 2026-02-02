-- pg_cron setup for daily prediction generation
-- Run this in Supabase SQL Editor after deploying the Edge Function

-- Schedule: Run at 5 AM Pacific (13:00 UTC) every day
SELECT cron.schedule(
  'daily-predictions',
  '0 13 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ybnmhpxchuxbgpmpqaxv.supabase.co/functions/v1/generate-daily',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('supabase.anon_key', true)
    )
  );
  $$
);

-- To view scheduled jobs:
-- SELECT * FROM cron.job;

-- To unschedule:
-- SELECT cron.unschedule('daily-predictions');

-- To manually trigger the function (for testing):
-- SELECT net.http_post(
--   url := 'https://ybnmhpxchuxbgpmpqaxv.supabase.co/functions/v1/generate-daily',
--   headers := jsonb_build_object('Content-Type', 'application/json')
-- );
