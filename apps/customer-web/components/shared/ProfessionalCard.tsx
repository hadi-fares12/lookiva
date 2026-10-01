'use client';

import * as React from 'react';
import Link from 'next/link';
import { Star, BadgeCheck, Calendar } from 'lucide-react';
import type { Professional } from '@lookiva/shared-types';
import { useLocale } from 'next-intl';
import { useTranslations } from 'next-intl';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ProfessionalCardProps {
  professional: Professional & {
    specialties?: string[] | null;
    companyName?: string;
    branches?: Array<{ name?: string }>;
    nextAvailableAt?: Date | null;
    followerCount?: number;
    isFollowing?: boolean;
    avatarMediaUrl?: string | null;
    portfolioCount?: number;
  };
  variant?: 'default' | 'compact' | 'grid';
  className?: string;
}

const FALLBACK_AVATAR =
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=60';

export function ProfessionalCard({
  professional,
  variant = 'default',
  className,
}: ProfessionalCardProps) {
  const t = useTranslations();
  const locale = useLocale();
  const href = `/${locale}/professional/${professional.id}`;

  const nextLabel = React.useMemo(() => {
    if (!professional.nextAvailableAt) return null;
    return t('professional.nextAvailable');
  }, [professional.nextAvailableAt, t]);

  if (variant === 'grid') {
    return (
      <Link
        href={href}
        className={twMerge(
          'group rounded-radius-xl overflow-hidden border border-border-subtle bg-surface-1 hover:border-accent-gold-2/50 transition-all hover:shadow-shadow-3 flex flex-col animate-fade-in',
          className
        )}
      >
        <div className="relative aspect-square overflow-hidden bg-surface-2">
          <img
            src={professional.avatarMediaUrl ?? FALLBACK_AVATAR}
            alt={professional.displayName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {professional.isVerified && (
            <div className="absolute top-2.5 end-2.5 bg-black/60 backdrop-blur rounded-radius-full p-1">
              <BadgeCheck className="w-4 h-4 text-accent-blue" />
            </div>
          )}
        </div>
        <div className="p-3 md:p-4 flex-1 flex flex-col min-h-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="text-sm md:text-base font-semibold text-primary line-clamp-1">
              {professional.displayName}
            </h4>
            {professional.avgRating != null && professional.avgRating > 0 && (
              <span className="shrink-0 inline-flex items-center gap-1 text-xs">
                <Star className="w-3.5 h-3.5 text-accent-gold-2 fill-accent-gold-2" />
                <span className="font-bold text-primary">{professional.avgRating.toFixed(1)}</span>
              </span>
            )}
          </div>
          {professional.specialties && professional.specialties.length > 0 && (
            <p className="text-xs md:text-sm text-muted line-clamp-1 mb-2">
              {professional.specialties.join(', ')}
            </p>
          )}
          <div className="mt-auto flex items-center justify-between pt-2 border-t border-border-subtle text-xs">
            {nextLabel && (
              <span className="inline-flex items-center gap-1 text-accent-green font-medium">
                <Calendar className="w-3.5 h-3.5" /> {nextLabel}
              </span>
            )}
            {professional.reviewCount > 0 && (
              <span className="text-muted">{professional.reviewCount} {t('business.totalReviews')}</span>
            )}
          </div>
        </div>
      </Link>
    );
  }

  if (variant === 'compact') {
    return (
      <Link
        href={href}
        className={twMerge(
          'group flex items-center gap-3 rounded-radius-xl border border-border-subtle bg-surface-1 hover:border-accent-gold-2/50 transition-colors p-3 animate-fade-in',
          className
        )}
      >
        <div className="relative shrink-0">
          <div className="w-14 h-14 md:w-16 md:h-16 rounded-radius-full bg-surface-2 overflow-hidden ring-2 ring-border-subtle group-hover:ring-accent-gold-2/50 transition-all">
            <img
              src={professional.avatarMediaUrl ?? FALLBACK_AVATAR}
              alt={professional.displayName}
              className="w-full h-full object-cover"
            />
          </div>
          {professional.isVerified && (
            <BadgeCheck className="absolute end-0 -bottom-0.5 w-5 h-5 text-accent-blue drop-shadow" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm md:text-base font-semibold text-primary truncate flex items-center gap-1.5">
            {professional.displayName}
          </h4>
          {professional.specialties?.[0] && (
            <p className="text-xs text-muted truncate mt-0.5">{professional.specialties[0]}</p>
          )}
          <div className="flex items-center gap-3 mt-1 text-xs text-secondary">
            {professional.avgRating != null && professional.avgRating > 0 && (
              <span className="inline-flex items-center gap-1">
                <Star className="w-3 h-3 text-accent-gold-2 fill-accent-gold-2" />
                <span className="font-medium text-primary">{professional.avgRating.toFixed(1)}</span>
              </span>
            )}
            {professional.companyName && (
              <span className="text-muted truncate">@ {professional.companyName}</span>
            )}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={twMerge(
        'group shrink-0 w-[180px] md:w-[200px] rounded-radius-xl overflow-hidden border border-border-subtle bg-surface-1 hover:border-accent-gold-2/50 transition-all hover:shadow-shadow-3 flex flex-col animate-fade-in',
        className
      )}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-surface-2">
        <img
          src={professional.avatarMediaUrl ?? FALLBACK_AVATAR}
          alt={professional.displayName}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <div className="absolute bottom-0 inset-x-0 p-3">
          {professional.specialties?.[0] && (
            <span className="inline-block mb-1.5 px-2 py-0.5 rounded-radius-full bg-black/60 backdrop-blur text-[10px] font-medium text-white/90 truncate max-w-full">
              {professional.specialties[0]}
            </span>
          )}
          <h4 className="text-base font-semibold text-white truncate flex items-center gap-1.5">
            {professional.displayName}
            {professional.isVerified && (
              <BadgeCheck className="w-4 h-4 text-accent-blue shrink-0" />
            )}
          </h4>
        </div>
      </div>
      <div className="p-3 flex items-center justify-between gap-2 text-xs">
        <span className="inline-flex items-center gap-1">
          <Star className="w-3.5 h-3.5 text-accent-gold-2 fill-accent-gold-2" />
          <span className="font-bold text-primary">
            {professional.avgRating?.toFixed(1) ?? '—'}
          </span>
          <span className="text-muted">({professional.reviewCount})</span>
        </span>
        {nextLabel && (
          <span className="text-accent-green font-medium">{nextLabel}</span>
        )}
      </div>
    </Link>
  );
}


