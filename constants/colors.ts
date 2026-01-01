// PokerGPT Brand Colors
// Based on the robot card character logo (maroon/cream/red theme)

export const colors = {
  // Backgrounds (matched to logo burgundy)
  background: {
    primary: '#4A0E0E',      // Logo burgundy - main background
    secondary: '#4A0E0E',    // Same as primary (simplified)
    tertiary: '#5A1818',     // Slightly lighter for cards/elevated surfaces
    card: '#F5F0E6',         // Cream/off-white
  },

  // Accent colors
  accent: {
    primary: '#E63333',      // Bright red (main accent)
    secondary: '#FF6B6B',    // Light red
    glow: '#FF4444',         // Red glow effect
    gold: '#D4A84B',         // Gold trim accent
  },

  // Utility colors
  utility: {
    success: '#22C55E',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
  },

  // Text
  text: {
    primary: '#F5F0E6',      // Cream on dark
    secondary: '#CCBBA8',    // Muted cream
    dark: '#1A0505',         // Dark on light surfaces
    muted: '#8B7355',        // Muted brown
    inverse: '#1A0505',      // For text on light backgrounds
  },

  // Card suit colors
  cards: {
    spades: '#F5F0E6',       // Cream (visible on dark bg)
    clubs: '#F5F0E6',        // Cream (visible on dark bg)
    hearts: '#EF4444',       // Red
    diamonds: '#3B82F6',     // Blue (traditional 4-color deck)
  },

  // Onboarding colors (Money & Royalty theme)
  onboarding: {
    gold: '#D4A84B',           // Metallic gold for TEXT/ICONS only (not buttons)
    goldDark: '#B8923F',       // Darker gold for accents
    profit: '#22C55E',         // Green for profit/money TEXT
    profitLight: '#4ADE80',    // Light green for accents
    data: '#3B82F6',           // Blue for data/graphs
    dataLight: '#60A5FA',      // Light blue for accents
    celebration: '#D4A84B',    // Confetti/sparkle color (metallic gold)
  },

  // Gradients (for LinearGradient components)
  gradients: {
    background: ['#4A0E0E', '#4A0E0E', '#3A0808'] as const,
    card: ['#5A1818', '#4A0E0E'] as const,
    premium: ['#E63333', '#B82828'] as const,
    goldButton: ['#FFD700', '#DAA520'] as const,
    profitGraph: ['#22C55E', '#16A34A'] as const,
    dataGraph: ['#3B82F6', '#2563EB'] as const,
  },

  // Semantic colors
  success: '#4CAF50',
  error: '#E63333',
  warning: '#D4A84B',

  // Opacity helpers
  withOpacity: (color: string, opacity: number) => {
    // Convert hex to rgba
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  },
};

// Legacy color mapping (for gradual migration)
export const legacyColors = {
  gold: colors.accent.gold,        // Was #D4AF37
  darkBg: colors.background.primary,
};

export default colors;
