import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
  Linking,
  ScrollView,
} from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, Clock, AlertCircle } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '@/constants/colors';
import { useNotifications } from '@/hooks/useNotifications';
import { sendTestNotification } from '@/services/notificationService';

export default function NotificationSettingsScreen() {
  const insets = useSafeAreaInsets();
  const {
    settings,
    isLoading,
    formattedTime,
    enableReminders,
    disableReminders,
    updateReminderTime,
  } = useNotifications();

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempTime, setTempTime] = useState<Date>(() => {
    const date = new Date();
    date.setHours(settings.reminderTime.hour);
    date.setMinutes(settings.reminderTime.minute);
    return date;
  });

  const handleToggle = async (value: boolean) => {
    if (value) {
      const success = await enableReminders(
        settings.reminderTime.hour,
        settings.reminderTime.minute
      );
      if (!success && settings.permissionStatus === 'denied') {
        Alert.alert(
          'Notifications Disabled',
          'Please enable notifications in your device settings to receive daily reminders.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  Linking.openSettings();
                }
              },
            },
          ]
        );
      }
    } else {
      await disableReminders();
    }
  };

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }

    if (selectedDate) {
      setTempTime(selectedDate);
      if (Platform.OS === 'android') {
        // On Android, apply immediately
        const hour = selectedDate.getHours();
        const minute = selectedDate.getMinutes();
        updateReminderTime(hour, minute);
      }
    }
  };

  const handleTimeConfirm = () => {
    setShowTimePicker(false);
    const hour = tempTime.getHours();
    const minute = tempTime.getMinutes();
    updateReminderTime(hour, minute);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Daily Reminders',
          headerStyle: { backgroundColor: colors.background.primary },
          headerTintColor: colors.text.primary,
          headerBackTitle: 'Back',
        }}
      />

      <LinearGradient
        colors={[colors.background.tertiary, colors.background.secondary, colors.background.primary]}
        style={styles.gradient}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
        >
          {/* Main Toggle */}
          <View style={styles.section}>
            <View style={styles.settingRow}>
              <View style={styles.settingIcon}>
                <Bell size={22} color={colors.accent.gold} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Daily Reminders</Text>
                <Text style={styles.settingSubtitle}>
                  Get reminded to complete your daily review
                </Text>
              </View>
              <Switch
                value={settings.enabled}
                onValueChange={handleToggle}
                disabled={isLoading}
                trackColor={{ false: colors.background.tertiary, true: colors.accent.gold }}
                thumbColor={colors.text.primary}
              />
            </View>
          </View>

          {/* Time Picker */}
          {settings.enabled && (
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.settingRow}
                onPress={() => setShowTimePicker(true)}
                activeOpacity={0.7}
              >
                <View style={styles.settingIcon}>
                  <Clock size={22} color={colors.accent.gold} />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>Reminder Time</Text>
                  <Text style={styles.settingSubtitle}>
                    {formattedTime}
                  </Text>
                </View>
              </TouchableOpacity>

              {showTimePicker && (
                <View style={styles.timePickerContainer}>
                  <DateTimePicker
                    value={tempTime}
                    mode="time"
                    is24Hour={false}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleTimeChange}
                    textColor={colors.text.primary}
                    themeVariant="dark"
                  />
                  {Platform.OS === 'ios' && (
                    <View style={styles.timePickerButtons}>
                      <TouchableOpacity
                        style={styles.timePickerButton}
                        onPress={() => setShowTimePicker(false)}
                      >
                        <Text style={styles.timePickerButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.timePickerButton, styles.confirmButton]}
                        onPress={handleTimeConfirm}
                      >
                        <Text style={[styles.timePickerButtonText, styles.confirmButtonText]}>
                          Confirm
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Permission Warning */}
          {settings.permissionStatus === 'denied' && (
            <View style={styles.warningSection}>
              <AlertCircle size={20} color={colors.utility.warning} />
              <Text style={styles.warningText}>
                Notifications are disabled in your device settings.
                Enable them to receive daily reminders.
              </Text>
            </View>
          )}

          {/* Info Section */}
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>About Daily Reminders</Text>
            <Text style={styles.infoText}>
              Daily reminders help you maintain your streak by notifying you at
              your preferred time each day. Complete your daily review to keep
              your streak alive and improve your poker skills.
            </Text>
          </View>

          {/* Test Button */}
          <TouchableOpacity
            style={styles.testButton}
            onPress={async () => {
              await sendTestNotification();
              Alert.alert('Sent!', 'Check your notifications.');
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.testButtonText}>Send Test Notification</Text>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  gradient: {
    flex: 1,
  },
  content: {
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  section: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
  },
  settingSubtitle: {
    fontSize: 13,
    color: colors.text.muted,
    marginTop: 2,
  },
  timePickerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  timePickerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  timePickerButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  timePickerButtonText: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  confirmButton: {
    backgroundColor: colors.accent.gold,
  },
  confirmButtonText: {
    color: colors.text.dark,
    fontWeight: '600',
  },
  warningSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: colors.utility.warning,
    lineHeight: 20,
  },
  infoSection: {
    padding: 16,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.muted,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  testButton: {
    backgroundColor: colors.background.secondary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.accent.gold,
  },
});
