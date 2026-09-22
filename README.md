# Poker Hands Coach

A React Native app that reviews poker hands and talks through them with you in real time. Live on the App Store.

Built with Expo (managed workflow) + TypeScript + Expo Router.

## Architecture

**Voice pipeline.** Spoken hand review runs on the OpenAI Realtime API over WebRTC
(`react-native-webrtc`, wired up in `services/realtimeWebRTC.ts` and
`hooks/useRealtimeVoice.ts`). WebRTC carries the audio in both directions and handles
jitter buffering and echo cancellation natively. Hand dictation and push-to-talk input
live in `hooks/useHandDictation.ts` and `hooks/useVoiceInput.ts`.

**Subscriptions.** RevenueCat (`react-native-purchases`) fronts App Store and Play
billing. A Supabase edge function (`supabase/functions/revenuecat-webhook`) receives
RevenueCat webhooks and joins each subscriber to their user row, so entitlement state
and post-purchase behaviour are queryable in the database rather than only in the
store.

**Backend.** Supabase for Postgres, auth, and storage, with schema versioned under
`supabase/migrations/`. Edge functions cover the RevenueCat webhook and a day-two
follow-up that re-engages a user on the hand they brought in. Client access goes
through `services/`, and the anon key is restricted by row-level security.

**Client state.** React Query for server state, Zod for runtime validation of model
output and API payloads.

### modules/streaming-audio-player

Custom Expo native module (Swift + Kotlin) for low-latency PCM16 audio streaming.
It played 24 kHz mono chunks from the Realtime API as they arrived, using
`AVAudioEngine` on iOS and `AudioTrack` in `MODE_STREAM` on Android, with a tunable
jitter buffer and a `clearQueue` path for barge-in. Superseded by
`react-native-webrtc`, which handles jitter buffering and playback internally;
kept for reference.

## Running it

```bash
npm install
npx expo start
```

Copy `.env.example` to `.env` and fill in the Supabase, OpenAI, and RevenueCat values
first. The app targets iOS and Android; `npx expo prebuild` generates the native
projects when you need a dev build.

## Tests

```bash
npm test            # jest
npx tsc --noEmit    # typecheck
```
