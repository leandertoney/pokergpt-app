// Paywall and goal tracking types

export type PaywallState = {
  hasSeenPaywall: boolean;
  hasSkippedPaywall: boolean;
  specialOfferShown: boolean;
  goalConfirmedAt: number | null;
};

export type PricingPlan = {
  id: 'weekly' | 'yearly' | 'lifetime';
  name: string;
  price: string;
  perPeriod: string;
  badge?: string;
  savings?: string;
  monthlyEquivalent?: string;
  features: string[];
  isHighlighted?: boolean;
};

export type GoalConfirmation = {
  goal: string;
  userName: string | null;
  timestamp: number;
};

// Shared features for all paid plans (same plan, different pricing)
const PREMIUM_FEATURES = [
  'Unlimited hand analysis',
  'Voice input',
  'Full AI breakdowns',
  'Hand history',
];

// Pricing configuration - Initial paywall (Weekly + Yearly only)
// Same features, different pricing commitment
export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'weekly',
    name: 'Weekly',
    price: '$9.99',
    perPeriod: '/week',
    features: PREMIUM_FEATURES,
  },
  {
    id: 'yearly',
    name: 'Yearly',
    price: '$49',
    perPeriod: '/year',
    badge: 'BEST VALUE',
    savings: 'Save 91%',
    monthlyEquivalent: '$4.08/month',
    features: PREMIUM_FEATURES,
    isHighlighted: true,
  },
];

// Lifetime plan - Only shown as special offer after skipping initial paywall
export const LIFETIME_PLAN: PricingPlan = {
  id: 'lifetime',
  name: 'Lifetime',
  price: '$99',
  perPeriod: 'one-time',
  features: [
    ...PREMIUM_FEATURES,
    'Never pay again',
  ],
};

// Special offer pricing (for users who skip paywall)
export const SPECIAL_OFFER = {
  originalPrice: '$99',
  discountedPrice: '$49',
  discountPercent: 50,
  planId: 'lifetime' as const,
};

// Default paywall state
export const DEFAULT_PAYWALL_STATE: PaywallState = {
  hasSeenPaywall: false,
  hasSkippedPaywall: false,
  specialOfferShown: false,
  goalConfirmedAt: null,
};
