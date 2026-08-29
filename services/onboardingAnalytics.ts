/**
 * ONBOARDING FUNNEL TELEMETRY
 *
 * This app has had no analytics of any kind. 124 lifetime customers produced
 * $23 and zero active subscriptions, and nothing recorded where in the flow
 * people quit — so the onboarding has now been redesigned twice from structure
 * alone rather than from evidence.
 *
 * Ported from the CourtCrowd implementation, which found a real bug within
 * minutes of first running on nine devices: three of four paywall viewers
 * tapped Subscribe and were bounced into a signup wall before they could pay.
 * That is the class of problem this exists to catch.
 *
 * Fire-and-forget by contract: telemetry must never block, delay, or break a
 * screen. Every call is wrapped, awaits nothing the UI needs, and swallows its
 * own errors.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import { supabase } from '@/lib/supabase';

const DEVICE_ID_KEY = '@pokergpt/device_id';

let cachedDeviceId: string | null = null;

/**
 * Stable per-install id, generated locally and persisted, so a device's
 * pre-auth and post-signup events stitch into one funnel. Most of onboarding
 * happens before any account exists, so this — not user_id — is the join key.
 */
export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;

  try {
    const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (stored) {
      cachedDeviceId = stored;
      return stored;
    }
  } catch {
    // Fall through and mint a fresh one; an unreadable store is not fatal.
  }

  const generated = `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;

  try {
    await AsyncStorage.setItem(DEVICE_ID_KEY, generated);
  } catch {
    // Not persisted — this install looks like a new device next launch. Still
    // better than dropping the event.
  }

  cachedDeviceId = generated;
  return generated;
}

/**
 * Append one event. Never throws, never blocks the caller.
 *
 * @param event      Step id for a screen view ('leak_question'), or a verb for
 *                   an action ('paywall_viewed', 'onboarding_completed').
 * @param properties Optional context — the answer chosen, plan tapped, variant.
 */
export function trackOnboardingEvent(
  event: string,
  properties: Record<string, unknown> = {}
): void {
  void (async () => {
    try {
      if (!supabase) return;

      const deviceId = await getDeviceId();

      // Attach the user when there is one; NULL is expected and meaningful for
      // everyone who has not signed up yet.
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const { error } = await supabase.from('onboarding_events').insert({
        device_id: deviceId,
        user_id: session?.user?.id ?? null,
        event,
        properties,
        platform: Platform.OS,
        app_version: Application.nativeApplicationVersion ?? null,
      });

      if (error) {
        console.warn('[analytics] insert failed:', error.message);
      }
    } catch (e: any) {
      console.warn('[analytics] track failed:', e?.message);
    }
  })();
}
