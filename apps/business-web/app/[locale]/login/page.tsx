'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { loginBusiness } from '@/lib/api';

export default function LoginPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await loginBusiness(identifier, password, rememberMe);
      router.replace(`/${params.locale}/dashboard`);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('unableSignIn'));
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-surface-1 border border-border-subtle rounded-radius-xl p-6 md:p-8 shadow-shadow-2">
          <div className="flex flex-col items-center mb-8"><div className="w-16 h-16 rounded-radius-xl bg-gradient-to-br from-accent-gold-1 to-accent-gold-3 flex items-center justify-center mb-4"><span className="text-surface-0 font-black text-2xl">L</span></div><h1 className="text-2xl font-bold text-primary">{t('welcomeBack')}</h1><p className="text-sm text-muted mt-1">{t('businessSecureAccess')}</p></div>
          {error && <div className="mb-5 rounded-radius-md border border-accent-red/40 bg-accent-red/10 px-4 py-3 text-sm text-accent-red">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div><label className="block text-sm font-medium text-secondary mb-1.5">{t('emailOrPhone')}</label><input required value={identifier} onChange={e => setIdentifier(e.target.value)} className="w-full h-11 px-4 rounded-radius-md bg-surface-0 border border-border-subtle text-primary focus:outline-none focus:border-accent-gold-2" placeholder="owner@business.com" autoComplete="username" /></div>
            <div><label className="block text-sm font-medium text-secondary mb-1.5">{t('password')}</label><input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full h-11 px-4 rounded-radius-md bg-surface-0 border border-border-subtle text-primary focus:outline-none focus:border-accent-gold-2" placeholder="••••••••" autoComplete="current-password" /></div>
            <div className="flex items-center justify-between text-sm"><label className="flex items-center gap-2 text-secondary cursor-pointer"><input checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} type="checkbox" className="rounded border-border-strong bg-surface-0"/><span>{t('rememberMe')}</span></label><Link href={`/${params.locale}/forgot-password`} className="text-accent-gold-2 hover:text-accent-gold-3">{t('forgotPassword')}</Link></div>
            <button type="submit" disabled={loading} className="w-full h-11 rounded-radius-md bg-gradient-to-r from-accent-gold-1 to-accent-gold-2 text-surface-0 font-semibold disabled:opacity-50">{loading ? t('signingIn') : t('login')}</button>
          </form>
          <div className="mt-6 border-t border-border-subtle pt-5 text-center">
            <p className="text-sm text-muted">New to LOOKIVA Business?</p>
            <Link href={`/${params.locale}/register`} className="mt-2 inline-flex h-10 items-center justify-center rounded-radius-md border border-accent-gold-2/50 px-4 text-sm font-semibold text-accent-gold-2 hover:bg-accent-gold-2/10">
              Register your business
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
