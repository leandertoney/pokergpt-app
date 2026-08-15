/**
 * Design tokens.
 *
 * Before this file the app had exactly one shared constant — the color palette —
 * and no typography, spacing, or radius values at all. Every screen inlined its
 * own fontSize/fontWeight/padding into a local StyleSheet, which is why the
 * onboarding screens each hand-roll 8-34 Animated calls and no two share a
 * heading size. This is the missing half of the system.
 *
 * Values are deliberately few. A scale you can hold in your head gets used; a
 * 12-step scale gets ignored and re-inlined.
 */

import { Platform, TextStyle } from 'react-native';

// -----------------------------------------------------------------------------
// SPACING — 4pt base. Named by intent, not by number, so call sites read as
// prose ("gap: spacing.tight") rather than arithmetic.
// -----------------------------------------------------------------------------
export const spacing = {
  hair: 2,
  tight: 4,
  snug: 8,
  cozy: 12,
  base: 16,
  roomy: 24,
  loose: 32,
  section: 48,
  page: 64,
} as const;

// -----------------------------------------------------------------------------
// RADIUS
// -----------------------------------------------------------------------------
export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

// -----------------------------------------------------------------------------
// TYPE SCALE
//
// System faces only — the app ships no custom fonts, and adding a webfont for
// onboarding alone would cost startup time for no real gain. iOS gets the
// rounded variant, which reads warmer than stock SF and suits a coach voice.
// -----------------------------------------------------------------------------
const displayFamily = Platform.select({
  ios: 'SF Pro Rounded',
  android: 'sans-serif-medium',
  default: 'System',
});

export const type = {
  /** One-line screen statements. Used sparingly — the biggest thing on screen. */
  hero: {
    fontFamily: displayFamily,
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '800',
    letterSpacing: -1,
  } as TextStyle,

  /** Standard screen headline. */
  title: {
    fontFamily: displayFamily,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    letterSpacing: -0.6,
  } as TextStyle,

  /** Section heading, card heading. */
  heading: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: -0.3,
  } as TextStyle,

  /** Supporting sentence under a headline. */
  subtitle: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '500',
  } as TextStyle,

  /** Running text. */
  body: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '400',
  } as TextStyle,

  /** Secondary/quiet text. */
  caption: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '400',
  } as TextStyle,

  /** Legal, disclaimers, trial terms. */
  fine: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
  } as TextStyle,

  /** Uppercase eyebrow above a headline. */
  eyebrow: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  } as TextStyle,

  /** Button label. */
  button: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
    letterSpacing: 0.2,
  } as TextStyle,

  /**
   * Numbers that animate or sit in columns. tabular-nums stops the width from
   * jittering as digits change — essential for the counting-up leak figure.
   */
  stat: {
    fontFamily: displayFamily,
    fontSize: 48,
    lineHeight: 52,
    fontWeight: '800',
    letterSpacing: -1.5,
    fontVariant: ['tabular-nums'],
  } as TextStyle,
} as const;

// -----------------------------------------------------------------------------
// MOTION
//
// Durations and easings shared across onboarding so transitions feel like one
// system. Keep animation at commitment moments, progress feedback and payoffs —
// the research found no credible evidence that decorative intro animation moves
// conversion, and every verifiable stat on the subject failed to hold up.
// -----------------------------------------------------------------------------
export const motion = {
  /** Micro-feedback: press states, checkmarks. */
  fast: 160,
  /** Standard enter/exit. */
  base: 280,
  /** Deliberate reveals — the artifact assembling. */
  slow: 520,
  /** The "synthesizing" beat. Long enough to feel like work was done. */
  think: 2200,

  /** Stagger between siblings entering as a group. */
  stagger: 70,

  spring: { damping: 18, stiffness: 160, mass: 1 },
  springy: { damping: 12, stiffness: 180, mass: 0.9 },
} as const;

// -----------------------------------------------------------------------------
// ELEVATION
// -----------------------------------------------------------------------------
export const elevation = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  lifted: {
    shadowColor: '#000',
    shadowOpacity: 0.38,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 12,
  },
} as const;

export const theme = { spacing, radius, type, motion, elevation } as const;
