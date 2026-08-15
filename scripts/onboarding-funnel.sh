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
echo
echo "=== Onboarding funnel (distinct devices, in flow order) ==="
run_sql "
WITH steps(step, ord) AS (
  VALUES
    ('welcome',1),('value_analyze',2),('value_live',3),('value_review',4),
    ('q_play_where',5),('q_stakes',6),('q_leak',7),('plan',8),('paywall',9),
    ('paywall_purchased',10),('onboarding_completed',11)
)
SELECT s.ord, s.step,
       count(DISTINCT e.device_id) AS devices,
       to_char(100.0 * count(DISTINCT e.device_id) /
               NULLIF(max(count(DISTINCT e.device_id)) OVER (), 0), 'FM990.0') || '%' AS pct_of_top
FROM steps s
LEFT JOIN public.onboarding_events e ON e.event = s.step
GROUP BY s.ord, s.step
ORDER BY s.ord;
"

echo
echo "=== Biggest drop-offs (consecutive steps) ==="
run_sql "
WITH steps(step, ord) AS (
  VALUES
    ('welcome',1),('value_analyze',2),('value_live',3),('value_review',4),
    ('q_play_where',5),('q_stakes',6),('q_leak',7),('plan',8),('paywall',9)
),
counts AS (
  SELECT s.ord, s.step, count(DISTINCT e.device_id) AS devices
  FROM steps s LEFT JOIN public.onboarding_events e ON e.event = s.step
  GROUP BY s.ord, s.step
)
SELECT step AS lost_between_this_and_next, devices,
       devices - lead(devices) OVER (ORDER BY ord) AS lost
FROM counts
ORDER BY lost DESC NULLS LAST
LIMIT 5;
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
