/**
 * Plain JS export of theme for Tailwind config (Node cannot load .ts directly).
 * Keep in sync with theme/index.ts - index.ts re-exports this for app code.
 */
export const theme = {
  colors: {
    background: {
      base: '#0F0F13',
      surface: '#17171D',
      card: '#1E1E28',
      elevated: '#252532',
    },
    border: {
      subtle: '#2A2A38',
      default: '#363648',
    },
    text: {
      primary: '#F1F1F5',
      secondary: '#9898AD',
      muted: '#5C5C75',
    },
    brand: {
      primary: '#6366F1',
      primaryLight: '#818CF8',
      primaryDark: '#4F46E5',
      accent: '#10B981',
    },
    semantic: {
      success: '#10B981',
      warning: '#F59E0B',
      danger: '#EF4444',
      info: '#3B82F6',
    },
  },
  typography: {
    fontFamily: {
      primary: "'Inter', 'SF Pro Display', system-ui, sans-serif",
      mono: "'JetBrains Mono', 'Fira Code', monospace",
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
    },
    fontWeight: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.625,
    },
  },
  spacing: {
    unit: 4,
    scale: [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128],
  },
  borderRadius: {
    sm: '6px',
    md: '10px',
    lg: '14px',
    xl: '20px',
    '2xl': '28px',
    full: '9999px',
  },
  boxShadow: {
    card: '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
    elevated: '0 10px 40px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)',
    dock: '0 -8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
    glowPrimary: '0 0 20px rgba(99,102,241,0.3)',
    glowSuccess: '0 0 16px rgba(16,185,129,0.25)',
  },
  animation: {
    duration: { fast: 120, default: 200, slow: 400 },
    easing: {
      default: 'cubic-bezier(0.16, 1, 0.3, 1)',
      spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    },
    transition: {
      fast: '120ms cubic-bezier(0.16, 1, 0.3, 1)',
      default: '200ms cubic-bezier(0.16, 1, 0.3, 1)',
      slow: '400ms cubic-bezier(0.16, 1, 0.3, 1)',
      dockIconHover: 'width 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
    },
  },
  glassmorphism: {
    backdropFilter: 'blur(20px) saturate(180%)',
    background: 'rgba(30, 30, 40, 0.7)',
    border: 'rgba(255, 255, 255, 0.08)',
  },
  effects: { frosted: 'backdrop-filter: blur(40px) saturate(200%)' },
  dock: {
    background: 'rgba(15, 15, 20, 0.85)',
    defaultIconSize: 48,
    hoverIconSize: 64,
    neighborIconSize: 56,
    padding: '12px 24px',
    gapBetweenIcons: 8,
    borderRadius: '28px',
    magnificationEasing: 'cubic-bezier(0.16, 1, 0.3, 1)',
  },
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
};
