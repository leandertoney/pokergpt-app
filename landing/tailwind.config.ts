import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#6A0B0B',
          secondary: '#7A1717',
          shadow: '#3A0000',
        },
        accent: {
          red: '#FF3A3A',
          redLight: '#FF6B6B',
          gold: '#E8B84A',
          goldDark: '#C9A03A',
        },
        text: {
          ivory: '#F4E8D8',
          cream: '#CCBBA8',
          dark: '#1A1A1A',
          muted: '#8B7355',
        },
        surface: {
          black: '#0A0A0A',
          darkGray: '#1A1A1A',
          card: '#F4E8D8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'typing-dot': 'typing-dot 1.4s infinite',
        'fade-in': 'fade-in 0.6s ease-out forwards',
        'slide-up': 'slide-up 0.6s ease-out forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(255, 58, 58, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(255, 58, 58, 0.6)' },
        },
        'typing-dot': {
          '0%, 60%, 100%': { opacity: '0.3' },
          '30%': { opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      boxShadow: {
        'glow-red': '0 0 30px rgba(255, 58, 58, 0.4)',
        'glow-gold': '0 0 30px rgba(232, 184, 74, 0.4)',
        'glow-red-lg': '0 0 60px rgba(255, 58, 58, 0.5)',
      },
    },
  },
  plugins: [],
};

export default config;
