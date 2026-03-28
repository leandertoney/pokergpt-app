import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/colors';
import { useDailyReviewCard } from '@/hooks/useDailyReview';

export function DailyReviewCard() {
  const router = useRouter();
  const { streak, bestStreak, hasReviewed, isLoading, totalReviewed, accuracy } = useDailyReviewCard();

  const handlePress = () => {
    router.push('/daily-review');
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#1A2F1A', '#0D1F0D']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradient, styles.loadingGradient]}
        >
          <ActivityIndicator color={colors.onboarding.profit} />
        </LinearGradient>
      </View>
    );
  }

  const handleFullHandPress = () => {
    router.push('/full-hand-review');
  };

  // Different content based on whether user has reviewed today
  if (hasReviewed) {
    const motivationalMessage = streak >= 7
      ? "You're on fire! Keep dominating!"
      : streak >= 3
        ? "Building momentum!"
        : "Great start! Come back tomorrow!";

    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#1A2F1A', '#0D1F0D']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {/* Completed state - celebratory */}
          <View style={styles.completedCelebration}>
            {/* Big streak display */}
            <View style={styles.bigStreakDisplay}>
              <Text style={styles.bigFireEmoji}>🔥</Text>
              <Text style={styles.bigStreakNumber}>{streak}</Text>
              <Text style={styles.streakDaysLabel}>day streak</Text>
            </View>

            {/* Motivational text */}
            <Text style={styles.motivationalText}>{motivationalMessage}</Text>

            {/* Stats row */}
            <View style={styles.statsRow}>
              {bestStreak > streak && (
                <Text style={styles.bestStreakText}>Best: {bestStreak} days</Text>
              )}
              {accuracy > 0 && (
                <Text style={styles.accuracyText}>{accuracy}% accuracy</Text>
              )}
            </View>

            {/* Checkmark badge */}
            <View style={styles.completedBadge}>
              <Text style={styles.checkmarkText}>✓</Text>
              <Text style={styles.completedBadgeText}>Done for today</Text>
            </View>

            {/* Full Hand Training option */}
            <TouchableOpacity
              style={styles.fullHandButton}
              onPress={handleFullHandPress}
              activeOpacity={0.8}
            >
              <Text style={styles.fullHandButtonText}>🎯 Full Hand Training</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  }

  // New user vs returning user content
  const isNewUser = totalReviewed === 0;

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress} activeOpacity={0.85}>
      <LinearGradient
        colors={['#1A2F1A', '#0D1F0D']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Streak badge */}
        {streak > 0 && (
          <View style={styles.streakRow}>
            <Text style={styles.fireEmoji}>🔥</Text>
            <Text style={styles.streakText}>{streak}-Day Streak</Text>
          </View>
        )}

        {/* Main content */}
        <View style={styles.mainContent}>
          <Text style={styles.title}>
            {isNewUser ? 'Daily Training' : 'Daily Review'}
          </Text>
          <Text style={styles.subtitle}>
            {isNewUser
              ? "Sharpen your instincts in 60 seconds"
              : "Review a hand and level up"
            }
          </Text>
        </View>

        {/* CTA Button */}
        <View style={styles.ctaButton}>
          <Text style={styles.ctaText}>
            {isNewUser ? 'Start' : 'Review'}
          </Text>
          <Text style={styles.ctaArrow}>→</Text>
        </View>

        {/* Subtle glow effect */}
        <View style={styles.glowOverlay} />
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  gradient: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    position: 'relative',
  },
  loadingGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fireEmoji: {
    fontSize: 18,
  },
  streakText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onboarding.profit,
    marginLeft: 6,
  },
  mainContent: {
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    opacity: 0.9,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.onboarding.profit,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
    alignSelf: 'flex-start',
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ctaArrow: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  glowOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.1)',
    pointerEvents: 'none',
  },
  // Completed state styles - compact celebratory
  completedCelebration: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  bigStreakDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  bigFireEmoji: {
    fontSize: 24,
  },
  bigStreakNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.onboarding.profit,
    marginHorizontal: 6,
  },
  streakDaysLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  motivationalText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 6,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  bestStreakText: {
    fontSize: 13,
    color: colors.text.muted,
  },
  accuracyText: {
    fontSize: 13,
    color: colors.onboarding.profit,
    fontWeight: '600',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  checkmarkText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onboarding.profit,
  },
  completedBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.onboarding.profit,
  },
  fullHandButton: {
    marginTop: 10,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  fullHandButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onboarding.gold,
  },
});

export default DailyReviewCard;
