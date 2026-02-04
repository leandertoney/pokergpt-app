// PokerPro AI Brand Colors
// Based on the robot card character logo - EXACT colors from logo design

export const colors = {
  // Backgrounds (exact match to logo)
  background: {
    primary: '#6A0B0B',      // Deep Background Red - matched to logo background
    secondary: '#6A0B0B',    // Same as primary
    tertiary: '#7A1717',     // Slightly lighter for cards/elevated surfaces
    card: '#F4E8D8',         // Card Face Ivory - exact from logo
    shadow: '#3A0000',       // Shadow Red - for darker elements
  },

  // Accent colors (exact match to logo)
  accent: {
    primary: '#FF3A3A',      // Glowing Circuit Red - exact from logo
    secondary: '#FF6B6B',    // Light red
    glow: '#FF3A3A',         // Glowing Circuit Red
    gold: '#E8B84A',         // Premium Gold Stroke - exact from logo
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
    primary: '#F4E8D8',      // Card Face Ivory - for text on dark
    secondary: '#CCBBA8',    // Muted cream
    dark: '#1A1A1A',         // Black Suit / Faceplate - exact from logo
    muted: '#8B7355',        // Muted brown
    inverse: '#1A1A1A',      // Black for text on light backgrounds
  },

  // Card suit colors
  cards: {
    spades: '#1A1A1A',       // Black Suit / Faceplate - exact from logo
    clubs: '#1A1A1A',        // Black Suit / Faceplate
    hearts: '#FF3A3A',       // Glowing Circuit Red
    diamonds: '#3B82F6',     // Blue (traditional 4-color deck)
  },

  // Onboarding colors (Money & Royalty theme)
  onboarding: {
    gold: '#E8B84A',           // Premium Gold Stroke - exact from logo
    goldDark: '#C9A03A',       // Darker gold for accents
    profit: '#22C55E',         // Green for profit/money TEXT
    profitLight: '#4ADE80',    // Light green for accents
    data: '#3B82F6',           // Blue for data/graphs
    dataLight: '#60A5FA',      // Light blue for accents
    celebration: '#E8B84A',    // Premium Gold Stroke
  },

  // Gradients (for LinearGradient components)
  gradients: {
    background: ['#6A0B0B', '#6A0B0B', '#3A0000'] as const,
    card: ['#7A1717', '#6A0B0B'] as const,
    premium: ['#FF3A3A', '#B82828'] as const,
    goldButton: ['#E8B84A', '#C9A03A'] as const,
    profitGraph: ['#22C55E', '#16A34A'] as const,
    dataGraph: ['#3B82F6', '#2563EB'] as const,
  },

  // Semantic colors
  success: '#4CAF50',
  error: '#FF3A3A',
  warning: '#E8B84A',

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
