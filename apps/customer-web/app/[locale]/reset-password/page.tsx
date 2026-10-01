'use client';

import * as React from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import axios from '@/lib/axios';

export default function ResetPasswordPage() {
  const locale = useLocale(); const t=useTranslations('resetPassword');
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError('');
    if (!token) { setError(t('missingToken')); return; }
    if (password.length < 8) { setError(t('tooShort')); return; }
    if (password !== confirmPassword) { setError(t('mismatch')); return; }
    setLoading(true);
    try { await axios.post('/auth/reset-password', { token, password }); setDone(true); }
    catch (err) { setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? t('invalid')); }
    finally { setLoading(false); }
  }

  return (
    <main className="mx-auto flex min-h-[65vh] max-w-md items-center px-4">
      <section className="w-full rounded-radius-2xl border border-border-subtle bg-surface-1 p-7 shadow-shadow-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-gold-2">{t('eyebrow')}</p>
        <h1 className="mt-2 text-2xl font-bold text-primary">{t('title')}</h1>
        <p className="mt-2 text-sm text-secondary">{t('subtitle')}</p>
        {done ? (
          <div className="mt-6 space-y-4"><div className="rounded-radius-xl border border-accent-green/30 bg-accent-green/10 p-4 text-sm text-secondary">{t('success')}</div><Link href={`/${locale}/login`} className="inline-flex h-12 w-full items-center justify-center rounded-radius-lg bg-accent-gold-2 font-semibold text-surface-0">{t('continue')}</Link></div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4"><input type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={t('newPassword')} className="h-12 w-full rounded-radius-lg border border-border-subtle bg-surface-0 px-4 text-primary outline-none focus:border-accent-gold-2" /><input type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder={t('confirmPassword')} className="h-12 w-full rounded-radius-lg border border-border-subtle bg-surface-0 px-4 text-primary outline-none focus:border-accent-gold-2" />{error && <p role="alert" className="text-sm text-accent-red">{error}</p>}<button disabled={loading || !token} className="h-12 w-full rounded-radius-lg bg-accent-gold-2 font-semibold text-surface-0 disabled:cursor-not-allowed disabled:opacity-60">{loading ? t('updating') : t('update')}</button></form>
        )}
        {!done && <Link href={`/${locale}/forgot-password`} className="mt-5 inline-block text-sm font-semibold text-accent-gold-2">{t('another')}</Link>}
      </section>
    </main>
  );
}
