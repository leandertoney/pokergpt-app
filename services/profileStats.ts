/**
 * Everything the profile screen shows, read in one pass.
 *
 * The screen used to display a name and two fields that said "Not signed in"
 * and "Unknown". All of the numbers below were already on the device; nothing
 * here needs a new table, a migration, or a network call.
 *
 * Deliberately counts ACTIVITY, never winnings. Sessions carry a `result`
 * field, so a profit total would be trivial to add and must not be: this app is
 * gambling-adjacent, has been rejected once on paywall grounds, and the old
 * "Up $3K this month" hero was cut for exactly this reason.
 */

import { getHandHistory, getSessionHistory, getChatHistory, getFavorites, getUserDisplayName, getUserIdentity, getUserTier } from './storageService';
import { getDailyReviewState } from './dailyReviewService';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const WEEKS_SHOWN = 12;

export type ProfileStats = {
  displayName: string | null;
  tier: 'free' | 'paid';
  /** Plain-language "1/2 and 1/3 · live and online", or null when unknown. */
  playsLine: string | null;

  currentStreak: number;
  bestStreak: number;

  handsTotal: number;
  handsThisWeek: number;

  sessionsTotal: number;
  lastSessionLabel: string | null;

  chatsTotal: number;
  favoritesTotal: number;

  /** The leak being worked on, in the wording the plan screen uses. */
  workingOn: string | null;

  /** Relative activity per week, oldest first, each 0..1. */
  activity: number[];

  /** True when there is genuinely nothing to show yet. */
  isEmpty: boolean;
};

const CHALLENGE_LABEL: Record<string, string> = {
  discipline: 'Calling too wide',
  sizing: 'Missing value',
  tilt: 'Tilt control',
  spots: 'Playing scared',
};

const LEVEL_STAKES: Record<string, string> = {
  beginner: 'Home games',
  intermediate: '1/2 and 1/3',
  advanced: '2/5 and up',
};

export async function getProfileStats(): Promise<ProfileStats> {
  // One pass, in parallel. Each of these is a local AsyncStorage read.
  const [name, identity, tier, review, hands, sessions, chats, favorites] =
    await Promise.all([
      getUserDisplayName().catch(() => null),
      getUserIdentity().catch(() => null),
      getUserTier().catch(() => 'free' as const),
      getDailyReviewState().catch(() => ({ currentStreak: 0, bestStreak: 0 })),
      getHandHistory().catch(() => []),
      getSessionHistory().catch(() => []),
      getChatHistory().catch(() => []),
      getFavorites().catch(() => []),
    ]);

  const now = Date.now();

  const handTimes = hands
    .map((h: any) => Number(h?.handData?.timestamp ?? h?.timestamp ?? 0))
    .filter((n) => Number.isFinite(n) && n > 0);

  const sessionTimes = sessions
    .map((s: any) => Number(s?.startTime ?? 0))
    .filter((n) => Number.isFinite(n) && n > 0);

  const handsThisWeek = handTimes.filter((t) => now - t < WEEK_MS).length;

  return {
    displayName: name,
    tier: tier === 'paid' ? 'paid' : 'free',
    playsLine: buildPlaysLine(identity),

    currentStreak: review.currentStreak ?? 0,
    bestStreak: review.bestStreak ?? 0,

    handsTotal: hands.length,
    handsThisWeek,

    sessionsTotal: sessions.length,
    lastSessionLabel: sessionTimes.length
      ? relativeDay(Math.max(...sessionTimes), now)
      : null,

    chatsTotal: chats.length,
    favoritesTotal: favorites.length,

    workingOn: identity?.biggestChallenge
      ? CHALLENGE_LABEL[identity.biggestChallenge] ?? null
      : null,

    activity: bucketByWeek([...handTimes, ...sessionTimes], now),

    isEmpty: hands.length === 0 && sessions.length === 0 && chats.length === 0,
  };
}

/** "1/2 and 1/3 · live and online" from whatever answers exist. */
function buildPlaysLine(identity: any): string | null {
  const stakes = identity?.experienceLevel
    ? LEVEL_STAKES[identity.experienceLevel]
    : null;
  return stakes ?? null;
}

/**
 * Relative bar heights for the last 12 weeks, oldest first.
 *
 * Normalised against the busiest week rather than an absolute scale, so the
 * shape of someone's habit reads the same whether they log two hands a week or
 * twenty. An all-zero history returns all zeros rather than dividing by zero.
 */
function bucketByWeek(timestamps: number[], now: number): number[] {
  const buckets = new Array(WEEKS_SHOWN).fill(0);

  for (const t of timestamps) {
    const weeksAgo = Math.floor((now - t) / WEEK_MS);
    if (weeksAgo < 0 || weeksAgo >= WEEKS_SHOWN) continue;
    buckets[WEEKS_SHOWN - 1 - weeksAgo] += 1;
  }

  const peak = Math.max(...buckets);
  if (peak === 0) return buckets;
  return buckets.map((n) => n / peak);
}

function relativeDay(ts: number, now: number): string {
  const days = Math.floor((now - ts) / (24 * 60 * 60 * 1000));
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) {
    return new Date(ts).toLocaleDateString(undefined, { weekday: 'long' });
  }
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
