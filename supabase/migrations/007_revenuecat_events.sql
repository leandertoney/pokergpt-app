-- RevenueCat webhook landing table.
--
-- Subscriptions live in RevenueCat and, until now, nowhere else. users.tier
-- was written only by the device, so a conversion that happened while the app
-- was closed -- which is every trial conversion, by definition -- never reached
-- Postgres. The first real paying customer converted on 2026-08-31 and the
-- database still read "free" for every user.
--
-- This table is the append-only record of what RevenueCat told us, kept raw so
-- a mapping bug can be re-derived from the payload instead of being lost.

CREATE TABLE IF NOT EXISTS public.revenuecat_events (
  -- RevenueCat's own event id. Deliveries are retried on non-2xx, so this is
  -- the dedupe key: a replay collides here and is dropped.
  event_id      text PRIMARY KEY,
  event_type    text NOT NULL,
  app_user_id   text,
  -- Resolved where possible. NULL is expected and permanent for the anonymous
  -- customers who purchased before the app began calling identifyUser.
  user_id       uuid REFERENCES public.users(id) ON DELETE SET NULL,
  environment   text,
  event_at      timestamptz,
  payload       jsonb NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS revenuecat_events_user_id_idx
  ON public.revenuecat_events(user_id);
CREATE INDEX IF NOT EXISTS revenuecat_events_app_user_id_idx
  ON public.revenuecat_events(app_user_id);
CREATE INDEX IF NOT EXISTS revenuecat_events_created_at_idx
  ON public.revenuecat_events(created_at DESC);

-- Service-role only: the webhook writes, nothing else reads. No policies by
-- design -- RLS on with zero policies denies every anon/authenticated request.
ALTER TABLE public.revenuecat_events ENABLE ROW LEVEL SECURITY;
