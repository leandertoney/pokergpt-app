import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';
import type { Stakes, TableType, CreateSessionPayload } from '@/types/session';
import { STAKES_OPTIONS, TABLE_TYPE_OPTIONS } from '@/types/session';

interface CreateSessionModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (payload: CreateSessionPayload) => void;
}

export function CreateSessionModal({
  visible,
  onClose,
  onConfirm,
}: CreateSessionModalProps) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [stakes, setStakes] = useState<Stakes | undefined>(undefined);
  const [customStakes, setCustomStakes] = useState('');
  const [buyIn, setBuyIn] = useState('');
  const [location, setLocation] = useState('');
  const [tableType, setTableType] = useState<TableType | undefined>(undefined);
  const [notes, setNotes] = useState('');

  const resetForm = () => {
    setName('');
    setStakes(undefined);
    setCustomStakes('');
    setBuyIn('');
    setLocation('');
    setTableType(undefined);
    setNotes('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleConfirm = () => {
    const payload: CreateSessionPayload = {
      name: name.trim() || undefined,
      stakes,
      customStakes: stakes === 'custom' ? customStakes.trim() : undefined,
      buyIn: buyIn ? parseInt(buyIn, 10) : undefined,
      location: location.trim() || undefined,
      tableType,
      notes: notes.trim() || undefined,
    };
    onConfirm(payload);
    resetForm();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        >
          <View
            style={[
              styles.modalContainer,
              { paddingBottom: Math.max(insets.bottom, 16) },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <BlurView intensity={80} tint="dark" style={styles.blurContainer}>
              <View style={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                  <Text style={styles.title}>New Session</Text>
                  <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color={colors.text.muted} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.scrollView}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* Session Name */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Session Name (optional)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={name}
                      onChangeText={setName}
                      placeholder="e.g., Friday Night at Bellagio"
                      placeholderTextColor={colors.text.muted}
                      returnKeyType="next"
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
                          style={[
                            styles.chip,
                            stakes === option && styles.chipActive,
                          ]}
                          onPress={() => setStakes(stakes === option ? undefined : option)}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              stakes === option && styles.chipTextActive,
                            ]}
                          >
                            {option}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    {stakes === 'custom' && (
                      <TextInput
                        style={[styles.textInput, styles.customStakesInput]}
                        value={customStakes}
                        onChangeText={setCustomStakes}
                        placeholder="Enter stakes (e.g., 5/10/25)"
                        placeholderTextColor={colors.text.muted}
                      />
                    )}
                  </View>

                  {/* Table Type */}
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
                          style={[
                            styles.chip,
                            tableType === option && styles.chipActive,
                          ]}
                          onPress={() => setTableType(tableType === option ? undefined : option)}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              tableType === option && styles.chipTextActive,
                            ]}
                          >
                            {option}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  {/* Buy-In */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Buy-In</Text>
                    <View style={styles.buyInContainer}>
                      <Text style={styles.dollarSign}>$</Text>
                      <TextInput
                        style={[styles.textInput, styles.buyInInput]}
                        value={buyIn}
                        onChangeText={(text) => setBuyIn(text.replace(/[^0-9]/g, ''))}
                        placeholder="0"
                        placeholderTextColor={colors.text.muted}
                        keyboardType="number-pad"
                      />
                    </View>
                  </View>

                  {/* Location */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Location (optional)</Text>
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
                    <Text style={styles.label}>Notes (optional)</Text>
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
                </ScrollView>

                {/* Action Buttons */}
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleClose}
                  >
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={handleConfirm}
                  >
                    <Ionicons name="add" size={20} color={colors.text.dark} />
                    <Text style={styles.confirmText}>Create Session</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </BlurView>
          </View>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  } as ViewStyle,
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  } as ViewStyle,
  modalContainer: {
    maxHeight: '85%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  } as ViewStyle,
  blurContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  } as ViewStyle,
  content: {
    backgroundColor: 'rgba(45, 18, 18, 0.95)',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(232, 184, 74, 0.2)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  } as ViewStyle,
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.text.primary,
  } as TextStyle,
  closeButton: {
    padding: 4,
  } as ViewStyle,
  scrollView: {
    maxHeight: 400,
    paddingHorizontal: 20,
  } as ViewStyle,
  inputGroup: {
    marginTop: 20,
  } as ViewStyle,
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  } as ViewStyle,
  chipActive: {
    backgroundColor: colors.accent.gold,
    borderColor: colors.accent.gold,
  } as ViewStyle,
  chipText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: colors.text.muted,
  } as TextStyle,
  chipTextActive: {
    color: colors.text.dark,
  } as TextStyle,
  customStakesInput: {
    marginTop: 12,
  } as TextStyle,
  buyInContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,
  dollarSign: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: colors.accent.gold,
    marginRight: 8,
  } as TextStyle,
  buyInInput: {
    flex: 1,
  } as TextStyle,
  notesInput: {
    minHeight: 80,
    paddingTop: 14,
  } as TextStyle,
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  } as ViewStyle,
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  } as ViewStyle,
  cancelText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text.muted,
  } as TextStyle,
  confirmButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.accent.gold,
  } as ViewStyle,
  confirmText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text.dark,
  } as TextStyle,
});

export default CreateSessionModal;
