import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';
import type { Session } from '@/types/session';

interface AddToSessionSheetProps {
  visible: boolean;
  onClose: () => void;
  sessions: Session[];
  currentSessionId?: string;
  onSelectSession: (sessionId: string) => void;
  onCreateNew: () => void;
  onRemoveFromSession?: () => void;
}

function formatSessionDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
}

export function AddToSessionSheet({
  visible,
  onClose,
  sessions,
  currentSessionId,
  onSelectSession,
  onCreateNew,
  onRemoveFromSession,
}: AddToSessionSheetProps) {
  const currentSession = sessions.find(s => s.id === currentSessionId);
  const otherSessions = sessions.filter(s => s.id !== currentSessionId);

  const handleSelectSession = (sessionId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectSession(sessionId);
  };

  const handleCreateNew = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onCreateNew();
  };

  const handleRemove = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onRemoveFromSession?.();
  };

  const renderSessionItem = ({ item }: { item: Session }) => {
    const sessionName = item.name || `Session on ${formatSessionDate(item.startTime)}`;
    const isCurrentSession = item.id === currentSessionId;

    return (
      <TouchableOpacity
        style={[styles.sessionItem, isCurrentSession && styles.sessionItemCurrent]}
        onPress={() => !isCurrentSession && handleSelectSession(item.id)}
        disabled={isCurrentSession}
        activeOpacity={0.7}
      >
        <View style={styles.sessionIcon}>
          <Ionicons
            name={isCurrentSession ? 'checkmark-circle' : 'layers-outline'}
            size={22}
            color={isCurrentSession ? colors.accent.gold : colors.text.muted}
          />
        </View>
        <View style={styles.sessionInfo}>
          <Text style={[styles.sessionName, isCurrentSession && styles.sessionNameCurrent]}>
            {sessionName}
          </Text>
          <Text style={styles.sessionMeta}>
            {item.handIds.length} hands
            {item.stakes && ` · ${item.stakes === 'custom' ? item.customStakes : item.stakes}`}
          </Text>
        </View>
        {isCurrentSession && (
          <View style={styles.currentBadge}>
            <Text style={styles.currentBadgeText}>Current</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.sheet}>
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Add to Session</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text.muted} />
            </TouchableOpacity>
          </View>

          {/* Current Session Notice */}
          {currentSession && (
            <View style={styles.currentSessionNotice}>
              <Ionicons name="information-circle" size={18} color={colors.accent.gold} />
              <Text style={styles.currentSessionText}>
                Currently in "{currentSession.name || `Session on ${formatSessionDate(currentSession.startTime)}`}"
              </Text>
            </View>
          )}

          {/* Session List */}
          {otherSessions.length > 0 ? (
            <FlatList
              data={otherSessions}
              keyExtractor={(item) => item.id}
              renderItem={renderSessionItem}
              style={styles.sessionList}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="layers-outline" size={40} color={colors.text.muted} />
              <Text style={styles.emptyText}>
                {currentSession ? 'No other sessions available' : 'No sessions yet'}
              </Text>
              <Text style={styles.emptySubtext}>Create a new session to get started</Text>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            {currentSession && onRemoveFromSession && (
              <TouchableOpacity
                style={styles.removeButton}
                onPress={handleRemove}
              >
                <Ionicons name="remove-circle-outline" size={20} color={colors.utility.error} />
                <Text style={styles.removeText}>Remove from Session</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.createButton}
              onPress={handleCreateNew}
            >
              <Ionicons name="add" size={20} color={colors.text.dark} />
              <Text style={styles.createText}>Create New Session</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  } as ViewStyle,
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  } as ViewStyle,
  sheet: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '70%',
  } as ViewStyle,
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: colors.background.tertiary,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  } as ViewStyle,
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
  } as TextStyle,
  closeButton: {
    position: 'absolute',
    right: 0,
    padding: 4,
  } as ViewStyle,
  currentSessionNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(232, 184, 74, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  } as ViewStyle,
  currentSessionText: {
    flex: 1,
    fontSize: 14,
    color: colors.accent.gold,
  } as TextStyle,
  sessionList: {
    maxHeight: 250,
  } as ViewStyle,
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
  } as ViewStyle,
  sessionItemCurrent: {
    opacity: 0.6,
  } as ViewStyle,
  sessionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  } as ViewStyle,
  sessionInfo: {
    flex: 1,
  } as ViewStyle,
  sessionName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  } as TextStyle,
  sessionNameCurrent: {
    color: colors.accent.gold,
  } as TextStyle,
  sessionMeta: {
    fontSize: 13,
    color: colors.text.muted,
  } as TextStyle,
  currentBadge: {
    backgroundColor: 'rgba(232, 184, 74, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  } as ViewStyle,
  currentBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accent.gold,
  } as TextStyle,
  separator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  } as ViewStyle,
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  } as ViewStyle,
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.secondary,
    marginTop: 12,
  } as TextStyle,
  emptySubtext: {
    fontSize: 14,
    color: colors.text.muted,
    marginTop: 4,
  } as TextStyle,
  actions: {
    gap: 12,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  } as ViewStyle,
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  } as ViewStyle,
  removeText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.utility.error,
  } as TextStyle,
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.accent.gold,
  } as ViewStyle,
  createText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.dark,
  } as TextStyle,
});

export default AddToSessionSheet;
