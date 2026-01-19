import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';
import type { Session } from '@/types/session';
import { formatResult, formatElapsedTime } from '@/types/session';

interface SessionCardProps {
  session: Session;
  handCount: number;
  isExpanded?: boolean;
  onPress: () => void;
  onToggleExpand?: () => void;
}

function formatSessionDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - timestamp;
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

function formatDuration(startTime: number, endTime?: number): string {
  const end = endTime || Date.now();
  const durationMs = end - startTime;
  const hours = Math.floor(durationMs / 3600000);
  const minutes = Math.floor((durationMs % 3600000) / 60000);

  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

export function SessionCard({
  session,
  handCount,
  isExpanded = false,
  onPress,
  onToggleExpand,
}: SessionCardProps) {
  const sessionName = session.name || `Session on ${formatSessionDate(session.startTime)}`;
  const hasResult = session.result !== undefined && session.result !== null;
  const isProfit = hasResult && (session.result ?? 0) >= 0;
  const duration = formatDuration(session.startTime, session.endTime);

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      <LinearGradient
        colors={['#2D1212', '#1A0808']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="layers-outline" size={28} color={colors.accent.gold} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Session Name */}
          <Text style={styles.sessionName} numberOfLines={1}>
            {sessionName}
          </Text>

          {/* Metadata Row */}
          <View style={styles.metaRow}>
            {/* Hand count */}
            <View style={styles.metaItem}>
              <Ionicons name="copy-outline" size={12} color={colors.text.muted} />
              <Text style={styles.metaText}>{handCount} hands</Text>
            </View>

            <Text style={styles.separator}>·</Text>

            {/* Duration */}
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={12} color={colors.text.muted} />
              <Text style={styles.metaText}>{duration}</Text>
            </View>

            {/* Stakes */}
            {session.stakes && (
              <>
                <Text style={styles.separator}>·</Text>
                <Text style={styles.metaText}>
                  {session.stakes === 'custom' ? session.customStakes : session.stakes}
                </Text>
              </>
            )}

            {/* Location */}
            {session.location && (
              <>
                <Text style={styles.separator}>·</Text>
                <View style={styles.metaItem}>
                  <Ionicons name="location-outline" size={12} color={colors.text.muted} />
                  <Text style={styles.metaText} numberOfLines={1}>{session.location}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Result Badge */}
        {hasResult && (
          <View style={[styles.resultBadge, isProfit ? styles.resultProfit : styles.resultLoss]}>
            <Text style={[styles.resultText, isProfit ? styles.resultTextProfit : styles.resultTextLoss]}>
              {formatResult(session.result!)}
            </Text>
          </View>
        )}

        {/* Expand/Collapse Button */}
        {onToggleExpand && handCount > 0 && (
          <TouchableOpacity
            style={styles.expandButton}
            onPress={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.text.muted}
            />
          </TouchableOpacity>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  } as ViewStyle,
  gradient: {
    padding: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(232, 184, 74, 0.25)',
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(232, 184, 74, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  } as ViewStyle,
  content: {
    flex: 1,
  } as ViewStyle,
  sessionName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text.primary,
    marginBottom: 4,
  } as TextStyle,
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  } as ViewStyle,
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  } as ViewStyle,
  metaText: {
    fontSize: 12,
    color: colors.text.muted,
  } as TextStyle,
  separator: {
    fontSize: 12,
    color: colors.text.muted,
    marginHorizontal: 6,
  } as TextStyle,
  resultBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  } as ViewStyle,
  resultProfit: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  } as ViewStyle,
  resultLoss: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  } as ViewStyle,
  resultText: {
    fontSize: 14,
    fontWeight: '700' as const,
  } as TextStyle,
  resultTextProfit: {
    color: colors.onboarding.profit,
  } as TextStyle,
  resultTextLoss: {
    color: colors.utility.error,
  } as TextStyle,
  expandButton: {
    padding: 4,
    marginLeft: 4,
  } as ViewStyle,
});

export default SessionCard;
