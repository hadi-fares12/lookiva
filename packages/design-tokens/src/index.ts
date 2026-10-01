export const MidnightGoldPalette = {
  surfaces: ['#080808', '#101010', '#151515'] as const,
  gold: ['#C9A227', '#D4AF37', '#E4C35A'] as const,
  textPrimary: '#FFFFFF',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',
  borderSubtle: '#27272A',
  borderStrong: '#3F3F46',
  accentRed: '#EF4444',
  accentGreen: '#22C55E',
  accentBlue: '#3B82F6',
  overlay: 'rgba(0, 0, 0, 0.6)',
  backdrop: 'rgba(8, 8, 8, 0.85)',
} as const;

export const SilverLightPalette = {
  surfaces: ['#FFFFFF', '#F7F7F8', '#ECEDEF'] as const,
  silver: ['#A7ABB2', '#C5C8CE'] as const,
  gold: '#D4AF37',
  textPrimary: '#111111',
  textSecondary: '#242424',
  textMuted: '#52525B',
  borderSubtle: '#E4E4E7',
  borderStrong: '#D4D4D8',
  accentRed: '#DC2626',
  accentGreen: '#16A34A',
  accentBlue: '#2563EB',
  overlay: 'rgba(0, 0, 0, 0.35)',
  backdrop: 'rgba(255, 255, 255, 0.85)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export type SpacingKey = keyof typeof spacing;
export type SpacingValue = (typeof spacing)[SpacingKey];

export const radius = {
  sm: 4,
  md: 8,
  lg: 16,
  xl: 24,
  xxl: 32,
  full: 9999,
} as const;

export type RadiusKey = keyof typeof radius;
export type RadiusValue = (typeof radius)[RadiusKey];

export const shadows = [
  'none',
  '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '0 25px 50px -12px rgb(0 0 0 / 0.25)',
] as const;

export type ShadowLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const typography = {
  fontFamily: {
    sans: [
      'Inter',
      'system-ui',
      '-apple-system',
      'BlinkMacSystemFont',
      'Segoe UI',
      'Roboto',
      'Helvetica Neue',
      'Arial',
      'sans-serif',
    ] as const,
    display: ['Playfair Display', 'Georgia', 'serif'] as const,
    arabic: ['Cairo', 'Noto Sans Arabic', 'Tajawal', 'sans-serif'] as const,
    mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace'] as const,
  },
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    md: 18,
    lg: 20,
    xl: 24,
    '2xl': 30,
    '3xl': 36,
    '4xl': 48,
    '5xl': 60,
    '6xl': 72,
  } as const,
  fontWeight: {
    thin: 100,
    extraLight: 200,
    light: 300,
    regular: 400,
    medium: 500,
    semiBold: 600,
    bold: 700,
    extraBold: 800,
    black: 900,
  } as const,
  lineHeight: {
    tight: 1.2,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  } as const,
  letterSpacing: {
    tighter: -0.05,
    tight: -0.025,
    normal: 0,
    wide: 0.025,
    wider: 0.05,
    widest: 0.1,
  } as const,
} as const;

export type FontSizeKey = keyof typeof typography.fontSize;
export type FontWeightKey = keyof typeof typography.fontWeight;
export type LineHeightKey = keyof typeof typography.lineHeight;
export type LetterSpacingKey = keyof typeof typography.letterSpacing;

export const transitions = {
  fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  normal: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '350ms cubic-bezier(0.4, 0, 0.2, 1)',
  slower: '500ms cubic-bezier(0.4, 0, 0.2, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

export const breakpoints = {
  xs: 360,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
  '3xl': 1920,
} as const;

export type BreakpointKey = keyof typeof breakpoints;

export const zIndex = {
  base: 0,
  sticky: 10,
  dropdown: 1000,
  stickyHeader: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  toast: 1080,
  snackbar: 1090,
  loading: 2000,
} as const;

export type ThemeMode = 'midnight-gold' | 'silver-light' | 'system';

export const ThemeModeValues: ThemeMode[] = ['midnight-gold', 'silver-light', 'system'];
export const DefaultTheme: ThemeMode = 'midnight-gold';

export function getPalette(mode: Exclude<ThemeMode, 'system'>) {
  return mode === 'midnight-gold' ? MidnightGoldPalette : SilverLightPalette;
}

export function resolveThemeMode(
  mode: ThemeMode,
  systemPrefersDark: boolean,
): Exclude<ThemeMode, 'system'> {
  if (mode === 'system') {
    return systemPrefersDark ? 'midnight-gold' : 'silver-light';
  }
  return mode;
}

