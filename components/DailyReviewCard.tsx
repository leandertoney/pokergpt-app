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

  // Different content based on whether user has reviewed today
  if (hasReviewed) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#1A2F1A', '#0D1F0D']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {/* Completed state */}
          <View style={styles.completedContent}>
            <View style={styles.streakBadge}>
              <Text style={styles.fireEmoji}>🔥</Text>
              <Text style={styles.streakNumber}>{streak}</Text>
            </View>

            <View style={styles.completedText}>
              <Text style={styles.completedTitle}>Today's review complete!</Text>
              <Text style={styles.completedSubtitle}>
                {streak > 1 ? `${streak}-day streak` : 'Come back tomorrow'}
                {accuracy > 0 && ` · ${accuracy}% accuracy`}
              </Text>
            </View>

            <View style={styles.checkmark}>
              <Text style={styles.checkmarkText}>✓</Text>
            </View>
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
  // Completed state styles
  completedContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    marginRight: 12,
  },
  streakNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.onboarding.profit,
    marginLeft: 4,
  },
  completedText: {
    flex: 1,
  },
  completedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  completedSubtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 2,
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.onboarding.profit,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default DailyReviewCard;
