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
import { Star } from 'lucide-react-native';
import Svg, { Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';

const HERO_IMAGE_URL = 'https://bollujxjsgahswigmyvq.supabase.co/storage/v1/object/public/assets/onboarding/pocket_aces.png?v=2';

type HookScreenProps = {
  onNext: () => void;
};

export function HookScreen({ onNext }: HookScreenProps) {
  const badgeAnim = useRef(new Animated.Value(0)).current;
  const winAnim = useRef(new Animated.Value(0)).current;
  const moreAnim = useRef(new Animated.Value(0)).current;
  const tiltAnim = useRef(new Animated.Value(0)).current;
  const lessAnim = useRef(new Animated.Value(0)).current;
  const subtextAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Reset all values to 0 (handles Fast Refresh / remount edge cases)
    badgeAnim.setValue(0);
    winAnim.setValue(0);
    moreAnim.setValue(0);
    tiltAnim.setValue(0);
    lessAnim.setValue(0);
    subtextAnim.setValue(0);
    buttonAnim.setValue(0);

    const timers: ReturnType<typeof setTimeout>[] = [];

    // Badge fades in
    timers.push(setTimeout(() => {
      Animated.spring(badgeAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }, 200));

    // "Win" slides in
    timers.push(setTimeout(() => {
      Animated.spring(winAnim, {
        toValue: 1,
        tension: 60,
        friction: 7,
        useNativeDriver: true,
      }).start();
    }, 500));

    // "MORE" punches in
    timers.push(setTimeout(() => {
      Animated.spring(moreAnim, {
        toValue: 1,
        tension: 80,
        friction: 5,
        useNativeDriver: true,
      }).start();
    }, 700));

    // "Tilt" appears
    timers.push(setTimeout(() => {
      Animated.spring(tiltAnim, {
        toValue: 1,
        tension: 60,
        friction: 7,
        useNativeDriver: true,
      }).start();
    }, 1050));

    // "LESS" fades in
    timers.push(setTimeout(() => {
      Animated.spring(lessAnim, {
        toValue: 1,
        tension: 40,
        friction: 10,
        useNativeDriver: true,
      }).start();
    }, 1250));

    // Subtext
    timers.push(setTimeout(() => {
      Animated.timing(subtextAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }, 1600));

    // Button
    timers.push(setTimeout(() => {
      Animated.spring(buttonAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }, 1900));

    return () => timers.forEach(clearTimeout);
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
          colors={['transparent', colors.background.primary]}
          style={styles.heroGradient}
        />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* App Name - White fill with gold stroke */}
        <Animated.View style={[styles.appNameContainer, { opacity: badgeAnim }]}>
          <Svg height={52} width={300}>
            {/* White stroke layer (behind) */}
            <SvgText
              x="150"
              y="42"
              textAnchor="middle"
              fontSize={42}
              fontWeight="800"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={3}
            >
              PokerPro AI
            </SvgText>
            {/* Gold fill layer (on top) */}
            <SvgText
              x="150"
              y="42"
              textAnchor="middle"
              fontSize={42}
              fontWeight="800"
              fill={colors.onboarding.gold}
            >
              PokerPro AI
            </SvgText>
          </Svg>
        </Animated.View>

        {/* Social proof badge */}
        <Animated.View
          style={[
            styles.badge,
            {
              opacity: badgeAnim,
              transform: [
                {
                  scale: badgeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <Star size={14} color={colors.onboarding.gold} fill={colors.onboarding.gold} />
          <Text style={styles.badgeText}>Loved by poker players</Text>
        </Animated.View>

        {/* Main Headline - Word by Word */}
        <View style={styles.headlineContainer}>
          {/* Win MORE */}
          <View style={styles.headlineLine}>
            <Animated.Text
              style={[
                styles.headline,
                {
                  opacity: winAnim,
                  transform: [
                    {
                      translateY: winAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [40, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              Win{' '}
            </Animated.Text>
            <Animated.Text
              style={[
                styles.emphasisMore,
                {
                  opacity: moreAnim,
                  transform: [
                    {
                      scale: moreAnim.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0.3, 1.15, 1],
                      }),
                    },
                    {
                      translateY: moreAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              MORE.
            </Animated.Text>
          </View>

          {/* Tilt LESS */}
          <View style={styles.headlineLine}>
            <Animated.Text
              style={[
                styles.headline,
                {
                  opacity: tiltAnim,
                  transform: [
                    {
                      translateY: tiltAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [40, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              Tilt{' '}
            </Animated.Text>
            <Animated.Text
              style={[
                styles.emphasisLess,
                {
                  opacity: lessAnim,
                  transform: [
                    {
                      translateY: lessAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [15, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              LESS.
            </Animated.Text>
          </View>
        </View>

        {/* Supporting Text */}
        <Animated.Text
          style={[
            styles.subtext,
            { opacity: subtextAnim },
          ]}
        >
          Real-time poker AI that thinks{'\n'}with you at the table.
        </Animated.Text>
      </View>

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
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 100,
  } as ViewStyle,
  appNameContainer: {
    alignItems: 'center',
    marginBottom: 20,
  } as ViewStyle,
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 168, 75, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    marginBottom: 32,
  } as ViewStyle,
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onboarding.gold,
  } as TextStyle,
  headlineContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  headlineLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  } as ViewStyle,
  headline: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 56,
  } as TextStyle,
  emphasisMore: {
    fontSize: 52,
    fontWeight: '900',
    color: colors.onboarding.profit,
    textShadowColor: 'rgba(34, 197, 94, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  } as TextStyle,
  emphasisLess: {
    fontSize: 40,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 6,
  } as TextStyle,
  subtext: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 24,
  } as TextStyle,
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

export default HookScreen;
