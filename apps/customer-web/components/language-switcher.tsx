'use client';

import * as React from 'react';
import { Languages, Check } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { usePathname } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

const LOCALES = [
  { code: 'en', label: 'English', native: 'EN', flag: '🇬🇧' },
  { code: 'ar', label: 'العربية', native: 'العربية', flag: '🇱🇧' },
  { code: 'fr', label: 'Français', native: 'FR', flag: '🇫🇷' },
] as const;

export function LanguageSwitcher({ className }: { className?: string }) {
  const t = useTranslations('profile');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const active = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  function setLocale(code: (typeof LOCALES)[number]['code']) {
    const nextPathname = pathname || '/';
    const base = nextPathname.replace(/^\/(en|ar|fr)(\/|$)/, '/');
    const newPath = `/${code}${base === '/' ? '/' : base}`;
    router.replace(newPath);
    setOpen(false);
  }

  return (
    <div className={twMerge('relative', className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-10 h-10 rounded-radius-md border border-border-subtle bg-surface-1 hover:bg-surface-2 text-secondary hover:text-primary inline-flex items-center justify-center gap-1 text-xs font-semibold transition-colors"
        aria-label={t('language')}
      >
        <Languages className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute z-z-popover end-0 mt-2 w-52 rounded-radius-lg border border-border-subtle bg-surface-1 p-1 shadow-shadow-4 animate-fade-in">
          <div className="px-3 py-2 text-xs uppercase text-muted font-semibold tracking-wide">
            {t('language')}
          </div>
          <div className="flex flex-col gap-0.5">
            {LOCALES.map((opt) => {
              const selected = opt.code === locale;
              return (
                <button
                  key={opt.code}
                  type="button"
                  onClick={() => setLocale(opt.code)}
                  className={clsx(
                    'w-full inline-flex items-center gap-3 px-3 py-2 rounded-radius-md text-sm transition-colors text-left',
                    selected
                      ? 'bg-accent-gold-2/10 text-accent-gold-2'
                      : 'text-secondary hover:bg-surface-2 hover:text-primary'
                  )}
                >
                  <span className="text-base">{opt.flag}</span>
                  <span className="flex-1 font-medium">{opt.native}</span>
                  <span className="text-xs text-muted">{opt.code.toUpperCase()}</span>
                  {selected && <Check className="w-4 h-4 text-accent-gold-2" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}



