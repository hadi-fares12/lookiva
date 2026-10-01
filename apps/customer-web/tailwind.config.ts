import type { Config } from 'tailwindcss';
import { breakpoints } from '@lookiva/design-tokens';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    screens: {
      xs: `${breakpoints.xs}px`,
      sm: `${breakpoints.sm}px`,
      md: `${breakpoints.md}px`,
      lg: `${breakpoints.lg}px`,
      xl: `${breakpoints.xl}px`,
      '2xl': `${breakpoints['2xl']}px`,
      '3xl': `${breakpoints['3xl']}px`,
    },
    extend: {
      colors: {
        'surface-0': 'var(--surface-0)',
        'surface-1': 'var(--surface-1)',
        'surface-2': 'var(--surface-2)',
        'accent-gold-1': 'var(--accent-gold-1)',
        'accent-gold-2': 'var(--accent-gold-2)',
        'accent-gold-3': 'var(--accent-gold-3)',
        'accent-silver-1': 'var(--accent-silver-1)',
        'accent-silver-2': 'var(--accent-silver-2)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'border-subtle': 'var(--border-subtle)',
        'border-strong': 'var(--border-strong)',
        'accent-red': 'var(--accent-red)',
        'accent-green': 'var(--accent-green)',
        'accent-blue': 'var(--accent-blue)',
      },
      backgroundColor: {
        'surface-0': 'var(--surface-0)',
        'surface-1': 'var(--surface-1)',
        'surface-2': 'var(--surface-2)',
      },
      borderColor: {
        'border-subtle': 'var(--border-subtle)',
        'border-strong': 'var(--border-strong)',
      },
      textColor: {
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        muted: 'var(--text-muted)',
      },
      spacing: {
        'spacing-xs': 'var(--spacing-xs)',
        'spacing-sm': 'var(--spacing-sm)',
        'spacing-md': 'var(--spacing-md)',
        'spacing-lg': 'var(--spacing-lg)',
        'spacing-xl': 'var(--spacing-xl)',
        'spacing-xxl': 'var(--spacing-xxl)',
        'spacing-xxxl': 'var(--spacing-xxxl)',
      },
      borderRadius: {
        'radius-sm': 'var(--radius-sm)',
        'radius-md': 'var(--radius-md)',
        'radius-lg': 'var(--radius-lg)',
        'radius-xl': 'var(--radius-xl)',
        'radius-xxl': 'var(--radius-xxl)',
        'radius-full': 'var(--radius-full)',
      },
      boxShadow: {
        'shadow-0': 'var(--shadow-0)',
        'shadow-1': 'var(--shadow-1)',
        'shadow-2': 'var(--shadow-2)',
        'shadow-3': 'var(--shadow-3)',
        'shadow-4': 'var(--shadow-4)',
        'shadow-5': 'var(--shadow-5)',
        'shadow-6': 'var(--shadow-6)',
      },
      zIndex: {
        'z-base': 'var(--z-base)',
        'z-sticky': 'var(--z-sticky)',
        'z-dropdown': 'var(--z-dropdown)',
        'z-sticky-header': 'var(--z-sticky-header)',
        'z-fixed': 'var(--z-fixed)',
        'z-modal-backdrop': 'var(--z-modal-backdrop)',
        'z-modal': 'var(--z-modal)',
        'z-popover': 'var(--z-popover)',
        'z-tooltip': 'var(--z-tooltip)',
        'z-toast': 'var(--z-toast)',
        'z-snackbar': 'var(--z-snackbar)',
        'z-loading': 'var(--z-loading)',
      },
      transitionDuration: {
        'transition-fast': '150ms',
        'transition-normal': '250ms',
        'transition-slow': '350ms',
        'transition-slower': '500ms',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
        arabic: ['Cairo', 'Noto Sans Arabic', 'Tajawal', 'sans-serif'],
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.5s ease-in-out infinite',
        'fade-in': 'fade-in 0.35s ease-out both',
      },
    },
  },
  plugins: [],
};

export default config;
