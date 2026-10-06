'use client';

import * as React from 'react';
import { Languages, Check, ArrowRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import clsx from 'clsx';
import { setCurrentLocale } from '@/lib/axios';

const LANGS = [
  {
    code: 'en' as const,
    native: 'English',
    flag: '🇬🇧',
    tagline: 'Continue in English',
    previewTitle: 'Premium Beauty & Wellness',
  },
  {
    code: 'ar' as const,
    native: 'العربية',
    flag: '🇱🇧',
    tagline: 'المتابعة بالعربية',
    previewTitle: 'خدمات الجمال والعناية الفاخرة',
  },
  {
    code: 'fr' as const,
    native: 'Français',
    flag: '🇫🇷',
    tagline: 'Continuer en français',
    previewTitle: 'Beauté & bien-être premium',
  },
];

const KEY = 'lookiva-language-chosen';

export default function LanguagePage() {
  const t = useTranslations();
  const tCommon = useTranslations('common');
  const current = useLocale();
  const router = useRouter();

  const [selected, setSelected] = React.useState<(typeof LANGS)[number]['code']>(
    (current as (typeof LANGS)[number]['code']) ?? 'en'
  );

  const preview = LANGS.find((l) => l.code === selected) ?? LANGS[0];

  function continueAction() {
    localStorage.setItem(KEY, '1');
    setCurrentLocale(selected);
    const onboardingDone = localStorage.getItem('lookiva-onboarding-complete') === '1';
    router.replace(onboardingDone ? '/home' : '/onboarding', { locale: selected });
  }

  return (
    <div className="min-h-[calc(100vh-6rem)] flex flex-col items-center justify-center py-12 px-4 md:px-8 animate-fade-in">
      <div className="w-full max-w-lg">
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-16 h-16 rounded-radius-2xl bg-gradient-to-br from-accent-gold-1 to-accent-gold-3 flex items-center justify-center mb-5 shadow-shadow-2">
            <Languages className="w-8 h-8 text-surface-0" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary mb-2">
            {t('profile.language')}
          </h1>
          <p className="text-secondary text-sm md:text-base max-w-md">
            Choose your preferred language. You can change this later in Settings.
          </p>
        </div>

        <div className="grid gap-3 md:gap-4 mb-8">
          {LANGS.map((lang) => {
            const sel = selected === lang.code;
            return (
              <button
                type="button"
                key={lang.code}
                onClick={() => setSelected(lang.code)}
                className={clsx(
                  'group relative w-full text-start rounded-radius-xl border p-5 md:p-6 transition-all overflow-hidden',
                  sel
                    ? 'border-accent-gold-2 bg-accent-gold-2/5 shadow-shadow-2'
                    : 'border-border-subtle bg-surface-1 hover:border-border-strong hover:bg-surface-2'
                )}
              >
                {sel && (
                  <div className="absolute top-4 end-4 w-7 h-7 rounded-radius-full bg-gradient-to-br from-accent-gold-1 to-accent-gold-2 flex items-center justify-center text-surface-0 shadow-shadow-1">
                    <Check className="w-4 h-4" />
                  </div>
                )}
                <div className="flex items-start gap-4">
                  <div className={clsx(
                    'w-14 h-14 rounded-radius-xl flex items-center justify-center text-3xl shrink-0 transition-all',
                    sel ? 'bg-surface-0 border border-border-subtle' : 'bg-surface-0 border border-border-subtle'
                  )}>
                    {lang.flag}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-lg md:text-xl font-semibold text-primary mb-1">
                      {lang.native}
                    </div>
                    <div className="text-xs md:text-sm text-muted mb-2">
                      {lang.tagline}
                    </div>
                    <div className="text-xs md:text-sm text-secondary truncate">
                      <span className="text-accent-gold-2 font-medium">LOOKIVA</span>
                      <span className="text-muted"> — </span>
                      {lang.previewTitle}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={continueAction}
          className="w-full h-12 md:h-13 rounded-radius-xl bg-gradient-to-r from-accent-gold-1 to-accent-gold-2 text-surface-0 font-semibold text-base inline-flex items-center justify-center gap-2 hover:from-accent-gold-2 hover:to-accent-gold-3 transition-all shadow-shadow-3 active:scale-[0.99]"
        >
          {tCommon('actions.continue')}
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}



