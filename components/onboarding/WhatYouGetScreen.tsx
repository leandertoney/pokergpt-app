import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { ChevronRight, Crown, Mic, BarChart3, Zap, DollarSign } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';

type WhatYouGetScreenProps = {
  onComplete: () => void;
};

const FEATURES = [
  { icon: DollarSign, title: 'Session profit tracking', color: colors.onboarding.profit },
  { icon: Mic, title: 'Voice input', color: colors.onboarding.gold },
  { icon: BarChart3, title: 'Learning progress', color: colors.onboarding.data },
  { icon: Zap, title: 'Unlimited analysis', color: colors.onboarding.gold },
];

export function WhatYouGetScreen({ onComplete }: WhatYouGetScreenProps) {
  const crownAnim = useRef(new Animated.Value(0)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;
  const itemAnims = useRef(FEATURES.map(() => new Animated.Value(0))).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;
  const footerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Crown bounce in
    Animated.spring(crownAnim, {
      toValue: 1,
      tension: 50,
      friction: 6,
      useNativeDriver: true,
    }).start();

    // Title
    setTimeout(() => {
      Animated.spring(titleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }, 200);

    // Features staggered
    itemAnims.forEach((anim, index) => {
      setTimeout(() => {
        Animated.spring(anim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }).start();
      }, 400 + index * 100);
    });

    // Button
    setTimeout(() => {
      Animated.spring(buttonAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }, 900);

    // Footer
    setTimeout(() => {
      Animated.timing(footerAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, 1100);
  }, []);

  const handlePress = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onComplete();
  };

  return (
    <View style={styles.container}>
      {/* Crown Header */}
      <Animated.View
        style={[
          styles.crownContainer,
          {
            opacity: crownAnim,
            transform: [
              {
                scale: crownAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.5, 1.1, 1],
                }),
              },
            ],
          },
        ]}
      >
        <Crown size={48} color={colors.onboarding.gold} />
      </Animated.View>

      {/* Title */}
      <Animated.View
        style={{
          opacity: titleAnim,
          transform: [
            {
              translateY: titleAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
        }}
      >
        <Text style={styles.title}>Your Edge</Text>
      </Animated.View>

      {/* Features List */}
      <View style={styles.featuresList}>
        {FEATURES.map((feature, index) => {
          const IconComponent = feature.icon;
          return (
            <Animated.View
              key={feature.title}
              style={[
                styles.featureRow,
                {
                  opacity: itemAnims[index],
                  transform: [
                    {
                      translateX: itemAnims[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [-30, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={[styles.featureIcon, { backgroundColor: `${feature.color}20` }]}>
                <IconComponent size={22} color={feature.color} />
              </View>
              <Text style={styles.featureText}>{feature.title}</Text>
            </Animated.View>
          );
        })}
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
          style={styles.button}
          onPress={handlePress}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Let's Go</Text>
          <ChevronRight size={20} color="#000" />
        </TouchableOpacity>
      </Animated.View>

      {/* Footer */}
      <Animated.Text
        style={[
          styles.footerText,
          {
            opacity: footerAnim,
          },
        ]}
      >
        Free to start.
      </Animated.Text>
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
  crownContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  } as ViewStyle,
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 40,
  } as TextStyle,
  featuresList: {
    width: '100%',
    gap: 16,
  } as ViewStyle,
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  } as ViewStyle,
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  featureText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  } as TextStyle,
  buttonContainer: {
    position: 'absolute',
    bottom: 100,
    left: 24,
    right: 24,
  } as ViewStyle,
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent.primary,
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 14,
    gap: 8,
  } as ViewStyle,
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  } as TextStyle,
  footerText: {
    position: 'absolute',
    bottom: 60,
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  } as TextStyle,
});

export default WhatYouGetScreen;
