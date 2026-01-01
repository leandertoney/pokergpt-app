import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  type ViewStyle,
} from 'react-native';
import { AnimatedLogo } from '@/components/AnimatedLogo';

type IntroScreenProps = {
  onNext: () => void;
  autoAdvanceDelay?: number;
};

/**
 * Pure splash screen - just the animated logo.
 * Auto-advances after the video completes.
 */
export function IntroScreen({
  onNext,
  autoAdvanceDelay = 2800,
}: IntroScreenProps) {
  useEffect(() => {
    // Auto-advance after logo animation completes
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
        <AnimatedLogo variant={1} size="large" loop={false} />
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
});

export default IntroScreen;
