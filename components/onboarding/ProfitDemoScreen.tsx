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
import { ChevronRight, TrendingUp, DollarSign } from 'lucide-react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';

type ProfitDemoScreenProps = {
  onNext: () => void;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRAPH_WIDTH = SCREEN_WIDTH - 64;
const GRAPH_HEIGHT = 140;

// Demo data points (normalized 0-1 for the graph) - doesn't go to full 1.0
const DATA_POINTS = [0.15, 0.2, 0.28, 0.22, 0.35, 0.42, 0.48, 0.55, 0.52, 0.62, 0.72, 0.78];

const DEMO_DATA = {
  sessionName: 'Friday Night Session',
  startingStack: 500,
  currentStack: 847,
  profit: 347,
};

export function ProfitDemoScreen({ onNext }: ProfitDemoScreenProps) {
  const [displayedProfit, setDisplayedProfit] = useState(0);
  const [displayedCurrent, setDisplayedCurrent] = useState(DEMO_DATA.startingStack);
  const [graphProgress, setGraphProgress] = useState(0);

  const headlineAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
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
      Animated.spring(cardAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Start graph animation after card appears
    setTimeout(() => {
      animateGraph();
    }, 600);

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

  const animateGraph = () => {
    const duration = 1500;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out)
      const eased = 1 - Math.pow(1 - progress, 3);

      setGraphProgress(eased);
      setDisplayedProfit(Math.round(DEMO_DATA.profit * eased));
      setDisplayedCurrent(Math.round(DEMO_DATA.startingStack + (DEMO_DATA.profit * eased)));

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
        // Smooth curve
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
        <Text style={styles.headline}>Track every session.</Text>
        <Text style={styles.headline}>Watch your bankroll grow.</Text>
      </Animated.View>

      {/* Session Card */}
      <Animated.View
        style={[
          styles.sessionCard,
          {
            opacity: cardAnim,
            transform: [
              {
                translateY: cardAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              },
              {
                scale: cardAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1],
                }),
              },
            ],
          },
        ]}
      >
        {/* Session Header */}
        <View style={styles.sessionHeader}>
          <View style={styles.sessionIcon}>
            <DollarSign size={18} color={colors.onboarding.profit} />
          </View>
          <Text style={styles.sessionName}>{DEMO_DATA.sessionName}</Text>
        </View>

        {/* Stack Info */}
        <View style={styles.stackRow}>
          <View style={styles.stackItem}>
            <Text style={styles.stackLabel}>Started</Text>
            <Text style={styles.stackValue}>${DEMO_DATA.startingStack}</Text>
          </View>
          <View style={styles.stackItem}>
            <Text style={styles.stackLabel}>Current</Text>
            <Text style={[styles.stackValue, styles.currentValue]}>${displayedCurrent}</Text>
          </View>
          <View style={styles.profitBadge}>
            <TrendingUp size={14} color="#000" />
            <Text style={styles.profitText}>+${displayedProfit}</Text>
          </View>
        </View>

        {/* Graph */}
        <View style={styles.graphContainer}>
          <Svg width={GRAPH_WIDTH} height={GRAPH_HEIGHT}>
            <Defs>
              <LinearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={colors.onboarding.profit} stopOpacity="0.6" />
                <Stop offset="1" stopColor={colors.onboarding.profitLight} stopOpacity="1" />
              </LinearGradient>
            </Defs>
            {currentPath && (
              <>
                <Path
                  d={currentPath}
                  stroke="url(#lineGradient)"
                  strokeWidth={3}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {graphProgress > 0 && (
                  <Circle
                    cx={lastPointX}
                    cy={lastPointY}
                    r={6}
                    fill={colors.onboarding.profitLight}
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
  headline: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 36,
  } as TextStyle,
  sessionCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 20,
    marginTop: 32,
    width: '100%',
  } as ViewStyle,
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  } as ViewStyle,
  sessionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  sessionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  } as TextStyle,
  stackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  } as ViewStyle,
  stackItem: {
    flex: 1,
  } as ViewStyle,
  stackLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 4,
  } as TextStyle,
  stackValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  } as TextStyle,
  currentValue: {
    color: colors.onboarding.profit,
  } as TextStyle,
  profitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.onboarding.profit,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  } as ViewStyle,
  profitText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
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

export default ProfitDemoScreen;
