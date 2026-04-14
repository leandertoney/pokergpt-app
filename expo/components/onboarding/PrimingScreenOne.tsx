import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
  Dimensions,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Check } from 'lucide-react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';
import { getPriceForPlan } from '@/services/revenueCat';
import { MockiPhoneFrame } from '@/components/MockiPhoneFrame';

const { width: SW } = Dimensions.get('window');
const PHONE_WIDTH = SW * 0.58;

type PrimingScreenOneProps = {
  onNext: () => void;
};

export function PrimingScreenOne({ onNext }: PrimingScreenOneProps) {
  const [yearlyPrice, setYearlyPrice] = useState<string>('$29.99 per year');

  const headlineAnim = useRef(new Animated.Value(0)).current;
  const phoneAnim = useRef(new Animated.Value(0)).current;
  const bodyAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;
  const priceAnim = useRef(new Animated.Value(0)).current;

  const player = useVideoPlayer(
    require('@/assets/videos/pokergpt_animation_1.mp4'),
    (p) => {
      p.loop = true;
      p.muted = true;
      p.play();
    }
  );

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const price = await getPriceForPlan('yearly');
        if (price) {
          setYearlyPrice(`${price} per year`);
        }
      } catch {
        // Keep default price
      }
    };
    fetchPrice();
  }, []);

  useEffect(() => {
    // Headline
    setTimeout(() => {
      Animated.spring(headlineAnim, {
        toValue: 1,
        tension: 60,
        friction: 7,
        useNativeDriver: true,
      }).start();
    }, 200);

    // Phone with video — "pulled from pocket" entrance over 2s
    setTimeout(() => {
      Animated.timing(phoneAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }, 100);

    // Body text — after phone settles (~2.2s)
    setTimeout(() => {
      Animated.timing(bodyAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }, 2200);

    // Button
    setTimeout(() => {
      Animated.spring(buttonAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }, 2400);

    // Price text
    setTimeout(() => {
      Animated.timing(priceAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, 2600);
  }, []);

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onNext();
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Headline */}
        <Animated.Text
          style={[
            styles.headline,
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
          We want you to{'\n'}try it free
        </Animated.Text>

        {/* Video in Mock iPhone Frame */}
        <Animated.View
          style={[
            styles.phoneContainer,
            {
              opacity: phoneAnim.interpolate({
                inputRange: [0, 0.15, 1],
                outputRange: [0, 1, 1],
              }),
              transform: [
                {
                  translateY: phoneAnim.interpolate({
                    inputRange: [0, 0.85, 1],
                    outputRange: [800, -10, 0],
                  }),
                },
                {
                  rotate: phoneAnim.interpolate({
                    inputRange: [0, 0.7, 1],
                    outputRange: ['8deg', '-1deg', '0deg'],
                  }),
                },
                {
                  scale: phoneAnim.interpolate({
                    inputRange: [0, 0.85, 1],
                    outputRange: [0.85, 1.02, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <MockiPhoneFrame width={PHONE_WIDTH}>
            <VideoView
              player={player}
              style={styles.video}
              contentFit="cover"
              nativeControls={false}
            />
          </MockiPhoneFrame>
        </Animated.View>

        {/* Body text */}
        <Animated.View
          style={[
            styles.bodyRow,
            { opacity: bodyAnim },
          ]}
        >
          <Check size={18} color={colors.onboarding.gold} strokeWidth={3} />
          <Text style={styles.bodyText}>No payment due now</Text>
        </Animated.View>
      </View>

      {/* CTA Section */}
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
          <Text style={styles.ctaButtonText}>Try for $0</Text>
        </TouchableOpacity>

        {/* Anchor Price */}
        <Animated.Text
          style={[styles.anchorPrice, { opacity: priceAnim }]}
        >
          Just {yearlyPrice} ($4.08/mo)
        </Animated.Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  } as ViewStyle,
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 140,
  } as ViewStyle,
  headline: {
    fontSize: 34,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 42,
    marginBottom: 24,
  } as TextStyle,
  phoneContainer: {
    marginBottom: 24,
    shadowColor: colors.onboarding.gold,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  } as ViewStyle,
  video: {
    width: '100%',
    height: '100%',
  } as ViewStyle,
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  } as ViewStyle,
  bodyText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
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
  anchorPrice: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 12,
  } as TextStyle,
});

export default PrimingScreenOne;
