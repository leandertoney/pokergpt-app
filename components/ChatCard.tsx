import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MessageCircle } from 'lucide-react-native';
import { colors } from '@/constants/colors';

interface ChatCardProps {
  id: string;
  title: string;
  preview: string;
  messageCount: number;
  createdAt: number;
  updatedAt: number;
  onPress: () => void;
  onLongPress?: () => void;
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function ChatCard({
  title,
  preview,
  messageCount,
  updatedAt,
  onPress,
  onLongPress,
}: ChatCardProps) {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={['#2D1212', '#1A0808']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Chat Icon */}
        <View style={styles.iconContainer}>
          <MessageCircle size={24} color={colors.accent.primary} />
        </View>

        {/* Text Content */}
        <View style={styles.textContent}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.preview} numberOfLines={2}>
            {preview}
          </Text>

          {/* Metadata Row */}
          <View style={styles.metaRow}>
            <Text style={styles.messageCount}>
              {messageCount} {messageCount === 1 ? 'message' : 'messages'}
            </Text>
            <Text style={styles.separator}>·</Text>
            <Text style={styles.timestamp}>{formatRelativeTime(updatedAt)}</Text>
          </View>
        </View>
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
    borderColor: 'rgba(230, 51, 51, 0.15)',
    flexDirection: 'row',
    alignItems: 'flex-start',
  } as ViewStyle,
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 58, 58, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  } as ViewStyle,
  textContent: {
    flex: 1,
  } as ViewStyle,
  title: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text.primary,
    marginBottom: 4,
  } as TextStyle,
  preview: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 6,
    lineHeight: 18,
  } as TextStyle,
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,
  messageCount: {
    fontSize: 12,
    color: colors.accent.primary,
    fontWeight: '500' as const,
  } as TextStyle,
  separator: {
    fontSize: 12,
    color: colors.text.muted,
    marginHorizontal: 6,
  } as TextStyle,
  timestamp: {
    fontSize: 12,
    color: colors.text.muted,
  } as TextStyle,
});

export default ChatCard;
