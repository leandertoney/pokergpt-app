#!/usr/bin/env bash
# Publish a Reel to Instagram via the media container flow.
#
#   ./scripts/post_ig_reel.sh <public-video-url> "<caption>"
#
# IMPORTANT: Instagram will not accept a local file. The Content Publishing
# API fetches the video itself, so video_url must be a publicly reachable
# HTTPS URL -- Meta's servers do the download. A local path is rejected here
# rather than failing later with an opaque container error.
#
# Two phases: create a container (Instagram starts fetching and transcoding),
# poll until status_code=FINISHED, then publish. Publishing a container that
# is still IN_PROGRESS fails, which is why the poll is not optional.
set -euo pipefail

APP=""
if [ "${1:-}" = "--app" ]; then APP="${2:?--app needs a name}"; shift 2; fi

VIDEO_URL="${1:?usage: post_ig_reel.sh <public-https-url> \"<caption>\"}"
CAPTION="${2:-}"

case "$VIDEO_URL" in
  https://*) ;;
  *) echo "video_url must be a public https:// URL -- Instagram fetches it server-side." >&2
     echo "A local file path will not work. Upload it somewhere reachable first." >&2
     exit 1 ;;
esac

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
: "${IG_USER_ID:?missing in .env}" "${FB_PAGE_TOKEN:?missing in .env}"

API="https://graph.facebook.com/v26.0"

echo "→ create container"
C=$(curl -sS -X POST "$API/$IG_USER_ID/media" \
  -d "media_type=REELS" \
  --data-urlencode "video_url=$VIDEO_URL" \
  --data-urlencode "caption=$CAPTION" \
  -d "access_token=$FB_PAGE_TOKEN")
CID=$(printf '%s' "$C" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("id",""))')
[ -n "$CID" ] || { echo "container failed: $C" >&2; exit 1; }
echo "  container=$CID"

# Instagram downloads and transcodes before the container is publishable.
# Reels routinely take 30-60s; publishing early returns a misleading error.
echo "→ waiting for container"
for i in $(seq 1 60); do
  S=$(curl -sS "$API/$CID?fields=status_code,status&access_token=$FB_PAGE_TOKEN")
  CODE=$(printf '%s' "$S" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("status_code",""))')
  case "$CODE" in
    FINISHED) echo "  ready"; break ;;
    ERROR)    echo "  FAILED: $S" >&2; exit 1 ;;
    *)        printf '.'; sleep 5 ;;
  esac
done
[ "$CODE" = "FINISHED" ] || { echo "timed out waiting for container" >&2; exit 1; }

echo "→ publish"
P=$(curl -sS -X POST "$API/$IG_USER_ID/media_publish" \
  -d "creation_id=$CID" -d "access_token=$FB_PAGE_TOKEN")
MID=$(printf '%s' "$P" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("id",""))')
[ -n "$MID" ] || { echo "publish failed: $P" >&2; exit 1; }

LINK=$(curl -sS "$API/$MID?fields=permalink&access_token=$FB_PAGE_TOKEN" \
  | python3 -c 'import json,sys; print(json.load(sys.stdin).get("permalink",""))')
echo "media_id: $MID"
echo "url:      ${LINK:-https://www.instagram.com/$IG_HANDLE/}"
