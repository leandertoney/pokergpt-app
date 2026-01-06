import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { ChevronRight, BarChart3, Clock, Layers, TrendingUp } from 'lucide-react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';

type SessionDemoScreenProps = {
  onNext: () => void;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRAPH_WIDTH = SCREEN_WIDTH - 64;
const GRAPH_HEIGHT = 120;

// Demo data points (normalized 0-1 for the graph) - doesn't fill completely
const DATA_POINTS = [0.2, 0.25, 0.3, 0.35, 0.32, 0.4, 0.48, 0.52, 0.55, 0.58, 0.62, 0.68];

const DEMO_STATS = {
  sessions: 47,
  handsAnalyzed: 892,
  timeWithApp: '12h',
  profitTracked: 2340,
};

export function SessionDemoScreen({ onNext }: SessionDemoScreenProps) {
  const [animatedSessions, setAnimatedSessions] = useState(0);
  const [animatedHands, setAnimatedHands] = useState(0);
  const [animatedProfit, setAnimatedProfit] = useState(0);
  const [graphProgress, setGraphProgress] = useState(0);

  const headlineAnim = useRef(new Animated.Value(0)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;
  const graphAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered entrance animations
    Animated.sequence([
      Animated.spring(headlineAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(statsAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Start counting animations
    setTimeout(() => {
      animateNumbers();
      animateGraph();
    }, 400);

    // Show swipe hint with pulsing animation
    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(buttonAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(buttonAnim, {
            toValue: 0.4,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, 2000);
  }, []);

  const animateNumbers = () => {
    const duration = 1500;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function
      const eased = 1 - Math.pow(1 - progress, 3);

      setAnimatedSessions(Math.round(DEMO_STATS.sessions * eased));
      setAnimatedHands(Math.round(DEMO_STATS.handsAnalyzed * eased));
      setAnimatedProfit(Math.round(DEMO_STATS.profitTracked * eased));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  };

  const animateGraph = () => {
    const duration = 1500;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setGraphProgress(eased);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    };

    animate();
  };

  const generatePath = (progress: number) => {
    if (progress === 0) return '';

    const pointsToShow = Math.floor(DATA_POINTS.length * progress);
    const padding = 10;
    const graphWidth = GRAPH_WIDTH - padding * 2;
    const graphHeight = GRAPH_HEIGHT - padding * 2;

    let path = '';

    for (let i = 0; i <= pointsToShow; i++) {
      const x = padding + (i / (DATA_POINTS.length - 1)) * graphWidth;
      const y = padding + graphHeight - (DATA_POINTS[i] * graphHeight);

      if (i === 0) {
        path += `M ${x} ${y}`;
      } else {
        const prevX = padding + ((i - 1) / (DATA_POINTS.length - 1)) * graphWidth;
        const prevY = padding + graphHeight - (DATA_POINTS[i - 1] * graphHeight);
        const midX = (prevX + x) / 2;
        path += ` Q ${prevX + (midX - prevX) * 0.8} ${prevY}, ${midX} ${(prevY + y) / 2}`;
        path += ` Q ${midX + (x - midX) * 0.2} ${y}, ${x} ${y}`;
      }
    }

    return path;
  };

  const currentPath = generatePath(graphProgress);
  const lastPointIndex = Math.floor(DATA_POINTS.length * graphProgress);
  const lastPointX = 10 + (lastPointIndex / (DATA_POINTS.length - 1)) * (GRAPH_WIDTH - 20);
  const lastPointY = 10 + (GRAPH_HEIGHT - 20) - (DATA_POINTS[lastPointIndex] * (GRAPH_HEIGHT - 20));

  return (
    <View style={styles.container}>
      {/* Headline */}
      <Animated.View
        style={{
          opacity: headlineAnim,
          transform: [
            {
              translateY: headlineAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [30, 0],
              }),
            },
          ],
        }}
      >
        <View style={styles.iconHeader}>
          <BarChart3 size={28} color={colors.onboarding.gold} />
        </View>
        <Text style={styles.headline}>Your poker journey</Text>
        <Text style={styles.subheadline}>Track everything, improve always.</Text>
      </Animated.View>

      {/* Stats Card */}
      <Animated.View
        style={[
          styles.statsCard,
          {
            opacity: statsAnim,
            transform: [
              {
                translateY: statsAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              },
            ],
          },
        ]}
      >
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(212, 168, 75, 0.15)' }]}>
              <Layers size={18} color={colors.onboarding.gold} />
            </View>
            <Text style={styles.statValue}>{animatedSessions}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>

          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(212, 168, 75, 0.15)' }]}>
              <BarChart3 size={18} color={colors.onboarding.gold} />
            </View>
            <Text style={styles.statValue}>{animatedHands}</Text>
            <Text style={styles.statLabel}>Hands</Text>
          </View>

          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(212, 168, 75, 0.15)' }]}>
              <Clock size={18} color={colors.onboarding.gold} />
            </View>
            <Text style={styles.statValue}>{DEMO_STATS.timeWithApp}</Text>
            <Text style={styles.statLabel}>Time</Text>
          </View>

          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
              <TrendingUp size={18} color={colors.onboarding.profit} />
            </View>
            <Text style={[styles.statValue, styles.profitValue]}>+${animatedProfit.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Profit</Text>
          </View>
        </View>

        {/* Graph */}
        <View style={styles.graphContainer}>
          <Svg width={GRAPH_WIDTH} height={GRAPH_HEIGHT}>
            <Defs>
              <LinearGradient id="goldGradient" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={colors.onboarding.gold} stopOpacity="0.6" />
                <Stop offset="1" stopColor={colors.onboarding.gold} stopOpacity="1" />
              </LinearGradient>
            </Defs>
            {currentPath && (
              <>
                <Path
                  d={currentPath}
                  stroke="url(#goldGradient)"
                  strokeWidth={3}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {graphProgress > 0 && (
                  <Circle
                    cx={lastPointX}
                    cy={lastPointY}
                    r={5}
                    fill={colors.onboarding.gold}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                )}
              </>
            )}
          </Svg>
        </View>
      </Animated.View>

      {/* Swipe Hint */}
      <Animated.View
        style={[
          styles.swipeHint,
          {
            opacity: buttonAnim,
          },
        ]}
      >
        <ChevronRight size={24} color="rgba(255,255,255,0.5)" />
        <Text style={styles.swipeText}>Swipe to continue</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  } as ViewStyle,
  iconHeader: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(212, 168, 75, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  } as ViewStyle,
  headline: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 36,
  } as TextStyle,
  subheadline: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginTop: 8,
  } as TextStyle,
  statsCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 20,
    marginTop: 32,
    width: '100%',
  } as ViewStyle,
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  } as ViewStyle,
  statItem: {
    alignItems: 'center',
    flex: 1,
  } as ViewStyle,
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  } as ViewStyle,
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  } as TextStyle,
  profitValue: {
    color: colors.onboarding.profit,
  } as TextStyle,
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  } as TextStyle,
  graphContainer: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 16,
    overflow: 'hidden',
    padding: 4,
  } as ViewStyle,
  swipeHint: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
    alignSelf: 'center',
    gap: 4,
  } as ViewStyle,
  swipeText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  } as TextStyle,
});

export default SessionDemoScreen;
