/**
 * Manage PME — Single source of truth for the entire design system.
 * Re-exports from tokens.js (used by Tailwind) and exposes Theme type.
 * Edit tokens.js to change the entire application appearance.
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error tokens.js has no declaration file
import { theme as tokens } from './tokens';
export const theme = tokens;
export type Theme = typeof theme;
