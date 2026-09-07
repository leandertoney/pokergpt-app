#!/usr/bin/env bash
# Publish an image carousel to Instagram.
#
#   ./scripts/post_ig_carousel.sh [--app <name>] <caption-file> <img-url> [img-url ...]
#
# Three phases, unlike a Reel's two:
#   1. one container per image, each with is_carousel_item=true
#   2. one parent container of media_type=CAROUSEL listing those children
#   3. publish the parent
#
# Instagram fetches every image server-side, so each URL must be public HTTPS.
# A local path is rejected here rather than failing later with an opaque
# container error.
#
# Limits: 2 to 10 images, JPEG or PNG, and the aspect ratio of the FIRST image
# sets the frame for all of them.
set -euo pipefail

APP=""
if [ "${1:-}" = "--app" ]; then APP="${2:?--app needs a name}"; shift 2; fi

CAPTION_FILE="${1:?usage: post_ig_carousel.sh <caption-file> <img-url>...}"
shift
[ -f "$CAPTION_FILE" ] || { echo "no caption file: $CAPTION_FILE" >&2; exit 1; }
CAPTION="$(cat "$CAPTION_FILE")"

[ "$#" -ge 2 ] || { echo "a carousel needs at least 2 images" >&2; exit 1; }
[ "$#" -le 10 ] || { echo "Instagram allows at most 10 images" >&2; exit 1; }

for u in "$@"; do
  case "$u" in
    https://*) ;;
    *) echo "image urls must be public https:// -- Instagram fetches them server-side: $u" >&2
       exit 1 ;;
  esac
done

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
set -a; . "$ROOT/.env"; set +a

resolve_app() {
  local app_upper
  app_upper=$(printf '%s' "$APP" | tr '[:lower:]-' '[:upper:]_')
  local iid tok
  eval "iid=\${${app_upper}_IG_USER_ID:-}"
  eval "tok=\${${app_upper}_FB_PAGE_TOKEN:-}"
  [ -n "$iid" ] || { echo "unknown app '$APP' -- expected ${app_upper}_IG_USER_ID in .env" >&2; exit 1; }
  IG_USER_ID="$iid"
  [ -n "$tok" ] && FB_PAGE_TOKEN="$tok"
}
[ -n "${APP:-}" ] && resolve_app
: "${IG_USER_ID:?missing in .env}" "${FB_PAGE_TOKEN:?missing in .env}"

API="https://graph.facebook.com/v26.0"
jq_id() { python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("id",""))'; }

CHILDREN=()
i=0
for url in "$@"; do
  i=$((i+1))
  echo "→ child $i/$#"
  R=$(curl -sS -X POST "$API/$IG_USER_ID/media" \
        -d "is_carousel_item=true" \
        --data-urlencode "image_url=$url" \
        -d "access_token=$FB_PAGE_TOKEN")
  ID=$(printf '%s' "$R" | jq_id)
  [ -n "$ID" ] || { echo "  child failed: $R" >&2; exit 1; }
  echo "  $ID"
  CHILDREN+=("$ID")
done

JOINED=$(IFS=,; echo "${CHILDREN[*]}")

echo "→ parent container"
P=$(curl -sS -X POST "$API/$IG_USER_ID/media" \
      -d "media_type=CAROUSEL" \
      -d "children=$JOINED" \
      --data-urlencode "caption=$CAPTION" \
      -d "access_token=$FB_PAGE_TOKEN")
PID=$(printf '%s' "$P" | jq_id)
[ -n "$PID" ] || { echo "parent failed: $P" >&2; exit 1; }
echo "  $PID"

# Images transcode faster than video, but the parent still has to finish
# before it will publish. Poll rather than sleep on a guess.
echo "→ waiting"
for _ in $(seq 1 40); do
  S=$(curl -sS "$API/$PID?fields=status_code&access_token=$FB_PAGE_TOKEN")
  CODE=$(printf '%s' "$S" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("status_code",""))')
  [ "$CODE" = "FINISHED" ] && break
  [ "$CODE" = "ERROR" ] && { echo "container error: $S" >&2; exit 1; }
  sleep 3
done

echo "→ publish"
R=$(curl -sS -X POST "$API/$IG_USER_ID/media_publish" \
      -d "creation_id=$PID" -d "access_token=$FB_PAGE_TOKEN")
MID=$(printf '%s' "$R" | jq_id)
[ -n "$MID" ] || { echo "publish failed: $R" >&2; exit 1; }
echo "published: $MID"
