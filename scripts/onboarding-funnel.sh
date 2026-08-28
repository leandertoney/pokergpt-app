#!/usr/bin/env bash
# Onboarding funnel report for PokerPro AI.
#
# Counts DISTINCT DEVICES per step, not raw events, so a user who bounces
# between two screens counts once per screen.
#
# Runs through the Supabase Management API rather than psql: this project's
# .env has no database password, and public.onboarding_events deliberately has
# no SELECT policy, so neither the anon nor the service-role REST key can read
# it. The management token can.
#
# Requires SUPABASE_ACCESS_TOKEN. Set it in the environment, or the script will
# fall back to reading it from a sibling project's .env.
set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT_REF="bollujxjsgahswigmyvq"

TOKEN="${SUPABASE_ACCESS_TOKEN:-}"
if [ -z "$TOKEN" ] && [ -f .env ]; then
  TOKEN="$(grep '^SUPABASE_ACCESS_TOKEN' .env | cut -d= -f2- || true)"
fi
if [ -z "$TOKEN" ]; then
  echo "error: SUPABASE_ACCESS_TOKEN is not set and no fallback .env was found." >&2
  exit 1
fi

run_sql() {
  # curl, not python urllib: Supabase sits behind Cloudflare, which returns
  # 403 "error code: 1010" for python's default user-agent. Formatting still
  # happens in python, fed from stdin.
  curl -s -m 45 -X POST \
    "https://api.supabase.com/v1/projects/$PROJECT_REF/database/query" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$(python3 -c 'import json,sys;print(json.dumps({"query":sys.argv[1]}))' "$1")" \
  | python3 -c '
import json, sys
raw = sys.stdin.read()
try:
    rows = json.loads(raw)
except Exception:
    print("  query failed:", raw[:200]); raise SystemExit(1)
if isinstance(rows, dict):
    print("  query failed:", rows); raise SystemExit(1)
if not rows:
    print("  (no data yet)"); raise SystemExit(0)
cols = list(rows[0].keys())
w = [max(len(c), *(len(str(r[c])) for r in rows)) for c in cols]
print("  " + "  ".join(c.ljust(x) for c, x in zip(cols, w)))
print("  " + "  ".join("-" * x for x in w))
for r in rows:
    print("  " + "  ".join(str(r[c]).ljust(x) for c, x in zip(cols, w)))
'
}
export PROJECT_REF TOKEN

# Flow order must match STEPS in components/OnboardingV3.tsx.
#
# Flow 2 (try-it-before-paywall) and flow 1 share several event names at
# different positions, and an OTA does not change app_version, so both report
# 1.1.0. Devices are split by the flow property on their 'welcome' event:
# anything without it predates the change.
echo
echo "=== Cohort sizes ==="
run_sql "
SELECT COALESCE((properties->>'flow')::int, 1) AS flow,
       count(DISTINCT device_id) AS devices,
       min(created_at)::date AS first_seen
FROM public.onboarding_events
WHERE event = 'welcome'
GROUP BY 1 ORDER BY 1;
"

echo
echo "=== Onboarding funnel, FLOW 2 (distinct devices, in flow order) ==="
run_sql "
WITH flow2 AS (
  SELECT DISTINCT device_id FROM public.onboarding_events
  WHERE event = 'welcome' AND (properties->>'flow')::int = 2
),
steps(step, ord) AS (
  VALUES
    ('welcome',1),('value_live',2),
    ('try_hand',3),('try_hand_offered',4),('mic_permission_result',5),
    ('try_hand_recorded',6),('try_hand_analyzed',7),
    ('notif_prompt_shown',8),('notif_prompt_accepted',9),('notif_permission_result',10),
    ('q_play_where',11),('q_leak',12),('building',13),('dealing',14),
    ('plan',15),('results',16),('paywall',17),
    ('paywall_purchased',18),('onboarding_completed',19)
)
SELECT s.ord, s.step,
       count(DISTINCT e.device_id) AS devices,
       to_char(100.0 * count(DISTINCT e.device_id) /
               NULLIF(max(count(DISTINCT e.device_id)) OVER (), 0), 'FM990.0') || '%' AS pct_of_top
FROM steps s
LEFT JOIN public.onboarding_events e
  ON e.event = s.step AND e.device_id IN (SELECT device_id FROM flow2)
GROUP BY s.ord, s.step
ORDER BY s.ord;
"

echo
echo "=== Biggest drop-offs (consecutive steps) ==="
run_sql "
WITH flow2 AS (
  SELECT DISTINCT device_id FROM public.onboarding_events
  WHERE event = 'welcome' AND (properties->>'flow')::int = 2
),
steps(step, ord) AS (
  VALUES
    ('welcome',1),('value_live',2),('try_hand',3),('q_play_where',4),
    ('q_leak',5),('building',6),('dealing',7),('plan',8),('results',9),('paywall',10)
),
counts AS (
  SELECT s.ord, s.step, count(DISTINCT e.device_id) AS devices
  FROM steps s LEFT JOIN public.onboarding_events e
    ON e.event = s.step AND e.device_id IN (SELECT device_id FROM flow2)
  GROUP BY s.ord, s.step
)
SELECT step AS lost_between_this_and_next, devices,
       devices - lead(devices) OVER (ORDER BY ord) AS lost
FROM counts
ORDER BY lost DESC NULLS LAST
LIMIT 5;
"

echo
echo "=== Try-it outcomes (flow 2) ==="
run_sql "
SELECT event,
       COALESCE(properties->>'reason', properties->>'granted', properties->>'readable', '-') AS detail,
       count(DISTINCT device_id) AS devices
FROM public.onboarding_events
WHERE event IN ('try_hand_offered','mic_permission_result','try_hand_recorded',
                'try_hand_analyzed','try_hand_skipped','notif_prompt_shown',
                'notif_prompt_accepted','notif_prompt_declined','notif_permission_result')
GROUP BY 1,2 ORDER BY 1,3 DESC;
"

echo
echo "=== Push tokens actually stored ==="
run_sql "
SELECT count(*) AS users,
       count(expo_push_token) AS with_token,
       max(push_token_updated_at)::date AS newest
FROM public.users
WHERE created_at > now() - interval '30 days';
"

echo
echo "=== Answers chosen ==="
run_sql "
SELECT event,
       coalesce(properties->>'where', properties->>'stakes', properties->>'leak') AS answer,
       count(DISTINCT device_id) AS devices
FROM public.onboarding_events
WHERE event IN ('q_stakes','q_leak','plan')
  AND coalesce(properties->>'where', properties->>'stakes', properties->>'leak') IS NOT NULL
GROUP BY 1,2
ORDER BY 1,3 DESC;
"

echo
echo "=== Volume by day ==="
run_sql "
SELECT to_char(created_at,'YYYY-MM-DD') AS day,
       count(DISTINCT device_id) AS devices, count(*) AS events
FROM public.onboarding_events
GROUP BY 1 ORDER BY 1 DESC LIMIT 7;
"
echo
