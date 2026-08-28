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
import { View, Text, StyleSheet, Animated, Pressable, type ViewStyle, type TextStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Mic, Square } from 'lucide-react-native';
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
  onSkip,
}: {
  onStart: () => void;
  onSkip: () => void;
}) {
  return (
    <Screen
      progress={0.26}
      eyebrow="Your turn"
      headline={'Tell me a hand\nthat still bugs you.'}
      reveal
      accent={['bugs']}
      support="Any spot you're not sure you played right. Just talk."
      footer={<TextButton label="I'll do this later" onPress={onSkip} />}
    >
      <View style={s.micWrap}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onStart();
          }}
          style={({ pressed }) => [s.micButton, pressed && s.micPressed]}
          accessibilityRole="button"
          accessibilityLabel="Start recording your hand"
        >
          <Mic size={34} color={colors.text.dark} />
        </Pressable>
        <Text style={s.micTip}>Tap to talk</Text>
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
      headline={'Keep going.'}
      footer={<PrimaryButton label="Done" onPress={onDone} />}
    >
      <View style={s.micWrap}>
        <View style={[s.micButton, s.micLive]}>
          <Square size={26} color="#FFFFFF" fill="#FFFFFF" />
        </View>
        <Waveform />
        <Text style={s.micTip}>Tap Done when you&apos;ve finished the hand</Text>
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

export function TryHandNotify({
  leakLabel,
  onEnable,
  onSkip,
}: {
  leakLabel: string;
  onEnable: () => void;
  onSkip: () => void;
}) {
  return (
    <Screen
      progress={0.74}
      eyebrow="One more thing"
      headline={'You\'ll play that\nspot again\nthis week.'}
      reveal
      accent={['again']}
      support={`We'll flag it the next time it shows up in a hand you bring us.`}
      scroll
      footer={
        <>
          <PrimaryButton label="Turn on notifications" onPress={onEnable} />
          <TextButton label="Not now" onPress={onSkip} />
        </>
      }
    >
      <View style={s.card}>
        <Text style={s.cardLabel}>WATCHING FOR</Text>
        <Text style={s.watchFor}>{leakLabel}</Text>
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

type Phase = 'invite' | 'listening' | 'stakes' | 'analyzing' | 'verdict' | 'notify';

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
  const dictation = useHandDictation();
  const finished = useRef(false);

  const finish = useCallback(
    (notificationsEnabled: boolean) => {
      if (finished.current) return;
      finished.current = true;
      onDone({ parsed, stakes, notificationsEnabled });
    },
    [onDone, parsed, stakes]
  );

  /** Every abandon path lands here: no verdict, no token, keep moving. */
  const bail = useCallback(
    (reason: string) => {
      trackOnboardingEvent('try_hand_skipped', { reason });
      if (finished.current) return;
      finished.current = true;
      onDone({ parsed: null, stakes, notificationsEnabled: false });
    },
    [onDone, stakes]
  );

  const startRecording = useCallback(async () => {
    trackOnboardingEvent('try_hand_offered');
    const ok = await dictation.start();
    trackOnboardingEvent('mic_permission_result', { granted: ok });
    if (!ok) {
      bail('mic_denied');
      return;
    }
    setPhase('listening');
  }, [dictation, bail]);

  const stopRecording = useCallback(async () => {
    // Move off the live-mic screen FIRST. stopAndTranscribe awaits a recorder
    // stop plus a Whisper call with a 20s timeout; leaving the phase on
    // 'listening' left a frozen red mic and a Done button that could be tapped
    // again into a racing recorder.stop().
    setPhase('analyzing');
    const text = await dictation.stopAndTranscribe();
    trackOnboardingEvent('try_hand_recorded', { chars: text.length });
    if (!text.trim()) {
      bail('empty_transcript');
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
      const result = await parseAndAnalyzeHand(dictation.transcript, label);

      if (!isReadableHand(result)) {
        trackOnboardingEvent('try_hand_analyzed', { readable: false });
        bail('unreadable');
        return;
      }

      trackOnboardingEvent('try_hand_analyzed', {
        readable: true,
        action: result.analysis.recommendedAction,
      });
      setParsed(result);
      setPhase('verdict');
    },
    [dictation.transcript, bail]
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
      return <TryHandInvite onStart={startRecording} onSkip={() => bail('declined_invite')} />;

    case 'listening':
      return <TryHandListening onDone={stopRecording} />;

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
          onEnable={enableNotifications}
          onSkip={() => {
            trackOnboardingEvent('notif_prompt_declined');
            finish(false);
          }}
        />
      );
  }
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
