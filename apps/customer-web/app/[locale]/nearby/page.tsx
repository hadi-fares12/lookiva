'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Navigation, MapPin, Target, SlidersHorizontal, X } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { useNearby } from '@/hooks/useNearby';
import { BusinessCard } from '@/components/shared/BusinessCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { NetworkError } from '@/components/shared/NetworkError';
import { SkeletonCard } from '@/components/shared/SkeletonCard';
import type { DiscoveryBusinessResult } from '@lookiva/shared-types';

const DISTANCE_OPTIONS = [
  { value: 250, label: '250 m' },
  { value: 500, label: '500 m' },
  { value: 1000, label: '1 km' },
  { value: 5000, label: '5 km' },
] as const;

export default function NearbyPage() {
  const t = useTranslations();
  const tCommon = useTranslations('common');
  const tFilter = useTranslations('filter');

  const [radiusMeters, setRadiusMeters] = React.useState<number>(1000);
  const [isCustom, setIsCustom] = React.useState(false);
  const [customValue, setCustomValue] = React.useState<string>('');
  const [coords, setCoords] = React.useState<{ lat: number; lon: number } | null>(null);
  const [locationLoading, setLocationLoading] = React.useState(false);

  React.useEffect(() => {
    if (!navigator.geolocation) return;
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setLocationLoading(false);
      },
      () => setLocationLoading(false),
      { timeout: 5000, enableHighAccuracy: false, maximumAge: 60_000 },
    );
  }, []);

  const query = useNearby({
    lat: coords?.lat,
    lon: coords?.lon,
    radiusMeters,
    limit: 20,
    sort: 'nearest',
    enabled: coords != null,
  });

  const results: DiscoveryBusinessResult[] = query.data?.items ?? [];

  const hasPreset = DISTANCE_OPTIONS.some((o) => o.value === radiusMeters);

  function selectPreset(value: number) {
    setRadiusMeters(value);
    setIsCustom(false);
  }

  function enableCustom() {
    setIsCustom(true);
    setCustomValue(String(radiusMeters));
  }

  function applyCustom() {
    const n = parseInt(customValue, 10);
    if (!Number.isNaN(n) && n > 0 && n <= 50000) {
      setRadiusMeters(n);
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) return;
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setLocationLoading(false);
      },
      () => {
        setLocationLoading(false);
      },
      { timeout: 5000, enableHighAccuracy: false }
    );
  }

  const radiusLabel = React.useMemo(() => {
    if (radiusMeters < 1000) return `${radiusMeters} m`;
    return `${(radiusMeters / 1000).toFixed(radiusMeters % 1000 === 0 ? 0 : 1)} km`;
  }, [radiusMeters]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-surface-0 animate-fade-in">
      <div className="sticky top-16 z-z-sticky bg-surface-0/90 backdrop-blur-md border-b border-border-subtle">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-radius-xl bg-gradient-to-br from-accent-gold-1/20 to-accent-gold-2/20 border border-accent-gold-2/30 flex items-center justify-center shrink-0">
                <Navigation className="w-5 h-5 text-accent-gold-2" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl md:text-2xl font-bold text-primary truncate">
                  {t('homeSections.nearYou')}
                </h1>
                <p className="text-xs md:text-sm text-muted truncate">
                  {results.length} {tFilter('noResults').replace('No results match your filters', 'results')} • {radiusLabel} radius
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={useCurrentLocation}
              disabled={locationLoading}
              className="shrink-0 inline-flex items-center gap-2 h-10 px-3 md:px-4 rounded-radius-md border border-border-subtle bg-surface-1 hover:bg-surface-2 text-secondary hover:text-primary transition-colors disabled:opacity-60"
              aria-label={tCommon('actions.refresh')}
            >
              <Target className={twMerge('w-4 h-4', locationLoading && 'animate-spin')} />
              <span className="hidden sm:inline text-sm font-medium">{tCommon('actions.refresh')}</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {DISTANCE_OPTIONS.map((opt) => {
              const active = !isCustom && radiusMeters === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => selectPreset(opt.value)}
                  className={twMerge(
                    'h-9 px-4 rounded-radius-full text-xs md:text-sm font-medium inline-flex items-center gap-1.5 transition-all border',
                    active
                      ? 'bg-gradient-to-r from-accent-gold-1 to-accent-gold-2 text-surface-0 border-transparent shadow-shadow-2'
                      : 'bg-surface-1 border-border-subtle text-secondary hover:text-primary hover:border-border-strong'
                  )}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  {opt.label}
                </button>
              );
            })}
            {!isCustom ? (
              <button
                type="button"
                onClick={enableCustom}
                className={twMerge(
                  'h-9 px-4 rounded-radius-full text-xs md:text-sm font-medium inline-flex items-center gap-1.5 transition-all border',
                  hasPreset
                    ? 'bg-surface-1 border-border-subtle text-secondary hover:text-primary hover:border-border-strong'
                    : 'bg-gradient-to-r from-accent-gold-1 to-accent-gold-2 text-surface-0 border-transparent shadow-shadow-2'
                )}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                {hasPreset ? 'Custom' : radiusLabel}
              </button>
            ) : (
              <div className="inline-flex items-center gap-2 h-9 px-2 rounded-radius-full border border-accent-gold-2/50 bg-surface-1 shadow-shadow-1">
                <input
                  type="number"
                  min={10}
                  max={50000}
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') applyCustom();
                  }}
                  className="w-20 md:w-24 bg-transparent border-none outline-none text-sm text-primary text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="meters"
                />
                <span className="text-xs text-muted">m</span>
                <button
                  type="button"
                  onClick={applyCustom}
                  className="h-7 px-3 rounded-radius-full bg-gradient-to-r from-accent-gold-1 to-accent-gold-2 text-surface-0 text-xs font-semibold inline-flex items-center"
                >
                  {tCommon('actions.apply')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCustom(false);
                    setRadiusMeters(DISTANCE_OPTIONS[2].value);
                  }}
                  className="w-7 h-7 rounded-radius-full hover:bg-surface-2 inline-flex items-center justify-center text-muted hover:text-secondary"
                  aria-label={tCommon('actions.cancel')}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-5 md:py-6">
        {!coords && !locationLoading && (
          <EmptyState
            illustration="search"
            title="Location needed"
            description="Allow location access to discover salons and professionals near you. LOOKIVA does not substitute a default city when your location is unavailable."
            actionLabel="Use current location"
            onAction={useCurrentLocation}
          />
        )}

        {(query.isLoading || locationLoading) && coords && (
          <div className="space-y-3">
            <SkeletonCard variant="row" count={5} />
          </div>
        )}

        {coords && !query.isLoading && query.isError && (
          <NetworkError
            variant="block"
            onRetry={() => query.refetch()}
            message="We couldn't load nearby businesses. Please check your connection and try again."
          />
        )}

        {coords && !query.isLoading && !query.isError && results.length === 0 && (
          <EmptyState
            illustration="search"
            title={`No businesses within ${radiusLabel}`}
            description="Try expanding your search radius or move to a different location to discover beauty and wellness spots near you."
            actionLabel="Reset to 1 km"
            onAction={() => selectPreset(1000)}
          />
        )}

        {coords && !query.isLoading && !query.isError && results.length > 0 && (
          <div className="space-y-3">
            {results.map((business) => (
              <div key={business.id} className="relative">
                <BusinessCard business={business} variant="row" />
                {business.distanceMeters != null && business.distanceMeters <= 500 && (
                  <div className="absolute top-3 end-3 md:top-4 md:end-4 z-10 inline-flex items-center gap-1 px-2.5 py-1 rounded-radius-full bg-accent-green/15 border border-accent-green/30 text-accent-green text-[11px] font-bold uppercase tracking-wide">
                    <MapPin className="w-3 h-3" />
                    {business.distanceMeters < 1000
                      ? `${Math.round(business.distanceMeters)} m`
                      : `${(business.distanceMeters / 1000).toFixed(1)} km`}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


