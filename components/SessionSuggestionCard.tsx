import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';
import type { SuggestedSession } from '@/types/session';

interface SessionSuggestionCardProps {
  suggestion: SuggestedSession;
  onAccept: () => void;
  onDismiss: () => void;
}

function formatDateRange(startTime: number, endTime: number): string {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const now = new Date();

  const isToday = start.toDateString() === now.toDateString();
  const isYesterday = start.toDateString() === new Date(now.getTime() - 86400000).toDateString();

  const dateStr = isToday ? 'Today' : isYesterday ? 'Yesterday' : start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  const startHour = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const endHour = end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return `${dateStr}, ${startHour} - ${endHour}`;
}

function formatDuration(startTime: number, endTime: number): string {
  const durationMs = endTime - startTime;
  const hours = Math.floor(durationMs / 3600000);
  const minutes = Math.floor((durationMs % 3600000) / 60000);

  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

export function SessionSuggestionCard({
  suggestion,
  onAccept,
  onDismiss,
}: SessionSuggestionCardProps) {
  const handCount = suggestion.handIds.length;
  const dateRange = formatDateRange(suggestion.estimatedStartTime, suggestion.estimatedEndTime);
  const duration = formatDuration(suggestion.estimatedStartTime, suggestion.estimatedEndTime);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(232, 184, 74, 0.15)', 'rgba(232, 184, 74, 0.05)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="sparkles" size={18} color={colors.accent.gold} />
          </View>
          <Text style={styles.title}>Session Detected</Text>
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={onDismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={18} color={colors.text.muted} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.description}>
            We found <Text style={styles.highlight}>{handCount} hands</Text> that look like they're from the same session
          </Text>

          <View style={styles.metadata}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={14} color={colors.text.muted} />
              <Text style={styles.metaText}>{dateRange}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color={colors.text.muted} />
              <Text style={styles.metaText}>{duration}</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.dismissTextButton}
            onPress={onDismiss}
          >
            <Text style={styles.dismissText}>Not a session</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.acceptButton}
            onPress={onAccept}
          >
            <Ionicons name="layers-outline" size={16} color={colors.text.dark} />
            <Text style={styles.acceptText}>Create Session</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(232, 184, 74, 0.3)',
  } as ViewStyle,
  gradient: {
    padding: 16,
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  } as ViewStyle,
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(232, 184, 74, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  } as ViewStyle,
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.accent.gold,
  } as TextStyle,
  dismissButton: {
    padding: 4,
  } as ViewStyle,
  content: {
    marginBottom: 16,
  } as ViewStyle,
  description: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: 12,
  } as TextStyle,
  highlight: {
    color: colors.text.primary,
    fontWeight: '600',
  } as TextStyle,
  metadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  } as ViewStyle,
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  } as ViewStyle,
  metaText: {
    fontSize: 13,
    color: colors.text.muted,
  } as TextStyle,
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  } as ViewStyle,
  dismissTextButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  } as ViewStyle,
  dismissText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.muted,
  } as TextStyle,
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.accent.gold,
  } as ViewStyle,
  acceptText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.dark,
  } as TextStyle,
});

export default SessionSuggestionCard;
