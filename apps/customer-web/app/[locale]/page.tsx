'use client';

import * as React from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';

const ONBOARDING_KEY = 'lookiva-onboarding-complete';
const LANGUAGE_KEY = 'lookiva-language-chosen';

export default function LocaleRoot() {
  const router = useRouter();
  const locale = useLocale();
  const [mounted, setMounted] = React.useState(false);
  const [dots, setDots] = React.useState('');

  React.useEffect(() => {
    setMounted(true);
    const t = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '' : `${d}.`));
    }, 400);
    return () => clearInterval(t);
  }, []);

  React.useEffect(() => {
    if (!mounted) return;
    const hasToken = !!localStorage.getItem('lookiva-access');
    const onboarded = localStorage.getItem(ONBOARDING_KEY) === '1';
    const langPicked = localStorage.getItem(LANGUAGE_KEY) === '1';

    const timer = setTimeout(() => {
      if (!langPicked && !localStorage.getItem('lookiva-locale-picker-skipped')) {
        router.replace('/language');
        return;
      }
      if (!onboarded) {
        router.replace('/onboarding');
        return;
      }
      router.replace('/home');
    }, 900);

    return () => clearTimeout(timer);
  }, [mounted, locale, router]);

  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center">
      <div className="flex flex-col items-center animate-fade-in">
        <div className="relative">
          <div className="absolute inset-0 rounded-radius-2xl bg-accent-gold-2/20 blur-2xl animate-pulse" />
          <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-radius-2xl bg-gradient-to-br from-accent-gold-1 via-accent-gold-2 to-accent-gold-3 flex items-center justify-center shadow-shadow-5">
            <span className="text-surface-0 font-black text-5xl md:text-6xl tracking-wider">L</span>
          </div>
        </div>
        <h1 className="mt-8 text-3xl md:text-4xl font-black tracking-[0.35em] text-primary">LOOKIVA</h1>
        <p className="mt-3 text-sm md:text-base text-muted tracking-wide">
          Premium Beauty &amp; Wellness Nearby{dots}
        </p>
        <div className="mt-10 flex items-center gap-2">
          <span className="w-2 h-2 rounded-radius-full bg-accent-gold-2 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-radius-full bg-accent-gold-2 animate-bounce" style={{ animationDelay: '120ms' }} />
          <span className="w-2 h-2 rounded-radius-full bg-accent-gold-2 animate-bounce" style={{ animationDelay: '240ms' }} />
        </div>
      </div>
    </div>
  );
}



