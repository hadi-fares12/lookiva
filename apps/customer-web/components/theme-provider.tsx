'use client';

import * as React from 'react';
import { useLocale } from 'next-intl';
import axios from '@/lib/axios';
import { APIPaths } from '@lookiva/api-contracts';

type Theme = 'midnight-gold' | 'silver-light' | 'system';

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

interface ThemeProviderState {
  theme: Theme;
  resolvedTheme: Exclude<Theme, 'system'>;
  setTheme: (theme: Theme) => void;
}

const ThemeProviderContext = React.createContext<ThemeProviderState | undefined>(undefined);

function applyThemeToDocument(theme: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const resolved =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'midnight-gold'
        : 'silver-light'
      : theme;

  root.setAttribute('data-theme', resolved);
  if (resolved === 'midnight-gold') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  return resolved as Exclude<Theme, 'system'>;
}

export function ThemeProvider({
  children,
  defaultTheme = 'midnight-gold',
  storageKey = 'lookiva-theme',
}: ThemeProviderProps) {
  const locale = useLocale();
  const [theme, setThemeState] = React.useState<Theme>(() => {
    if (typeof window === 'undefined') return defaultTheme;
    const stored = localStorage.getItem(storageKey) as Theme | null;
    return stored ?? defaultTheme;
  });
  const [resolvedTheme, setResolvedTheme] = React.useState<Exclude<Theme, 'system'>>(
    theme === 'system' ? 'midnight-gold' : theme
  );

  React.useEffect(() => {
    const resolved = applyThemeToDocument(theme);
    if (resolved) setResolvedTheme(resolved);
    localStorage.setItem(storageKey, theme);
  }, [theme, storageKey]);

  React.useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const resolved = applyThemeToDocument(theme);
      if (resolved) setResolvedTheme(resolved);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  React.useEffect(() => {
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('lookiva-access') : null;
    if (!accessToken) return;
    (async () => {
      try {
        const { data } = await axios.get(APIPaths.USERS_ME, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const serverTheme = (data as { themeMode?: string })?.themeMode;
        if (serverTheme && (serverTheme === 'midnight-gold' || serverTheme === 'silver-light' || serverTheme === 'system')) {
          setThemeState(serverTheme as Theme);
        }
      } catch {
        // ignore
      }
    })();
  }, [locale]);

  const setTheme = React.useCallback(
    (t: Theme) => {
      setThemeState(t);
    },
    []
  );

  const value = React.useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme]
  );

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export function useTheme() {
  const ctx = React.useContext(ThemeProviderContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}


