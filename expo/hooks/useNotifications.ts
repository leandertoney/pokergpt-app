import { useState, useEffect, useCallback } from 'react';
import {
  NotificationSettings,
  DEFAULT_NOTIFICATION_SETTINGS,
} from '@/types/notifications';
import {
  getNotificationSettings,
  scheduleDailyReminder,
  cancelDailyReminder,
  requestNotificationPermissions,
  checkNotificationPermissions,
  setupNotificationResponseListener,
  clearBadge,
  formatReminderTime,
} from '@/services/notificationService';

export function useNotifications() {
  const [settings, setSettings] = useState<NotificationSettings>(
    DEFAULT_NOTIFICATION_SETTINGS
  );
  const [isLoading, setIsLoading] = useState(true);

  // Load settings on mount
  useEffect(() => {
    async function load() {
      try {
        const stored = await getNotificationSettings();
        const permission = await checkNotificationPermissions();
        setSettings({ ...stored, permissionStatus: permission });
      } catch (error) {
        console.error('Error loading notification settings:', error);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  // Set up notification response listener
  useEffect(() => {
    const unsubscribe = setupNotificationResponseListener();
    return unsubscribe;
  }, []);

  // Clear badge when hook mounts (app foregrounded)
  useEffect(() => {
    clearBadge();
  }, []);

  const enableReminders = useCallback(async (hour: number, minute: number) => {
    setIsLoading(true);
    try {
      const hasPermission = await requestNotificationPermissions();
      if (!hasPermission) {
        setSettings(prev => ({ ...prev, permissionStatus: 'denied' }));
        return false;
      }

      await scheduleDailyReminder(hour, minute);
      setSettings(prev => ({
        ...prev,
        enabled: true,
        reminderTime: { hour, minute },
        permissionStatus: 'granted',
      }));
      return true;
    } catch (error) {
      console.error('Error enabling reminders:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disableReminders = useCallback(async () => {
    setIsLoading(true);
    try {
      await cancelDailyReminder();
      setSettings(prev => ({ ...prev, enabled: false }));
    } catch (error) {
      console.error('Error disabling reminders:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateReminderTime = useCallback(async (hour: number, minute: number) => {
    if (!settings.enabled) return;

    setIsLoading(true);
    try {
      await scheduleDailyReminder(hour, minute);
      setSettings(prev => ({
        ...prev,
        reminderTime: { hour, minute },
      }));
    } catch (error) {
      console.error('Error updating reminder time:', error);
    } finally {
      setIsLoading(false);
    }
  }, [settings.enabled]);

  const formattedTime = formatReminderTime(
    settings.reminderTime.hour,
    settings.reminderTime.minute
  );

  return {
    settings,
    isLoading,
    formattedTime,
    enableReminders,
    disableReminders,
    updateReminderTime,
  };
}
