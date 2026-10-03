'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  UserRound,
  Mail,
  Phone,
  Lock,
  Globe2,
  Upload,
  Eye,
  EyeOff,
  CheckCircle2,
  UserPlus,
  ChevronLeft,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import clsx from 'clsx';
import axios, { setAuthTokens } from '@/lib/axios';
import { APIPaths, type AuthResponse, type RegisterRequest } from '@lookiva/api-contracts';
import { toast } from 'sonner';

const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية' },
  { code: 'fr', label: 'Français' },
] as const;

export default function RegisterPage() {
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();

  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [lang, setLang] = React.useState(locale);
  const [terms, setTerms] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [dragOver, setDragOver] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      toast.warning(tCommon('actions.select'), { description: `${t('firstName')} / ${t('lastName')}` });
      return;
    }
    if (!email.trim() && !phone.trim()) {
      toast.warning(tCommon('actions.select'), {
        description: `${t('email')} / ${t('phone')}`,
      });
      return;
    }
    if (!password) {
      toast.warning(tCommon('actions.select'), { description: t('password') });
      return;
    }
    if (!terms) {
      toast.warning(tCommon('actions.select'), { description: t('iAcceptTerms') });
      return;
    }

    try {
      setLoading(true);
      const body: RegisterRequest = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        password,
        locale: lang,
        acceptTerms: terms,
      };
      const { data } = await axios.post<AuthResponse>(APIPaths.REGISTER, body);
      if (data.accessToken && data.refreshToken) {
        setAuthTokens(data.accessToken, data.refreshToken);
      }
      toast.success(t('registerSuccess'));
      router.push(`/${locale}/location-permission`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-12 px-4 animate-fade-in">
      <div className="w-full max-w-lg">
        <div className="bg-surface-1 border border-border-subtle rounded-radius-2xl p-6 md:p-8 shadow-shadow-3">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-radius-2xl bg-gradient-to-br from-accent-gold-1 to-accent-gold-3 flex items-center justify-center mb-4 shadow-shadow-2">
              <UserPlus className="w-7 h-7 text-surface-0" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-primary text-center">
              {t('welcomeToLookiva')}
            </h1>
            <p className="mt-2 text-sm text-muted text-center">{t('register')}</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4 md:space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1.5">
                  {t('firstName')}
                </label>
                <div className="relative">
                  <UserRound className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full h-11 ps-11 pe-4 rounded-radius-lg bg-surface-0 border border-border-subtle text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent-gold-2 focus:ring-1 focus:ring-accent-gold-2/30 transition-all"
                    placeholder="Jane"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary mb-1.5">
                  {t('lastName')}
                </label>
                <div className="relative">
                  <UserRound className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full h-11 ps-11 pe-4 rounded-radius-lg bg-surface-0 border border-border-subtle text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent-gold-2 focus:ring-1 focus:ring-accent-gold-2/30 transition-all"
                    placeholder="Doe"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-1.5">
                {t('email')}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 ps-11 pe-4 rounded-radius-lg bg-surface-0 border border-border-subtle text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent-gold-2 focus:ring-1 focus:ring-accent-gold-2/30 transition-all"
                  placeholder="you@lookiva.dev"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-1.5">
                {t('phone')}
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full h-11 ps-11 pe-4 rounded-radius-lg bg-surface-0 border border-border-subtle text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent-gold-2 focus:ring-1 focus:ring-accent-gold-2/30 transition-all"
                  placeholder="+961 3 123 456"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-1.5">
                {t('password')}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 ps-11 pe-11 rounded-radius-lg bg-surface-0 border border-border-subtle text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent-gold-2 focus:ring-1 focus:ring-accent-gold-2/30 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute end-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-secondary"
                  aria-label="Show password"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="mt-2 text-xs text-muted leading-relaxed">{t('passwordHint')}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-1.5">
                {t('language')}
              </label>
              <div className="relative">
                <Globe2 className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value)}
                  className="w-full h-11 ps-11 pe-10 rounded-radius-lg bg-surface-0 border border-border-subtle text-sm text-primary focus:outline-none focus:border-accent-gold-2 focus:ring-1 focus:ring-accent-gold-2/30 transition-all appearance-none"
                >
                  {LANGS.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-1.5">
                {t('profile.profilePicture')} <span className="text-muted font-normal">({tCommon('actions.select').toLowerCase()} {tCommon('actions.upload')})</span>
              </label>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  toast.info(tCommon('comingSoon'), { description: 'Drop is captured. Upload starts after account creation.' });
                }}
                className={clsx(
                  'rounded-radius-xl border-2 border-dashed p-5 transition-colors cursor-pointer',
                  dragOver
                    ? 'border-accent-gold-2 bg-accent-gold-2/5'
                    : 'border-border-strong bg-surface-0 hover:bg-surface-2'
                )}
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-radius-full bg-surface-1 border border-border-subtle flex items-center justify-center shrink-0">
                    <Upload className="w-6 h-6 text-accent-gold-2" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-primary">Drop photo here or click</p>
                    <p className="text-xs text-muted mt-0.5">JPG, PNG up to 10MB. Optional for now.</p>
                  </div>
                </div>
              </div>
            </div>

            <label className="inline-flex items-start gap-3 cursor-pointer select-none pt-1">
              <div className="mt-0.5">
                <input
                  type="checkbox"
                  checked={terms}
                  onChange={(e) => setTerms(e.target.checked)}
                  className="w-4 h-4 rounded border-border-strong bg-surface-0 text-accent-gold-2 focus:ring-accent-gold-2/40"
                />
              </div>
              <span className="text-xs md:text-sm text-secondary leading-relaxed">
                {t('iAcceptTerms')
                  .split('Terms of Service')
                  .map((seg: string, idx: number, arr: string[]) => (
                    <React.Fragment key={idx}>
                      {seg}
                      {idx < arr.length - 1 && (
                        <>
                          <span className="text-accent-gold-2 font-medium">{t('termsOfService')}</span>
                        </>
                      )}
                    </React.Fragment>
                  ))}
                <span className="text-accent-gold-2 font-medium"> {t('privacyPolicy')}</span>.
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-radius-lg bg-gradient-to-r from-accent-gold-1 to-accent-gold-2 text-surface-0 font-semibold inline-flex items-center justify-center gap-2 hover:from-accent-gold-2 hover:to-accent-gold-3 transition-all disabled:opacity-60 shadow-shadow-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {loading ? tCommon('actions.loading') : t('register')}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-border-subtle text-center">
            <p className="text-sm text-secondary">
              {t('alreadyHaveAccount')}{' '}
              <Link
                href={`/${locale}/login`}
                className="text-accent-gold-2 hover:text-accent-gold-3 font-semibold inline-flex items-center gap-0.5"
              >
                <ChevronLeft className="w-4 h-4" />
                {t('loginHere')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}



