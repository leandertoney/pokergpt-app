#!/usr/bin/env bash
# Publish a Reel to the Facebook Page via the video_reels flow.
#
#   ./scripts/post_fb_reel.sh <video.mp4> "<caption>"
#
# Three phases, per Meta's Reels spec: start (get a video_id and an upload
# URL), upload (raw binary to rupload.facebook.com), finish (publish).
# The finish call returns before the Reel is live -- Facebook transcodes
# asynchronously -- so the script polls status until it publishes or errors.
set -euo pipefail

APP=""
if [ "${1:-}" = "--app" ]; then APP="${2:?--app needs a name}"; shift 2; fi

VIDEO="${1:?usage: post_fb_reel.sh <video.mp4> \"<caption>\"}"
CAPTION="${2:-}"
[ -f "$VIDEO" ] || { echo "no such file: $VIDEO" >&2; exit 1; }

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
set -a; . "$ROOT/.env"; set +a

# --app <name> selects which product's Page/Instagram to post to. Without it,
# the unprefixed vars are used (Poker Hands Coach). Adding a product means
# adding <NAME>_FB_PAGE_ID / _IG_USER_ID / _FB_PAGE_TOKEN to .env -- no new
# Meta app, no code change here.
resolve_app() {
  local app_upper
  app_upper=$(printf '%s' "$APP" | tr '[:lower:]-' '[:upper:]_')
  local pid tok iid
  eval "pid=\${${app_upper}_FB_PAGE_ID:-}"
  eval "tok=\${${app_upper}_FB_PAGE_TOKEN:-}"
  eval "iid=\${${app_upper}_IG_USER_ID:-}"
  if [ -z "$pid" ] && [ -z "$iid" ]; then
    echo "unknown app '$APP' -- expected ${app_upper}_FB_PAGE_ID in .env" >&2
    exit 1
  fi
  [ -n "$pid" ] && FB_PAGE_ID="$pid"
  [ -n "$tok" ] && FB_PAGE_TOKEN="$tok"
  [ -n "$iid" ] && IG_USER_ID="$iid"
}
[ -n "${APP:-}" ] && resolve_app
: "${FB_PAGE_ID:?missing in .env}" "${FB_PAGE_TOKEN:?missing in .env}"

API="https://graph.facebook.com/v26.0"

echo "→ start"
START=$(curl -sS -X POST "$API/$FB_PAGE_ID/video_reels" \
  -d "upload_phase=start" -d "access_token=$FB_PAGE_TOKEN")
VIDEO_ID=$(printf '%s' "$START" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("video_id",""))')
UPLOAD_URL=$(printf '%s' "$START" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("upload_url",""))')
[ -n "$VIDEO_ID" ] || { echo "start failed: $START" >&2; exit 1; }
echo "  video_id=$VIDEO_ID"

echo "→ upload ($(wc -c <"$VIDEO" | tr -d ' ') bytes)"
UP=$(curl -sS -X POST "$UPLOAD_URL" \
  -H "Authorization: OAuth $FB_PAGE_TOKEN" \
  -H "offset: 0" \
  -H "file_size: $(wc -c <"$VIDEO" | tr -d ' ')" \
  --data-binary "@$VIDEO")
printf '%s' "$UP" | grep -q '"success":true' || { echo "upload failed: $UP" >&2; exit 1; }

echo "→ finish"
FIN=$(curl -sS -X POST "$API/$FB_PAGE_ID/video_reels" \
  -d "upload_phase=finish" \
  -d "video_id=$VIDEO_ID" \
  -d "video_state=PUBLISHED" \
  --data-urlencode "description=$CAPTION" \
  -d "access_token=$FB_PAGE_TOKEN")
printf '%s' "$FIN" | grep -q '"success":true' || { echo "finish failed: $FIN" >&2; exit 1; }

# Transcoding is async: a success here only means Facebook accepted the job.
echo "→ waiting for publish"
for i in $(seq 1 40); do
  S=$(curl -sS "$API/$VIDEO_ID?fields=status&access_token=$FB_PAGE_TOKEN")
  PHASE=$(printf '%s' "$S" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("status",{}).get("video_status",""))' 2>/dev/null || echo "")
  case "$PHASE" in
    ready|published) echo "  published"; break ;;
    error)           echo "  FAILED: $S" >&2; exit 1 ;;
    *)               printf '.'; sleep 3 ;;
  esac
done
echo
echo "video_id: $VIDEO_ID"
echo "url:      https://www.facebook.com/reel/$VIDEO_ID"
