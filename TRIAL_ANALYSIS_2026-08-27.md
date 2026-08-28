# Trial analysis: US (Aug 24, ended) vs Germany (Aug 27, active)

Sources: public.onboarding_events (1,083 events / 30 devices, Aug 15-27),
public.hands, public.users, and the RevenueCat PokerGPT dashboard.
Product: pokergpt_yearly, $29.99/yr, 3-day intro trial.

## Verdict

The US user is a REAL poker player, not recon. Nine minutes after starting the
trial they dictated a genuine bad-beat hand by voice, got a correct analysis
back, and never returned. The trial then EXPIRED on its own - RevenueCat shows
"inactive trial, expired 7 hours ago", not an early cancellation. They got one
answer, had no reason to come back, and let it lapse. That is a retention
problem, not fraud and not an app-quality problem.

## Identity mapping (confirmed on absolute timestamps)

Telemetry carries no country, so devices were matched to RevenueCat customer
records by exact link time:

  US  $RCA...20f6  United States  linked 2026-08-24 6:02 p.m. UTC
      -> device mt7jnl9i-br35x99q, first event 18:02:55 UTC   MATCH
      Trial expired Aug 27 ~07:00 UTC. Total spent USD 0.

  DE  $RCA...50a6  Germany        linked 2026-08-27 1:23 p.m. UTC
      -> device mtbk0304-5joquriq, first event 13:23:42 UTC   MATCH
      Active trial, converts in 3 days. Total spent USD 0.

Note: the German trial is about 1 hour old, not 12. The "12 hours ago" on the
dashboard list is a stale relative label; the customer record reads
2026-08-27 1:23 p.m. UTC. Worth knowing because the trial has nearly its whole
window left.

## Why the US user is real, not recon

The hand saved at 18:15:05, nine minutes after the trial started:

  Hero Q9s in BB, board 9-7-5 rainbow, turn J, river J.
  "bb leads for half pot I call river car is another J bb bets
   3 quarter pot I call and lose to AJ"

Three things recon does not do:
1. A specific, coherent, real hand with a bad-beat ending. Scouts type "test"
   or mash card values.
2. It was DICTATED BY VOICE - the transcript carries speech-to-text errors
   ("I have Coin9" for "Q9", "river car" for "river card"). Nobody evaluating a
   competitor narrates their own losses into a microphone.
3. Their onboarding answers were honest and internally consistent (micro
   stakes, plays both live and online), and the hand they submitted is exactly
   a micro-stakes spot.

The app answered correctly: fold on the river, 30% equity, 2.33 pot odds, 70%
confidence, with both GTO and exploit lines. The product did its job once.

Then nothing. No chats, no sessions, no second hand, and the trial lapsed.

## The two users side by side

| | US (expired) | Germany (active) |
|---|---|---|
| Onboarding duration | 2 min 52 s | 1 min 45 s |
| Restarted onboarding | no | YES, once at 44 s |
| Plays | live + online | online only |
| Stakes | micro | SKIPPED |
| Leak question | SKIPPED | SKIPPED |
| Named their plan | yes | yes |
| Content created | 1 hand, 9 min after | none yet |

Both skipped the leak question. That question is the one piece of data that
would let the app personalize day one, and neither paying user answered it.

The German user gave LESS profile data than the US user (skipped stakes too)
and restarted onboarding once, which usually means the first pass was
confusing or they backed out to re-read something.

## FINDING: there is no telemetry after onboarding at all

Both event streams end at the paywall because trackOnboardingEvent is only
called from OnboardingV3.tsx and PaywallV2.tsx. Nothing inside the app is
instrumented. The ONLY reason we know the US user engaged is that their hand
happened to sync to Postgres.

The sync tables are largely dead: chats = 1 row, sessions = 3 rows, both last
written in January. So most in-app activity is invisible even when it happens.

This is why a churned trial is currently unexplainable - the telemetry stops
exactly one screen before the behavior that decides retention.

## Funnel (16 real devices)

Excludes the Aug 17 07:20-08:30 cluster of 11 Android devices inside one hour
(a pre-launch test farm, not users) and the dev device.

  welcome                    16
  value / questions / plan   15
  paywall                    15
  paywall_page_price         11    <- 4 never scrolled to the price
  paywall_subscribe_tapped    7
  paywall_purchased           2

Is the 7 -> 2 drop the CourtCrowd signup-wall bug? No. The non-buyers fire
paywall_declined 8-23 s after tapping, which is the native payment sheet being
dismissed - ordinary price rejection at $29.99/yr. Three iOS devices go silent
after the tap with no further event (app backgrounded at the sheet); worth
watching, not conclusive.

Both real purchases were the YEARLY plan. Nobody bought weekly.

## Recommendations, in priority order

1. BUILD A REASON TO RETURN ON DAY 2. This is the actual cause of the US churn:
   one answer, then nothing pulling them back, then silent expiry.
   dailyReviewService.ts and notificationService.ts already exist. A push the
   morning after the first hand ("here is what your Q9 spot says about your
   calling range") attacks precisely what happened here. JS-only, ships OTA.

2. INSTRUMENT THE APP ITSELF. Track hand entry, analysis returned, voice chat,
   and day-2 open. Without it the next churned trial is equally unexplainable.

3. WIN THE GERMAN TRIAL - it has nearly 3 full days left. They have not entered
   a hand yet. First hand submitted is the leading indicator; the US user
   reached that and still churned, so first hand PLUS a day-2 touch is the
   conversion path. If you want one thing to watch, watch public.hands for
   user b9c2aac3-43fa-4f45-8607-43609b3b13cc.

4. RECONSIDER THE SKIPPED LEAK QUESTION. Both payers skipped it. Either make it
   answerable in one tap or drop it and infer the leak from the first hand.

5. FIX THE SYNC BLIND SPOT. Chats and sessions have not written since January.
