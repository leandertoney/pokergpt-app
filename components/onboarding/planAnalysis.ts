/**
 * Plan synthesis.
 *
 * The plan screen used to be a receipt: it echoed the three taps back as three
 * rows. That reads as "here is what you clicked", not "here is what we worked
 * out about you", and it looks identical to every other player's.
 *
 * This composes an actual read instead. Each of the three answers contributes a
 * different sentence — a context line from where + stakes, a diagnosis from the
 * leak read *through* those stakes, and a forward-looking outcome — so the 48
 * possible combinations produce genuinely different text rather than the same
 * paragraph with three words swapped.
 *
 * Everything here is deterministic and offline. No claims about money won, and
 * no invented statistics: this app is gambling-adjacent, and an unverifiable
 * earnings claim is a review risk (the old "Up $3K this month" hero was cut for
 * exactly that reason).
 */

export type Where = 'live' | 'online' | 'both' | null;
export type Stakes = 'home' | 'micro' | 'low' | 'mid' | null;
export type Leak = 'call_too_much' | 'miss_value' | 'tilt' | 'play_scared' | null;

export type PlanAnalysis = {
  /** One line naming the kind of player they are. */
  profile: string;
  /** What the leak actually costs, read through their stakes. */
  diagnosis: string;
  /** What changes, phrased as the outcome they want. */
  outcome: string;
  /** Short label for the outcome, used in headlines. */
  outcomeShort: string;
  /** What 30 days of work on this leak looks like. Drives the paywall framing. */
  thirtyDay: string;
};

const STAKE_CONTEXT: Record<string, { noun: string; texture: string }> = {
  home:  { noun: 'home games',        texture: 'where reads matter more than ranges' },
  micro: { noun: 'micro stakes',      texture: 'where volume punishes small mistakes' },
  low:   { noun: '1/2 and 1/3',       texture: 'where most pots are decided after the flop' },
  mid:   { noun: '2/5 and up',        texture: 'where opponents punish predictable lines' },
};

const WHERE_CONTEXT: Record<string, string> = {
  live:   'at the table',
  online: 'online',
  both:   'live and online',
};

/**
 * Leak descriptions are written per stake level. The same leak costs a
 * different thing in a home game than it does at 2/5, and saying so is the
 * difference between an analysis and a lookup.
 */
const LEAK_BY_STAKES: Record<string, Record<string, string>> = {
  call_too_much: {
    home:  'Calling too wide is the most expensive habit in a friendly game, because nobody is bluffing enough to make it pay.',
    micro: 'Calling too wide bleeds slowly at micros — small pots, but every single session.',
    low:   'Calling too wide is the number one leak at these stakes. Most river bets here are value, not bluffs.',
    mid:   'Calling too wide gets punished hardest at 2/5 and up, where good players size their value bets to get paid.',
  },
  miss_value: {
    home:  'Checking your strong hands leaves money on the table in a home game, where people will call far more than they should.',
    micro: 'Missing value at micros is quiet but constant — the pots you win are smaller than they should be.',
    low:   'Missing value is what separates break-even from winning at 1/2. The calls are there; the bets are not.',
    mid:   'Missing value at 2/5 and up is costly, because thin value bets are where the edge actually lives.',
  },
  tilt: {
    home:  'Tilt costs the most in a home game, where the next hand comes fast and nobody is stopping you.',
    micro: 'Tilt at micros turns a small downswing into a long one, because the volume is relentless.',
    low:   'One tilted session at 1/2 can undo a month of good decisions.',
    mid:   'Tilt at 2/5 and up is the most expensive mistake on this list. The stacks are deep enough to lose several at once.',
  },
  play_scared: {
    home:  'Playing scared in a home game means folding to people who are not bluffing you.',
    micro: 'Playing scared at micros means folding the best hand to bets that are almost always weak.',
    low:   'Playing scared at 1/2 costs you the pots you already earned — the ones you were ahead in.',
    mid:   'Playing scared at 2/5 and up is read instantly, and good opponents will bet you off hand after hand.',
  },
};

const OUTCOME: Record<string, { long: string; short: string }> = {
  call_too_much: { long: 'letting go of hands that are beat', short: 'folding when you are beat' },
  miss_value:    { long: 'getting paid on your big hands',    short: 'getting paid' },
  tilt:          { long: 'staying steady after a bad beat',   short: 'staying steady' },
  play_scared:   { long: 'betting when you are ahead',        short: 'betting with confidence' },
};

export function buildPlanAnalysis(where: Where, stakes: Stakes, leak: Leak): PlanAnalysis {
  const w = where ? WHERE_CONTEXT[where] : null;
  const st = stakes ? STAKE_CONTEXT[stakes] : null;

  // Profile: composed from whichever of the two context answers exist, so a
  // skipped question degrades the sentence rather than breaking it.
  let profile: string;
  if (st && w) {
    profile = `You play ${st.noun} ${w}, ${st.texture}.`;
  } else if (st) {
    profile = `You play ${st.noun}, ${st.texture}.`;
  } else if (w) {
    profile = `You play ${w}.`;
  } else {
    profile = 'Built from how you play.';
  }

  const diagnosis =
    leak && stakes
      ? LEAK_BY_STAKES[leak][stakes]
      : leak
        ? LEAK_BY_STAKES[leak].low
        : 'We will find the leak costing you the most and start there.';

  const o = leak ? OUTCOME[leak] : { long: 'playing your best hand every time', short: 'your biggest leak' };

  // The 30-day horizon. It gives the plan a shape the user can price against —
  // and against a $29.99 year, one month of the weekly plan costs more. No
  // outcome is promised in money, only in the habit that changes.
  const thirtyDay = leak
    ? `In 30 days of hands, ${o.long} stops being the thing that costs you.`
    : 'In 30 days of hands, your biggest leak stops being the thing that costs you.';

  return { profile, diagnosis, outcome: o.long, outcomeShort: o.short, thirtyDay };
}
