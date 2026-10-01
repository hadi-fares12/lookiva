'use client';

import * as React from 'react';
import { Clock, Plus, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { Service } from '@lookiva/shared-types';
import { useLocale } from 'next-intl';
import { useTranslations } from 'next-intl';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ServiceRowProps {
  service: Service & {
    currencyCode?: string;
    categoryName?: string;
    professionalIds?: string[];
    finalPrice?: number;
    discountPercent?: number | null;
    earliestAvailableAt?: Date | null;
  };
  compact?: boolean;
  onBook?: (id: string) => void;
  className?: string;
}

function formatCurrency(amount: number, code = 'USD') {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} ${code}`;
  }
}

export function ServiceRow({
  service,
  compact = false,
  onBook,
  className,
}: ServiceRowProps) {
  const t = useTranslations();
  const locale = useLocale();

  const price = service.finalPrice ?? service.basePrice ?? 0;
  const currency = service.currencyCode ?? 'USD';

  return (
    <div
      className={twMerge(
        'group w-full rounded-radius-lg md:rounded-radius-xl border border-border-subtle bg-surface-1 hover:border-accent-gold-2/50 transition-colors overflow-hidden animate-fade-in',
        compact ? 'p-3 md:p-4' : 'p-4 md:p-5',
        className
      )}
    >
      <div className="flex items-stretch gap-3 md:gap-4">
        {!compact && (
          <div className="hidden sm:block w-20 h-20 md:w-24 md:h-24 shrink-0 rounded-radius-lg overflow-hidden bg-surface-2">
            <div className="w-full h-full flex items-center justify-center text-accent-gold-2">
              <Plus className="w-8 h-8 opacity-40" strokeWidth={1.2} />
            </div>
          </div>
        )}
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h4 className="text-sm md:text-base font-semibold text-primary truncate">
                {service.name}
              </h4>
              {service.categoryName && (
                <p className="text-xs text-muted mt-0.5 truncate">
                  {service.categoryName}
                </p>
              )}
            </div>
            <div className="shrink-0 text-end">
              <div className="flex items-center justify-end gap-1.5">
                {service.discountPercent ? (
                  <span className="text-xs text-accent-red font-bold">
                    -{service.discountPercent}%
                  </span>
                ) : null}
                <span className="text-base md:text-lg font-bold text-primary">
                  {formatCurrency(price, currency)}
                </span>
              </div>
              <span className="text-xs text-muted">
                {t('common.currency.perSession')}
              </span>
            </div>
          </div>

          {service.summary && !compact && (
            <p className="text-xs md:text-sm text-secondary line-clamp-2 mt-0.5">
              {service.summary}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-secondary">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-muted" />
              {service.durationMinutes} {t('common.time.minutes')}
            </span>
            {service.tags?.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-radius-full bg-surface-2 text-muted border border-border-subtle"
              >
                {tag}
              </span>
            ))}
            {service.depositPercent && service.depositPercent > 0 && (
              <span className="inline-flex items-center gap-1 text-accent-gold-2 font-medium">
                {t('common.currency.deposit')}
              </span>
            )}
            {service.homeServiceAllowed && (
              <span className="inline-flex items-center gap-1 text-accent-blue font-medium">
                {t('business.homeServices')}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-border-subtle flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {service.professionalIds && service.professionalIds.length > 0 && (
            <span className="text-xs text-muted truncate">
              {service.professionalIds.length}{' '}
              {service.professionalIds.length === 1
                ? t('professional.specialty').toLowerCase()
                : t('business.professionals').toLowerCase()}
            </span>
          )}
          {service.earliestAvailableAt && (
            <span className="text-xs inline-flex items-center gap-1.5 text-accent-green font-medium">
              <span className="w-1.5 h-1.5 rounded-radius-full bg-accent-green" />
              {t('professional.nextAvailable')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/${locale}/service/${service.id}`}
            className="h-9 px-3 rounded-radius-md text-sm text-secondary hover:text-primary hover:bg-surface-2 inline-flex items-center gap-1 transition-colors border border-transparent"
          >
            {t('common.actions.details')}
            <ChevronRight className="w-4 h-4" />
          </Link>
          {onBook ? (
            <button
              type="button"
              onClick={() => onBook(service.id)}
              className="h-9 px-4 rounded-radius-md bg-gradient-to-r from-accent-gold-1 to-accent-gold-2 text-surface-0 font-semibold text-xs md:text-sm inline-flex items-center gap-1.5 hover:from-accent-gold-2 hover:to-accent-gold-3 transition-all"
            >
              {t('common.actions.book')}
            </button>
          ) : (
            <button
              type="button"
              className="h-9 px-4 rounded-radius-md bg-gradient-to-r from-accent-gold-1 to-accent-gold-2 text-surface-0 font-semibold text-xs md:text-sm inline-flex items-center gap-1.5 hover:from-accent-gold-2 hover:to-accent-gold-3 transition-all"
            >
              {t('common.actions.book')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


