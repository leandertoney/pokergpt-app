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
import { Bell } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { colors } from '@/constants/colors';

type NotificationScreenProps = {
  onComplete: (enabled: boolean) => void;
};

export function NotificationScreen({ onComplete }: NotificationScreenProps) {
  const iconAnim = useRef(new Animated.Value(0)).current;
  const headlineAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;
  const skipAnim = useRef(new Animated.Value(0)).current;

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

    // Bell icon entrance
    setTimeout(() => {
      Animated.spring(iconAnim, {
        toValue: 1,
        tension: 60,
        friction: 7,
        useNativeDriver: true,
      }).start();
    }, 400);

    // Button
    setTimeout(() => {
      Animated.spring(buttonAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }, 700);

    // Skip link
    setTimeout(() => {
      Animated.timing(skipAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, 900);
  }, []);

  const handleEnable = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      onComplete(status === 'granted');
    } catch {
      onComplete(false);
    }
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onComplete(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Headline first */}
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
          Stay on track with{'\n'}daily tips & reminders
        </Animated.Text>

        {/* Bell Icon - large, centered */}
        <Animated.View
          style={[
            styles.iconContainer,
            {
              opacity: iconAnim,
              transform: [
                {
                  scale: iconAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <Bell size={64} color={colors.onboarding.gold} />
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
          onPress={handleEnable}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaButtonText}>Enable Notifications</Text>
        </TouchableOpacity>

        <Animated.View style={{ opacity: skipAnim }}>
          <TouchableOpacity
            onPress={handleSkip}
            activeOpacity={0.6}
            style={styles.skipButton}
          >
            <Text style={styles.skipText}>Not now</Text>
          </TouchableOpacity>
        </Animated.View>
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
    paddingHorizontal: 24,
    paddingBottom: 80,
  } as ViewStyle,
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(212, 168, 75, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  headline: {
    fontSize: 34,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 44,
    marginBottom: 48,
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
  skipButton: {
    marginTop: 16,
    paddingVertical: 8,
  } as ViewStyle,
  skipText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.4)',
  } as TextStyle,
});

export default NotificationScreen;
