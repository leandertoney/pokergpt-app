import React, { useEffect, useRef, useState } from 'react';
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
import { Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';

const HERO_IMAGE_URL = 'https://bollujxjsgahswigmyvq.supabase.co/storage/v1/object/public/assets/onboarding/identity_screen.png?v=2';

type GoalTimelineScreenProps = {
  onComplete: (timeline: string) => void;
};

type Option = {
  label: string;
  value: string;
  description: string;
};

const OPTIONS: Option[] = [
  { label: 'Within a month', value: '1month', description: "I'm ready to go all in" },
  { label: 'Within 3 months', value: '3months', description: 'Steady and focused' },
  { label: 'Within 6 months', value: '6months', description: 'Building a solid foundation' },
  { label: 'No rush', value: 'no_rush', description: 'Just getting better every session' },
];

export function GoalTimelineScreen({ onComplete }: GoalTimelineScreenProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const headlineAnim = useRef(new Animated.Value(0)).current;
  const itemAnims = useRef(OPTIONS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    animateIn();
  }, []);

  const animateIn = () => {
    // Reset animations
    headlineAnim.setValue(0);
    itemAnims.forEach(anim => anim.setValue(0));

    // Headline entrance
    Animated.spring(headlineAnim, {
      toValue: 1,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();

    // Staggered items
    itemAnims.forEach((anim, index) => {
      setTimeout(() => {
        Animated.spring(anim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }).start();
      }, 150 + index * 70);
    });
  };

  const handleSelect = (value: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedOption(value);

    // Brief delay to show selection, then auto-advance
    setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onComplete(value);
    }, 350);
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
          style={[
            styles.headlineContainer,
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
          <Text style={styles.headline}>How fast do you want to get there?</Text>
          <Text style={styles.subheadline}>We'll build your plan around this</Text>
        </Animated.View>

        {/* Option Cards */}
        <View style={styles.optionsContainer}>
          {OPTIONS.map((option, index) => {
            const isSelected = selectedOption === option.value;
            return (
              <Animated.View
                key={option.value}
                style={{
                  opacity: itemAnims[index],
                  transform: [
                    {
                      translateY: itemAnims[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                }}
              >
                <TouchableOpacity
                  style={[
                    styles.optionCard,
                    isSelected && styles.optionCardSelected,
                  ]}
                  onPress={() => handleSelect(option.value)}
                  activeOpacity={0.7}
                >
                  {/* Text Content */}
                  <View style={styles.optionText}>
                    <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                      {option.label}
                    </Text>
                    <Text style={styles.optionDescription}>{option.description}</Text>
                  </View>

                  {/* Check Circle - Right Side */}
                  <View style={[styles.checkCircle, isSelected && styles.checkCircleSelected]}>
                    {isSelected && (
                      <Check size={16} color="#000" strokeWidth={3} />
                    )}
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
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
    top: -120,
    left: 0,
    right: 0,
    height: '50%',
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
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
  } as ViewStyle,
  headlineContainer: {
    marginBottom: 28,
  } as ViewStyle,
  headline: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 36,
  } as TextStyle,
  subheadline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 8,
  } as TextStyle,
  optionsContainer: {
    gap: 12,
  } as ViewStyle,
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 16,
    paddingHorizontal: 18,
  } as ViewStyle,
  optionCardSelected: {
    backgroundColor: 'rgba(212, 168, 75, 0.12)',
    borderColor: colors.onboarding.gold,
  } as ViewStyle,
  optionText: {
    flex: 1,
  } as ViewStyle,
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  } as TextStyle,
  optionLabelSelected: {
    color: colors.onboarding.gold,
  } as TextStyle,
  optionDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 3,
  } as TextStyle,
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 14,
  } as ViewStyle,
  checkCircleSelected: {
    backgroundColor: colors.onboarding.gold,
    borderColor: colors.onboarding.gold,
  } as ViewStyle,
});

export default GoalTimelineScreen;
