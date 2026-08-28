-- Marks that the server-side day-two fallback has been sent to a user.
--
-- The fallback (supabase/functions/day2-followup) is a safety net for people
-- who granted notification permission during onboarding and then never entered
-- a hand. Anyone who did enter one already has a personalised local
-- notification scheduled on their device and is excluded.
--
-- Nullable and unset by default: NULL means "not yet sent", which is also the
-- correct state for every existing row.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS day2_sent_at timestamptz;

-- The fallback query filters on this being NULL alongside a recent token, so
-- the partial index covers exactly the rows it scans.
CREATE INDEX IF NOT EXISTS users_day2_pending_idx
  ON public.users (push_token_updated_at)
  WHERE day2_sent_at IS NULL AND expo_push_token IS NOT NULL;
