/**
 * One worked hand, advanced by the player.
 *
 * This screen replaces three that described the product. The old ones claimed
 * the coach was conversational; this one spends a single exchange being it,
 * which is the only version a first-time player has any reason to believe.
 *
 * Two rules shape the whole file:
 *
 * 1. The player taps to advance. Nothing plays at them. Watching a
 *    demonstration measurably raises how hard people rate the task afterwards,
 *    while doing one lands -- so the tap is not decoration, it is the point.
 *
 * 2. The verdict is fixed, not fetched. One spot has exactly one answer, so a
 *    live call here would buy nothing and add a spinner, a timeout and a
 *    failure path to the single screen that has to land. The text below is a
 *    recorded response from the real analyzer for this exact spot, not copy
 *    written to sound like one. Everything from `try_hand` onward is live.
 */

import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, type ViewStyle, type TextStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';
import { spacing, radius, type as type_ } from '@/constants/theme';
import { Screen, PrimaryButton } from './ui/Primitives';
import { trackOnboardingEvent } from '@/services/onboardingAnalytics';

/**
 * The spot, as a player would actually say it out loud.
 *
 * One decision, one street. Not a hand history through to showdown -- the unit
 * is the moment someone would turn to the person next to them and ask.
 */
const PLAYER_LINE =
  'Folds to the player on my right, he makes it 20. I look down at ace-queen of hearts on the button.';

/**
 * The coach's reply, recorded from the analyzer for this spot.
 *
 * Ends by asking something back, which is what separates a conversation from a
 * lookup and is the shape every response pattern in VOICE_COACH_PROMPT takes.
 */
const COACH_LINE =
  "Ace-queen suited on the button? Easy three-bet. I'd make it 60 — you've got position and you dominate most of what he's opening from there. Was he playing a lot of hands?";

export function ExampleHand({
  progress,
  onBack,
  onDone,
}: {
  progress: number;
  onBack: () => void;
  onDone: () => void;
}) {
  const [revealed, setRevealed] = useState(false);

  const reveal = useCallback(() => {
    if (revealed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    trackOnboardingEvent('example_revealed');
    setRevealed(true);
  }, [revealed]);

  return (
    <Screen
      progress={progress}
      onBack={onBack}
      eyebrow="A hand"
      headline={revealed ? 'See what\nit does.' : "Here's one."}
      support={revealed ? undefined : 'Tap to hear what the coach says back.'}
      scroll
      footer={
        revealed ? (
          <PrimaryButton
            label="My turn"
            onPress={() => {
              trackOnboardingEvent('example_continued');
              onDone();
            }}
          />
        ) : undefined
      }
    >
      {/* The whole body is the tap target until the reply lands. A small
          button would make advancing feel like work; the screen itself
          advancing keeps the cost at essentially zero. */}
      <Pressable
        onPress={reveal}
        disabled={revealed}
        accessibilityRole={revealed ? undefined : 'button'}
        accessibilityLabel={revealed ? undefined : 'Show the coach’s answer'}
      >
        <View style={s.thread}>
          <View style={[s.bubble, s.you]}>
            <Text style={s.who}>YOU</Text>
            <Text style={s.youText}>{PLAYER_LINE}</Text>
          </View>

          {revealed ? (
            <View style={[s.bubble, s.coach]}>
              <Text style={[s.who, s.whoCoach]}>COACH</Text>
              <Text style={s.coachText}>{COACH_LINE}</Text>
            </View>
          ) : (
            <View style={[s.bubble, s.pending]}>
              <Text style={s.pendingText}>tap to hear back →</Text>
            </View>
          )}
        </View>
      </Pressable>
    </Screen>
  );
}

const s = StyleSheet.create({
  thread: { gap: spacing.snug, paddingVertical: spacing.base },

  bubble: {
    maxWidth: '90%',
    paddingVertical: spacing.cozy,
    paddingHorizontal: spacing.base,
    borderRadius: radius.lg,
  } as ViewStyle,

  you: {
    alignSelf: 'flex-end',
    backgroundColor: colors.background.tertiary,
    borderWidth: 1,
    borderColor: 'rgba(232,184,74,0.2)',
    borderBottomRightRadius: radius.sm,
  } as ViewStyle,

  coach: {
    alignSelf: 'flex-start',
    backgroundColor: colors.background.card,
    borderBottomLeftRadius: radius.sm,
  } as ViewStyle,

  pending: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(232,184,74,0.35)',
    borderBottomLeftRadius: radius.sm,
  } as ViewStyle,

  who: {
    ...type_.fine,
    letterSpacing: 1.2,
    color: colors.text.muted,
    marginBottom: spacing.tight,
  } as TextStyle,
  whoCoach: { color: colors.text.muted } as TextStyle,

  youText: { ...type_.body, color: colors.text.primary } as TextStyle,
  // Dark ink: this bubble sits on the ivory card colour, not the red ground.
  coachText: { ...type_.body, color: colors.text.dark } as TextStyle,
  pendingText: { ...type_.caption, color: colors.accent.gold } as TextStyle,
});
