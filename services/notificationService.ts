import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import {
  NotificationSettings,
  DEFAULT_NOTIFICATION_SETTINGS,
  NotificationData,
} from '@/types/notifications';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { getOrCreateUser } from '@/services/supabaseStorage';

const NOTIFICATION_SETTINGS_KEY = '@notification_settings';
const DAILY_REMINDER_ID = 'daily-review-reminder';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ============================================
// Permission Management
// ============================================

export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    console.log('Notifications require a physical device');
    return false;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();

  if (existingStatus === 'granted') {
    await updatePermissionStatus('granted');
    return true;
  }

  // Request permissions
  const { status } = await Notifications.requestPermissionsAsync();
  await updatePermissionStatus(status === 'granted' ? 'granted' : 'denied');

  // Android requires notification channel
  if (Platform.OS === 'android') {
    await setupAndroidChannel();
  }

  return status === 'granted';
}

export async function checkNotificationPermissions(): Promise<'undetermined' | 'granted' | 'denied'> {
  if (!Device.isDevice) {
    return 'denied';
  }

  const { status } = await Notifications.getPermissionsAsync();

  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';
  return 'undetermined';
}

async function setupAndroidChannel(): Promise<void> {
  await Notifications.setNotificationChannelAsync('daily-reminders', {
    name: 'Daily Review Reminders',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF3A3A',
    sound: 'default',
  });
}

// ============================================
// Settings Management
// ============================================

export async function getNotificationSettings(): Promise<NotificationSettings> {
  try {
    const stored = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    return stored
      ? { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(stored) }
      : DEFAULT_NOTIFICATION_SETTINGS;
  } catch (error) {
    console.error('Error getting notification settings:', error);
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
}

export async function setNotificationSettings(
  updates: Partial<NotificationSettings>
): Promise<void> {
  try {
    const current = await getNotificationSettings();
    const updated = { ...current, ...updates };
    await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error setting notification settings:', error);
  }
}

async function updatePermissionStatus(
  status: 'undetermined' | 'granted' | 'denied'
): Promise<void> {
  await setNotificationSettings({ permissionStatus: status });
}

// ============================================
// Daily Reminder Scheduling
// ============================================

export async function scheduleDailyReminder(
  hour: number = 9,
  minute: number = 0
): Promise<string | null> {
  try {
    // Cancel any existing daily reminder
    await cancelDailyReminder();

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.log('No notification permission');
      return null;
    }

    // Schedule notification for the specified time daily
    const trigger: Notifications.NotificationTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    };

    const notificationContent: Notifications.NotificationContentInput = {
      title: "Time for Your Daily Review!",
      body: "Keep your streak alive. Review a hand in 60 seconds.",
      data: {
        type: 'daily_reminder',
        screen: '/daily-review',
      } as NotificationData,
      sound: 'default',
      badge: 1,
      ...(Platform.OS === 'android' && {
        channelId: 'daily-reminders',
      }),
    };

    const identifier = await Notifications.scheduleNotificationAsync({
      content: notificationContent,
      trigger,
      identifier: DAILY_REMINDER_ID,
    });

    // Save settings
    await setNotificationSettings({
      enabled: true,
      reminderTime: { hour, minute },
      lastScheduledDate: new Date().toISOString().split('T')[0],
    });

    console.log('Daily reminder scheduled:', identifier);
    return identifier;
  } catch (error) {
    console.error('Error scheduling daily reminder:', error);
    return null;
  }
}

export async function cancelDailyReminder(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID);
    await setNotificationSettings({ enabled: false });
    console.log('Daily reminder cancelled');
  } catch (error) {
    console.error('Error cancelling daily reminder:', error);
  }
}

export async function rescheduleAfterCompletion(): Promise<void> {
  // After completing a review, ensure the next notification is for tomorrow
  const settings = await getNotificationSettings();
  if (settings.enabled) {
    await scheduleDailyReminder(
      settings.reminderTime.hour,
      settings.reminderTime.minute
    );
  }
}

// ============================================
// Streak Celebration Notifications
// ============================================

export async function scheduleStreakCelebration(streak: number): Promise<void> {
  // Only celebrate milestones: 3, 7, 14, 30, 50, 100 days
  const milestones = [3, 7, 14, 30, 50, 100];
  if (!milestones.includes(streak)) return;

  const hasPermission = await checkNotificationPermissions();
  if (hasPermission !== 'granted') return;

  const messages: Record<number, { title: string; body: string }> = {
    3: {
      title: "3-Day Streak!",
      body: "You're building momentum. Keep it going!",
    },
    7: {
      title: "1-Week Streak!",
      body: "A full week of grinding. You're on fire!",
    },
    14: {
      title: "2-Week Streak!",
      body: "Two weeks of dedication. You're getting serious!",
    },
    30: {
      title: "30-Day Streak!",
      body: "A month of daily training. You're a machine!",
    },
    50: {
      title: "50-Day Streak!",
      body: "Halfway to 100! Incredible commitment!",
    },
    100: {
      title: "100-Day Streak!",
      body: "LEGENDARY! 100 days of poker mastery!",
    },
  };

  const message = messages[streak];
  if (!message) return;

  // Schedule immediately (shows right after review completion)
  await Notifications.scheduleNotificationAsync({
    content: {
      title: message.title,
      body: message.body,
      data: {
        type: 'streak_celebration',
        payload: { streak },
      } as NotificationData,
      sound: 'default',
    },
    trigger: null, // null = immediate
  });
}

// ============================================
// Notification Response Handling
// ============================================

export function setupNotificationResponseListener(): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content.data as NotificationData;

      if (data?.screen) {
        // Navigate to the specified screen
        router.push(data.screen as any);
      }
    }
  );

  return () => subscription.remove();
}

// Check for notification that opened the app
export async function getInitialNotification(): Promise<NotificationData | null> {
  const response = await Notifications.getLastNotificationResponseAsync();
  if (response) {
    return response.notification.request.content.data as NotificationData;
  }
  return null;
}

// ============================================
// Push Token Registration
// ============================================

const EXPO_PROJECT_ID = '74438842-5df3-4dd3-96e1-35306d266aa5';

export async function registerExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Push tokens require a physical device');
    return null;
  }

  const permission = await checkNotificationPermissions();
  if (permission !== 'granted') {
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: EXPO_PROJECT_ID,
    });
    console.log('Expo push token:', tokenData.data);
    return tokenData.data;
  } catch (error) {
    console.warn('Failed to get Expo push token:', error);
    return null;
  }
}

export async function syncPushTokenToSupabase(token: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;

  try {
    const user = await getOrCreateUser();
    if (!user) return;

    await supabase
      .from('users')
      .update({
        expo_push_token: token,
        push_token_updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);
  } catch {
    // Silent - app works offline
  }
}

// ============================================
// Utility Functions
// ============================================

export async function getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  return await Notifications.getAllScheduledNotificationsAsync();
}

export async function clearAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.dismissAllNotificationsAsync();
  await Notifications.setBadgeCountAsync(0);
}

export async function clearBadge(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
}

// Format time for display (e.g., "9:00 AM")
export function formatReminderTime(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  const displayMinute = minute.toString().padStart(2, '0');
  return `${displayHour}:${displayMinute} ${period}`;
}

// Send a test notification immediately (for debugging)
export async function sendTestNotification(): Promise<void> {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    console.log('No notification permission for test');
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Test Notification",
      body: "If you see this, notifications are working!",
      data: {
        type: 'daily_reminder',
        screen: '/daily-review',
      },
      sound: 'default',
    },
    trigger: null, // null = immediate
  });

  console.log('Test notification sent!');
}
