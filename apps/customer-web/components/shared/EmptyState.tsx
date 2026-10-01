'use client';

import * as React from 'react';
import { SearchX, Inbox } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { twMerge } from 'tailwind-merge';

interface EmptyStateProps {
  title?: string;
  description?: string;
  illustration?: 'default' | 'search' | 'bookings' | 'favorites' | 'reviews';
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  title,
  description,
  illustration = 'default',
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  const t = useTranslations('common');
  const Icon = illustration === 'search' ? SearchX : Inbox;

  return (
    <div
      className={twMerge(
        'flex flex-col items-center justify-center text-center py-16 md:py-20 px-6 animate-fade-in',
        className
      )}
    >
      <div className="relative mb-6">
        <div className="w-24 h-24 md:w-28 md:h-28 rounded-radius-2xl bg-gradient-to-br from-accent-gold-1/10 via-accent-gold-2/10 to-accent-silver-1/10 border border-border-subtle flex items-center justify-center">
          <Icon className="w-10 h-10 md:w-12 md:h-12 text-accent-gold-2" strokeWidth={1.5} />
        </div>
      </div>
      <h3 className="text-lg md:text-xl font-semibold text-primary mb-2">
        {title ?? t('empty')}
      </h3>
      {description && (
        <p className="text-secondary text-sm md:text-base max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-6 h-11 px-6 rounded-radius-md bg-gradient-to-r from-accent-gold-1 to-accent-gold-2 text-surface-0 font-semibold text-sm inline-flex items-center gap-2 hover:from-accent-gold-2 hover:to-accent-gold-3 transition-all shadow-shadow-1"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}


