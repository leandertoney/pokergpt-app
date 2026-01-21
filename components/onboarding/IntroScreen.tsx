import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  type ViewStyle,
  type ImageStyle,
} from 'react-native';

type IntroScreenProps = {
  onNext: () => void;
  autoAdvanceDelay?: number;
};

/**
 * Pure splash screen - just the static logo.
 * Auto-advances after a brief delay.
 */
export function IntroScreen({
  onNext,
  autoAdvanceDelay = 1500,
}: IntroScreenProps) {
  useEffect(() => {
    // Auto-advance after brief delay
    const timer = setTimeout(onNext, autoAdvanceDelay);
    return () => clearTimeout(timer);
  }, [onNext, autoAdvanceDelay]);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onNext}
      activeOpacity={1}
    >
      <View style={styles.logoContainer}>
        <Image
          source={require('@/assets/images/pokergpt_logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  logo: {
    width: 120,
    height: 120,
  } as ImageStyle,
});

export default IntroScreen;
