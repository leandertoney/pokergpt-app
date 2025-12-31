import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { MessageSquare, Mic, X, Grid3X3 } from 'lucide-react-native';
import { colors } from '@/constants/colors';

interface ComposeModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectText: () => void;
  onSelectTalk: () => void;
  onSelectCards?: () => void;
}

export function ComposeModal({
  visible,
  onClose,
  onSelectText,
  onSelectTalk,
  onSelectCards,
}: ComposeModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={[styles.modalContainer, { marginBottom: Math.max(insets.bottom, 16) + 70 }]}>
          <BlurView intensity={80} tint="dark" style={styles.blurContainer}>
            <View style={styles.content}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>New Analysis</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <X size={20} color={colors.text.muted} />
                </TouchableOpacity>
              </View>

              {/* Options */}
              <View style={styles.options}>
                <TouchableOpacity
                  style={styles.option}
                  onPress={onSelectText}
                  activeOpacity={0.7}
                >
                  <View style={styles.iconContainer}>
                    <MessageSquare size={24} color={colors.accent.primary} />
                  </View>
                  <View style={styles.optionText}>
                    <Text style={styles.optionTitle}>Text</Text>
                    <Text style={styles.optionDescription}>Type your hand</Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.divider} />

                <TouchableOpacity
                  style={styles.option}
                  onPress={onSelectTalk}
                  activeOpacity={0.7}
                >
                  <View style={styles.iconContainer}>
                    <Mic size={24} color={colors.accent.primary} />
                  </View>
                  <View style={styles.optionText}>
                    <Text style={styles.optionTitle}>Talk</Text>
                    <Text style={styles.optionDescription}>Speak your hand</Text>
                  </View>
                </TouchableOpacity>

                {onSelectCards && (
                  <>
                    <View style={styles.divider} />

                    <TouchableOpacity
                      style={styles.option}
                      onPress={onSelectCards}
                      activeOpacity={0.7}
                    >
                      <View style={styles.iconContainer}>
                        <Grid3X3 size={24} color={colors.accent.primary} />
                      </View>
                      <View style={styles.optionText}>
                        <Text style={styles.optionTitle}>Cards</Text>
                        <Text style={styles.optionDescription}>Pick from grid</Text>
                      </View>
                    </TouchableOpacity>
                  </>
                )}
              </View>

              {/* Cancel Button */}
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  } as ViewStyle,
  modalContainer: {
    width: '85%',
    maxWidth: 320,
    borderRadius: 20,
    overflow: 'hidden',
  } as ViewStyle,
  blurContainer: {
    borderRadius: 20,
    overflow: 'hidden',
  } as ViewStyle,
  content: {
    backgroundColor: 'rgba(45, 18, 18, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(230, 51, 51, 0.2)',
    borderRadius: 20,
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  } as ViewStyle,
  title: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text.primary,
  } as TextStyle,
  closeButton: {
    padding: 4,
  } as ViewStyle,
  options: {
    paddingHorizontal: 16,
  } as ViewStyle,
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
  } as ViewStyle,
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(230, 51, 51, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  } as ViewStyle,
  optionText: {
    flex: 1,
  } as ViewStyle,
  optionTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: colors.text.primary,
    marginBottom: 2,
  } as TextStyle,
  optionDescription: {
    fontSize: 14,
    color: colors.text.muted,
  } as TextStyle,
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginHorizontal: 4,
  } as ViewStyle,
  cancelButton: {
    paddingVertical: 16,
    marginTop: 8,
    marginBottom: 8,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  } as ViewStyle,
  cancelText: {
    fontSize: 16,
    color: colors.text.muted,
    fontWeight: '500' as const,
  } as TextStyle,
});

export default ComposeModal;
