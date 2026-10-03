'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Mail,
  Phone,
  Lock,
  LogIn,
  KeyRound,
  ChevronRight,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import clsx from 'clsx';
import axios from '@/lib/axios';
import { APIPaths, type LoginRequest, type AuthResponse } from '@lookiva/api-contracts';
import { setAuthTokens } from '@/lib/axios';
import { toast } from 'sonner';

type Tab = 'password' | 'otp';
type IdentifierType = 'email' | 'phone';

export default function LoginPage() {
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();

  function nextPathAfterLogin() {
    if (typeof window === 'undefined') return '/home';
    const requestedNext = new URLSearchParams(window.location.search).get('next');
    return requestedNext && requestedNext.startsWith('/') && !requestedNext.startsWith('//')
      ? requestedNext
      : '/home';
  }

  const [tab, setTab] = React.useState<Tab>('password');
  const [identifierType, setIdentifierType] = React.useState<IdentifierType>('email');
  const [identifier, setIdentifier] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [otp, setOtp] = React.useState(['', '', '', '', '', '']);
  const [showPassword, setShowPassword] = React.useState(false);
  const [rememberMe, setRememberMe] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [otpSent, setOtpSent] = React.useState(false);
  const otpRefs = React.useRef<Array<HTMLInputElement | null>>([]);

  const identifierPlaceholder =
    identifierType === 'email' ? 'you@lookiva.dev' : '+961 3 123 456';

  React.useEffect(() => {
    if (tab === 'otp' && identifierType !== 'phone') setIdentifierType('phone');
  }, [tab, identifierType]);

  async function sendOtp() {
    if (!identifier.trim()) {
      toast.warning(tCommon('select'), { description: t(identifierType === 'email' ? 'email' : 'phone') });
      return;
    }
    try {
      setLoading(true);
      await axios.post(APIPaths.SEND_OTP, {
        identifier: identifier.trim(),
        purpose: 'login',
        channel: 'sms',
      } satisfies import('@lookiva/api-contracts').SendOtpRequest);
      setOtpSent(true);
      toast.success(t('otpSentTo'), { description: identifier });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim()) {
      toast.warning(tCommon('select'), {
        description: t(identifierType === 'email' ? 'email' : 'phone'),
      });
      return;
    }

    try {
      setLoading(true);
      if (tab === 'password') {
        if (!password) {
          toast.warning(tCommon('select'), { description: t('password') });
          return;
        }
        const { data } = await axios.post<AuthResponse>(APIPaths.LOGIN, {
          identifier: identifier.trim(),
          password,
          rememberMe,
          deviceName: 'customer-web',
        } satisfies LoginRequest);
        if (data.accessToken && data.refreshToken) {
          setAuthTokens(data.accessToken, data.refreshToken);
        }
        toast.success(t('loginSuccess'));
        router.push(nextPathAfterLogin());
      } else {
        const code = otp.join('');
        if (code.length < 6) {
          toast.warning(tCommon('select'), { description: t('enterOtp') });
          return;
        }
        const { data } = await axios.post<AuthResponse>(APIPaths.VERIFY_OTP, {
          identifier: identifier.trim(),
          otp: code,
          purpose: 'login',
          deviceName: 'customer-web',
        } satisfies import('@lookiva/api-contracts').VerifyOtpRequest);
        if (data.accessToken && data.refreshToken) {
          setAuthTokens(data.accessToken, data.refreshToken);
        }
        toast.success(t('loginSuccess'));
        router.push(nextPathAfterLogin());
      }
    } finally {
      setLoading(false);
    }
  }

  function handleOtpChange(idx: number, v: string) {
    const digit = v.replace(/\D/g, '').slice(0, 1);
    const next = [...otp];
    next[idx] = digit;
    setOtp(next);
    if (digit && idx < 5) {
      otpRefs.current[idx + 1]?.focus();
    }
  }

  function handleOtpKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-12 px-4 animate-fade-in">
      <div className="w-full max-w-md">
        <div className="bg-surface-1 border border-border-subtle rounded-radius-2xl p-6 md:p-8 shadow-shadow-3">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-radius-2xl bg-gradient-to-br from-accent-gold-1 to-accent-gold-3 flex items-center justify-center mb-4 shadow-shadow-2">
              <span className="text-surface-0 font-black text-2xl">L</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-primary text-center">
              {t('welcomeBack')}
            </h1>
            <p className="mt-2 text-sm text-muted text-center">{t('loginHere')}</p>
          </div>

          <div className="grid grid-cols-2 gap-1 p-1 mb-6 bg-surface-0 rounded-radius-lg border border-border-subtle">
            <button
              type="button"
              onClick={() => setTab('password')}
              className={clsx(
                'h-10 rounded-radius-md text-sm font-medium transition-all inline-flex items-center justify-center gap-2',
                tab === 'password'
                  ? 'bg-surface-1 text-primary shadow-shadow-1'
                  : 'text-muted hover:text-secondary'
              )}
            >
              <Lock className="w-4 h-4" />
              {t('password')}
            </button>
            <button
              type="button"
              onClick={() => setTab('otp')}
              className={clsx(
                'h-10 rounded-radius-md text-sm font-medium transition-all inline-flex items-center justify-center gap-2',
                tab === 'otp'
                  ? 'bg-surface-1 text-primary shadow-shadow-1'
                  : 'text-muted hover:text-secondary'
              )}
            >
              <KeyRound className="w-4 h-4" />
              OTP
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-secondary mb-1.5">
                {identifierType === 'email' ? t('email') : t('phone')}
              </label>
              <div className="flex gap-1 p-1 mb-2 bg-surface-0 rounded-radius-md border border-border-subtle w-fit">
                {tab === 'password' && (
                  <button
                    type="button"
                    onClick={() => setIdentifierType('email')}
                    className={clsx(
                      'h-8 px-3 rounded-radius-sm text-xs font-medium transition-all inline-flex items-center gap-1.5',
                      identifierType === 'email'
                        ? 'bg-surface-1 text-primary'
                        : 'text-muted hover:text-secondary'
                    )}
                  >
                    <Mail className="w-3.5 h-3.5" /> Email
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIdentifierType('phone')}
                  className={clsx(
                    'h-8 px-3 rounded-radius-sm text-xs font-medium transition-all inline-flex items-center gap-1.5',
                    identifierType === 'phone'
                      ? 'bg-surface-1 text-primary'
                      : 'text-muted hover:text-secondary'
                  )}
                >
                  <Phone className="w-3.5 h-3.5" /> Phone
                </button>
              </div>
              <div className="relative">
                {identifierType === 'email' ? (
                  <Mail className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-muted" />
                ) : (
                  <Phone className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-muted" />
                )}
                <input
                  type={identifierType === 'email' ? 'email' : 'tel'}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={identifierPlaceholder}
                  className="w-full h-12 ps-11 pe-4 rounded-radius-lg bg-surface-0 border border-border-subtle text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent-gold-2 focus:ring-1 focus:ring-accent-gold-2/30 transition-all"
                />
              </div>
            </div>

            {tab === 'password' ? (
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
                    className="w-full h-12 ps-11 pe-11 rounded-radius-lg bg-surface-0 border border-border-subtle text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent-gold-2 focus:ring-1 focus:ring-accent-gold-2/30 transition-all"
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
                <div className="mt-3 flex items-center justify-between text-sm">
                  <label className="inline-flex items-center gap-2 text-secondary cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-border-strong bg-surface-0 text-accent-gold-2 focus:ring-accent-gold-2/40"
                    />
                    {t('rememberMe')}
                  </label>
                  <Link
                    href={`/${locale}/forgot-password`}
                    className="text-accent-gold-2 hover:text-accent-gold-3 font-medium"
                  >
                    {t('forgotPassword')}
                  </Link>
                </div>
              </div>
            ) : (
              <div>
                {!otpSent ? (
                  <button
                    type="button"
                    onClick={sendOtp}
                    disabled={loading}
                    className="w-full h-12 rounded-radius-lg bg-surface-0 border border-dashed border-border-strong text-sm text-secondary hover:text-primary hover:bg-surface-2 hover:border-accent-gold-2/50 transition-all inline-flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    <KeyRound className="w-4 h-4" />
                    {loading ? tCommon('actions.loading') : t('sendOtp')}
                  </button>
                ) : (
                  <>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      {t('enterOtp')}
                    </label>
                    <div className="flex items-center justify-between gap-2">
                      {otp.map((v, i) => (
                        <input
                          key={i}
                          ref={(el) => {
                            otpRefs.current[i] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={v}
                          onChange={(e) => handleOtpChange(i, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(i, e)}
                          className="w-11 h-14 md:w-12 md:h-14 rounded-radius-lg bg-surface-0 border border-border-subtle text-center text-xl font-bold text-primary focus:outline-none focus:border-accent-gold-2 focus:ring-1 focus:ring-accent-gold-2/30 transition-all"
                        />
                      ))}
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <button
                        type="button"
                        onClick={sendOtp}
                        disabled={loading}
                        className="text-accent-gold-2 hover:text-accent-gold-3 font-medium disabled:opacity-60"
                      >
                        {t('resendCode')}
                      </button>
                      <span className="text-muted">{t('otpExpiresIn')} 5:00</span>
                    </div>
                  </>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-radius-lg bg-gradient-to-r from-accent-gold-1 to-accent-gold-2 text-surface-0 font-semibold inline-flex items-center justify-center gap-2 hover:from-accent-gold-2 hover:to-accent-gold-3 transition-all disabled:opacity-60 shadow-shadow-2"
            >
              <LogIn className="w-4 h-4" />
              {loading ? tCommon('actions.loading') : t('login')}
            </button>
          </form>

          <div className="my-7 flex items-center gap-4">
            <div className="flex-1 h-px bg-border-subtle" />
            <span className="text-xs text-muted font-medium uppercase tracking-wider">
              {t('orContinueWith')}
            </span>
            <div className="flex-1 h-px bg-border-subtle" />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-7">
            <button
              type="button"
              disabled
              aria-disabled
              className="h-11 rounded-radius-lg border border-border-subtle bg-surface-0 text-sm text-secondary opacity-70 inline-flex items-center justify-center gap-2 cursor-not-allowed"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4"><path fill="#EA4335" d="M12 10.8v3.9h5.5c-.2 1.4-1.6 4-5.5 4-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5L18 5.2c-1-.9-2.3-1.5-6-1.5-5 0-9 4-9 9s4 9 9 9c5.2 0 8.6-3.6 8.6-8.7 0-.6 0-1-.1-1.2L12 10.8z"/></svg>
              {t('google')}
            </button>
            <button
              type="button"
              disabled
              aria-disabled
              className="h-11 rounded-radius-lg border border-border-subtle bg-surface-0 text-sm text-secondary opacity-70 inline-flex items-center justify-center gap-2 cursor-not-allowed"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M16.365 1.43c0 1.14-.417 2.23-1.25 3.13-.93 1.02-2.33 1.79-3.72 1.68-.15-1.13.41-2.25 1.2-3.11.89-.95 2.3-1.72 3.77-1.7zm2.91 18.06c-.86.58-1.96.47-2.7-.15-.7-.59-1.06-1.43-2.25-1.45-1.22-.02-1.56.86-2.52.88-.94.01-1.3-.87-2.52-.89-1.23-.02-1.58.86-2.27 1.43-.98.79-2.35.68-3.27.13C1.41 17.17.12 11.35 2.65 8.05c1.4-1.84 3.63-2.98 5.8-2.98 1.72 0 2.91.96 4.4.96 1.49 0 2.41-.96 4.4-.96 1.63 0 3.23.88 4.6 2.41-4.04 2.22-3.32 8.32 0 10.95z" /></svg>
              {t('apple')}
            </button>
          </div>

          <p className="text-center text-sm text-secondary">
            {t('dontHaveAccount')}{' '}
            <Link
              href={`/${locale}/register`}
              className="text-accent-gold-2 hover:text-accent-gold-3 font-semibold inline-flex items-center gap-0.5"
            >
              {t('signupHere')}
              <ChevronRight className="w-4 h-4" />
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}



