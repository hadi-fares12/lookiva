'use client';

import * as React from 'react';
import Link from 'next/link';
import { Star, MapPin, Clock, BadgeCheck } from 'lucide-react';
import type { DiscoveryBusinessResult } from '@lookiva/shared-types';
import { useLocale } from 'next-intl';
import { useTranslations } from 'next-intl';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface BusinessCardProps {
  business: DiscoveryBusinessResult;
  variant?: 'default' | 'compact' | 'row';
  className?: string;
}

export function BusinessCard({
  business,
  variant = 'default',
  className,
}: BusinessCardProps) {
  const t = useTranslations();
  const locale = useLocale();
  const href = `/${locale}/businesses/${business.id}`;

  const priceLabel = business.minPrice != null
    ? `${business.currencyCode ?? ''} ${Number(business.minPrice).toLocaleString()}`.trim()
    : null;

  const distanceLabel = React.useMemo(() => {
    if (business.distanceMeters == null) return null;
    if (business.distanceMeters < 1000) return `${Math.round(business.distanceMeters)} m`;
    return `${(business.distanceMeters / 1000).toFixed(1)} km`;
  }, [business.distanceMeters]);

  if (variant === 'row') {
    return (
      <Link
        href={href}
        className={twMerge(
          'group flex items-stretch gap-4 rounded-radius-xl border border-border-subtle bg-surface-1 hover:border-accent-gold-2/50 transition-colors overflow-hidden animate-fade-in',
          className
        )}
      >
        <div className="relative w-28 h-28 md:w-36 md:h-32 shrink-0">
          <div className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 bg-gradient-to-br from-surface-2 via-surface-2 to-accent-gold-1/10 flex items-center justify-center" role="img" aria-label={business.companyName}>
            <span className="text-2xl font-black text-accent-gold-2/60">{business.companyName.slice(0, 1).toUpperCase()}</span>
          </div>
          {business.isFeatured && (
            <span className="absolute top-2 start-2 px-2 py-0.5 rounded-radius-full bg-gradient-to-r from-accent-gold-1 to-accent-gold-2 text-surface-0 text-[10px] font-bold uppercase tracking-wide">
              PREMIUM
            </span>
          )}
        </div>
        <div className="flex-1 py-3 pe-3 md:py-4 md:pe-4 min-w-0">
          <div className="flex items-start gap-2">
            <h3 className="text-base md:text-lg font-semibold text-primary truncate flex-1">
              {business.companyName}
            </h3>
            {business.isVerified && (
              <BadgeCheck className="w-4 h-4 md:w-5 md:h-5 text-accent-blue shrink-0" />
            )}
          </div>
          {business.primaryCategoryName && (
            <p className="text-xs md:text-sm text-muted truncate mt-0.5">
              {business.primaryCategoryName}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-secondary">
            <span className="inline-flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-accent-gold-2 fill-accent-gold-2" />
              <span className="font-medium text-primary">{business.avgRating?.toFixed(1) ?? '—'}</span>
              <span className="text-muted">({business.reviewCount ?? 0})</span>
            </span>
            {distanceLabel && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-muted" /> {distanceLabel}
              </span>
            )}
            {business.isOpen != null && (
              <span
                className={clsx(
                  'inline-flex items-center gap-1 font-medium',
                  business.isOpen ? 'text-accent-green' : 'text-accent-red'
                )}
              >
                <span
                  className={twMerge(
                    'w-1.5 h-1.5 rounded-radius-full',
                    business.isOpen ? 'bg-accent-green' : 'bg-accent-red'
                  )}
                />
                {business.isOpen ? t('business.openNow') : t('business.closedNow')}
              </span>
            )}
            {priceLabel && <span className="inline-flex items-center gap-0.5 text-accent-silver-2 font-semibold tracking-tight">From {priceLabel}</span>}
          </div>
          {business.tagline && (
            <p className="mt-2 text-xs text-muted line-clamp-1 hidden md:block">
              {business.tagline}
            </p>
          )}
        </div>
      </Link>
    );
  }

  if (variant === 'compact') {
    return (
      <Link
        href={href}
        className={twMerge(
          'group rounded-radius-xl overflow-hidden border border-border-subtle bg-surface-1 hover:border-accent-gold-2/50 transition-all hover:shadow-shadow-3 shrink-0 w-[220px] md:w-[240px] animate-fade-in',
          className
        )}
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
          <div className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 bg-gradient-to-br from-surface-2 via-surface-2 to-accent-gold-1/10 flex items-center justify-center" role="img" aria-label={business.companyName}>
            <span className="text-2xl font-black text-accent-gold-2/60">{business.companyName.slice(0, 1).toUpperCase()}</span>
          </div>
          {business.isVerified && (
            <div className="absolute top-2 end-2 bg-black/60 backdrop-blur-sm rounded-radius-full p-1">
              <BadgeCheck className="w-3.5 h-3.5 text-accent-blue" />
            </div>
          )}
        </div>
        <div className="p-3">
          <div className="flex items-start gap-1.5 mb-1.5">
            <h3 className="text-sm font-semibold text-primary line-clamp-1 flex-1 min-w-0">
              {business.companyName}
            </h3>
          </div>
          <div className="flex items-center justify-between gap-2 text-xs text-secondary">
            <span className="inline-flex items-center gap-1">
              <Star className="w-3 h-3 text-accent-gold-2 fill-accent-gold-2" />
              <span className="font-medium text-primary">{business.avgRating?.toFixed(1) ?? '—'}</span>
            </span>
            {distanceLabel && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3 h-3 text-muted" />
                {distanceLabel}
              </span>
            )}
            {priceLabel && <span className="text-accent-silver-2 font-semibold">From {priceLabel}</span>}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={twMerge(
        'group rounded-radius-xl overflow-hidden border border-border-subtle bg-surface-1 hover:border-accent-gold-2/50 transition-all hover:shadow-shadow-3 shrink-0 w-[260px] md:w-[300px] animate-fade-in',
        className
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
          <div className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 bg-gradient-to-br from-surface-2 via-surface-2 to-accent-gold-1/10 flex items-center justify-center" role="img" aria-label={business.companyName}>
            <span className="text-2xl font-black text-accent-gold-2/60">{business.companyName.slice(0, 1).toUpperCase()}</span>
          </div>
        <div className="absolute top-3 start-3 flex items-center gap-2">
          {business.isFeatured && (
            <span className="px-2.5 py-1 rounded-radius-full bg-gradient-to-r from-accent-gold-1 to-accent-gold-2 text-surface-0 text-[10px] font-bold uppercase tracking-wide shadow-shadow-1">
              PREMIUM
            </span>
          )}
          {business.promotionLabel && (
            <span className="px-2.5 py-1 rounded-radius-full bg-accent-red text-white text-[10px] font-bold uppercase tracking-wide shadow-shadow-1">
              {business.promotionLabel}
            </span>
          )}
          {business.isOpen != null && (
            <span
              className={clsx(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-radius-full text-[10px] font-semibold',
                business.isOpen
                  ? 'bg-accent-green/90 text-white'
                  : 'bg-accent-red/90 text-white'
              )}
            >
              <span className="w-1.5 h-1.5 rounded-radius-full bg-current" />
              {business.isOpen ? 'OPEN' : 'CLOSED'}
            </span>
          )}
        </div>
        {business.availableNow && (
          <div className="absolute top-3 end-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-radius-full bg-black/70 backdrop-blur text-accent-green text-[10px] font-bold">
              <Clock className="w-3 h-3" />
              {t('homeSections.availableNow')}
            </span>
          </div>
        )}
      </div>
      <div className="p-4 md:p-5">
        <div className="flex items-start gap-2 mb-1.5">
          <h3 className="text-base md:text-lg font-semibold text-primary line-clamp-1 flex-1 min-w-0">
            {business.companyName}
          </h3>
          {business.isVerified && (
            <BadgeCheck
              className="w-5 h-5 md:w-[22px] md:h-[22px] text-accent-blue shrink-0"
              aria-label={t('common.verified')}
            />
          )}
        </div>
        {business.primaryCategoryName && (
          <p className="text-xs md:text-sm text-muted line-clamp-1 mb-3">
            {business.primaryCategoryName}
            {business.areaName ? ` • ${business.areaName}` : ''}
          </p>
        )}
        <div className="flex items-center justify-between mb-3">
          <div className="inline-flex items-center gap-1.5">
            <Star className="w-4 h-4 md:w-[18px] md:h-[18px] text-accent-gold-2 fill-accent-gold-2" />
            <span className="font-bold text-primary text-sm md:text-base">
              {business.avgRating?.toFixed(1) ?? '—'}
            </span>
            <span className="text-xs text-muted">({business.reviewCount ?? 0})</span>
          </div>
          {priceLabel && <span className="text-sm font-semibold text-accent-silver-2 tracking-tight">From {priceLabel}</span>}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-secondary">
          {distanceLabel && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-muted" />
              {distanceLabel}
            </span>
          )}
          {business.topServiceName && (
            <span className="inline-flex items-center gap-1 text-muted line-clamp-1">
              <span className="w-1 h-1 rounded-radius-full bg-border-strong" />
              {business.topServiceName}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}


