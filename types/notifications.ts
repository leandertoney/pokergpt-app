// Notification settings and types for daily review reminders

export type NotificationSettings = {
  enabled: boolean;
  reminderTime: { hour: number; minute: number }; // 24-hour format
  lastScheduledDate: string | null; // ISO date string
  permissionStatus: 'undetermined' | 'granted' | 'denied';
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: false,
  reminderTime: { hour: 9, minute: 0 }, // Default 9:00 AM
  lastScheduledDate: null,
  permissionStatus: 'undetermined',
};

export type NotificationType =
  | 'daily_reminder'
  | 'streak_celebration'
  | 'streak_at_risk'
  /** Next-morning follow-up on the last hand the player entered. */
  | 'hand_followup';

export type NotificationData = {
  type: NotificationType;
  screen?: string; // Route to navigate to
  payload?: Record<string, unknown>;
};
