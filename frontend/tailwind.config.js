/** @type {import('tailwindcss').Config} */
import { theme } from './src/theme/tokens.js';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        base: theme.colors.background.base,
        surface: theme.colors.background.surface,
        card: theme.colors.background.card,
        elevated: theme.colors.background.elevated,
        'border-subtle': theme.colors.border.subtle,
        'border-default': theme.colors.border.default,
        'text-primary': theme.colors.text.primary,
        'text-secondary': theme.colors.text.secondary,
        'text-muted': theme.colors.text.muted,
        brand: {
          DEFAULT: theme.colors.brand.primary,
          light: theme.colors.brand.primaryLight,
          dark: theme.colors.brand.primaryDark,
          accent: theme.colors.brand.accent,
        },
        success: theme.colors.semantic.success,
        warning: theme.colors.semantic.warning,
        danger: theme.colors.semantic.danger,
        info: theme.colors.semantic.info,
      },
      fontFamily: {
        sans: theme.typography.fontFamily.primary.split(',').map((s) => s.trim()),
        mono: theme.typography.fontFamily.mono.split(',').map((s) => s.trim()),
      },
      fontSize: {
        xs: theme.typography.fontSize.xs,
        sm: theme.typography.fontSize.sm,
        base: theme.typography.fontSize.base,
        lg: theme.typography.fontSize.lg,
        xl: theme.typography.fontSize.xl,
        '2xl': theme.typography.fontSize['2xl'],
        '3xl': theme.typography.fontSize['3xl'],
        '4xl': theme.typography.fontSize['4xl'],
      },
      fontWeight: theme.typography.fontWeight,
      lineHeight: theme.typography.lineHeight,
      spacing: Object.fromEntries(
        theme.spacing.scale.map((v, i) => [i, `${v}px`])
      ),
      borderRadius: {
        sm: theme.borderRadius.sm,
        md: theme.borderRadius.md,
        lg: theme.borderRadius.lg,
        xl: theme.borderRadius.xl,
        '2xl': theme.borderRadius['2xl'],
        full: theme.borderRadius.full,
      },
      boxShadow: {
        card: theme.boxShadow.card,
        elevated: theme.boxShadow.elevated,
        dock: theme.boxShadow.dock,
        'glow-primary': theme.boxShadow.glowPrimary,
        'glow-success': theme.boxShadow.glowSuccess,
      },
      transitionTimingFunction: {
        default: theme.animation.easing.default,
        spring: theme.animation.easing.spring,
      },
      transitionDuration: {
        fast: `${theme.animation.duration.fast}ms`,
        default: `${theme.animation.duration.default}ms`,
        slow: `${theme.animation.duration.slow}ms`,
      },
      screens: theme.breakpoints,
    },
  },
  plugins: [],
  darkMode: 'class',
};
