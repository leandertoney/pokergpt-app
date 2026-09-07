#!/usr/bin/env bash
# Publish a multi-photo post to a Facebook Page.
#
#   ./scripts/post_fb_photos.sh [--app <name>] <caption-file> <img-url> [img-url ...]
#
# Facebook has no carousel type for an organic Page post. The equivalent is a
# multi-photo post: upload each photo unpublished, then create one feed post
# that attaches all of them. Readers swipe it the same way.
set -euo pipefail

APP=""
if [ "${1:-}" = "--app" ]; then APP="${2:?--app needs a name}"; shift 2; fi

CAPTION_FILE="${1:?usage: post_fb_photos.sh <caption-file> <img-url>...}"
shift
[ -f "$CAPTION_FILE" ] || { echo "no caption file: $CAPTION_FILE" >&2; exit 1; }
CAPTION="$(cat "$CAPTION_FILE")"
[ "$#" -ge 1 ] || { echo "give me at least one image url" >&2; exit 1; }

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
set -a; . "$ROOT/.env"; set +a

resolve_app() {
  local u; u=$(printf '%s' "$APP" | tr '[:lower:]-' '[:upper:]_')
  local pid tok
  eval "pid=\${${u}_FB_PAGE_ID:-}"; eval "tok=\${${u}_FB_PAGE_TOKEN:-}"
  [ -n "$pid" ] || { echo "unknown app '$APP' -- expected ${u}_FB_PAGE_ID in .env" >&2; exit 1; }
  FB_PAGE_ID="$pid"; [ -n "$tok" ] && FB_PAGE_TOKEN="$tok"
}
[ -n "${APP:-}" ] && resolve_app
: "${FB_PAGE_ID:?missing in .env}" "${FB_PAGE_TOKEN:?missing in .env}"

API="https://graph.facebook.com/v26.0"
jq_id() { python3 -c 'import json,sys; print(json.load(sys.stdin).get("id",""))'; }

ATTACH=()
i=0
for url in "$@"; do
  i=$((i+1))
  echo "→ photo $i/$#"
  R=$(curl -sS -X POST "$API/$FB_PAGE_ID/photos" \
        --data-urlencode "url=$url" \
        -d "published=false" \
        -d "access_token=$FB_PAGE_TOKEN")
  ID=$(printf '%s' "$R" | jq_id)
  [ -n "$ID" ] || { echo "  failed: $R" >&2; exit 1; }
  echo "  $ID"
  ATTACH+=("{\"media_fbid\":\"$ID\"}")
done

MEDIA="[$(IFS=,; echo "${ATTACH[*]}")]"

echo "→ feed post"
R=$(curl -sS -X POST "$API/$FB_PAGE_ID/feed" \
      --data-urlencode "message=$CAPTION" \
      --data-urlencode "attached_media=$MEDIA" \
      -d "access_token=$FB_PAGE_TOKEN")
PID=$(printf '%s' "$R" | jq_id)
[ -n "$PID" ] || { echo "post failed: $R" >&2; exit 1; }
echo "published: $PID"
