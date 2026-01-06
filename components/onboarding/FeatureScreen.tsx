import React, { useEffect, useRef, type ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { ChevronUp } from 'lucide-react-native';
import { colors } from '@/constants/colors';

type FeatureScreenProps = {
  icon?: ReactNode;
  headline: string;
  subheadline?: string;
  description: string;
  buttonText: string;
  onNext: () => void;
  children?: ReactNode;
};

export function FeatureScreen({
  icon,
  headline,
  subheadline,
  description,
  buttonText,
  onNext,
  children,
}: FeatureScreenProps) {
  const iconAnim = useRef(new Animated.Value(0)).current;
  const headlineAnim = useRef(new Animated.Value(0)).current;
  const descAnim = useRef(new Animated.Value(0)).current;
  const childrenAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Icon bounces in
    Animated.spring(iconAnim, {
      toValue: 1,
      tension: 50,
      friction: 6,
      useNativeDriver: true,
    }).start();

    // Headline slides up
    setTimeout(() => {
      Animated.spring(headlineAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }, 150);

    // Description fades in
    setTimeout(() => {
      Animated.timing(descAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, 350);

    // Children (custom content) fades in
    setTimeout(() => {
      Animated.spring(childrenAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }, 450);

    // Swipe hint with pulsing animation
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
    }, 550);
  }, []);

  return (
    <View style={styles.container}>
      {/* Icon */}
      {icon && (
        <Animated.View
          style={[
            styles.iconContainer,
            {
              opacity: iconAnim,
              transform: [
                {
                  scale: iconAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.5, 1.1, 1],
                  }),
                },
              ],
            },
          ]}
        >
          {icon}
        </Animated.View>
      )}

      {/* Headline */}
      <Animated.View
        style={{
          opacity: headlineAnim,
          transform: [
            {
              translateY: headlineAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
        }}
      >
        <Text style={styles.headline}>{headline}</Text>
        {subheadline && <Text style={styles.subheadline}>{subheadline}</Text>}
      </Animated.View>

      {/* Description */}
      <Animated.Text
        style={[
          styles.description,
          {
            opacity: descAnim,
          },
        ]}
      >
        {description}
      </Animated.Text>

      {/* Custom children content */}
      {children && (
        <Animated.View
          style={[
            styles.childrenContainer,
            {
              opacity: childrenAnim,
              transform: [
                {
                  translateY: childrenAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {children}
        </Animated.View>
      )}

      {/* Swipe Hint */}
      <Animated.View
        style={[
          styles.swipeHint,
          {
            opacity: buttonAnim,
          },
        ]}
      >
        <ChevronUp size={24} color="rgba(255,255,255,0.5)" />
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
    paddingHorizontal: 32,
  } as ViewStyle,
  iconContainer: {
    marginBottom: 32,
  } as ViewStyle,
  headline: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 40,
  } as TextStyle,
  subheadline: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 40,
  } as TextStyle,
  description: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 16,
    paddingHorizontal: 16,
  } as TextStyle,
  childrenContainer: {
    marginTop: 32,
    width: '100%',
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

export default FeatureScreen;
