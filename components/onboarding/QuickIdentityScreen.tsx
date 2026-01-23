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
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';

const HERO_IMAGE_URL = 'https://bollujxjsgahswigmyvq.supabase.co/storage/v1/object/public/assets/onboarding/identity_screen.png?v=2';

type QuickIdentityScreenProps = {
  onComplete: (playStyle: string, goal: string) => void;
};

type Question = {
  title: string;
  subtitle: string;
  options: {
    emoji: string;
    label: string;
    value: string;
    description: string;
  }[];
};

const QUESTIONS: Question[] = [
  {
    title: 'How do you like to play?',
    subtitle: 'Tap to choose your style',
    options: [
      { emoji: '🦈', label: 'The Shark', value: 'shark', description: 'Reads and exploits' },
      { emoji: '📊', label: 'The Analyst', value: 'analyst', description: 'GTO and math' },
      { emoji: '⚡', label: 'The Grinder', value: 'grinder', description: 'Volume player' },
      { emoji: '📚', label: 'The Student', value: 'student', description: 'Always learning' },
    ],
  },
  {
    title: "What's your main goal?",
    subtitle: 'One more tap',
    options: [
      { emoji: '💰', label: 'Make Money', value: 'profit', description: 'Build bankroll' },
      { emoji: '🏆', label: 'Win More', value: 'win', description: 'Beat opponents' },
      { emoji: '🧠', label: 'Get Smarter', value: 'learn', description: 'Master strategy' },
      { emoji: '😌', label: 'Play Better', value: 'confidence', description: 'Trust decisions' },
    ],
  },
];

export function QuickIdentityScreen({ onComplete }: QuickIdentityScreenProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [playStyle, setPlayStyle] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const headlineAnim = useRef(new Animated.Value(0)).current;
  const cardAnims = useRef(QUESTIONS[0].options.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    animateIn();
  }, [currentQuestion]);

  const animateIn = () => {
    // Reset animations
    headlineAnim.setValue(0);
    cardAnims.forEach(anim => anim.setValue(0));
    fadeAnim.setValue(1);

    // Headline entrance
    Animated.spring(headlineAnim, {
      toValue: 1,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();

    // Staggered cards
    cardAnims.forEach((anim, index) => {
      setTimeout(() => {
        Animated.spring(anim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }).start();
      }, 150 + index * 80);
    });
  };

  const handleSelect = (value: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedOption(value);

    // Brief delay to show selection
    setTimeout(() => {
      if (currentQuestion === 0) {
        // First question - save and move to next
        setPlayStyle(value);

        // Fade out
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          setCurrentQuestion(1);
          setSelectedOption(null);
        });
      } else {
        // Second question - complete
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onComplete(playStyle!, value);
      }
    }, 300);
  };

  const question = QUESTIONS[currentQuestion];

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
          <Text style={styles.headline}>{question.title}</Text>
          <Text style={styles.subheadline}>{question.subtitle}</Text>
        </Animated.View>

        {/* Cards Grid */}
        <View style={styles.cardsGrid}>
          {question.options.map((option, index) => {
            const isSelected = selectedOption === option.value;
            return (
              <Animated.View
                key={option.value}
                style={[
                  styles.cardWrapper,
                  {
                    opacity: cardAnims[index],
                    transform: [
                      {
                        scale: cardAnims[index].interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.8, 1],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.card,
                    isSelected && styles.cardSelected,
                  ]}
                  onPress={() => handleSelect(option.value)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.cardEmoji}>{option.emoji}</Text>
                  <Text style={[styles.cardLabel, isSelected && styles.cardLabelSelected]}>
                    {option.label}
                  </Text>
                  <Text style={styles.cardDescription}>{option.description}</Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
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
    paddingHorizontal: 24,
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
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginTop: 48,
    paddingHorizontal: 8,
  } as ViewStyle,
  cardWrapper: {
    width: '45%',
  } as ViewStyle,
  card: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  } as ViewStyle,
  cardSelected: {
    borderColor: colors.onboarding.gold,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  } as ViewStyle,
  cardEmoji: {
    fontSize: 40,
    marginBottom: 12,
  } as TextStyle,
  cardLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  } as TextStyle,
  cardLabelSelected: {
    color: colors.onboarding.gold,
  } as TextStyle,
  cardDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginTop: 4,
  } as TextStyle,
});

export default QuickIdentityScreen;
