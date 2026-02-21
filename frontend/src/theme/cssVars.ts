/**
 * Maps the theme object to CSS custom property declarations.
 * Used for :root variables and runtime overrides from Admin UI.
 */

import { theme, type Theme } from './index';

function toCssVars(t: Theme): Record<string, string> {
  const num = (n: number, suffix = 'px') => (suffix === 'ms' ? `${n}ms` : `${n}${suffix}`);
  return {
    // Backgrounds
    '--color-bg-base': t.colors.background.base,
    '--color-bg-surface': t.colors.background.surface,
    '--color-bg-card': t.colors.background.card,
    '--color-bg-elevated': t.colors.background.elevated,
    // Borders
    '--color-border-subtle': t.colors.border.subtle,
    '--color-border-default': t.colors.border.default,
    // Text
    '--color-text-primary': t.colors.text.primary,
    '--color-text-secondary': t.colors.text.secondary,
    '--color-text-muted': t.colors.text.muted,
    // Brand
    '--color-brand-primary': t.colors.brand.primary,
    '--color-brand-primary-light': t.colors.brand.primaryLight,
    '--color-brand-primary-dark': t.colors.brand.primaryDark,
    '--color-brand-accent': t.colors.brand.accent,
    // Semantic
    '--color-success': t.colors.semantic.success,
    '--color-warning': t.colors.semantic.warning,
    '--color-danger': t.colors.semantic.danger,
    '--color-info': t.colors.semantic.info,
    // Typography
    '--font-family-primary': t.typography.fontFamily.primary,
    '--font-family-mono': t.typography.fontFamily.mono,
    '--font-size-xs': t.typography.fontSize.xs,
    '--font-size-sm': t.typography.fontSize.sm,
    '--font-size-base': t.typography.fontSize.base,
    '--font-size-lg': t.typography.fontSize.lg,
    '--font-size-xl': t.typography.fontSize.xl,
    '--font-size-2xl': t.typography.fontSize['2xl'],
    '--font-size-3xl': t.typography.fontSize['3xl'],
    '--font-size-4xl': t.typography.fontSize['4xl'],
    '--font-weight-regular': String(t.typography.fontWeight.regular),
    '--font-weight-medium': String(t.typography.fontWeight.medium),
    '--font-weight-semibold': String(t.typography.fontWeight.semibold),
    '--font-weight-bold': String(t.typography.fontWeight.bold),
    '--line-height-tight': String(t.typography.lineHeight.tight),
    '--line-height-normal': String(t.typography.lineHeight.normal),
    '--line-height-relaxed': String(t.typography.lineHeight.relaxed),
    // Spacing (scale indices 0-13)
    ...Object.fromEntries(
      t.spacing.scale.map((v, i) => [`--spacing-${i}`, `${v}px`])
    ),
    '--spacing-unit': `${t.spacing.unit}px`,
    // Border radius
    '--radius-sm': t.borderRadius.sm,
    '--radius-md': t.borderRadius.md,
    '--radius-lg': t.borderRadius.lg,
    '--radius-xl': t.borderRadius.xl,
    '--radius-2xl': t.borderRadius['2xl'],
    '--radius-full': t.borderRadius.full,
    // Shadows
    '--shadow-card': t.boxShadow.card,
    '--shadow-elevated': t.boxShadow.elevated,
    '--shadow-dock': t.boxShadow.dock,
    '--shadow-glow-primary': t.boxShadow.glowPrimary,
    '--shadow-glow-success': t.boxShadow.glowSuccess,
    // Animation
    '--duration-fast': num(t.animation.duration.fast, 'ms'),
    '--duration-default': num(t.animation.duration.default, 'ms'),
    '--duration-slow': num(t.animation.duration.slow, 'ms'),
    '--easing-default': t.animation.easing.default,
    '--easing-spring': t.animation.easing.spring,
    '--transition-fast': t.animation.transition.fast,
    '--transition-default': t.animation.transition.default,
    '--transition-slow': t.animation.transition.slow,
    '--transition-dock-icon': t.animation.transition.dockIconHover,
    // Glassmorphism
    '--glass-backdrop': t.glassmorphism.backdropFilter,
    '--glass-bg': t.glassmorphism.background,
    '--glass-border': t.glassmorphism.border,
    // Dock
    '--dock-bg': t.dock.background,
    '--dock-icon-size': `${t.dock.defaultIconSize}px`,
    '--dock-icon-size-hover': `${t.dock.hoverIconSize}px`,
    '--dock-icon-size-neighbor': `${t.dock.neighborIconSize}px`,
    '--dock-padding': t.dock.padding,
    '--dock-gap': `${t.dock.gapBetweenIcons}px`,
    '--dock-radius': t.dock.borderRadius,
    '--dock-easing': t.dock.magnificationEasing,
    // Breakpoints (for reference / JS)
    '--breakpoint-sm': t.breakpoints.sm,
    '--breakpoint-md': t.breakpoints.md,
    '--breakpoint-lg': t.breakpoints.lg,
    '--breakpoint-xl': t.breakpoints.xl,
    '--breakpoint-2xl': t.breakpoints['2xl'],
  };
}

export function themeToCssVars(t: Theme = theme): Record<string, string> {
  return toCssVars(t);
}

export function themeToCssRoot(t?: Theme): string {
  const vars = toCssVars(t || theme);
  const lines = Object.entries(vars).map(([k, v]) => `  ${k}: ${v};`);
  return `:root {\n${lines.join('\n')}\n}`;
}

export function applyThemeToDom(t?: Theme): void {
  const vars = toCssVars(t || theme);
  const root = document.documentElement;
  for (const [name, value] of Object.entries(vars)) {
    root.style.setProperty(name, value);
  }
}
