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
import { ChevronRight, TrendingUp, TrendingDown } from 'lucide-react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Line, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';

type ComparisonScreenProps = {
  onNext: () => void;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRAPH_WIDTH = SCREEN_WIDTH - 48;
const GRAPH_HEIGHT = 200;
const PADDING = 20;

// Data points for "With PokerGPT" - trending up
const WITH_POKERGPT = [0.35, 0.38, 0.42, 0.40, 0.48, 0.52, 0.55, 0.60, 0.58, 0.65, 0.72, 0.78];

// Data points for "Without PokerGPT" - trending down/flat
const WITHOUT_POKERGPT = [0.35, 0.33, 0.30, 0.32, 0.28, 0.25, 0.27, 0.22, 0.24, 0.20, 0.18, 0.15];

export function ComparisonScreen({ onNext }: ComparisonScreenProps) {
  const [graphProgress, setGraphProgress] = useState(0);
  const [showLabels, setShowLabels] = useState(false);

  const headlineAnim = useRef(new Animated.Value(0)).current;
  const graphAnim = useRef(new Animated.Value(0)).current;
  const labelAnim = useRef(new Animated.Value(0)).current;
  const swipeHintAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Headline entrance
    Animated.spring(headlineAnim, {
      toValue: 1,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();

    // Graph card entrance
    setTimeout(() => {
      Animated.spring(graphAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }, 300);

    // Start graph animation
    setTimeout(() => {
      animateGraph();
    }, 600);

    // Show labels after graph completes
    setTimeout(() => {
      setShowLabels(true);
      Animated.spring(labelAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }, 2200);

    // Swipe hint with pulsing animation
    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(swipeHintAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(swipeHintAnim, {
            toValue: 0.4,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, 2500);
  }, []);

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
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    };

    animate();
  };

  const generatePath = (dataPoints: number[], progress: number) => {
    if (progress === 0) return '';

    const pointsToShow = Math.floor(dataPoints.length * progress);
    const graphWidth = GRAPH_WIDTH - PADDING * 2;
    const graphHeight = GRAPH_HEIGHT - PADDING * 2;

    let path = '';

    for (let i = 0; i <= pointsToShow; i++) {
      const x = PADDING + (i / (dataPoints.length - 1)) * graphWidth;
      const y = PADDING + graphHeight - (dataPoints[i] * graphHeight);

      if (i === 0) {
        path += `M ${x} ${y}`;
      } else {
        const prevX = PADDING + ((i - 1) / (dataPoints.length - 1)) * graphWidth;
        const prevY = PADDING + graphHeight - (dataPoints[i - 1] * graphHeight);
        const midX = (prevX + x) / 2;
        path += ` Q ${prevX + (midX - prevX) * 0.8} ${prevY}, ${midX} ${(prevY + y) / 2}`;
        path += ` Q ${midX + (x - midX) * 0.2} ${y}, ${x} ${y}`;
      }
    }

    return path;
  };

  const withPath = generatePath(WITH_POKERGPT, graphProgress);
  const withoutPath = generatePath(WITHOUT_POKERGPT, graphProgress);

  const lastIndex = Math.floor(WITH_POKERGPT.length * graphProgress);
  const graphWidth = GRAPH_WIDTH - PADDING * 2;
  const graphHeight = GRAPH_HEIGHT - PADDING * 2;

  const withLastX = PADDING + (lastIndex / (WITH_POKERGPT.length - 1)) * graphWidth;
  const withLastY = PADDING + graphHeight - (WITH_POKERGPT[lastIndex] * graphHeight);
  const withoutLastX = PADDING + (lastIndex / (WITHOUT_POKERGPT.length - 1)) * graphWidth;
  const withoutLastY = PADDING + graphHeight - (WITHOUT_POKERGPT[lastIndex] * graphHeight);

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
        <Text style={styles.headline}>The difference is clear</Text>
        <Text style={styles.subheadline}>Your results over time</Text>
      </Animated.View>

      {/* Graph Card */}
      <Animated.View
        style={[
          styles.graphCard,
          {
            opacity: graphAnim,
            transform: [
              {
                translateY: graphAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              },
            ],
          },
        ]}
      >
        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.onboarding.profit }]} />
            <Text style={styles.legendText}>With PokerGPT</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
            <Text style={[styles.legendText, { color: 'rgba(255,255,255,0.5)' }]}>Without</Text>
          </View>
        </View>

        {/* Graph */}
        <View style={styles.graphContainer}>
          <Svg width={GRAPH_WIDTH} height={GRAPH_HEIGHT}>
            <Defs>
              <LinearGradient id="greenGradient" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={colors.onboarding.profit} stopOpacity="0.6" />
                <Stop offset="1" stopColor={colors.onboarding.profitLight} stopOpacity="1" />
              </LinearGradient>
              <LinearGradient id="grayGradient" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor="rgba(255,255,255,0.2)" stopOpacity="0.6" />
                <Stop offset="1" stopColor="rgba(255,255,255,0.4)" stopOpacity="1" />
              </LinearGradient>
            </Defs>

            {/* Zero line */}
            <Line
              x1={PADDING}
              y1={PADDING + graphHeight * 0.65}
              x2={GRAPH_WIDTH - PADDING}
              y2={PADDING + graphHeight * 0.65}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth={1}
              strokeDasharray="4,4"
            />
            <SvgText
              x={PADDING}
              y={PADDING + graphHeight * 0.65 - 5}
              fill="rgba(255,255,255,0.3)"
              fontSize={10}
            >
              Breakeven
            </SvgText>

            {/* Without PokerGPT path (draw first, so it's behind) */}
            {withoutPath && (
              <>
                <Path
                  d={withoutPath}
                  stroke="url(#grayGradient)"
                  strokeWidth={2}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="6,3"
                />
                {graphProgress > 0 && (
                  <Circle
                    cx={withoutLastX}
                    cy={withoutLastY}
                    r={4}
                    fill="rgba(255,255,255,0.4)"
                    stroke="rgba(255,255,255,0.6)"
                    strokeWidth={1.5}
                  />
                )}
              </>
            )}

            {/* With PokerGPT path */}
            {withPath && (
              <>
                <Path
                  d={withPath}
                  stroke="url(#greenGradient)"
                  strokeWidth={3}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {graphProgress > 0 && (
                  <Circle
                    cx={withLastX}
                    cy={withLastY}
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

        {/* Result Labels */}
        {showLabels && (
          <Animated.View
            style={[
              styles.resultsRow,
              {
                opacity: labelAnim,
                transform: [
                  {
                    translateY: labelAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.resultItem}>
              <View style={[styles.resultIcon, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                <TrendingUp size={18} color={colors.onboarding.profit} />
              </View>
              <Text style={styles.resultValue}>+$2,340</Text>
              <Text style={styles.resultLabel}>With PokerGPT</Text>
            </View>

            <View style={styles.vsContainer}>
              <Text style={styles.vsText}>vs</Text>
            </View>

            <View style={styles.resultItem}>
              <View style={[styles.resultIcon, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
                <TrendingDown size={18} color="rgba(255,255,255,0.5)" />
              </View>
              <Text style={[styles.resultValue, { color: 'rgba(255,255,255,0.5)' }]}>-$890</Text>
              <Text style={[styles.resultLabel, { color: 'rgba(255,255,255,0.4)' }]}>Without</Text>
            </View>
          </Animated.View>
        )}
      </Animated.View>

      {/* Compelling message */}
      {showLabels && (
        <Animated.Text
          style={[
            styles.compelling,
            {
              opacity: labelAnim,
            },
          ]}
        >
          Don't leave money on the table.
        </Animated.Text>
      )}

      {/* Swipe Hint */}
      <Animated.View
        style={[
          styles.swipeHint,
          {
            opacity: swipeHintAnim,
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
  subheadline: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginTop: 8,
  } as TextStyle,
  graphCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 20,
    marginTop: 32,
    width: '100%',
  } as ViewStyle,
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 16,
  } as ViewStyle,
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  } as ViewStyle,
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  } as ViewStyle,
  legendText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  } as TextStyle,
  graphContainer: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 16,
    overflow: 'hidden',
  } as ViewStyle,
  resultsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 8,
  } as ViewStyle,
  resultItem: {
    alignItems: 'center',
    flex: 1,
  } as ViewStyle,
  resultIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  } as ViewStyle,
  resultValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.onboarding.profit,
  } as TextStyle,
  resultLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  } as TextStyle,
  vsContainer: {
    paddingHorizontal: 16,
  } as ViewStyle,
  vsText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.3)',
  } as TextStyle,
  compelling: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.onboarding.gold,
    textAlign: 'center',
    marginTop: 24,
  } as TextStyle,
  swipeHint: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
    gap: 4,
  } as ViewStyle,
  swipeText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  } as TextStyle,
});

export default ComparisonScreen;
