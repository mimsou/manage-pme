import { z } from 'zod';

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color');
const rgbaString = z.string().regex(/^rgba?\([^)]+\)$/, 'Invalid rgba string');

const colorsSchema = z.object({
  background: z.object({
    base: hexColor,
    surface: hexColor,
    card: hexColor,
    elevated: hexColor,
  }),
  border: z.object({
    subtle: hexColor,
    default: hexColor,
  }),
  text: z.object({
    primary: hexColor,
    secondary: hexColor,
    muted: hexColor,
  }),
  brand: z.object({
    primary: hexColor,
    primaryLight: hexColor,
    primaryDark: hexColor,
    accent: hexColor,
  }),
  semantic: z.object({
    success: hexColor,
    warning: hexColor,
    danger: hexColor,
    info: hexColor,
  }),
});

const typographySchema = z.object({
  fontFamily: z.object({
    primary: z.string().min(1),
    mono: z.string().min(1),
  }),
  fontSize: z.object({
    xs: z.string(),
    sm: z.string(),
    base: z.string(),
    lg: z.string(),
    xl: z.string(),
    '2xl': z.string(),
    '3xl': z.string(),
    '4xl': z.string(),
  }),
  fontWeight: z.object({
    regular: z.number().int().min(1).max(900),
    medium: z.number().int().min(1).max(900),
    semibold: z.number().int().min(1).max(900),
    bold: z.number().int().min(1).max(900),
  }),
  lineHeight: z.object({
    tight: z.number().positive(),
    normal: z.number().positive(),
    relaxed: z.number().positive(),
  }),
});

const spacingSchema = z.object({
  unit: z.number().int().min(0),
  scale: z.array(z.number().int().min(0)).length(14),
});

const borderRadiusSchema = z.object({
  sm: z.string(),
  md: z.string(),
  lg: z.string(),
  xl: z.string(),
  '2xl': z.string(),
  full: z.string(),
});

const boxShadowSchema = z.object({
  card: z.string(),
  elevated: z.string(),
  dock: z.string(),
  glowPrimary: z.string(),
  glowSuccess: z.string(),
});

const animationSchema = z.object({
  duration: z.object({
    fast: z.number().int().min(0),
    default: z.number().int().min(0),
    slow: z.number().int().min(0),
  }),
  easing: z.object({
    default: z.string(),
    spring: z.string(),
  }),
  transition: z.object({
    fast: z.string(),
    default: z.string(),
    slow: z.string(),
    dockIconHover: z.string(),
  }),
});

const glassmorphismSchema = z.object({
  backdropFilter: z.string(),
  background: rgbaString,
  border: rgbaString,
});

const dockSchema = z.object({
  background: rgbaString,
  defaultIconSize: z.number().int().positive(),
  hoverIconSize: z.number().int().positive(),
  neighborIconSize: z.number().int().positive(),
  padding: z.string(),
  gapBetweenIcons: z.number().int().min(0),
  borderRadius: z.string(),
  magnificationEasing: z.string(),
});

const breakpointsSchema = z.object({
  sm: z.string(),
  md: z.string(),
  lg: z.string(),
  xl: z.string(),
  '2xl': z.string(),
});

export const themeSchema = z.object({
  colors: colorsSchema,
  typography: typographySchema,
  spacing: spacingSchema,
  borderRadius: borderRadiusSchema,
  boxShadow: boxShadowSchema,
  animation: animationSchema,
  glassmorphism: glassmorphismSchema,
  effects: z.object({ frosted: z.string() }),
  dock: dockSchema,
  breakpoints: breakpointsSchema,
});

export type ThemeInput = z.infer<typeof themeSchema>;

export function validateTheme(data: unknown): ThemeInput {
  return themeSchema.parse(data);
}

export function validateThemePartial(data: unknown): Partial<ThemeInput> {
  return themeSchema.partial().parse(data);
}
