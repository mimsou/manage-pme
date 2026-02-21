/**
 * Manage PME — Single source of truth for the entire design system.
 * Re-exports from tokens.js (used by Tailwind) and exposes Theme type.
 * Edit tokens.js to change the entire application appearance.
 */
import { theme as tokens } from './tokens';
export const theme = tokens;
export type Theme = typeof theme;
