import React, { useEffect, useRef } from 'react';
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
import { getOnboardingDemoHand } from '@/services/dailyReviewService';

const HERO_IMAGE_URL = 'https://bollujxjsgahswigmyvq.supabase.co/storage/v1/object/public/assets/onboarding/training_hands.png?v=2';

type DailyReviewDemoScreenProps = {
  onNext: () => void;
};

// Card display component
function MiniCard({ card }: { card: string }) {
  const suits = ['♠', '♥', '♦', '♣'];
  let rank = card;
  let suit = '';

  for (const s of suits) {
    if (card.includes(s)) {
      rank = card.replace(s, '');
      suit = s;
      break;
    }
  }

  const isRed = suit === '♥' || suit === '♦';

  return (
    <View style={miniCardStyles.card}>
      <Text style={[miniCardStyles.rank, isRed && miniCardStyles.redText]}>{rank}</Text>
      <Text style={[miniCardStyles.suit, isRed && miniCardStyles.redText]}>{suit}</Text>
    </View>
  );
}

export function DailyReviewDemoScreen({ onNext }: DailyReviewDemoScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;

  const demoHand = getOnboardingDemoHand();
  const cards = demoHand.heroHand.split(' ').filter(c => c.length > 0);

  // Card dealing animations - one for each card
  const cardAnims = useRef(cards.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // Initial animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Deal cards with staggered animation
    cardAnims.forEach((anim, index) => {
      setTimeout(() => {
        Animated.spring(anim, {
          toValue: 1,
          tension: 80,
          friction: 8,
          useNativeDriver: true,
        }).start();
        // Haptic feedback for each card dealt
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }, 400 + index * 150); // Start after fade-in, 150ms between cards
    });

    // Start button pulse after cards dealt
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
    }, 400 + cards.length * 150 + 300); // After all cards dealt
  }, []);

  const handleTryNow = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onNext();
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

      <View style={styles.introContent}>
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Subheadline */}
          <Text style={styles.subheadline}>Daily Training</Text>

          {/* Demo card preview - Now bigger and more prominent */}
          <View style={styles.demoPreview}>
            <View style={styles.miniCardsRow}>
              {cards.map((card, index) => (
                <Animated.View
                  key={index}
                  style={{
                    opacity: cardAnims[index],
                    transform: [
                      {
                        translateX: cardAnims[index].interpolate({
                          inputRange: [0, 1],
                          outputRange: [-100, 0],
                        }),
                      },
                      {
                        rotate: cardAnims[index].interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: ['-15deg', '3deg', '0deg'],
                        }),
                      },
                      {
                        scale: cardAnims[index].interpolate({
                          inputRange: [0, 0.8, 1],
                          outputRange: [0.5, 1.05, 1],
                        }),
                      },
                    ],
                  }}
                >
                  <MiniCard card={card} />
                </Animated.View>
              ))}
            </View>
            <Text style={styles.previewQuestion}>What would you do?</Text>
          </View>

          {/* Headline - Now smaller and below the card */}
          <Text style={styles.headline}>Sharpen your edge daily</Text>

          <Text style={styles.description}>
            A new poker spot every day.{'\n'}
            Pick your play, get instant feedback on why.
          </Text>

          {/* Try Now Button */}
          <TouchableOpacity
            style={styles.tryButton}
            onPress={handleTryNow}
            activeOpacity={0.85}
          >
            <Text style={styles.tryButtonText}>Continue</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const miniCardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.card,
    borderRadius: 8,
    width: 56,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
  },
  rank: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A0505',
  },
  suit: {
    fontSize: 20,
    marginTop: -2,
    color: '#1A0505',
  },
  redText: {
    color: '#E63333',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  } as ViewStyle,
  heroContainer: {
    position: 'absolute',
    top: -120,
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
  introContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: 120,
  } as ViewStyle,
  content: {
    alignItems: 'center',
  } as ViewStyle,
  subheadline: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 16,
  } as TextStyle,
  headline: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  } as TextStyle,
  description: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  } as TextStyle,
  demoPreview: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.25)',
  } as ViewStyle,
  miniCardsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  } as ViewStyle,
  previewQuestion: {
    fontSize: 18,
    color: colors.onboarding.profit,
    fontWeight: '700',
  } as TextStyle,
  tryButton: {
    backgroundColor: colors.onboarding.profit,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 30,
  } as ViewStyle,
  tryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  } as TextStyle,
});

export default DailyReviewDemoScreen;
