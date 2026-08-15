-- Onboarding funnel instrumentation.
--
-- This app has had no analytics of any kind. 124 lifetime customers produced
-- $23 in revenue and zero active subscriptions, and nothing recorded where in
-- the flow people quit — so two onboarding redesigns have been argued from
-- structure alone rather than from evidence.
--
-- Ported from the CourtCrowd implementation, which found a real bug on nine
-- devices within minutes of first running: three of four paywall viewers tapped
-- Subscribe and were bounced into a signup wall before they could pay.
--
-- Deliberately NOT a third-party SDK. The volume is tiny (~10 new users/month),
-- the question is specific ("which screen loses people"), and routing it through
-- Supabase keeps the data owned and queryable next to everything else.
--
-- Anonymous by design: most of the funnel happens before any account exists, so
-- user_id is nullable and the client-generated device_id is the join key.

CREATE TABLE IF NOT EXISTS public.onboarding_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Stable per install, generated client-side, survives sign-up so a single
  -- device's pre-auth and post-auth events stitch into one funnel.
  device_id text NOT NULL,
  -- NULL for everyone who has not signed up yet — the majority of the funnel.
  user_id uuid,
  -- Step id for screen views ('leak_question'), or a verb for actions
  -- ('paywall_viewed', 'paywall_purchased', 'onboarding_completed').
  event text NOT NULL,
  -- Free-form context: the answer chosen, the plan tapped, the variant shown.
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  platform text,
  app_version text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Funnel queries are "count distinct devices per event, newest first".
CREATE INDEX IF NOT EXISTS onboarding_events_event_created_idx
  ON public.onboarding_events (event, created_at DESC);
CREATE INDEX IF NOT EXISTS onboarding_events_device_idx
  ON public.onboarding_events (device_id, created_at);

ALTER TABLE public.onboarding_events ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) may append their own telemetry. This is a firehose
-- the client writes to and never reads back.
CREATE POLICY "Anyone can insert onboarding events"
  ON public.onboarding_events
  FOR INSERT
  WITH CHECK (true);

-- No SELECT policy on purpose: with RLS enabled and no read policy, neither
-- anon nor authenticated clients can read the table. Analysis runs with the
-- service role, so one user's funnel is never visible to another.
