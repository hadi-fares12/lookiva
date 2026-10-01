'use client';

import * as React from 'react';
import { WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { twMerge } from 'tailwind-merge';

interface NetworkErrorProps {
  message?: string;
  onRetry?: () => void;
  variant?: 'inline' | 'block' | 'page';
  className?: string;
}

export function NetworkError({
  message,
  onRetry,
  variant = 'block',
  className,
}: NetworkErrorProps) {
  const t = useTranslations('common');
  const [retrying, setRetrying] = React.useState(false);

  const handleRetry = async () => {
    if (!onRetry) return;
    setRetrying(true);
    try {
      onRetry();
    } finally {
      setTimeout(() => setRetrying(false), 300);
    }
  };

  if (variant === 'inline') {
    return (
      <div
        className={twMerge(
          'w-full flex items-center justify-between gap-4 rounded-radius-lg border border-accent-red/30 bg-accent-red/5 px-4 py-3 animate-fade-in',
          className
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <AlertTriangle className="w-5 h-5 text-accent-red shrink-0" />
          <p className="text-sm text-secondary truncate">
            {message ?? t('error')}
          </p>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={handleRetry}
            disabled={retrying}
            className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-radius-md bg-surface-1 border border-border-subtle text-secondary hover:text-primary hover:bg-surface-2 text-xs font-medium transition-colors"
          >
            <RefreshCw className={twMerge('w-3.5 h-3.5', retrying && 'animate-spin')} />
            {t('actions.retry')}
          </button>
        )}
      </div>
    );
  }

  if (variant === 'block') {
    return (
      <div
        className={twMerge(
          'rounded-radius-xl border border-accent-red/20 bg-surface-1 p-6 md:p-8 animate-fade-in',
          className
        )}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-radius-xl bg-accent-red/10 flex items-center justify-center shrink-0">
            <WifiOff className="w-6 h-6 md:w-7 md:h-7 text-accent-red" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-primary font-semibold mb-1">{t('error')}</h4>
            <p className="text-secondary text-sm md:text-base leading-relaxed">
              {message ?? 'Something went wrong while loading. Please check your connection and try again.'}
            </p>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={handleRetry}
              disabled={retrying}
              className="h-10 px-5 rounded-radius-md bg-gradient-to-r from-accent-gold-1 to-accent-gold-2 text-surface-0 font-semibold text-sm inline-flex items-center gap-2 hover:from-accent-gold-2 hover:to-accent-gold-3 transition-all disabled:opacity-60"
            >
              <RefreshCw className={twMerge('w-4 h-4', retrying && 'animate-spin')} />
              {t('actions.retry')}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={twMerge(
        'min-h-[60vh] flex flex-col items-center justify-center text-center px-6 py-16 animate-fade-in',
        className
      )}
    >
      <div className="w-20 h-20 md:w-24 md:h-24 rounded-radius-2xl bg-accent-red/10 flex items-center justify-center mb-6">
        <WifiOff className="w-10 h-10 md:w-12 md:h-12 text-accent-red" strokeWidth={1.5} />
      </div>
      <h3 className="text-xl md:text-2xl font-bold text-primary mb-2">{t('error')}</h3>
      <p className="text-secondary text-sm md:text-base max-w-md leading-relaxed mb-6">
        {message ?? 'We had trouble connecting. Please check your internet connection and try again.'}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={handleRetry}
          disabled={retrying}
          className="h-11 px-7 rounded-radius-md bg-gradient-to-r from-accent-gold-1 to-accent-gold-2 text-surface-0 font-semibold inline-flex items-center gap-2 hover:from-accent-gold-2 hover:to-accent-gold-3 transition-all disabled:opacity-60 shadow-shadow-2"
        >
          <RefreshCw className={twMerge('w-4 h-4', retrying && 'animate-spin')} />
          {t('actions.tryAgain')}
        </button>
      )}
    </div>
  );
}


