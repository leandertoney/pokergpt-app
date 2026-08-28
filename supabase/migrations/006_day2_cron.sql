-- Schedules the server-side day-two fallback.
--
-- The primary follow-up is local, scheduled on the device when a hand is saved
-- (services/handFollowup.ts). This job exists only for the cohort that granted
-- notification permission and then never entered a hand, so the device had
-- nothing to schedule for them. The edge function itself excludes anyone with a
-- hand, so the two paths cannot double-send.
--
-- 16:00 UTC is late morning in the US and early evening in Europe: a reasonable
-- hour across the storefronts this app actually sells in.
--
-- The invoke key lives in Vault rather than inline, so rotating it does not
-- require redefining the job.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Idempotent: unschedule before scheduling so re-running this file is safe.
SELECT cron.unschedule('day2-followup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'day2-followup');

SELECT cron.schedule(
  'day2-followup',
  '0 16 * * *',
  $$
  select net.http_post(
    url := 'https://bollujxjsgahswigmyvq.supabase.co/functions/v1/day2-followup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'day2_invoke_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

-- The secret itself is created once, out of band:
--   select vault.create_secret('<anon key>', 'day2_invoke_key', '...');
