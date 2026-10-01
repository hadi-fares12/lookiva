'use client';

import * as React from 'react';
import { Lock, LogIn } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { twMerge } from 'tailwind-merge';

interface PermissionDeniedProps {
  message?: string;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
}

export function PermissionDenied({
  message,
  actionHref,
  actionLabel,
  className,
}: PermissionDeniedProps) {
  const t = useTranslations();
  const locale = useLocale();
  const href = actionHref ?? `/${locale}/login`;
  const label = actionLabel ?? t('auth.login');

  return (
    <div
      className={twMerge(
        'min-h-[60vh] flex flex-col items-center justify-center text-center px-6 py-16 animate-fade-in',
        className
      )}
    >
      <div className="w-20 h-20 md:w-24 md:h-24 rounded-radius-2xl bg-accent-gold-2/10 flex items-center justify-center mb-6 border border-accent-gold-2/20">
        <Lock className="w-10 h-10 md:w-12 md:h-12 text-accent-gold-2" strokeWidth={1.5} />
      </div>
      <h3 className="text-xl md:text-2xl font-bold text-primary mb-2">
        {t('common.verified') ? t('auth.login') : 'Authentication required'}
      </h3>
      <p className="text-secondary text-sm md:text-base max-w-md leading-relaxed mb-6">
        {message ?? 'You need to be signed in to access this section. Log in to continue.'}
      </p>
      <Link
        href={href}
        className="h-11 px-7 rounded-radius-md bg-gradient-to-r from-accent-gold-1 to-accent-gold-2 text-surface-0 font-semibold inline-flex items-center gap-2 hover:from-accent-gold-2 hover:to-accent-gold-3 transition-all shadow-shadow-2"
      >
        <LogIn className="w-4 h-4" />
        {label}
      </Link>
    </div>
  );
}


