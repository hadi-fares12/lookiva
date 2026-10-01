'use client';

import * as React from 'react';
import { Clock, RefreshCw, Target } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { twMerge } from 'tailwind-merge';
import { useAvailableNow } from '@/hooks/useAvailableNow';
import { BusinessCard } from '@/components/shared/BusinessCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { NetworkError } from '@/components/shared/NetworkError';
import { SkeletonCard } from '@/components/shared/SkeletonCard';

const WINDOWS = [
  { key: 'now', labelKey: 'now', minutes: 15 },
  { key: '30m', labelKey: 'm30', minutes: 30 },
  { key: '1h', labelKey: 'h1', minutes: 60 },
  { key: '2h', labelKey: 'h2', minutes: 120 },
  { key: 'today', labelKey: 'today', minutes: 720 },
] as const;

export default function AvailableNowPage() {
  const t = useTranslations();
  const pageT = useTranslations('availableNowPage');
  const [windowKey, setWindowKey] = React.useState<(typeof WINDOWS)[number]['key']>('now');
  const [coords, setCoords] = React.useState<{ lat: number; lon: number } | null>(null);
  const [locationLoading, setLocationLoading] = React.useState(false);
  const selected = WINDOWS.find((window) => window.key === windowKey)!;

  const requestLocation = React.useCallback(() => {
    if (!navigator.geolocation) return;
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lon: position.coords.longitude });
        setLocationLoading(false);
      },
      () => setLocationLoading(false),
      { timeout: 5000, enableHighAccuracy: false, maximumAge: 60_000 },
    );
  }, []);

  React.useEffect(() => requestLocation(), [requestLocation]);

  const query = useAvailableNow({
    lat: coords?.lat,
    lon: coords?.lon,
    radiusMeters: 5000,
    windowMinutes: selected.minutes,
    enabled: coords != null,
  });
  const items = query.data?.items ?? [];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-surface-0 animate-fade-in">
      <div className="sticky top-16 z-z-sticky bg-surface-0/90 backdrop-blur-md border-b border-border-subtle">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-radius-xl bg-accent-green/15 border border-accent-green/30 flex items-center justify-center">
                <Clock className="w-5 h-5 text-accent-green" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-primary">{t('homeSections.availableNow')}</h1>
                <p className="text-xs md:text-sm text-muted">{items.length} {pageT('realOpenings')} • {pageT(selected.labelKey)}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => (coords ? void query.refetch() : requestLocation())}
              disabled={query.isFetching || locationLoading}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-radius-md border border-border-subtle bg-surface-1"
            >
              {coords ? <RefreshCw className={twMerge('w-4 h-4', query.isFetching && 'animate-spin')} /> : <Target className="w-4 h-4" />}
              <span className="hidden sm:inline text-sm">{coords ? pageT('refresh') : pageT('useLocation')}</span>
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {WINDOWS.map((window) => (
              <button
                key={window.key}
                type="button"
                onClick={() => setWindowKey(window.key)}
                className={twMerge(
                  'h-10 px-4 rounded-radius-lg text-sm font-medium border whitespace-nowrap transition-all',
                  window.key === windowKey
                    ? 'bg-surface-1 border-accent-gold-2/50 text-primary'
                    : 'border-transparent text-secondary hover:bg-surface-1',
                )}
              >
                {pageT(window.labelKey)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6">
        {!coords && !locationLoading && (
          <EmptyState
            illustration="search"
            title={pageT('locationNeeded')}
            description={pageT('locationDescription')}
            actionLabel={pageT('useLocation')}
            onAction={requestLocation}
          />
        )}
        {(locationLoading || query.isLoading) && <SkeletonCard variant="row" count={5} />}
        {coords && !query.isLoading && query.isError && (
          <NetworkError variant="block" onRetry={() => void query.refetch()} />
        )}
        {coords && !query.isLoading && !query.isError && items.length === 0 && (
          <EmptyState
            illustration="search"
            title={pageT('noOpenings')}
            description={pageT('noOpeningsDescription')}
          />
        )}
        {coords && !query.isLoading && !query.isError && items.length > 0 && (
          <div className="space-y-3">
            {items.map((business) => <BusinessCard key={business.id} business={business} variant="row" />)}
          </div>
        )}
      </div>
    </div>
  );
}
