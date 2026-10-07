'use client';

import * as React from 'react';
import { useLocale } from 'next-intl';

type Consent = 'essential' | 'analytics';
const STORAGE_KEY = 'lookiva-cookie-consent-v1';

function applyConsent(value: Consent) {
  document.documentElement.dataset.cookieConsent = value;
  window.dispatchEvent(
    new CustomEvent('lookiva:cookie-consent', {
      detail: { analytics: value === 'analytics' },
    }),
  );
}

export function CookieConsent() {
  const locale = useLocale();
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Consent | null;
      if (saved === 'essential' || saved === 'analytics') {
        applyConsent(saved);
      } else {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const copy =
    locale === 'ar'
      ? {
          title: 'الخصوصية وملفات الارتباط',
          body: 'نستخدم ملفات أساسية لتشغيل لوكيفا. يمكنك السماح ببيانات تحليلية غير ضرورية لتحسين الأداء والتجربة.',
          essential: 'الأساسية فقط',
          analytics: 'السماح بالتحليلات',
        }
      : locale === 'fr'
        ? {
            title: 'Confidentialité et cookies',
            body: 'LOOKIVA utilise des cookies essentiels pour fonctionner. Vous pouvez autoriser des données analytiques facultatives afin d’améliorer les performances et l’expérience.',
            essential: 'Essentiels uniquement',
            analytics: 'Autoriser les analyses',
          }
        : {
            title: 'Privacy & cookies',
            body: 'LOOKIVA uses essential cookies to operate. You can optionally allow analytics data to improve performance and the customer experience.',
            essential: 'Essential only',
            analytics: 'Allow analytics',
          };

  function choose(value: Consent) {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // Consent still applies for this page session even if persistence is unavailable.
    }
    applyConsent(value);
    setVisible(false);
  }

  return (
    <div className="fixed inset-x-3 bottom-3 z-[1200] mx-auto max-w-3xl rounded-radius-xl border border-border-subtle bg-surface-0 p-4 shadow-2xl md:bottom-5 md:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-semibold text-primary">{copy.title}</p>
          <p className="mt-1 text-sm text-secondary">{copy.body}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => choose('essential')}
            className="rounded-radius-md border border-border-subtle px-4 py-2 text-sm font-semibold text-primary"
          >
            {copy.essential}
          </button>
          <button
            type="button"
            onClick={() => choose('analytics')}
            className="rounded-radius-md bg-accent-gold-2 px-4 py-2 text-sm font-semibold text-surface-0"
          >
            {copy.analytics}
          </button>
        </div>
      </div>
    </div>
  );
}
