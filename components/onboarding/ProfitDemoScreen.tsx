import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  Image,
  type ViewStyle,
  type TextStyle,
  type ImageStyle,
} from 'react-native';
import { TrendingUp, DollarSign } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, Defs, LinearGradient as SvgLinearGradient, Stop, Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';

type ProfitDemoScreenProps = {
  onNext: () => void;
};

const HERO_IMAGE_URL = 'https://bollujxjsgahswigmyvq.supabase.co/storage/v1/object/public/assets/onboarding/studying_poker.png?v=2';
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

    // Show continue button (solid, no animation)
    setTimeout(() => {
      Animated.timing(buttonAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
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
    if (progress <= 0) return '';

    // Ensure we never exceed array bounds
    const pointsToShow = Math.min(
      Math.max(1, Math.ceil(DATA_POINTS.length * progress)),
      DATA_POINTS.length
    );

    const padding = 10;
    const graphWidth = GRAPH_WIDTH - padding * 2;
    const graphHeight = GRAPH_HEIGHT - padding * 2;

    let path = '';

    for (let i = 0; i < pointsToShow; i++) {
      // Safety check for valid data point
      const dataPoint = DATA_POINTS[i];
      if (dataPoint === undefined || isNaN(dataPoint)) continue;

      const x = padding + (i / (DATA_POINTS.length - 1)) * graphWidth;
      const y = padding + graphHeight - (dataPoint * graphHeight);

      if (i === 0) {
        path += `M ${x} ${y}`;
      } else {
        // Smooth curve - with bounds check for previous point
        const prevDataPoint = DATA_POINTS[i - 1];
        if (prevDataPoint === undefined || isNaN(prevDataPoint)) continue;

        const prevX = padding + ((i - 1) / (DATA_POINTS.length - 1)) * graphWidth;
        const prevY = padding + graphHeight - (prevDataPoint * graphHeight);
        const midX = (prevX + x) / 2;
        path += ` Q ${prevX + (midX - prevX) * 0.8} ${prevY}, ${midX} ${(prevY + y) / 2}`;
        path += ` Q ${midX + (x - midX) * 0.2} ${y}, ${x} ${y}`;
      }
    }

    return path;
  };

  const currentPath = generatePath(graphProgress);
  // Clamp to valid array index to prevent NaN when graphProgress reaches 1
  const lastPointIndex = Math.max(0, Math.min(Math.floor(DATA_POINTS.length * graphProgress), DATA_POINTS.length - 1));
  const lastDataPoint = DATA_POINTS[lastPointIndex] ?? 0;
  const lastPointX = 10 + (lastPointIndex / (DATA_POINTS.length - 1)) * (GRAPH_WIDTH - 20);
  const lastPointY = 10 + (GRAPH_HEIGHT - 20) - (lastDataPoint * (GRAPH_HEIGHT - 20));

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
          colors={['transparent', colors.background.primary]}
          style={styles.heroGradient}
        />
      </View>

      <View style={styles.content}>
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
              <SvgLinearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={colors.onboarding.profit} stopOpacity="0.6" />
                <Stop offset="1" stopColor={colors.onboarding.profitLight} stopOpacity="1" />
              </SvgLinearGradient>
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

      {/* Continue Button */}
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
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.85}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  } as ViewStyle,
  heroContainer: {
    position: 'absolute',
    top: -70,
    left: 0,
    right: 0,
    height: '65%',
    overflow: 'hidden',
  } as ViewStyle,
  heroImage: {
    width: '100%',
    height: '100%',
  } as ImageStyle,
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
  } as ViewStyle,
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: 140,
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
  buttonContainer: {
    position: 'absolute',
    bottom: 50,
    left: 24,
    right: 24,
  } as ViewStyle,
  continueButton: {
    backgroundColor: colors.onboarding.gold,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  } as ViewStyle,
  continueButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
  } as TextStyle,
});

export default ProfitDemoScreen;
