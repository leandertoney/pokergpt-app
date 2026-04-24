import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ScrollView,
  Modal,
  Image,
  type ViewStyle,
  type TextStyle,
  type ImageStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';
import { TRAINING_HANDS } from '@/data/trainingHands';
import type { ExperienceLevel } from '@/types/poker';
import type { TrainingHand } from '@/types/dailyReview';

const HERO_IMAGE_URL = 'https://bollujxjsgahswigmyvq.supabase.co/storage/v1/object/public/assets/onboarding/skill_level.png?v=2';

type SkillLevelScreenProps = {
  onComplete: (level: ExperienceLevel) => void;
};

type SkillOption = {
  level: ExperienceLevel;
  label: string;
  description: string;
  badgeColor: string;
  badgeBgColor: string;
  trainingHandId: string;
};

const SKILL_OPTIONS: SkillOption[] = [
  {
    level: 'beginner',
    label: 'Beginner',
    description: 'Learning the basics of poker strategy',
    badgeColor: '#22C55E',
    badgeBgColor: 'rgba(34, 197, 94, 0.15)',
    trainingHandId: 'training-1', // Pocket Aces
  },
  {
    level: 'intermediate',
    label: 'Intermediate',
    description: 'Comfortable with pot odds and position play',
    badgeColor: colors.onboarding.gold,
    badgeBgColor: 'rgba(232, 184, 74, 0.15)',
    trainingHandId: 'training-6', // Flush draw
  },
  {
    level: 'advanced',
    label: 'Advanced',
    description: 'Exploits opponents and makes thin value plays',
    badgeColor: '#EF4444',
    badgeBgColor: 'rgba(239, 68, 68, 0.15)',
    trainingHandId: 'training-11', // River bluff spot
  },
];

// Mini card component for hand preview
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

export function SkillLevelScreen({ onComplete }: SkillLevelScreenProps) {
  const [previewHand, setPreviewHand] = useState<TrainingHand | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<ExperienceLevel | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const cardAnims = useRef(SKILL_OPTIONS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // Initial fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    // Stagger card animations
    cardAnims.forEach((anim, index) => {
      setTimeout(() => {
        Animated.spring(anim, {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }).start();
      }, 200 + index * 150);
    });
  }, []);

  const handlePreview = (trainingHandId: string) => {
    const hand = TRAINING_HANDS.find(h => h.id === trainingHandId);
    if (hand) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setPreviewHand(hand);
    }
  };

  const handleSelect = (level: ExperienceLevel) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedLevel(level);

    // Brief delay to show selection, then complete
    setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onComplete(level);
    }, 300);
  };

  const closePreview = () => {
    setPreviewHand(null);
  };

  return (
    <View style={styles.container}>
      {/* Full-screen Hero Image */}
      <View style={styles.heroContainer}>
        <Image
          source={{ uri: HERO_IMAGE_URL }}
          style={styles.heroImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(26, 5, 5, 0.7)', colors.background.primary]}
          locations={[0, 0.5, 0.85]}
          style={styles.heroGradient}
        />
      </View>

      <View style={styles.contentWrapper}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Header */}
          <Text style={styles.subheadline}>Set Your Challenge Level</Text>
          <Text style={styles.headline}>What level fits you best?</Text>
          <Text style={styles.description}>
            Tap any card to preview an example hand
          </Text>

          {/* Skill level cards */}
          <ScrollView
            style={styles.cardsContainer}
            contentContainerStyle={styles.cardsContent}
            showsVerticalScrollIndicator={false}
          >
          {SKILL_OPTIONS.map((option, index) => (
            <Animated.View
              key={option.level}
              style={[
                {
                  opacity: cardAnims[index],
                  transform: [
                    {
                      translateY: cardAnims[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [30, 0],
                      }),
                    },
                    {
                      scale: cardAnims[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.9, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.skillCard,
                  { borderColor: option.badgeColor },
                  selectedLevel === option.level && styles.skillCardSelected,
                ]}
                onPress={() => handleSelect(option.level)}
                activeOpacity={0.85}
              >
                {/* Badge */}
                <View style={[styles.levelBadge, { backgroundColor: option.badgeBgColor }]}>
                  <Text style={[styles.levelBadgeText, { color: option.badgeColor }]}>
                    {option.label.toUpperCase()}
                  </Text>
                </View>

                {/* Description */}
                <Text style={styles.cardDescription}>{option.description}</Text>

                {/* Preview button */}
                <TouchableOpacity
                  style={[styles.previewButton, { borderColor: option.badgeColor }]}
                  onPress={() => handlePreview(option.trainingHandId)}
                >
                  <Text style={[styles.previewButtonText, { color: option.badgeColor }]}>
                    See Example
                  </Text>
                </TouchableOpacity>
              </TouchableOpacity>
            </Animated.View>
          ))}
          </ScrollView>
        </Animated.View>
      </View>

      {/* Hand Preview Modal */}
      <Modal
        visible={previewHand !== null}
        transparent
        animationType="fade"
        onRequestClose={closePreview}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Close button */}
            <TouchableOpacity style={styles.closeButton} onPress={closePreview}>
              <X size={24} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>

            {previewHand && (
              <>
                {/* Difficulty badge */}
                <View
                  style={[
                    styles.previewBadge,
                    previewHand.difficulty === 'beginner' && styles.previewBadgeBeginner,
                    previewHand.difficulty === 'intermediate' && styles.previewBadgeIntermediate,
                    previewHand.difficulty === 'advanced' && styles.previewBadgeAdvanced,
                  ]}
                >
                  <Text style={styles.previewBadgeText}>
                    {previewHand.difficulty.toUpperCase()}
                  </Text>
                </View>

                {/* Cards */}
                <View style={styles.previewCardsRow}>
                  {previewHand.heroHand.split(' ').filter(c => c.length > 0).map((card, idx) => (
                    <MiniCard key={idx} card={card} />
                  ))}
                </View>

                {/* Position info */}
                <Text style={styles.previewPosition}>
                  Position: {previewHand.heroPosition} vs {previewHand.villainPosition}
                </Text>

                {/* Board (if any) */}
                {previewHand.board && (
                  <View style={styles.previewBoardSection}>
                    <Text style={styles.previewBoardLabel}>Board:</Text>
                    <Text style={styles.previewBoardText}>{previewHand.board}</Text>
                  </View>
                )}

                {/* Action */}
                <View style={styles.previewActionBox}>
                  <Text style={styles.previewActionText}>{previewHand.villainAction}</Text>
                  <Text style={styles.previewPot}>Pot: ${previewHand.potSize}</Text>
                </View>

                {/* Question */}
                <Text style={styles.previewQuestion}>What would you do here?</Text>

                {/* Dismiss hint */}
                <Text style={styles.dismissHint}>Tap outside to close</Text>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const miniCardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.card,
    borderRadius: 6,
    width: 44,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  rank: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A0505',
  },
  suit: {
    fontSize: 16,
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
    bottom: 0,
  } as ViewStyle,
  heroImage: {
    width: '100%',
    height: '100%',
  } as ImageStyle,
  heroGradient: {
    position: 'absolute',
    top: -120,
    left: 0,
    right: 0,
    bottom: 0,
  } as ViewStyle,
  contentWrapper: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  } as ViewStyle,
  content: {
    flex: 1,
  } as ViewStyle,
  subheadline: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 8,
  } as TextStyle,
  headline: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  } as TextStyle,
  description: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 24,
  } as TextStyle,
  cardsContainer: {
    flex: 1,
  } as ViewStyle,
  cardsContent: {
    paddingBottom: 40,
    gap: 16,
  } as ViewStyle,
  skillCard: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    alignItems: 'center',
  } as ViewStyle,
  skillCardSelected: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  } as ViewStyle,
  levelBadge: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginBottom: 12,
  } as ViewStyle,
  levelBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  } as TextStyle,
  cardDescription: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  } as TextStyle,
  previewButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
  } as ViewStyle,
  previewButtonText: {
    fontSize: 14,
    fontWeight: '600',
  } as TextStyle,
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  } as ViewStyle,
  modalContent: {
    backgroundColor: colors.background.secondary,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  } as ViewStyle,
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  previewBadge: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 20,
  } as ViewStyle,
  previewBadgeBeginner: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  } as ViewStyle,
  previewBadgeIntermediate: {
    backgroundColor: 'rgba(232, 184, 74, 0.2)',
  } as ViewStyle,
  previewBadgeAdvanced: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  } as ViewStyle,
  previewBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
  } as TextStyle,
  previewCardsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  } as ViewStyle,
  previewPosition: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 12,
  } as TextStyle,
  previewBoardSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  } as ViewStyle,
  previewBoardLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  } as TextStyle,
  previewBoardText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  } as TextStyle,
  previewActionBox: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  } as ViewStyle,
  previewActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.onboarding.gold,
    marginBottom: 4,
  } as TextStyle,
  previewPot: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  } as TextStyle,
  previewQuestion: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  } as TextStyle,
  dismissHint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
  } as TextStyle,
});

export default SkillLevelScreen;
