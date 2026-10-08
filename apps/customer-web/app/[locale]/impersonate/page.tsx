'use client';

import * as React from 'react';
import { useLocale } from 'next-intl';
import { setAuthTokens } from '@/lib/axios';

export default function ImpersonationLandingPage() {
  const locale = useLocale();
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    try {
      const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const access = fragment.get('access');
      const refresh = fragment.get('refresh');
      const target = fragment.get('target') || '';
      window.history.replaceState({}, document.title, window.location.pathname);
      if (!access || !refresh) {
        setError('Invalid impersonation session.');
        return;
      }
      setAuthTokens(access, refresh);
      localStorage.setItem('lookiva-impersonation', '1');
      localStorage.setItem('lookiva-impersonation-target', target);
      window.location.replace(`/${locale}/home`);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to start impersonation.');
    }
  }, [locale]);

  return (
    <div className="mx-auto flex min-h-[55vh] max-w-xl items-center justify-center px-5">
      <div className="w-full rounded-radius-2xl border border-border-subtle bg-surface-1 p-8 text-center">
        {error ? (
          <>
            <h1 className="text-xl font-bold text-accent-red">Impersonation failed</h1>
            <p className="mt-3 text-secondary">{error}</p>
          </>
        ) : (
          <>
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-border-subtle border-t-accent-gold-2" />
            <h1 className="mt-5 text-xl font-bold text-primary">Opening audited session…</h1>
            <p className="mt-2 text-sm text-secondary">The temporary credentials are being removed from the browser URL.</p>
          </>
        )}
      </div>
    </div>
  );
}
