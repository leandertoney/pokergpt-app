import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Image,
  type ViewStyle,
  type TextStyle,
  type ImageStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TrendingUp, Zap } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';

const HERO_IMAGE_URL = 'https://bollujxjsgahswigmyvq.supabase.co/storage/v1/object/public/assets/onboarding/poker_potential.png?v=2';

type PotentialScreenProps = {
  userName: string | null;
  experienceLevel: string;
  frequency: string | null;
  goal: string;
  goalTimeline: string | null;
  onNext: () => void;
};

// Timeline labels and corresponding bar heights (0–1, taller = more improvement)
const TIMELINE_DATA: Record<string, { labels: string[]; heights: number[] }> = {
  '1month': {
    labels: ['Now', 'Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'],
    heights: [0.15, 0.35, 0.55, 0.75, 0.93],
  },
  '3months': {
    labels: ['Now', 'Wk 2', 'Wk 4', 'Wk 6', 'Wk 8', 'Wk 10', 'Wk 12'],
    heights: [0.12, 0.25, 0.40, 0.55, 0.68, 0.82, 0.93],
  },
  '6months': {
    labels: ['Now', 'Mo 1', 'Mo 2', 'Mo 3', 'Mo 4', 'Mo 5', 'Mo 6'],
    heights: [0.12, 0.24, 0.38, 0.52, 0.67, 0.80, 0.93],
  },
  'norush': {
    labels: ['Now', 'Mo 1', 'Mo 2', 'Mo 3', 'Mo 4', 'Mo 5', 'Mo 6'],
    heights: [0.12, 0.24, 0.38, 0.52, 0.67, 0.80, 0.93],
  },
};

// Map goal keys to readable labels
const GOAL_LABELS: Record<string, string> = {
  bankroll: 'grow their bankroll',
  competition: 'crush tougher games',
  mastery: 'master the game',
  confidence: 'play with confidence',
};

// Map goal keys to what the graph Y-axis represents
const GOAL_GRAPH_METRIC: Record<string, string> = {
  bankroll: 'Win rate (BB/100)',
  competition: 'Win rate (BB/100)',
  mastery: 'Skill rating',
  confidence: 'Decision accuracy',
};

// Map timeline keys to readable timeframes
const TIMELINE_LABELS: Record<string, string> = {
  '1month': '30 days',
  '3months': '3 months',
  '6months': '6 months',
  'norush': 'their first few months',
};

// Map frequency to coaching insight
const FREQUENCY_INSIGHTS: Record<string, string> = {
  'once_twice_week': 'Even playing once or twice a week, structured coaching compounds fast.',
  'few_times_week': 'Playing a few times a week is the sweet spot for rapid improvement.',
  'almost_every_day': 'With near-daily play, you\'ll see changes within your first week.',
  'every_day': 'Daily players see the fastest results — you\'re set up perfectly.',
};

export function PotentialScreen({ userName, experienceLevel, frequency, goal, goalTimeline, onNext }: PotentialScreenProps) {
  // Build personalized copy
  const goalLabel = GOAL_LABELS[goal] || 'improve their game';
  const timelineLabel = TIMELINE_LABELS[goalTimeline || ''] || '30 days';
  const frequencyInsight = FREQUENCY_INSIGHTS[frequency || ''] || 'With consistent play and structured coaching, improvement comes fast.';
  const graphMetric = GOAL_GRAPH_METRIC[goal] || 'Win rate (BB/100)';

  const headlineAnim = useRef(new Animated.Value(0)).current;
  const graphAnim = useRef(new Animated.Value(0)).current;
  const stat1Anim = useRef(new Animated.Value(0)).current;
  const stat2Anim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Headline
    setTimeout(() => {
      Animated.spring(headlineAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }, 200);

    // Graph draw-in
    setTimeout(() => {
      Animated.timing(graphAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: false,
      }).start();
    }, 500);

    // Stats
    setTimeout(() => {
      Animated.spring(stat1Anim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }, 1400);

    setTimeout(() => {
      Animated.spring(stat2Anim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }, 1600);

    // Button
    setTimeout(() => {
      Animated.spring(buttonAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }, 1800);
  }, []);

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onNext();
  };

  return (
    <View style={styles.container}>
      {/* Hero Image */}
      <View style={styles.heroContainer}>
        <Image
          source={{ uri: HERO_IMAGE_URL }}
          style={styles.heroImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['rgba(13,13,20,0.4)', 'rgba(13,13,20,0.7)', colors.background.primary]}
          locations={[0, 0.35, 0.65]}
          style={StyleSheet.absoluteFillObject}
        />
      </View>

      <View style={styles.content}>
        {/* Headline */}
        <Animated.View
          style={[
            styles.headlineContainer,
            {
              opacity: headlineAnim,
              transform: [
                {
                  translateY: headlineAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.headline}>{userName ? `${userName}, your` : "Your"} poker game{'\n'}is about to level up</Text>
          <Text style={styles.subheadline}>Based on {experienceLevel} players who want to {goalLabel}</Text>
        </Animated.View>

        {/* Graph */}
        <View style={styles.graphContainer}>
          <View style={styles.graphArea}>
            {/* Y-axis rotated title */}
            <View style={styles.yAxisTitleContainer}>
              <Text style={styles.yAxisTitle}>{graphMetric}</Text>
            </View>

            {/* Y-axis tick labels */}
            <View style={styles.yAxis}>
              <Text style={styles.axisLabel}>Higher</Text>
              <Text style={styles.axisLabelMid}>Avg</Text>
              <Text style={styles.axisLabel}>Start</Text>
            </View>

            {/* Data column: graph + aligned x-axis labels */}
            <View style={styles.dataColumn}>
              <View style={styles.graphBody}>
                {/* Grid lines */}
                {[0, 1, 2, 3].map((i) => (
                  <View
                    key={i}
                    style={[styles.gridLine, { top: `${i * 33}%` }]}
                  />
                ))}

                {/* Bars — flex-spaced to match x-axis labels */}
                <View style={styles.barsContainer}>
                  {(TIMELINE_DATA[goalTimeline || ''] || TIMELINE_DATA['6months']).heights.map((h, index, arr) => {
                    const targetHeight = `${h * 100}%`;
                    return (
                      <View key={index} style={styles.barColumn}>
                        <Animated.View
                          style={[
                            styles.graphBar,
                            {
                              height: graphAnim.interpolate({
                                inputRange: [0, Math.min(1, (index + 1) / arr.length), 1],
                                outputRange: ['0%', targetHeight, targetHeight],
                              }),
                            },
                          ]}
                        />
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* X-axis labels — same flex container width as bars */}
              <View style={styles.xAxis}>
                {(TIMELINE_DATA[goalTimeline || ''] || TIMELINE_DATA['6months']).labels.map((label) => (
                  <Text key={label} style={styles.axisLabel}>{label}</Text>
                ))}
              </View>
            </View>
          </View>
          <Text style={styles.xAxisTitle}>Time with PokerPro AI</Text>
        </View>

        {/* Stats */}
        <Animated.View
          style={[
            styles.statCard,
            {
              opacity: stat1Anim,
              transform: [
                {
                  translateY: stat1Anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <TrendingUp size={20} color={colors.onboarding.gold} />
          <Text style={styles.statText}>{frequencyInsight}</Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.statCard,
            {
              opacity: stat2Anim,
              transform: [
                {
                  translateY: stat2Anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Zap size={20} color={colors.onboarding.gold} />
          <Text style={styles.statText}>
            {experienceLevel === 'beginner'
              ? 'Beginners who follow structured coaching see the steepest improvement curve.'
              : experienceLevel === 'advanced'
              ? 'Advanced players unlock the biggest edge from AI-driven leak detection.'
              : 'Intermediate players typically see the fastest results with targeted coaching.'}
          </Text>
        </Animated.View>
      </View>

      {/* CTA */}
      <Animated.View
        style={[
          styles.buttonContainer,
          {
            opacity: buttonAnim,
            transform: [
              {
                translateY: buttonAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={handleContinue}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaButtonText}>Let's Make It Happen</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  } as ViewStyle,
  heroContainer: {
    position: 'absolute',
    top: -120,
    left: 0,
    right: 0,
    height: '75%',
    overflow: 'hidden',
  } as ViewStyle,
  heroImage: {
    width: '100%',
    height: '100%',
  } as ImageStyle,
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    justifyContent: 'center',
  } as ViewStyle,
  headlineContainer: {
    marginBottom: 28,
    alignItems: 'center',
  } as ViewStyle,
  headline: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 36,
  } as TextStyle,
  subheadline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 8,
    textAlign: 'center',
  } as TextStyle,
  graphContainer: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 20,
    marginBottom: 20,
  } as ViewStyle,
  graphArea: {
    flexDirection: 'row',
  } as ViewStyle,
  yAxisTitleContainer: {
    width: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 0,
  } as ViewStyle,
  yAxisTitle: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    transform: [{ rotate: '-90deg' }],
    width: 120,
    textAlign: 'center',
  } as TextStyle,
  yAxis: {
    justifyContent: 'space-between',
    marginLeft: 6,
    marginRight: 8,
    paddingVertical: 2,
  } as ViewStyle,
  xAxisTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    textAlign: 'center',
    marginTop: 8,
  } as TextStyle,
  dataColumn: {
    flex: 1,
  } as ViewStyle,
  graphBody: {
    height: 140,
    position: 'relative',
    overflow: 'hidden',
  } as ViewStyle,
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  } as ViewStyle,
  barsContainer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  } as ViewStyle,
  barColumn: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  } as ViewStyle,
  graphBar: {
    width: 8,
    borderRadius: 4,
    backgroundColor: colors.onboarding.gold,
  } as ViewStyle,
  xAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  } as ViewStyle,
  axisLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
  } as TextStyle,
  axisLabelMid: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.25)',
  } as TextStyle,
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    gap: 12,
  } as ViewStyle,
  statText: {
    flex: 1,
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
  } as TextStyle,
  statHighlight: {
    fontWeight: '700',
    color: colors.onboarding.gold,
  } as TextStyle,
  buttonContainer: {
    position: 'absolute',
    bottom: 50,
    left: 24,
    right: 24,
    alignItems: 'center',
  } as ViewStyle,
  ctaButton: {
    width: '100%',
    backgroundColor: colors.onboarding.gold,
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: colors.onboarding.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  } as ViewStyle,
  ctaButtonText: {
    fontSize: 19,
    fontWeight: '700',
    color: '#000',
  } as TextStyle,
});

export default PotentialScreen;
