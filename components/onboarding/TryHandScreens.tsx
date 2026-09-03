/**
 * The try-it sequence: the player speaks one real hand and gets a real verdict,
 * before the paywall.
 *
 * Why this exists: the app's one paying US trial entered a hand nine minutes
 * after subscribing, got a correct answer, and never came back. That single
 * moment is the product, and it used to sit behind the paywall. Moving it in
 * front means the notification ask that follows can name a leak found in the
 * player's own hand instead of promising something in the abstract.
 *
 * Every failure path here routes forward. Mic denied, nothing said, model could
 * not read it — all of them continue to the plan. Onboarding never shows an
 * error wall.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Pressable, TextInput, type ViewStyle, type TextStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Mic, Square, Keyboard } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { spacing, radius, type as type_, elevation } from '@/constants/theme';
import { Screen, PrimaryButton, TextButton, Choice } from './ui/Primitives';
import { useHandDictation } from '@/hooks/useHandDictation';
import { parseAndAnalyzeHand, isReadableHand, type ParsedHand } from '@/services/handAnalysis';
import { trackOnboardingEvent } from '@/services/onboardingAnalytics';

/* ------------------------------------------------------------------ */
/* 1. The invite                                                       */
/* ------------------------------------------------------------------ */

export function TryHandInvite({
  onStart,
  onType,
  onSkip,
}: {
  onStart: () => void;
  onType: () => void;
  onSkip: () => void;
}) {
  return (
    <Screen
      progress={0.26}
      eyebrow="Your turn"
      headline={"What's up? Tell me\nabout the hand."}
      reveal
      accent={['hand.']}
      support={"Any spot that still bugs you. \u201cI had ace queen on the button and got check-raised on the turn\u201d is plenty."}
      footer={<TextButton label="Skip" onPress={onSkip} />}
    >
      {/* Two routes, deliberately the same size. Speech is rated far less
          acceptable in public than in private, so a meaningful share of first
          runs happen somewhere the player simply will not talk -- presenting
          text as a lesser fallback loses those players for a reason that has
          nothing to do with whether they want the app. */}
      <View style={s.routeRow}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onStart();
          }}
          style={({ pressed }) => [s.route, s.routePrimary, pressed && s.routePressed]}
          accessibilityRole="button"
          accessibilityLabel="Say your hand out loud"
        >
          <View style={s.routeIcon}>
            <Mic size={20} color={colors.text.dark} />
          </View>
          <Text style={s.routeLabel}>Say it</Text>
          <Text style={s.routeSub}>faster</Text>
        </Pressable>

        <Pressable
          onPress={onType}
          style={({ pressed }) => [s.route, pressed && s.routePressed]}
          accessibilityRole="button"
          accessibilityLabel="Type your hand instead"
        >
          <View style={s.routeIcon}>
            <Keyboard size={20} color={colors.text.dark} />
          </View>
          <Text style={s.routeLabel}>Type it</Text>
          <Text style={s.routeSub}>anywhere</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

/**
 * The typed route.
 *
 * A message composer rather than a labelled form field: the player has just
 * tapped through an exchange of chat bubbles, and the whole flow is selling a
 * conversation. A text input with a caption would break that in the one place
 * it needs to hold.
 */
export function TryHandCompose({
  value,
  onChange,
  onSubmit,
  onSkip,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onSkip: () => void;
}) {
  const ready = value.trim().length >= 8;
  return (
    <Screen
      progress={0.34}
      eyebrow="Your turn"
      headline={'Type the spot.'}
      support="A sentence is enough. The coach fills in the rest."
      footer={
        <>
          <PrimaryButton label="Send it" onPress={onSubmit} disabled={!ready} />
          <TextButton label="Skip" onPress={onSkip} />
        </>
      }
    >
      <View style={s.composer}>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder="Jacks in middle position, raised, button 3-bet me"
          placeholderTextColor={colors.text.muted}
          style={s.composerInput}
          multiline
          autoFocus
          maxLength={400}
          returnKeyType="done"
          blurOnSubmit
          onSubmitEditing={() => ready && onSubmit()}
          accessibilityLabel="Describe your hand"
        />
      </View>
    </Screen>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Listening                                                        */
/* ------------------------------------------------------------------ */

/**
 * The live-mic screen.
 *
 * Deliberately shows no running transcript: transcription happens in one pass
 * after recording stops, so there is nothing to stream. Claiming otherwise
 * would mean rendering an empty box for the whole take.
 */
export function TryHandListening({ onDone }: { onDone: () => void }) {
  return (
    <Screen
      progress={0.38}
      eyebrow="Listening"
      headline={'Go ahead.'}
      footer={<PrimaryButton label="Done" onPress={onDone} />}
    >
      <View style={s.micWrap}>
        <View style={[s.micButton, s.micLive]}>
          <Square size={26} color="#FFFFFF" fill="#FFFFFF" />
        </View>
        <Waveform />
        <Text style={s.micTip}>Tap Done when you&apos;ve said enough</Text>
      </View>
    </Screen>
  );
}

/** Ambient bars. Decorative only — real amplitude metering is not worth the
 *  battery or the complexity for a screen that lasts a few seconds. */
function Waveform() {
  const bars = useRef(
    Array.from({ length: 11 }, () => new Animated.Value(0.3))
  ).current;

  useEffect(() => {
    const loops = bars.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, {
            toValue: 1,
            duration: 380 + i * 47,
            useNativeDriver: false,
          }),
          Animated.timing(v, {
            toValue: 0.3,
            duration: 380 + i * 47,
            useNativeDriver: false,
          }),
        ])
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [bars]);

  return (
    <View style={s.wave}>
      {bars.map((v, i) => (
        <Animated.View
          key={i}
          style={[
            s.waveBar,
            {
              height: v.interpolate({ inputRange: [0, 1], outputRange: [5, 24] }),
            },
          ]}
        />
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Stakes, asked in context                                         */
/* ------------------------------------------------------------------ */

const STAKES = [
  { value: 'home', label: 'Home game' },
  { value: 'micro', label: 'Micro stakes' },
  { value: 'low', label: '1/2 or 1/3' },
  { value: 'mid', label: '2/5 and up' },
] as const;

export function TryHandStakes({
  value,
  onChange,
  onContinue,
  onSkip,
}: {
  value: string | null;
  onChange: (v: string) => void;
  onContinue: () => void;
  onSkip: () => void;
}) {
  return (
    <Screen
      progress={0.5}
      eyebrow="Before I read it"
      headline={'What were you\nplaying?'}
      support="Changes the answer. A loose call at 1/2 is a fold at 2/5."
      scroll
      footer={
        <>
          <PrimaryButton label="Read my hand" onPress={onContinue} />
          <TextButton label="Just guess" onPress={onSkip} />
        </>
      }
    >
      {STAKES.map((o) => (
        <Choice
          key={o.value}
          label={o.label}
          selected={value === o.value}
          onPress={() => onChange(o.value)}
        />
      ))}
    </Screen>
  );
}

/* ------------------------------------------------------------------ */
/* 4. The verdict                                                      */
/* ------------------------------------------------------------------ */

export function TryHandVerdict({
  parsed,
  onContinue,
}: {
  parsed: ParsedHand;
  onContinue: () => void;
}) {
  const { handData, analysis } = parsed;
  const street = handData.river ? 'River' : handData.turn ? 'Turn' : 'Flop';

  return (
    <Screen
      progress={0.62}
      eyebrow="Your hand"
      headline={'Here\'s where\nit went wrong.'}
      reveal
      accent={['wrong.']}
      scroll
      footer={<PrimaryButton label="Continue" onPress={onContinue} />}
    >
      <View style={s.card}>
        {!!handData.heroHand && (
          <Text style={s.heroHand}>{handData.heroHand}</Text>
        )}

        <Text style={s.cardLabel}>{street.toUpperCase()}</Text>
        <Text style={s.verdictAction}>{analysis.recommendedAction}</Text>

        {!!analysis.reasoning && (
          <Text style={s.verdictWhy}>{analysis.reasoning}</Text>
        )}

        <View style={s.metaRow}>
          {typeof analysis.equity === 'number' && (
            <Meta k="Equity" v={`${analysis.equity}%`} />
          )}
          {typeof analysis.potOdds === 'number' && (
            <Meta k="Pot odds" v={String(analysis.potOdds)} />
          )}
          {typeof analysis.confidence === 'number' && (
            <Meta k="Conf" v={`${analysis.confidence}%`} />
          )}
        </View>
      </View>
    </Screen>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <View style={s.meta}>
      <Text style={s.metaValue}>{v}</Text>
      <Text style={s.metaKey}>{k}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* 5. The notification ask                                             */
/* ------------------------------------------------------------------ */

/**
 * The permission ask, worded for what actually happened.
 *
 * Every route through the try-it flow lands here -- spoke, typed, or skipped --
 * because it is the only screen all three share, and a player who leaves
 * without granting this cannot be reached again at all.
 *
 * The offer differs by route on purpose. Someone who just handed us a hand and
 * got it read does not want an offer of more hands; they want the coach to keep
 * working on the leak it just found. Only the player with no hand is offered
 * the daily spot, because for them it is the honest description of what arrives.
 */
export function TryHandNotify({
  leakLabel,
  hasHand,
  onEnable,
  onSkip,
}: {
  leakLabel: string;
  hasHand: boolean;
  onEnable: () => void;
  onSkip: () => void;
}) {
  return (
    <Screen
      progress={0.74}
      eyebrow="One more thing"
      headline={hasHand ? 'Want me to keep\nworking on this?' : 'A hand a day,\nthen.'}
      reveal
      accent={hasHand ? ['this?'] : ['then.']}
      support={
        hasHand
          ? `I'll send you spots that test exactly that, one a day.`
          : `A real spot every morning. See how your play stacks up before you sit down.`
      }
      scroll
      footer={
        <>
          <PrimaryButton
            label={hasHand ? 'Keep working on this' : 'Send me a hand a day'}
            onPress={onEnable}
          />
          <TextButton label="No thanks" onPress={onSkip} />
        </>
      }
    >
      <View style={s.card}>
        <Text style={s.cardLabel}>{hasHand ? 'WATCHING FOR' : 'TOMORROW'}</Text>
        <Text style={s.watchFor}>
          {hasHand
            ? leakLabel
            : 'AQ suited on the button, facing a 3-bet. What’s your play?'}
        </Text>
      </View>
    </Screen>
  );
}

/* ------------------------------------------------------------------ */
/* Controller                                                          */
/* ------------------------------------------------------------------ */

export type TryHandResult = {
  /** The verdict, when one was produced. */
  parsed: ParsedHand | null;
  /** Stakes chosen here, so the outer flow does not ask twice. */
  stakes: string | null;
  /** Whether the player turned notifications on. */
  notificationsEnabled: boolean;
};

type Phase = 'invite' | 'listening' | 'retry' | 'compose' | 'stakes' | 'analyzing' | 'verdict' | 'notify';

/**
 * Drives the five try-it screens and hands the outcome back to OnboardingV3.
 *
 * onDone is called exactly once, on every path including the failures, so the
 * parent can move to the plan without knowing which branch ran.
 */
export function TryHandFlow({ onDone }: { onDone: (r: TryHandResult) => void }) {
  const [phase, setPhase] = useState<Phase>('invite');
  const [stakes, setStakes] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedHand | null>(null);
  // What the player typed, when they took the text route. Kept separate from
  // the dictation transcript so a denied mic followed by typing does not read
  // back a stale half-transcription.
  const [typed, setTyped] = useState('');
  const dictation = useHandDictation();
  const finished = useRef(false);

  /**
   * The hand text, whichever way it arrived.
   *
   * Typing is not a fallback here -- a large share of first runs happen where
   * the player will not speak aloud, so the two routes are equals and the rest
   * of the flow must not care which one produced the words.
   */
  const handText = typed.trim() || dictation.transcript || '';

  const finish = useCallback(
    (notificationsEnabled: boolean) => {
      if (finished.current) return;
      finished.current = true;
      onDone({ parsed, stakes, notificationsEnabled });
    },
    [onDone, parsed, stakes]
  );

  /**
   * Every abandon path lands here: no verdict, keep moving.
   *
   * It routes through the notification ask rather than straight out. Skipping
   * the hand is not a reason to leave without a push token -- these are exactly
   * the players least likely to come back on their own, and this is the last
   * screen in the flow that reaches them.
   */
  const bail = useCallback(
    (reason: string) => {
      trackOnboardingEvent('try_hand_skipped', { reason });
      if (finished.current) return;
      trackOnboardingEvent('notif_prompt_shown', { source: 'skip_path' });
      setPhase('notify');
    },
    []
  );

  const startRecording = useCallback(async () => {
    trackOnboardingEvent('try_hand_offered');
    const ok = await dictation.start();
    trackOnboardingEvent('mic_permission_result', { granted: ok });
    if (!ok) {
      // A denied mic used to end the try-it flow outright, which threw away a
      // player who was willing to give us a hand and only refused the
      // microphone. Typing is a real route, so send them there instead.
      trackOnboardingEvent('try_hand_compose', { reason: 'mic_denied' });
      setPhase('compose');
      return;
    }
    setPhase('listening');
  }, [dictation, bail]);

  const retriedRef = useRef(false);

  const stopRecording = useCallback(async () => {
    // Move off the live-mic screen FIRST. stopAndTranscribe awaits a recorder
    // stop plus a Whisper call with a 20s timeout; leaving the phase on
    // 'listening' left a frozen red mic and a Done button that could be tapped
    // again into a racing recorder.stop().
    setPhase('analyzing');
    const text = await dictation.stopAndTranscribe();
    trackOnboardingEvent('try_hand_recorded', {
      chars: text.length,
      failure: text ? null : (dictation.lastError.current ?? 'unknown'),
    });
    if (!text.trim()) {
      const reason = dictation.lastError.current ?? 'empty_transcript';
      // Falling silently forward is right for a hand we could not READ, but
      // after someone has visibly spoken it just looks broken. One retry, then
      // move on -- never an error wall inside onboarding.
      if (!retriedRef.current) {
        retriedRef.current = true;
        trackOnboardingEvent('try_hand_retry_offered', { reason });
        setPhase('retry');
        return;
      }
      bail(reason);
      return;
    }
    setPhase('stakes');
    // Falls through to the stakes question, then back to 'analyzing' for the
    // model call itself.
  }, [dictation, bail]);

  const runAnalysis = useCallback(
    async (stakesValue: string | null) => {
      setPhase('analyzing');
      const label = STAKES.find((x) => x.value === stakesValue)?.label ?? null;
      const source = typed.trim() ? 'typed' : 'voice';
      const result = await parseAndAnalyzeHand(handText, label);

      if (!isReadableHand(result)) {
        // Five of the first six recordings died here with nothing recorded but
        // the word "unreadable", which cannot distinguish a bad transcription
        // from a good one the model would not treat as poker. The length, the
        // opening words and the route are enough to tell those apart without
        // storing what someone said.
        trackOnboardingEvent('try_hand_analyzed', {
          readable: false,
          chars: handText.length,
          preview: handText.slice(0, 60),
          source,
        });
        bail('unreadable');
        return;
      }

      trackOnboardingEvent('try_hand_analyzed', {
        readable: true,
        source,
        action: result.analysis.recommendedAction,
      });

      // Persist it. Without this the very first hand a player gives us is shown
      // once and thrown away, so they land on an empty home screen having just
      // watched the app read a real spot. Saving also schedules the day-two
      // follow-up, which is the whole retention loop.
      try {
        const { storeHand } = await import('@/services/supabaseStorage');
        await storeHand(
          { ...result.handData, id: `hand-${Date.now()}`, timestamp: Date.now() } as any,
          { ...result.analysis, timestamp: Date.now() } as any
        );
        // Confirms the hand is waiting on the home screen. Without this the
        // only evidence of a save was the row itself, so a save that never
        // happened was indistinguishable from one that did.
        trackOnboardingEvent('try_hand_saved');
      } catch (e: any) {
        // A failed save must not cost them the verdict they just earned.
        console.warn('[try_hand] save failed:', e?.message);
        trackOnboardingEvent('try_hand_save_failed', { reason: e?.message ?? 'unknown' });
      }

      setParsed(result);
      setPhase('verdict');
    },
    [handText, typed, bail]
  );

  const enableNotifications = useCallback(async () => {
    trackOnboardingEvent('notif_prompt_accepted');
    const { requestAndRegisterPushToken } = await import('@/services/notificationService');
    const granted = await requestAndRegisterPushToken();
    trackOnboardingEvent('notif_permission_result', { granted });
    finish(granted);
  }, [finish]);

  switch (phase) {
    case 'invite':
      return (
        <TryHandInvite
          onStart={startRecording}
          onType={() => {
            trackOnboardingEvent('try_hand_compose', { reason: 'chose_text' });
            setPhase('compose');
          }}
          onSkip={() => bail('declined_invite')}
        />
      );

    case 'listening':
      return <TryHandListening onDone={stopRecording} />;

    case 'compose':
      return (
        <TryHandCompose
          value={typed}
          onChange={setTyped}
          onSubmit={() => {
            trackOnboardingEvent('try_hand_typed', { chars: typed.trim().length });
            setPhase('stakes');
          }}
          onSkip={() => bail('declined_compose')}
        />
      );

    case 'stakes':
      return (
        <TryHandStakes
          value={stakes}
          onChange={setStakes}
          onContinue={() => runAnalysis(stakes)}
          onSkip={() => {
            setStakes(null);
            runAnalysis(null);
          }}
        />
      );

    case 'retry':
      return (
        <TryHandRetry
          onRetry={() => {
            trackOnboardingEvent('try_hand_retry_taken');
            void startRecording();
          }}
          onSkip={() => bail('declined_retry')}
        />
      );

    case 'analyzing':
      return <AnalyzingScreen />;

    case 'verdict':
      return (
        <TryHandVerdict
          parsed={parsed!}
          onContinue={() => {
            trackOnboardingEvent('notif_prompt_shown');
            setPhase('notify');
          }}
        />
      );

    case 'notify':
      return (
        <TryHandNotify
          leakLabel={describeLeak(parsed)}
          hasHand={!!parsed}
          onEnable={enableNotifications}
          onSkip={() => {
            trackOnboardingEvent('notif_prompt_declined');
            finish(false);
          }}
        />
      );
  }
}

/** Shown once when a recording produced nothing usable. */
export function TryHandRetry({
  onRetry,
  onSkip,
}: {
  onRetry: () => void;
  onSkip: () => void;
}) {
  return (
    <Screen
      progress={0.38}
      eyebrow="One more go"
      headline={"Didn't catch that."}
      support="Tap the mic, wait a beat, then say the spot. A few seconds is plenty."
      footer={
        <>
          <PrimaryButton label="Try again" onPress={onRetry} />
          <TextButton label="Skip for now" onPress={onSkip} />
        </>
      }
    >
      <View style={s.micWrap}>
        <Pressable onPress={onRetry} style={s.micButton}>
          <Mic size={34} color={colors.text.dark} />
        </Pressable>
      </View>
    </Screen>
  );
}

/** Brief hold while the model reads the hand. */
function AnalyzingScreen() {
  return (
    <Screen progress={0.56} eyebrow="Reading" headline={'Working through\nyour hand.'}>
      <View style={s.micWrap}>
        <Waveform />
      </View>
    </Screen>
  );
}

/**
 * A short label for what the app will watch for, drawn from the hand itself.
 * Deliberately describes the SPOT, not a promise about results.
 */
function describeLeak(parsed: ParsedHand | null): string {
  const a = parsed?.analysis?.recommendedAction?.toLowerCase() ?? '';
  const h = parsed?.handData;

  if (h?.river && a.includes('fold')) return 'Wide river calls';
  if (a.includes('fold')) return 'Calling too wide';
  if (a.includes('raise') || a.includes('bet')) return 'Missed value bets';
  return 'The spot you just described';
}

const s = StyleSheet.create({
  /* Two equal routes into the same flow -- same width, same padding, same
     radius. Any asymmetry here reads as "typing is the lesser option", which
     is exactly the signal that loses the players who cannot speak right now. */
  routeRow: { flexDirection: 'row', gap: spacing.snug, paddingVertical: spacing.base },
  route: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.tight,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.snug,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(232,184,74,0.2)',
    backgroundColor: colors.background.tertiary,
  } as ViewStyle,
  routePrimary: { borderColor: colors.accent.gold } as ViewStyle,
  routePressed: { opacity: 0.85, transform: [{ scale: 0.98 }] } as ViewStyle,
  routeIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.accent.gold,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  routeLabel: { ...type_.body, fontWeight: '800', color: colors.text.primary } as TextStyle,
  routeSub: { ...type_.caption, color: colors.text.muted } as TextStyle,

  composer: {
    backgroundColor: colors.background.tertiary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.accent.gold,
    padding: spacing.base,
    minHeight: 132,
  } as ViewStyle,
  composerInput: {
    ...type_.body,
    color: colors.text.primary,
    minHeight: 100,
    textAlignVertical: 'top',
  } as TextStyle,

  micWrap: { alignItems: 'center', gap: spacing.base, paddingVertical: spacing.base },

  micButton: {
    width: 96,
    height: 96,
    borderRadius: radius.pill,
    backgroundColor: colors.accent.gold,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation.card,
  } as ViewStyle,
  micPressed: { opacity: 0.85, transform: [{ scale: 0.97 }] } as ViewStyle,
  micLive: { backgroundColor: colors.accent.primary } as ViewStyle,
  micTip: { ...type_.caption, color: colors.text.secondary } as TextStyle,

  wave: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 26 },
  waveBar: { width: 3, borderRadius: 2, backgroundColor: colors.accent.gold } as ViewStyle,

  card: {
    backgroundColor: colors.background.tertiary,
    borderRadius: radius.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(232,184,74,0.2)',
  } as ViewStyle,
  heroHand: {
    ...type_.heading,
    color: colors.accent.gold,
    marginBottom: spacing.snug,
  } as TextStyle,
  cardLabel: {
    ...type_.caption,
    fontSize: 10,
    letterSpacing: 1.4,
    color: colors.text.secondary,
    marginBottom: 4,
  } as TextStyle,
  verdictAction: { ...type_.heading, color: colors.text.primary } as TextStyle,
  verdictWhy: {
    ...type_.body,
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: spacing.snug,
  } as TextStyle,
  watchFor: { ...type_.heading, fontSize: 18, color: colors.text.primary } as TextStyle,

  metaRow: { flexDirection: 'row', gap: spacing.base, marginTop: spacing.base },
  meta: { alignItems: 'flex-start' },
  metaValue: {
    ...type_.heading,
    fontSize: 17,
    color: colors.accent.gold,
    fontVariant: ['tabular-nums'],
  } as TextStyle,
  metaKey: {
    ...type_.caption,
    fontSize: 10,
    letterSpacing: 1.2,
    color: colors.text.secondary,
  } as TextStyle,
});
