import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Lock, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/colors';

type UpgradeReason = 'hand_limit' | 'sessions';

type UpgradeModalProps = {
  visible: boolean;
  onClose: () => void;
  currentCount?: number;
  maxCount?: number;
  reason?: UpgradeReason;
};

const CONTENT = {
  hand_limit: {
    title: 'Save More Hands with Pro',
    getMessage: (count: number) =>
      `You've saved ${count} hands—your free limit. Upgrade to Pro for unlimited saves and build your complete hand history.`,
    features: [
      'Unlimited hand saves',
      'Full hand history',
      'Session tracking',
    ],
  },
  sessions: {
    title: 'Track Sessions with Pro',
    getMessage: () =>
      'Organize your hands into sessions, track profit/loss by session, and analyze your performance over time.',
    features: [
      'Create poker sessions',
      'Track profit & loss',
      'Session analytics',
    ],
  },
};

export function UpgradeModal({
  visible,
  onClose,
  currentCount = 3,
  maxCount = 3,
  reason = 'hand_limit',
}: UpgradeModalProps) {
  const router = useRouter();
  const content = CONTENT[reason];

  const handleUpgrade = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose();
    // Navigate to paywall - using the onboarding paywall route
    router.push('/paywall');
  };

  const handleNotNow = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.container}>
              {/* Icon */}
              <View style={styles.iconContainer}>
                <Lock size={32} color={colors.accent.gold} />
              </View>

              {/* Title */}
              <Text style={styles.title}>{content.title}</Text>

              {/* Message */}
              <Text style={styles.message}>
                {content.getMessage(currentCount)}
              </Text>

              {/* Features Preview */}
              <View style={styles.featuresContainer}>
                {content.features.map((feature, index) => (
                  <View key={index} style={styles.featureRow}>
                    <Sparkles size={16} color={colors.accent.gold} />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              {/* Buttons */}
              <TouchableOpacity
                style={styles.upgradeButton}
                onPress={handleUpgrade}
                activeOpacity={0.9}
              >
                <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.notNowButton}
                onPress={handleNotNow}
                activeOpacity={0.7}
              >
                <Text style={styles.notNowButtonText}>Not Now</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  } as ViewStyle,
  container: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.background.tertiary,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(232, 184, 74, 0.3)',
  } as ViewStyle,
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(232, 184, 74, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  } as ViewStyle,
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 12,
  } as TextStyle,
  message: {
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  } as TextStyle,
  featuresContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  } as ViewStyle,
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  } as ViewStyle,
  featureText: {
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: '500',
  } as TextStyle,
  upgradeButton: {
    width: '100%',
    backgroundColor: colors.accent.gold,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  } as ViewStyle,
  upgradeButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text.dark,
  } as TextStyle,
  notNowButton: {
    paddingVertical: 8,
  } as ViewStyle,
  notNowButtonText: {
    fontSize: 15,
    color: colors.text.muted,
    fontWeight: '500',
  } as TextStyle,
});

export default UpgradeModal;
