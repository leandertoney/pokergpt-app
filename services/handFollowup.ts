/**
 * The day-two follow-up.
 *
 * This exists because of one specific churn: the app's only paying US trial
 * entered a real hand nine minutes after subscribing, got a correct verdict,
 * and never opened the app again. Nothing followed up. Three days later the
 * trial lapsed on its own.
 *
 * So when a hand is saved, we schedule a local notification for the next
 * morning that names the spot they actually brought us. Local, not push:
 * the device already has the hand, the copy can be specific, and it fires
 * whether or not the app is ever reopened.
 *
 * Only ONE follow-up is ever pending. A newer hand replaces the older one
 * rather than stacking, so a player who logs five hands in a session gets one
 * message about the last one, not five.
 *
 * Copy rule, same as PaywallV2: name the spot and the decision, never an
 * outcome or an amount. This app is gambling-adjacent and has been rejected
 * once already.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { HandData, AnalysisResult } from '@/types/poker';
import type { NotificationData } from '@/types/notifications';
import { checkNotificationPermissions } from './notificationService';
import { trackAppEvent } from './appAnalytics';

const FOLLOWUP_ID = 'hand-followup';

/** Delivered the next morning at this hour, local time. */
const FOLLOWUP_HOUR = 9;

/**
 * Schedule tomorrow-morning's follow-up for a hand just saved.
 *
 * Fire-and-forget by contract: never throws, never blocks saving a hand.
 */
export async function scheduleHandFollowup(
  handData: Partial<HandData>,
  analysis: Partial<AnalysisResult>
): Promise<void> {
  try {
    // Permission is acquired during onboarding. Without it there is nothing to
    // do and nothing to report — asking here would spend the one-shot OS
    // prompt at a moment the player has not been prepared for.
    const permission = await checkNotificationPermissions();
    if (permission !== 'granted') return;

    const body = buildBody(handData, analysis);
    if (!body) return;

    // Replaces any pending follow-up: one message, about the newest hand.
    await Notifications.cancelScheduledNotificationAsync(FOLLOWUP_ID).catch(() => {});

    const trigger = nextMorning();

    const content: Notifications.NotificationContentInput = {
      title: 'About that hand',
      body,
      data: {
        type: 'hand_followup',
        screen: '/history',
        payload: { handId: handData.id ?? null },
      } as NotificationData,
      sound: 'default',
      ...(Platform.OS === 'android' && { channelId: 'daily-reminders' }),
    };

    await Notifications.scheduleNotificationAsync({
      content,
      trigger,
      identifier: FOLLOWUP_ID,
    });

    trackAppEvent('day2_scheduled', {
      hasStreet: Boolean(handData.river || handData.turn || handData.flop),
      action: analysis.recommendedAction ?? null,
    });
  } catch (e: any) {
    console.warn('[followup] schedule failed:', e?.message);
  }
}

/** Drop the pending follow-up, e.g. once the player has come back on their own. */
export async function cancelHandFollowup(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(FOLLOWUP_ID);
  } catch {
    // Nothing pending is the normal case.
  }
}

/**
 * The message.
 *
 * Names the hand and the street, then the decision. Returns null when the
 * analysis is too thin to say anything specific — a vague notification is
 * worse than none, because the OS prompt that earned this is spent.
 */
function buildBody(
  handData: Partial<HandData>,
  analysis: Partial<AnalysisResult>
): string | null {
  const action = analysis.recommendedAction?.trim();
  if (!action) return null;

  const hand = handData.heroHand?.trim();
  const street = handData.river
    ? 'river'
    : handData.turn
      ? 'turn'
      : handData.flop
        ? 'flop'
        : null;

  if (hand && street) {
    return `Your ${hand} on the ${street}: the read was ${lower(action)}. Worth another look before you play again.`;
  }
  if (hand) {
    return `Your ${hand}: the read was ${lower(action)}. Worth another look before you play again.`;
  }
  return `Yesterday's hand: the read was ${lower(action)}. Worth another look before you play again.`;
}

/** "Fold on the river" reads better mid-sentence than "Fold On The River". */
function lower(action: string): string {
  return action.charAt(0).toLowerCase() + action.slice(1);
}

/**
 * Tomorrow at FOLLOWUP_HOUR local time.
 *
 * A DATE trigger rather than a delay, so someone who logs a hand at 2am gets
 * the message at a sensible hour rather than 2am the next night.
 */
function nextMorning(): Notifications.NotificationTriggerInput {
  const when = new Date();
  when.setDate(when.getDate() + 1);
  when.setHours(FOLLOWUP_HOUR, 0, 0, 0);

  return {
    type: Notifications.SchedulableTriggerInputTypes.DATE,
    date: when,
  };
}
