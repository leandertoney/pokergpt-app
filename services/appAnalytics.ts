/**
 * In-app telemetry, beyond onboarding.
 *
 * Onboarding has been instrumented since August; everything after it has not.
 * That gap is why a churned trial was unexplainable: the only reason we knew
 * the one paying US user had engaged at all was that their hand happened to
 * sync to Postgres. Screen views, the coach, the daily review and the day-two
 * follow-up were all invisible.
 *
 * Writes to the same public.onboarding_events table on purpose. The table is
 * an append-only event firehose keyed by device_id, the volume is tiny, and a
 * second table would mean joining two firehoses to answer one question. The
 * name is now slightly wrong; splitting it is not worth a migration.
 *
 * Same contract as trackOnboardingEvent: fire-and-forget, never blocks a
 * screen, swallows its own errors.
 */

import { trackOnboardingEvent } from './onboardingAnalytics';

/**
 * Record something the player did inside the app.
 *
 * @param event      A verb or a screen id — 'screen_home', 'coach_opened',
 *                   'hand_saved', 'day2_scheduled', 'day2_opened'.
 * @param properties Optional context. Keep it small and non-identifying.
 */
export function trackAppEvent(
  event: string,
  properties: Record<string, unknown> = {}
): void {
  trackOnboardingEvent(event, properties);
}

/**
 * Record that a screen was shown.
 *
 * Prefixed so the funnel script can separate navigation from actions without
 * maintaining a list of screen names.
 */
export function trackScreen(
  name: string,
  properties: Record<string, unknown> = {}
): void {
  trackOnboardingEvent(`screen_${name}`, properties);
}
