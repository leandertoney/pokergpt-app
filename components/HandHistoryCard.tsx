import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import type { HandData, AnalysisResult } from '@/types/poker';
import { colors } from '@/constants/colors';

interface HandHistoryCardProps {
  handData: HandData;
  analysis: AnalysisResult;
  createdAt: string;
  onPress: () => void;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function formatHeroHand(hand?: string): string {
  if (!hand) return '??';
  // Add card suit symbols if not present
  return hand.toUpperCase();
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 80) return colors.success;
  if (confidence >= 60) return colors.accent.gold;
  return colors.accent.primary;
}

export function HandHistoryCard({ handData, analysis, createdAt, onPress }: HandHistoryCardProps) {
  const heroHand = formatHeroHand(handData.heroHand);
  const position = handData.heroPosition || '??';
  const villainPos = handData.villainPosition;
  const positionDisplay = villainPos ? `${position} vs ${villainPos}` : position;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.leftSection}>
        <View style={styles.handDisplay}>
          <Text style={styles.heroHand}>{heroHand}</Text>
        </View>

        <View style={styles.detailsSection}>
          <Text style={styles.positionText}>{positionDisplay}</Text>
          <Text style={styles.recommendation} numberOfLines={1}>
            {analysis.recommendedAction}
          </Text>
          <Text style={styles.timestamp}>{formatRelativeTime(createdAt)}</Text>
        </View>
      </View>

      <View style={styles.rightSection}>
        <View style={[styles.confidenceBadge, { backgroundColor: colors.withOpacity(getConfidenceColor(analysis.confidence), 0.2) }]}>
          <Text style={[styles.confidenceText, { color: getConfidenceColor(analysis.confidence) }]}>
            {analysis.confidence}%
          </Text>
        </View>
        <ChevronRight size={20} color={colors.text.muted} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.background.tertiary,
  } as ViewStyle,
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  } as ViewStyle,
  handDisplay: {
    backgroundColor: colors.background.tertiary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 12,
    minWidth: 70,
    alignItems: 'center',
  } as ViewStyle,
  heroHand: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.text.primary,
    letterSpacing: 1,
  } as TextStyle,
  detailsSection: {
    flex: 1,
  } as ViewStyle,
  positionText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.accent.primary,
    marginBottom: 4,
  } as TextStyle,
  recommendation: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: 4,
  } as TextStyle,
  timestamp: {
    fontSize: 11,
    color: colors.text.muted,
  } as TextStyle,
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  } as ViewStyle,
  confidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  } as ViewStyle,
  confidenceText: {
    fontSize: 12,
    fontWeight: '600' as const,
  } as TextStyle,
});
