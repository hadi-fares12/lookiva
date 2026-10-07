'use client';

import * as React from 'react';
import { useLocale } from 'next-intl';
import { clearAuthTokens } from '@/lib/axios';

const FLAG = 'lookiva-impersonation';
const TARGET = 'lookiva-impersonation-target';

export function ImpersonationBanner() {
  const locale = useLocale();
  const [target, setTarget] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      if (localStorage.getItem(FLAG) === '1') {
        setTarget(localStorage.getItem(TARGET) || '');
      }
    } catch {
      setTarget(null);
    }
  }, []);

  if (target === null) return null;

  const text =
    locale === 'ar'
      ? `أنت الآن تستعرض الحساب ${target || 'كمستخدم آخر'} بصلاحية انتحال مدققة.`
      : locale === 'fr'
        ? `Vous consultez ${target || 'un autre compte'} via une session d’usurpation auditée.`
        : `You are viewing ${target || 'another account'} through an audited impersonation session.`;
  const exit =
    locale === 'ar'
      ? 'إنهاء الانتحال'
      : locale === 'fr'
        ? 'Quitter l’usurpation'
        : 'Exit impersonation';

  function stop() {
    clearAuthTokens();
    try {
      localStorage.removeItem(FLAG);
      localStorage.removeItem(TARGET);
    } catch {
      // Ignore storage cleanup failures; the auth tokens were already cleared.
    }
    window.location.replace(`/${locale}/login`);
  }

  return (
    <div className="sticky top-0 z-[1000] flex items-center justify-center gap-3 border-b border-accent-red/30 bg-accent-red px-4 py-2 text-center text-sm font-semibold text-white">
      <span>{text}</span>
      <button
        type="button"
        onClick={stop}
        className="rounded-radius-md border border-white/50 px-3 py-1 text-xs font-bold hover:bg-white/10"
      >
        {exit}
      </button>
    </div>
  );
}
