/**
 * ONLYUS v2 Design Tokens
 * Structured design parameters ensuring warm, calm, intimate visual hierarchy.
 */

export const TOKENS = {
  // Theme Modes
  themes: ['dark', 'cream', 'auto'] as const,

  // Radii Specs
  radius: {
    card: 'rounded-[26px]',
    sheet: 'rounded-t-[32px]',
    pill: 'rounded-full',
    input: 'rounded-2xl',
    button: 'rounded-2xl',
  },

  // Touch targets (minimum 44px accessible)
  touchTarget: 'min-h-[44px] min-w-[44px]',

  // Spring physics for Framer Motion
  spring: {
    tap: { scale: 0.96 },
    subtleTap: { scale: 0.98 },
    pop: { type: 'spring', stiffness: 420, damping: 28 },
    smooth: { type: 'spring', stiffness: 300, damping: 30 },
    gentle: { duration: 0.24, ease: [0.16, 1, 0.3, 1] },
  },

  // Color constants
  colors: {
    rose: '#ff4d8d',
    roseGlow: '#ff75a0',
    violet: '#8b5cf6',
    dark: {
      bg: '#0b0614',
      surface: 'rgba(255, 255, 255, 0.06)',
      surfaceStrong: 'rgba(255, 255, 255, 0.12)',
      border: 'rgba(255, 255, 255, 0.12)',
      textPrimary: '#ffffff',
      textSecondary: 'rgba(255, 255, 255, 0.65)',
      textMuted: 'rgba(255, 255, 255, 0.40)',
    },
    cream: {
      bg: '#faf6f0',
      surface: '#ffffff',
      surfaceSoft: '#f3ece1',
      border: 'rgba(180, 150, 130, 0.22)',
      textPrimary: '#241a24',
      textSecondary: '#6e5d6a',
      textMuted: '#9e8d9a',
    },
  },
} as const;

export type ThemeMode = (typeof TOKENS.themes)[number];
