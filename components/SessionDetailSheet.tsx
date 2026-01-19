import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';
import type { Session, Stakes, TableType, UpdateSessionPayload } from '@/types/session';
import { STAKES_OPTIONS, TABLE_TYPE_OPTIONS, formatResult, formatElapsedTime } from '@/types/session';
import type { StoredHand } from '@/types/poker';

interface SessionDetailSheetProps {
  visible: boolean;
  session: Session | null;
  hands: StoredHand[];
  onClose: () => void;
  onUpdate: (updates: UpdateSessionPayload) => void;
  onRemoveHand: (handId: string) => void;
  onDelete: () => void;
}

function formatSessionDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
}

function formatDuration(startTime: number, endTime?: number): string {
  const end = endTime || Date.now();
  const durationMs = end - startTime;
  return formatElapsedTime(durationMs);
}

export function SessionDetailSheet({
  visible,
  session,
  hands,
  onClose,
  onUpdate,
  onRemoveHand,
  onDelete,
}: SessionDetailSheetProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [stakes, setStakes] = useState<Stakes | undefined>(undefined);
  const [customStakes, setCustomStakes] = useState('');
  const [buyIn, setBuyIn] = useState('');
  const [cashOut, setCashOut] = useState('');
  const [location, setLocation] = useState('');
  const [tableType, setTableType] = useState<TableType | undefined>(undefined);
  const [notes, setNotes] = useState('');

  // Sync form state when session changes
  useEffect(() => {
    if (session) {
      setName(session.name || '');
      setStakes(session.stakes);
      setCustomStakes(session.customStakes || '');
      setBuyIn(session.buyIn?.toString() || '');
      setCashOut(session.cashOut?.toString() || '');
      setLocation(session.location || '');
      setTableType(session.tableType);
      setNotes(session.notes || '');
    }
  }, [session]);

  const handleSave = () => {
    const buyInNum = buyIn ? parseInt(buyIn, 10) : undefined;
    const cashOutNum = cashOut ? parseInt(cashOut, 10) : undefined;

    // Calculate result if both buy-in and cash-out are provided
    let result = session?.result;
    if (buyInNum !== undefined && cashOutNum !== undefined) {
      result = cashOutNum - buyInNum;
    }

    onUpdate({
      name: name.trim() || undefined,
      stakes,
      customStakes: stakes === 'custom' ? customStakes.trim() : undefined,
      buyIn: buyInNum,
      cashOut: cashOutNum,
      result,
      location: location.trim() || undefined,
      tableType,
      notes: notes.trim() || undefined,
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsEditing(false);
  };

  const handleDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onDelete();
  };

  const handleRemoveHand = (handId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onRemoveHand(handId);
  };

  if (!session) return null;

  const sessionName = session.name || `Session on ${formatSessionDate(session.startTime)}`;
  const hasResult = session.result !== undefined && session.result !== null;
  const isProfit = hasResult && (session.result ?? 0) >= 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
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
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="chevron-down" size={24} color={colors.text.muted} />
              </TouchableOpacity>
              <Text style={styles.title} numberOfLines={1}>
                {isEditing ? 'Edit Session' : sessionName}
              </Text>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => isEditing ? handleSave() : setIsEditing(true)}
              >
                <Text style={styles.editButtonText}>
                  {isEditing ? 'Save' : 'Edit'}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.content}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {isEditing ? (
                // Edit Mode
                <>
                  {/* Session Name */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Session Name</Text>
                    <TextInput
                      style={styles.textInput}
                      value={name}
                      onChangeText={setName}
                      placeholder="e.g., Friday Night at Bellagio"
                      placeholderTextColor={colors.text.muted}
                    />
                  </View>

                  {/* Stakes */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Stakes</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.chipsContainer}
                    >
                      {STAKES_OPTIONS.map((option) => (
                        <TouchableOpacity
                          key={option}
                          style={[styles.chip, stakes === option && styles.chipActive]}
                          onPress={() => setStakes(stakes === option ? undefined : option)}
                        >
                          <Text style={[styles.chipText, stakes === option && styles.chipTextActive]}>
                            {option}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  {/* Game Type */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Game Type</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.chipsContainer}
                    >
                      {TABLE_TYPE_OPTIONS.map((option) => (
                        <TouchableOpacity
                          key={option}
                          style={[styles.chip, tableType === option && styles.chipActive]}
                          onPress={() => setTableType(tableType === option ? undefined : option)}
                        >
                          <Text style={[styles.chipText, tableType === option && styles.chipTextActive]}>
                            {option}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  {/* Buy-In & Cash-Out */}
                  <View style={styles.rowInputs}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.label}>Buy-In</Text>
                      <View style={styles.moneyInput}>
                        <Text style={styles.dollarSign}>$</Text>
                        <TextInput
                          style={[styles.textInput, styles.moneyTextInput]}
                          value={buyIn}
                          onChangeText={(text) => setBuyIn(text.replace(/[^0-9]/g, ''))}
                          placeholder="0"
                          placeholderTextColor={colors.text.muted}
                          keyboardType="number-pad"
                        />
                      </View>
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.label}>Cash-Out</Text>
                      <View style={styles.moneyInput}>
                        <Text style={styles.dollarSign}>$</Text>
                        <TextInput
                          style={[styles.textInput, styles.moneyTextInput]}
                          value={cashOut}
                          onChangeText={(text) => setCashOut(text.replace(/[^0-9]/g, ''))}
                          placeholder="0"
                          placeholderTextColor={colors.text.muted}
                          keyboardType="number-pad"
                        />
                      </View>
                    </View>
                  </View>

                  {/* Location */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Location</Text>
                    <TextInput
                      style={styles.textInput}
                      value={location}
                      onChangeText={setLocation}
                      placeholder="Casino or venue name"
                      placeholderTextColor={colors.text.muted}
                    />
                  </View>

                  {/* Notes */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Notes</Text>
                    <TextInput
                      style={[styles.textInput, styles.notesInput]}
                      value={notes}
                      onChangeText={setNotes}
                      placeholder="Any notes about this session..."
                      placeholderTextColor={colors.text.muted}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>
                </>
              ) : (
                // View Mode
                <>
                  {/* Summary Stats */}
                  <View style={styles.summary}>
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>Duration</Text>
                      <Text style={styles.summaryValue}>
                        {formatDuration(session.startTime, session.endTime)}
                      </Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>Hands</Text>
                      <Text style={styles.summaryValue}>{hands.length}</Text>
                    </View>
                    {hasResult && (
                      <>
                        <View style={styles.summaryDivider} />
                        <View style={styles.summaryItem}>
                          <Text style={styles.summaryLabel}>Result</Text>
                          <Text style={[
                            styles.summaryValue,
                            isProfit ? styles.profitText : styles.lossText
                          ]}>
                            {formatResult(session.result!)}
                          </Text>
                        </View>
                      </>
                    )}
                  </View>

                  {/* Session Details */}
                  <View style={styles.detailsSection}>
                    <Text style={styles.sectionTitle}>Details</Text>

                    {session.stakes && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Stakes</Text>
                        <Text style={styles.detailValue}>
                          {session.stakes === 'custom' ? session.customStakes : session.stakes}
                        </Text>
                      </View>
                    )}

                    {session.tableType && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Game Type</Text>
                        <Text style={styles.detailValue}>{session.tableType}</Text>
                      </View>
                    )}

                    {session.buyIn !== undefined && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Buy-In</Text>
                        <Text style={styles.detailValue}>${session.buyIn}</Text>
                      </View>
                    )}

                    {session.cashOut !== undefined && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Cash-Out</Text>
                        <Text style={styles.detailValue}>${session.cashOut}</Text>
                      </View>
                    )}

                    {session.location && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Location</Text>
                        <Text style={styles.detailValue}>{session.location}</Text>
                      </View>
                    )}

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Date</Text>
                      <Text style={styles.detailValue}>
                        {formatSessionDate(session.startTime)}
                      </Text>
                    </View>

                    {session.notes && (
                      <View style={[styles.detailRow, styles.detailRowVertical]}>
                        <Text style={styles.detailLabel}>Notes</Text>
                        <Text style={[styles.detailValue, styles.notesValue]}>
                          {session.notes}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Hands List */}
                  {hands.length > 0 && (
                    <View style={styles.handsSection}>
                      <Text style={styles.sectionTitle}>Hands ({hands.length})</Text>
                      {hands.map((hand) => (
                        <View key={hand.handData.id} style={styles.handItem}>
                          <View style={styles.handInfo}>
                            <Text style={styles.handCards}>
                              {hand.handData.heroHand?.toUpperCase()}
                            </Text>
                            <Text style={styles.handPosition}>
                              {hand.handData.heroPosition}
                              {hand.handData.villainPosition && ` vs ${hand.handData.villainPosition}`}
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={styles.removeHandButton}
                            onPress={() => hand.handData.id && handleRemoveHand(hand.handData.id)}
                          >
                            <Ionicons name="close-circle" size={22} color={colors.text.muted} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}
            </ScrollView>

            {/* Delete Button */}
            {!isEditing && (
              <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={18} color={colors.utility.error} />
                <Text style={styles.deleteText}>Delete Session</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  } as ViewStyle,
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
    paddingBottom: 40,
    maxHeight: '90%',
  } as ViewStyle,
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: colors.background.tertiary,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  } as ViewStyle,
  closeButton: {
    padding: 4,
  } as ViewStyle,
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    marginHorizontal: 16,
  } as TextStyle,
  editButton: {
    padding: 4,
  } as ViewStyle,
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.accent.gold,
  } as TextStyle,
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  } as ViewStyle,
  summary: {
    flexDirection: 'row',
    backgroundColor: colors.background.tertiary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  } as ViewStyle,
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  } as ViewStyle,
  summaryLabel: {
    fontSize: 12,
    color: colors.text.muted,
    marginBottom: 4,
  } as TextStyle,
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  } as TextStyle,
  summaryDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 8,
  } as ViewStyle,
  profitText: {
    color: colors.onboarding.profit,
  } as TextStyle,
  lossText: {
    color: colors.utility.error,
  } as TextStyle,
  detailsSection: {
    marginBottom: 24,
  } as ViewStyle,
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  } as ViewStyle,
  detailRowVertical: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 6,
  } as ViewStyle,
  detailLabel: {
    fontSize: 15,
    color: colors.text.muted,
  } as TextStyle,
  detailValue: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
  } as TextStyle,
  notesValue: {
    fontWeight: '400',
    lineHeight: 22,
  } as TextStyle,
  handsSection: {
    marginBottom: 24,
  } as ViewStyle,
  handItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  } as ViewStyle,
  handInfo: {
    flex: 1,
  } as ViewStyle,
  handCards: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  } as TextStyle,
  handPosition: {
    fontSize: 13,
    color: colors.text.muted,
  } as TextStyle,
  removeHandButton: {
    padding: 4,
  } as ViewStyle,
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  } as ViewStyle,
  deleteText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.utility.error,
  } as TextStyle,
  // Edit mode styles
  inputGroup: {
    marginBottom: 20,
  } as ViewStyle,
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 8,
  } as TextStyle,
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  } as TextStyle,
  chipsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  } as ViewStyle,
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  } as ViewStyle,
  chipActive: {
    backgroundColor: colors.accent.gold,
    borderColor: colors.accent.gold,
  } as ViewStyle,
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.muted,
  } as TextStyle,
  chipTextActive: {
    color: colors.text.dark,
  } as TextStyle,
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  } as ViewStyle,
  moneyInput: {
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,
  dollarSign: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.accent.gold,
    marginRight: 8,
  } as TextStyle,
  moneyTextInput: {
    flex: 1,
  } as TextStyle,
  notesInput: {
    minHeight: 80,
    paddingTop: 14,
  } as TextStyle,
});

export default SessionDetailSheet;
