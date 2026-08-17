import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, Image, type ViewStyle } from 'react-native';
import { AnimatedLogo } from './AnimatedLogo';
import { colors } from '@/constants/colors';

interface SplashFlowProps {
  onComplete: () => void;
}

const { width, height } = Dimensions.get('window');

export function SplashFlow({ onComplete }: SplashFlowProps) {
  const [phase, setPhase] = useState<'static' | 'animated' | 'fade'>('static');
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const logoOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Phase 1: Show static logo briefly (800ms)
    const staticTimer = setTimeout(() => {
      // Fade out static logo
      Animated.timing(logoOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        // Phase 2: Show animated logo
        setPhase('animated');
      });
    }, 800);

    return () => clearTimeout(staticTimer);
  }, []);

  // The animated phase advances only when the video reports playToEnd. If the
  // video fails to load, or the event never fires, the splash would sit there
  // forever with no error. Cap it so the app always reaches the first screen.
  useEffect(() => {
    if (phase !== 'animated') return;
    const cap = setTimeout(() => handleAnimationComplete(), 4000);
    return () => clearTimeout(cap);
  }, [phase]);

  const handleAnimationComplete = () => {
    // Phase 3: Fade out entire splash
    setPhase('fade');
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      onComplete();
    });
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {phase === 'static' && (
        <Animated.View style={[styles.logoContainer, { opacity: logoOpacity }]}>
          <Image
            source={require('@/assets/images/pokergpt_logo.png')}
            style={styles.staticLogo}
            resizeMode="contain"
          />
        </Animated.View>
      )}
      {phase === 'animated' && (
        <View style={styles.animatedContainer}>
          <AnimatedLogo
            variant={1}
            size="large"
            onFinish={handleAnimationComplete}
          />
        </View>
      )}
      {phase === 'fade' && (
        <View style={styles.animatedContainer}>
          <AnimatedLogo
            variant={1}
            size="large"
          />
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  } as ViewStyle,
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  staticLogo: {
    width: 200,
    height: 200,
  },
  animatedContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
});

export default SplashFlow;
