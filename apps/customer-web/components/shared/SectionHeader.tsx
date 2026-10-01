'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { twMerge } from 'tailwind-merge';

interface SectionHeaderProps {
  title: string;
  subtitle?: string | null;
  viewAllHref?: string | null;
  viewAllLabel?: string;
  className?: string;
}

export function SectionHeader({
  title,
  subtitle,
  viewAllHref,
  viewAllLabel,
  className,
}: SectionHeaderProps) {
  const t = useTranslations('common');
  const locale = useLocale();

  const resolvedLabel = viewAllLabel ?? t('actions.viewAll');

  return (
    <div className={twMerge('flex items-end justify-between gap-4 mb-4 md:mb-5', className)}>
      <div className="min-w-0">
        <h2 className="text-lg md:text-xl font-bold text-primary leading-tight truncate">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-sm text-muted truncate">{subtitle}</p>
        )}
      </div>
      {viewAllHref && (
        <Link
          href={viewAllHref.startsWith('/') ? `/${locale}${viewAllHref}` : viewAllHref}
          className="shrink-0 inline-flex items-center gap-1 text-sm font-medium text-accent-gold-2 hover:text-accent-gold-3 transition-colors"
        >
          {resolvedLabel}
          <ChevronRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}


