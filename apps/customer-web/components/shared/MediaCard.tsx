'use client';

import * as React from 'react';
import Link from 'next/link';
import { Play, BadgeCheck, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface MediaCardProps {
  id: string;
  title?: string | null;
  authorName?: string | null;
  mediaUrl?: string | null;
  mediaType?: 'image' | 'video' | 'reel';
  verified?: boolean;
  serviceId?: string | null;
  businessId?: string | null;
  professionalId?: string | null;
  variant?: 'grid' | 'carousel';
  className?: string;
}

const FALLBACK_MEDIA =
  'https://images.unsplash.com/photo-1560869713-7d0a29430803?auto=format&fit=crop&w=900&q=60';

export function MediaCard({
  id,
  title,
  authorName,
  mediaUrl,
  mediaType = 'image',
  verified = false,
  serviceId,
  businessId,
  professionalId,
  variant = 'grid',
  className,
}: MediaCardProps) {
  const t = useTranslations();
  const tCommon = useTranslations('common');

  const linkHref = React.useMemo(() => {
    if (serviceId) return `/service/${serviceId}`;
    if (professionalId) return `/professional/${professionalId}`;
    if (businessId) return `/business/${businessId}`;
    return null;
  }, [serviceId, professionalId, businessId]);

  function onBookLook() {
    if (linkHref) {
      toast.info(tCommon('comingSoon'), {
        description: 'Opening the linked service so you can choose a slot.',
      });
      return;
    }
    toast.info(tCommon('comingSoon'), {
      description: 'This look needs a linked service or professional before booking.',
    });
  }

  const base = (
    <div
      className={twMerge(
        'group relative overflow-hidden rounded-radius-xl bg-surface-2 border border-border-subtle animate-fade-in',
        variant === 'grid' ? 'aspect-square' : 'aspect-[4/5] w-[220px] md:w-[260px] shrink-0',
        className
      )}
    >
      <img
        src={mediaUrl ?? FALLBACK_MEDIA}
        alt={title ?? authorName ?? `post-${id}`}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        loading="lazy"
      />
      {mediaType === 'video' && (
        <div className="absolute top-3 end-3 w-10 h-10 rounded-radius-full bg-black/60 backdrop-blur flex items-center justify-center text-white">
          <Play className="w-5 h-5 ms-0.5" fill="currentColor" />
        </div>
      )}
      {mediaType === 'reel' && (
        <div className="absolute top-3 end-3 px-2.5 py-1 rounded-radius-full bg-black/70 backdrop-blur text-white text-[10px] font-bold inline-flex items-center gap-1.5">
          REEL
        </div>
      )}
      {verified && (
        <div className="absolute top-3 start-3 inline-flex items-center gap-1.5 px-2 py-1 rounded-radius-full bg-black/60 backdrop-blur text-accent-blue text-[10px] font-semibold">
          <BadgeCheck className="w-3.5 h-3.5" />
          {tCommon('verified')}
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="absolute bottom-0 inset-x-0 p-3 md:p-4 translate-y-2 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
        {(title || authorName) && (
          <div className="mb-3 min-w-0">
            {title && (
              <h5 className="text-sm font-semibold text-white truncate">{title}</h5>
            )}
            {authorName && (
              <p className="text-xs text-white/80 truncate mt-0.5">@{authorName}</p>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={onBookLook}
          className="w-full h-10 rounded-radius-md bg-gradient-to-r from-accent-gold-1 to-accent-gold-2 text-surface-0 font-semibold text-xs md:text-sm inline-flex items-center justify-center gap-1.5 hover:from-accent-gold-2 hover:to-accent-gold-3 transition-all shadow-shadow-2"
        >
          {tCommon('bookNow')}
        </button>
      </div>
    </div>
  );

  if (linkHref) {
    return <Link href={linkHref}>{base}</Link>;
  }
  return base;
}


