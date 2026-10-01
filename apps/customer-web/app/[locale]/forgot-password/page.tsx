'use client';
import * as React from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import axios from '@/lib/axios';
export default function ForgotPasswordPage(){
  const locale=useLocale();const t=useTranslations('passwordRecovery');const[email,setEmail]=React.useState('');const[loading,setLoading]=React.useState(false);const[sent,setSent]=React.useState(false);const[error,setError]=React.useState('');
  async function submit(e:React.FormEvent){e.preventDefault();setLoading(true);setError('');try{await axios.post('/auth/forgot-password',{email});setSent(true);}catch(e){setError(e instanceof Error?e.message:t('error'));}finally{setLoading(false)}}
  return <div className="mx-auto flex min-h-[65vh] max-w-md items-center px-4"><div className="w-full rounded-radius-2xl border border-border-subtle bg-surface-1 p-7 shadow-shadow-2"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-gold-2">{t('eyebrow')}</p><h1 className="mt-2 text-2xl font-bold text-primary">{t('title')}</h1><p className="mt-2 text-sm text-secondary">{t('subtitle')}</p>{sent?<div className="mt-6 rounded-radius-xl border border-accent-green/30 bg-accent-green/10 p-4 text-sm text-secondary">{t('success')}</div>:<form onSubmit={submit} className="mt-6 space-y-4"><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" className="h-12 w-full rounded-radius-lg border border-border-subtle bg-surface-0 px-4 text-primary outline-none focus:border-accent-gold-2"/>{error&&<p className="text-sm text-accent-red">{error}</p>}<button disabled={loading} className="h-12 w-full rounded-radius-lg bg-accent-gold-2 font-semibold text-surface-0 disabled:opacity-60">{loading?t('sending'):t('send')}</button></form>}<Link href={`/${locale}/login`} className="mt-5 inline-block text-sm font-semibold text-accent-gold-2">{t('back')}</Link></div></div>;
}
