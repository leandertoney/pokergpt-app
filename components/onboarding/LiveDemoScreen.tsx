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
import { VoiceOrb, type VoiceOrbState } from '@/components/VoiceOrb';
import { colors } from '@/constants/colors';

const HERO_IMAGE_URL = 'https://bollujxjsgahswigmyvq.supabase.co/storage/v1/object/public/assets/onboarding/speak_your_hand.png?v=2';

// Card display component - centered rank + suit design
function MiniCard({ rank, suit, size = 'medium' }: { rank: string; suit: string; size?: 'small' | 'medium' }) {
  const suitSymbols: Record<string, string> = { s: '♠', h: '♥', d: '♦', c: '♣' };
  const suitSymbol = suitSymbols[suit] || suit;
  const isRed = suit === 'h' || suit === 'd';
  const isSmall = size === 'small';

  return (
    <View style={[miniCardStyles.card, isSmall && miniCardStyles.cardSmall]}>
      <Text style={[miniCardStyles.rank, isSmall && miniCardStyles.rankSmall, isRed && miniCardStyles.redText]}>{rank}</Text>
      <Text style={[miniCardStyles.suit, isSmall && miniCardStyles.suitSmall, isRed && miniCardStyles.redText]}>{suitSymbol}</Text>
    </View>
  );
}

type LiveDemoScreenProps = {
  onNext: () => void;
};

// Demo transcription text that appears word by word
const TRANSCRIPTION_TEXT = '"I had ace king suited... villain 3-bet to 45... pot was 120..."';

export function LiveDemoScreen({ onNext }: LiveDemoScreenProps) {
  const [orbState, setOrbState] = useState<VoiceOrbState>('idle');
  const [showCards, setShowCards] = useState(false);
  const [showBoard, setShowBoard] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [displayedText, setDisplayedText] = useState('');

  const titleAnim = useRef(new Animated.Value(0)).current;
  const transcriptAnim = useRef(new Animated.Value(0)).current;
  const handAnim = useRef(new Animated.Value(0)).current;
  const boardAnim = useRef(new Animated.Value(0)).current;
  const actionAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;

  // Animate transcription text word by word
  const animateTranscription = async () => {
    const words = TRANSCRIPTION_TEXT.split(' ');
    for (let i = 0; i < words.length; i++) {
      await delay(120); // Speed per word
      setDisplayedText(words.slice(0, i + 1).join(' '));

      // Show cards when we mention them
      if (i === 3) { // After "ace king suited"
        setShowCards(true);
        Animated.spring(handAnim, {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }).start();
      }
    }
  };

  useEffect(() => {
    // Start the demo sequence
    const sequence = async () => {
      // Phase 1: Show title
      Animated.spring(titleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();

      // Phase 2: Start listening immediately + show transcript area
      await delay(400);
      setOrbState('listening');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Animated.timing(transcriptAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Phase 3: Animate transcription text word by word (cards appear during this)
      await delay(300);
      await animateTranscription();

      // Phase 4: Show board cards after transcription
      await delay(300);
      setShowBoard(true);
      Animated.spring(boardAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }).start();

      // Phase 5: Show action context
      await delay(300);
      Animated.timing(actionAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      // Phase 6: Processing visual
      await delay(400);
      setOrbState('processing');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Phase 7: Show continue button (solid, no animation)
      await delay(800);
      setAnimationComplete(true);
      Animated.timing(buttonAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    };

    sequence();
  }, []);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const handlePress = () => {
    if (animationComplete) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onNext();
    }
  };

  return (
    <View style={styles.container}>
      {/* Hero Image at Top */}
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

      {/* Content Container */}
      <View style={styles.content}>
        {/* Title */}
        <Animated.Text
          style={[
            styles.title,
            {
              opacity: titleAnim,
              transform: [
                {
                  translateY: titleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          Just speak your hand
        </Animated.Text>

        <Animated.Text
          style={[
            styles.subtitle,
            {
              opacity: titleAnim,
            },
          ]}
        >
          Natural voice input for quick analysis
        </Animated.Text>

        {/* Voice Orb - Now at top to show this is voice-first */}
        <View style={styles.orbContainer}>
          <VoiceOrb state={orbState} size="small" />
        </View>

        {/* Live Transcription Text */}
        <Animated.View
          style={[
            styles.transcriptContainer,
            {
              opacity: transcriptAnim,
            },
          ]}
        >
          <Text style={styles.transcriptText}>
            {displayedText || '...'}
          </Text>
        </Animated.View>

        {/* Hand Display Card */}
        <Animated.View
          style={[
            styles.handCard,
            {
              opacity: handAnim,
              transform: [
                {
                  scale: handAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.9, 1],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Your Hand */}
          <View style={styles.handSection}>
            <Text style={styles.sectionLabel}>Your Hand</Text>
            <View style={styles.cardsRow}>
              {showCards && (
                <>
                  <MiniCard rank="A" suit="s" size="medium" />
                  <MiniCard rank="K" suit="h" size="medium" />
                </>
              )}
            </View>
          </View>

          {/* Board */}
          <Animated.View
            style={[
              styles.handSection,
              {
                opacity: boardAnim,
              },
            ]}
          >
            <Text style={styles.sectionLabel}>Flop</Text>
            <View style={styles.cardsRow}>
              {showBoard && (
                <>
                  <MiniCard rank="Q" suit="d" size="small" />
                  <MiniCard rank="J" suit="c" size="small" />
                  <MiniCard rank="3" suit="s" size="small" />
                </>
              )}
            </View>
          </Animated.View>

          {/* Action Context */}
          <Animated.View
            style={[
              styles.actionContext,
              {
                opacity: actionAnim,
              },
            ]}
          >
            <Text style={styles.actionText}>Villain 3-bets to $45</Text>
            <Text style={styles.potText}>Pot: $120</Text>
          </Animated.View>
        </Animated.View>
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
          style={styles.continueButton}
          onPress={handlePress}
          activeOpacity={0.85}
          disabled={!animationComplete}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
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
    paddingBottom: 140,
  } as ViewStyle,
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  } as TextStyle,
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 16,
  } as TextStyle,
  handCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
    width: '100%',
  } as ViewStyle,
  handSection: {
    marginBottom: 16,
  } as ViewStyle,
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  } as TextStyle,
  cardsRow: {
    flexDirection: 'row',
    gap: 8,
  } as ViewStyle,
  actionContext: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  } as ViewStyle,
  actionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  } as TextStyle,
  potText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onboarding.gold,
  } as TextStyle,
  orbContainer: {
    marginVertical: 12,
  } as ViewStyle,
  transcriptContainer: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    width: '100%',
    minHeight: 44,
  } as ViewStyle,
  transcriptText: {
    fontSize: 16,
    color: '#fff',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 22,
  } as TextStyle,
  buttonContainer: {
    position: 'absolute',
    bottom: 50,
    left: 24,
    right: 24,
  } as ViewStyle,
  continueButton: {
    backgroundColor: colors.onboarding.gold,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  } as ViewStyle,
  continueButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
  } as TextStyle,
});

// Mini card styles - centered rank + suit design
const miniCardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.card,
    borderRadius: 6,
    width: 48,
    height: 66,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  } as ViewStyle,
  cardSmall: {
    width: 38,
    height: 52,
  } as ViewStyle,
  rank: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
  } as TextStyle,
  rankSmall: {
    fontSize: 18,
  } as TextStyle,
  suit: {
    fontSize: 18,
    marginTop: -2,
    color: '#1A1A1A',
  } as TextStyle,
  suitSmall: {
    fontSize: 14,
  } as TextStyle,
  redText: {
    color: '#FF3A3A',
  } as TextStyle,
});

export default LiveDemoScreen;
