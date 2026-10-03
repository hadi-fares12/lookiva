'use client';

import Link from 'next/link';
import { Bell, Search, User, LogIn } from 'lucide-react';
import { AreaPicker } from './area-picker';
import { ThemeToggle } from './theme-toggle';
import { LanguageSwitcher } from './language-switcher';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import * as React from 'react';

export function Header() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [hasToken, setHasToken] = React.useState(false);

  React.useEffect(() => {
    setHasToken(!!localStorage.getItem('lookiva-access'));
  }, []);

  function goSearch() {
    router.push('/search');
  }

  return (
    <header className="sticky top-0 z-z-sticky-header bg-surface-0/80 backdrop-blur-md border-b border-border-subtle">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 h-16 flex items-center gap-2 md:gap-4">
        <Link
          href={`/${locale}/home`}
          className="shrink-0 inline-flex items-center gap-2 me-2 md:me-4"
          aria-label="LOOKIVA home"
        >
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-radius-lg bg-gradient-to-br from-accent-gold-1 to-accent-gold-3 flex items-center justify-center shadow-shadow-1">
            <span className="text-surface-0 font-black text-base md:text-lg">L</span>
          </div>
          <div className="hidden sm:flex flex-col leading-none">
            <span className="text-primary font-bold tracking-wider text-sm md:text-base">LOOKIVA</span>
          </div>
        </Link>

        <AreaPicker className="hidden md:inline-flex" />

        <button
          onClick={goSearch}
          className="flex-1 md:flex-none md:w-80 lg:w-96 h-10 rounded-radius-md border border-border-subtle bg-surface-1 hover:bg-surface-2 inline-flex items-center gap-2 px-3 text-sm text-muted transition-colors"
          aria-label={t('common.actions.search')}
        >
          <Search className="w-4 h-4 shrink-0" />
          <span className="truncate">{t('common.actions.searchPlaceholder')}</span>
        </button>

        <div className="flex-1 md:hidden" />

        <div className="flex items-center gap-1 sm:gap-2">
          <AreaPicker className="md:hidden" compact />
          <ThemeToggle />
          <LanguageSwitcher />
          <Link
            href={`/${locale}/notifications`}
            className="w-10 h-10 rounded-radius-md border border-border-subtle bg-surface-1 hover:bg-surface-2 text-secondary hover:text-primary inline-flex items-center justify-center transition-colors relative"
            aria-label={t('nav.notifications')}
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 end-1.5 w-2 h-2 rounded-radius-full bg-accent-gold-2" />
          </Link>
          {hasToken ? (
            <Link
              href={`/${locale}/profile`}
              className="w-10 h-10 rounded-radius-md border border-border-subtle bg-surface-1 hover:bg-surface-2 text-secondary hover:text-primary inline-flex items-center justify-center transition-colors"
              aria-label={t('nav.profile')}
            >
              <User className="w-4 h-4" />
            </Link>
          ) : (
            <Link
              href={`/${locale}/login`}
              className="h-10 px-3 md:px-4 rounded-radius-md bg-gradient-to-r from-accent-gold-1 to-accent-gold-2 text-surface-0 font-semibold text-sm inline-flex items-center gap-2 hover:from-accent-gold-2 hover:to-accent-gold-3 transition-all shadow-shadow-1"
            >
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:inline">{t('auth.login')}</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}


