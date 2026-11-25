import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#07040d',
          900: '#0b0614',
          850: '#120a20',
          800: '#1a1030',
          700: '#261844',
        },
        rose: {
          glow: '#ff4d8d',
          soft: '#ff85b3',
        },
        violet: {
          glow: '#8b5cf6',
          electric: '#a855f7',
        },
      },
      backgroundImage: {
        'love-gradient': 'linear-gradient(135deg, #ff4d8d 0%, #8b5cf6 100%)',
        'love-gradient-soft': 'linear-gradient(135deg, rgba(255,77,141,0.22) 0%, rgba(139,92,246,0.22) 100%)',
        'midnight-radial': 'radial-gradient(circle at 20% 0%, rgba(255,77,141,0.16), transparent 45%), radial-gradient(circle at 80% 100%, rgba(139,92,246,0.18), transparent 50%)',
      },
      boxShadow: {
        'glow-pink': '0 0 28px -6px rgba(255, 77, 141, 0.55)',
        'glow-violet': '0 0 28px -6px rgba(139, 92, 246, 0.55)',
        'glass': '0 12px 40px -12px rgba(0, 0, 0, 0.65)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
