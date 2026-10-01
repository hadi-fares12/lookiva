'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { requestPasswordReset } from '@/lib/api';

export default function ForgotPasswordPage() {
  const t = useTranslations('auth');
  const { locale } = useParams<{ locale: string }>();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError('');
    try { await requestPasswordReset(email.trim()); setSent(true); }
    catch (e) { setError(e instanceof Error ? e.message : t('resetRequestError')); }
    finally { setLoading(false); }
  }
  return <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12"><div className="w-full max-w-md rounded-radius-xl border border-border-subtle bg-surface-1 p-6 md:p-8 shadow-shadow-2"><h1 className="text-2xl font-bold text-primary">{t('resetPassword')}</h1><p className="mt-2 text-sm text-secondary">{t('resetInstructions')}</p>{sent?<div className="mt-6 rounded-radius-md border border-accent-green/30 bg-accent-green/10 p-4 text-sm text-secondary">{t('resetEmailSent')}</div>:<form onSubmit={submit} className="mt-6 space-y-4"><label className="block"><span className="mb-1.5 block text-sm font-medium text-secondary">{t('email')}</span><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" className="h-11 w-full rounded-radius-md border border-border-subtle bg-surface-0 px-4 text-primary outline-none focus:border-accent-gold-2" /></label>{error&&<p role="alert" className="text-sm text-accent-red">{error}</p>}<button disabled={loading} className="h-11 w-full rounded-radius-md bg-accent-gold-2 font-semibold text-surface-0 disabled:opacity-50">{loading?t('sending'):t('sendResetLink')}</button></form>}<Link href={`/${locale}/login`} className="mt-5 inline-block text-sm font-semibold text-accent-gold-2">{t('backToLogin')}</Link></div></div>;
}
