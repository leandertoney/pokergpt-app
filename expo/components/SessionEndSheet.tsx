import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { X, TrendingUp, TrendingDown, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';
import { formatElapsedTime } from '@/types/session';

interface SessionEndSheetProps {
  visible: boolean;
  elapsedMs: number;
  handCount: number;
  onCancel: () => void;
  onConfirm: (result: number) => void;
}

const NUMBER_PAD = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['00', '0', 'del'],
];

export function SessionEndSheet({
  visible,
  elapsedMs,
  handCount,
  onCancel,
  onConfirm,
}: SessionEndSheetProps) {
  const [amount, setAmount] = useState('0');
  const [isProfit, setIsProfit] = useState(true);

  const handleNumberPress = useCallback((value: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (value === 'del') {
      setAmount(prev => {
        if (prev.length <= 1) return '0';
        return prev.slice(0, -1);
      });
    } else if (value === '00') {
      setAmount(prev => {
        if (prev === '0') return '0';
        if (prev.length >= 6) return prev;
        return prev + '00';
      });
    } else {
      setAmount(prev => {
        if (prev === '0') return value;
        if (prev.length >= 6) return prev;
        return prev + value;
      });
    }
  }, []);

  const toggleSign = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsProfit(prev => !prev);
  }, []);

  const handleConfirm = useCallback(() => {
    const numAmount = parseInt(amount, 10) || 0;
    const result = isProfit ? numAmount : -numAmount;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onConfirm(result);
    // Reset state
    setAmount('0');
    setIsProfit(true);
  }, [amount, isProfit, onConfirm]);

  const handleCancel = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onCancel();
    // Reset state
    setAmount('0');
    setIsProfit(true);
  }, [onCancel]);

  const displayAmount = `${isProfit ? '+' : '-'}$${parseInt(amount, 10).toLocaleString()}`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>End Session</Text>
            <TouchableOpacity style={styles.closeButton} onPress={handleCancel}>
              <X size={20} color={colors.text.muted} />
            </TouchableOpacity>
          </View>

          {/* Session Summary */}
          <View style={styles.summary}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Duration</Text>
              <Text style={styles.summaryValue}>{formatElapsedTime(elapsedMs)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Hands</Text>
              <Text style={styles.summaryValue}>{handCount}</Text>
            </View>
          </View>

          {/* Result Input */}
          <Text style={styles.resultLabel}>Session Result</Text>
          <View style={styles.resultContainer}>
            <TouchableOpacity
              style={[styles.signButton, isProfit && styles.signButtonActive]}
              onPress={toggleSign}
            >
              <TrendingUp
                size={20}
                color={isProfit ? '#1A1A1A' : colors.text.muted}
              />
            </TouchableOpacity>
            <Text style={[styles.resultAmount, !isProfit && styles.resultAmountLoss]}>
              {displayAmount}
            </Text>
            <TouchableOpacity
              style={[styles.signButton, !isProfit && styles.signButtonLoss]}
              onPress={toggleSign}
            >
              <TrendingDown
                size={20}
                color={!isProfit ? '#1A1A1A' : colors.text.muted}
              />
            </TouchableOpacity>
          </View>

          {/* Number Pad */}
          <View style={styles.numpad}>
            {NUMBER_PAD.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.numpadRow}>
                {row.map((key) => (
                  <TouchableOpacity
                    key={key}
                    style={[styles.numpadKey, key === 'del' && styles.numpadKeyDel]}
                    onPress={() => handleNumberPress(key)}
                  >
                    <Text style={[styles.numpadKeyText, key === 'del' && styles.numpadKeyTextDel]}>
                      {key === 'del' ? '⌫' : key}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>

          {/* Save Button */}
          <TouchableOpacity style={styles.saveButton} onPress={handleConfirm}>
            <Check size={20} color="#1A1A1A" />
            <Text style={styles.saveButtonText}>Save Session</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  } as ViewStyle,
  sheet: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
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
    marginBottom: 20,
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
  summary: {
    flexDirection: 'row',
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  } as ViewStyle,
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  } as ViewStyle,
  summaryLabel: {
    fontSize: 13,
    color: colors.text.muted,
    marginBottom: 4,
  } as TextStyle,
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  } as TextStyle,
  divider: {
    width: 1,
    backgroundColor: colors.background.tertiary,
    marginHorizontal: 16,
  } as ViewStyle,
  resultLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 12,
    textAlign: 'center',
  } as TextStyle,
  resultContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  } as ViewStyle,
  signButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  signButtonActive: {
    backgroundColor: colors.onboarding.profit,
  } as ViewStyle,
  signButtonLoss: {
    backgroundColor: colors.accent.primary,
  } as ViewStyle,
  resultAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.onboarding.profit,
    minWidth: 160,
    textAlign: 'center',
  } as TextStyle,
  resultAmountLoss: {
    color: colors.accent.primary,
  } as TextStyle,
  numpad: {
    gap: 8,
    marginBottom: 24,
  } as ViewStyle,
  numpadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  } as ViewStyle,
  numpadKey: {
    width: 80,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  numpadKeyDel: {
    backgroundColor: 'transparent',
  } as ViewStyle,
  numpadKeyText: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text.primary,
  } as TextStyle,
  numpadKeyTextDel: {
    color: colors.text.muted,
  } as TextStyle,
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent.gold,
    paddingVertical: 16,
    borderRadius: 16,
  } as ViewStyle,
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  } as TextStyle,
});

export default SessionEndSheet;
