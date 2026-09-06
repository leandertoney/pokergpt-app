# Meta publishing (Facebook + Instagram)

Claude Code posts Reels to Facebook Pages and Instagram by API, no manual
uploads. Set up 2026-09-05. Verified end to end: both test Reels published.

## The design

One Meta app (**Universole Publisher**) owns publishing for every Universole
app. A new product is **one more Facebook Page**, not a new Meta app. The same
long-lived user token already grants access to 11 Pages, so adding Pronto or
Court Crowd is a Page ID and an Instagram link, nothing more.

## IDs

| What | Value |
|---|---|
| Business portfolio | `297288351853094` (Universole App Studios) |
| Meta app | `1825461091956554` (Universole Publisher) |
| Facebook Page | `1244917095380178` (Poker Hands Coach) |
| Instagram account | `17841425197692513` (@pokerhandscoach) |

### Products wired up

| Product | Page ID | Instagram | .env prefix |
|---|---|---|---|
| Poker Hands Coach | `1244917095380178` | @pokerhandscoach `17841425197692513` | *(none -- default)* |
| Court Crowd | `1286297964562105` | @courtcrowd `17841474815586106` | `COURTCROWD_` |
| Shadow Work | `1268247759708880` | @shadowworkvoice `17841438233857858` | `SHADOWWORK_` |

All live in `.env` at the repo root, which is gitignored. Never commit it.

```
META_BUSINESS_ID  FB_APP_ID  FB_APP_SECRET  FB_PAGE_ID
IG_HANDLE  IG_USER_ID  FB_USER_TOKEN  FB_PAGE_TOKEN
```

## Permissions

App is in **Development mode** (unpublished). Every permission below reads
"Ready for testing", which is full working access for Pages and Instagram
accounts this account admins. That is all this setup needs -- Development
mode is not a limitation here, because we are the only user.

| Permission | Status | Needs App Review for public use |
|---|---|---|
| `pages_show_list` | Ready for testing | yes |
| `pages_read_engagement` | Ready for testing | yes |
| `pages_manage_posts` | Ready for testing | yes |
| `business_management` | Ready for testing | yes |
| `instagram_basic` | Ready for testing | yes |
| `instagram_content_publish` | Ready for testing | yes |
| `public_profile` | auto-granted | no |

**`publish_video` does not exist.** It was requested in the original spec but
Meta does not offer it in either use case -- Reels publishing on Pages is
covered by `pages_manage_posts` via the `video_reels` edge. Verified by
reading every permission in both use cases.

App Review would additionally require **business verification**; the portfolio
is currently Unverified. Not needed while we publish only to our own assets.

## Tokens

`FB_PAGE_TOKEN` is what both scripts use.

- Type PAGE, **never expires** (`expires_at: 0`)
- **Data access expires 2026-12-05** -- this is the date that matters

The token itself does not lapse, but Meta expires *data access* every 90 days.
After that date calls start failing even though the token looks valid.

### Refreshing

Re-run the Graph API Explorer flow:

1. https://developers.facebook.com/tools/explorer/?app_id=1825461091956554
2. Meta App: Universole Publisher. Add the 6 permissions above.
3. Generate Access Token, approve the dialog.
4. Copy the token, then:

```bash
echo "FB_USER_TOKEN=$(pbpaste)" >> .env     # short-lived user token
```

5. Exchange it for a long-lived user token and a fresh Page token:

```bash
set -a; . ./.env; set +a
LL=$(curl -s "https://graph.facebook.com/v26.0/oauth/access_token?grant_type=fb_exchange_token&client_id=$FB_APP_ID&client_secret=$FB_APP_SECRET&fb_exchange_token=$FB_USER_TOKEN" | python3 -c 'import json,sys;print(json.load(sys.stdin)["access_token"])')
curl -s "https://graph.facebook.com/v26.0/me/accounts?fields=id,name,access_token&limit=50&access_token=$LL" | python3 -m json.tool
```

Take the `access_token` for the Page you want and replace `FB_PAGE_TOKEN`.

### Checking expiry any time

```bash
set -a; . ./.env; set +a
curl -s "https://graph.facebook.com/debug_token?input_token=$FB_PAGE_TOKEN&access_token=$FB_APP_ID|$FB_APP_SECRET" | python3 -m json.tool
```

## Posting

```bash
# Poker Hands Coach (default)
./scripts/post_fb_reel.sh video.mp4 "caption"
./scripts/post_ig_reel.sh https://public-url/video.mp4 "caption"

# any other product
./scripts/post_fb_reel.sh --app courtcrowd video.mp4 "caption"
./scripts/post_ig_reel.sh --app courtcrowd https://public-url/video.mp4 "caption"
```

`--app <name>` maps to `<NAME>_FB_PAGE_ID` / `<NAME>_IG_USER_ID` /
`<NAME>_FB_PAGE_TOKEN` in `.env` (uppercased, hyphens to underscores). Adding
a product is three `.env` lines -- no code change.

**Facebook takes a local file. Instagram does not.** The Instagram Content
Publishing API fetches the video from a public HTTPS URL server-side, so the
file has to be hosted first. The Supabase `assets` bucket is public and works:

```bash
set -a; . ./.env; set +a
curl -X POST "$EXPO_PUBLIC_SUPABASE_URL/storage/v1/object/assets/reels/NAME.mp4" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: video/mp4" -H "x-upsert: true" \
  --data-binary "@NAME.mp4"
# public URL:
# $EXPO_PUBLIC_SUPABASE_URL/storage/v1/object/public/assets/reels/NAME.mp4
```

Both scripts poll until the platform finishes transcoding. That wait is not
optional: Facebook's finish call returns before the Reel is live, and
publishing an Instagram container that is still IN_PROGRESS fails with a
misleading error.

### Video spec that worked

1080x1920, H.264 (high profile, yuv420p), 30fps, AAC stereo 44.1kHz,
`+faststart`. Generated with:

```bash
ffmpeg -f lavfi -i "color=c=0x6A0B0B:s=1080x1920:d=5:r=30" \
  -f lavfi -i "anullsrc=channel_layout=stereo:sample_rate=44100" \
  -c:v libx264 -profile:v high -pix_fmt yuv420p -r 30 -g 60 \
  -c:a aac -b:a 128k -ar 44100 -ac 2 -t 5 -movflags +faststart out.mp4
```

## Adding another app (Pronto, Court Crowd, ...)

1. Create a Facebook Page under the Universole portfolio (Business Settings ->
   Pages -> Add -> Create a new Facebook Page).
2. Create the Instagram account, switch it to Professional, add it to the
   portfolio (Business Settings -> Instagram accounts -> Add), and assign
   yourself Full access.
3. Link Instagram to the Page: Page -> Settings -> Linked accounts ->
   Instagram -> Connect. **Do this while acting as the Page**, not as your
   personal profile, or it attaches to the wrong entity.
4. Get that Page's token from `me/accounts` using `FB_USER_TOKEN` (see
   Refreshing above). No new Meta app, no new App Review.
5. Add `<APP>_FB_PAGE_ID` / `<APP>_IG_USER_ID` / `<APP>_FB_PAGE_TOKEN` to
   `.env`, then post with `--app <name>`.

Verify the Instagram link took:

```bash
curl -s "https://graph.facebook.com/v26.0/<PAGE_ID>?fields=instagram_business_account%7Bid,username%7D&access_token=<PAGE_TOKEN>"
```

## Security note

`FB_APP_SECRET` mints tokens for every asset in the portfolio and does not
expire. It was displayed on screen during setup. Rotate it once convenient:
App settings -> Basic -> App secret -> **Reset**, then update `.env`. Resetting
invalidates existing tokens, so redo the token steps afterward.

## Known issue

`Build & Launch` was linked to **@leandertoney** (personal). Unlinked
2026-09-06 -- verified `instagram_business_account` is now absent.

Pages with no Instagram linked (Facebook Reels work, Instagram does not):
Yourbizworth, TasteFayetteville, The PopUp System, SoLid Lids.

### Accounts Center vs Page links

These are unrelated. **Accounts Center** is the consumer feature (shared
login, cross-posting) and has no bearing on the API. The **Page ->
Instagram link** is what `instagram_content_publish` uses. An account can sit
in a personal Accounts Center and still publish correctly by API, which is
the case for @shadowworkvoice.
