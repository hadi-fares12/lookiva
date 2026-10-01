'use client';

import * as React from 'react';
import { twMerge } from 'tailwind-merge';

interface SkeletonCardProps {
  variant?: 'business' | 'professional' | 'service' | 'media' | 'square' | 'row';
  count?: number;
  className?: string;
}

export function SkeletonCard({
  variant = 'business',
  count = 1,
  className,
}: SkeletonCardProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  return (
    <>
      {items.map((i) => (
        <div
          key={i}
          className={twMerge(
            'shrink-0 overflow-hidden rounded-radius-xl bg-surface-1 border border-border-subtle',
            variant === 'business' && 'w-[260px] md:w-[300px] h-[320px] md:h-[340px]',
            variant === 'professional' && 'w-[180px] md:w-[200px] h-[260px]',
            variant === 'service' && 'w-full h-20',
            variant === 'media' && 'aspect-[4/5] rounded-radius-lg',
            variant === 'square' && 'w-full aspect-square rounded-radius-lg',
            variant === 'row' && 'w-full h-28 rounded-radius-xl',
            className
          )}
        >
          {variant === 'business' && (
            <>
              <div className="shimmer w-full h-40 md:h-44 rounded-b-none" />
              <div className="p-4 space-y-3">
                <div className="shimmer h-5 w-3/4 rounded-radius-md" />
                <div className="shimmer h-4 w-1/2 rounded-radius-md" />
                <div className="flex items-center justify-between pt-2">
                  <div className="shimmer h-4 w-20 rounded-radius-md" />
                  <div className="shimmer h-5 w-10 rounded-radius-full" />
                </div>
                <div className="shimmer h-3 w-1/3 rounded-radius-md" />
              </div>
            </>
          )}
          {variant === 'professional' && (
            <>
              <div className="shimmer w-full h-36 rounded-radius-none" />
              <div className="p-3 space-y-2">
                <div className="shimmer h-4 w-4/5 rounded-radius-md" />
                <div className="shimmer h-3 w-2/3 rounded-radius-md" />
                <div className="flex gap-2 pt-1">
                  <div className="shimmer h-4 w-14 rounded-radius-full" />
                </div>
              </div>
            </>
          )}
          {variant === 'service' && (
            <div className="h-full w-full flex items-center gap-4 px-4">
              <div className="shimmer w-12 h-12 rounded-radius-lg shrink-0" />
              <div className="flex-1 space-y-2 py-3">
                <div className="shimmer h-4 w-2/3 rounded-radius-md" />
                <div className="shimmer h-3 w-1/2 rounded-radius-md" />
              </div>
              <div className="shrink-0 flex items-center gap-3">
                <div className="shimmer h-4 w-16 rounded-radius-md" />
                <div className="shimmer h-9 w-9 rounded-radius-md" />
              </div>
            </div>
          )}
          {variant === 'row' && (
            <div className="h-full w-full flex items-center gap-4 p-4">
              <div className="shimmer w-24 h-24 rounded-radius-lg shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="shimmer h-5 w-3/4 rounded-radius-md" />
                <div className="shimmer h-4 w-1/2 rounded-radius-md" />
                <div className="flex gap-2 pt-1">
                  <div className="shimmer h-4 w-20 rounded-radius-full" />
                  <div className="shimmer h-4 w-16 rounded-radius-full" />
                </div>
              </div>
            </div>
          )}
          {(variant === 'media' || variant === 'square') && (
            <div className="shimmer w-full h-full" />
          )}
        </div>
      ))}
    </>
  );
}


