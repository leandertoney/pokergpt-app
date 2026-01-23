import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TextInput,
  TouchableOpacity,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Image,
  type ViewStyle,
  type TextStyle,
  type ImageStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';

const HERO_IMAGE_URL = 'https://bollujxjsgahswigmyvq.supabase.co/storage/v1/object/public/assets/onboarding/name_input.png?v=2';

type NameInputScreenProps = {
  onComplete: (name: string | null) => void;
};

export function NameInputScreen({ onComplete }: NameInputScreenProps) {
  const [name, setName] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headlineAnim = useRef(new Animated.Value(0)).current;
  const inputAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered entrance animations
    Animated.sequence([
      Animated.spring(fadeAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.spring(headlineAnim, {
      toValue: 1,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      Animated.spring(inputAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }, 200);

    setTimeout(() => {
      Animated.spring(buttonAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }, 400);
  }, []);

  const handleContinue = () => {
    Keyboard.dismiss();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const trimmedName = name.trim();
    onComplete(trimmedName.length > 0 ? trimmedName : null);
  };

  const handleSkip = () => {
    Keyboard.dismiss();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onComplete(null);
  };

  const isValidName = name.trim().length > 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
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

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
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
          <Text style={styles.headline}>What should we call you?</Text>
          <Text style={styles.subheadline}>
            We'll personalize your experience
          </Text>
        </Animated.View>

        {/* Input */}
        <Animated.View
          style={[
            styles.inputContainer,
            {
              opacity: inputAnim,
              transform: [
                {
                  scale: inputAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.9, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <TextInput
            style={[
              styles.input,
              isFocused && styles.inputFocused,
            ]}
            placeholder="Enter your name"
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={name}
            onChangeText={setName}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={30}
            returnKeyType="done"
            onSubmitEditing={isValidName ? handleContinue : undefined}
          />
        </Animated.View>

        {/* Buttons */}
        <Animated.View
          style={[
            styles.buttonsContainer,
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
            style={[
              styles.continueButton,
              !isValidName && styles.continueButtonDisabled,
            ]}
            onPress={handleContinue}
            activeOpacity={0.85}
            disabled={!isValidName}
          >
            <Text style={[
              styles.continueButtonText,
              !isValidName && styles.continueButtonTextDisabled,
            ]}>
              Continue
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            activeOpacity={0.7}
          >
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </KeyboardAvoidingView>
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
    paddingHorizontal: 32,
    paddingBottom: 80,
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
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginTop: 8,
  } as TextStyle,
  inputContainer: {
    width: '100%',
    marginTop: 48,
  } as ViewStyle,
  input: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 18,
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  } as TextStyle,
  inputFocused: {
    borderColor: colors.onboarding.gold,
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
  } as TextStyle,
  buttonsContainer: {
    width: '100%',
    marginTop: 32,
    gap: 16,
  } as ViewStyle,
  continueButton: {
    backgroundColor: colors.onboarding.gold,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  } as ViewStyle,
  continueButtonDisabled: {
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
  } as ViewStyle,
  continueButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
  } as TextStyle,
  continueButtonTextDisabled: {
    color: 'rgba(0, 0, 0, 0.5)',
  } as TextStyle,
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
  } as ViewStyle,
  skipButtonText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  } as TextStyle,
});

export default NameInputScreen;
