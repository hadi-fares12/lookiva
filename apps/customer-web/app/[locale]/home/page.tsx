'use client';

import * as React from 'react';
import { Filter, MapPin, Search } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { HomeSectionKey, type DiscoveryBusinessResult } from '@lookiva/shared-types';
import { useHomeSections } from '@/hooks/useHomeSections';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { BusinessCard } from '@/components/shared/BusinessCard';
import { SkeletonCard } from '@/components/shared/SkeletonCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { NetworkError } from '@/components/shared/NetworkError';

const SECTION_TKEY_MAP: Record<HomeSectionKey, string> = {
  [HomeSectionKey.ForYou]: 'homeSections.forYou',
  [HomeSectionKey.NearYou]: 'homeSections.nearYou',
  [HomeSectionKey.AvailableNow]: 'homeSections.availableNow',
  [HomeSectionKey.Trending]: 'homeSections.trending',
  [HomeSectionKey.TopRated]: 'homeSections.topRated',
  [HomeSectionKey.BestValue]: 'homeSections.bestValue',
  [HomeSectionKey.LastMinute]: 'homeSections.lastMinute',
  [HomeSectionKey.Offers]: 'homeSections.offers',
  [HomeSectionKey.NewNearYou]: 'homeSections.newNearYou',
  [HomeSectionKey.Following]: 'homeSections.following',
  [HomeSectionKey.RecentlyViewed]: 'homeSections.recentlyViewed',
  [HomeSectionKey.PopularCategories]: 'homeSections.popularCategories',
  [HomeSectionKey.RecommendedProfessionals]: 'homeSections.recommendedProfessionals',
};

function HomeSection({
  sectionKey,
  title,
  subtitle,
  items,
  isLoading,
  error,
  onRetry,
  compact,
}: {
  sectionKey: HomeSectionKey;
  title: string;
  subtitle?: string | null;
  items: DiscoveryBusinessResult[];
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  compact?: boolean;
}) {
  const t = useTranslations('common');
  return (
    <section className="animate-fade-in">
      <SectionHeader title={title} subtitle={subtitle} viewAllHref={`/search?section=${sectionKey}`} />
      {error && !isLoading ? (
        <NetworkError variant="block" onRetry={onRetry} />
      ) : isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          <SkeletonCard variant="business" count={4} />
        </div>
      ) : items.length === 0 ? (
        <EmptyState illustration="search" title={t('empty')} />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0 snap-x snap-mandatory scrollbar-hide">
          {items.map((business) => (
            <div key={`${sectionKey}-${business.id}`} className="snap-start shrink-0">
              <BusinessCard business={business} variant={compact ? 'compact' : 'default'} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function HomePage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [location, setLocation] = React.useState<{ lat: number; lon: number } | null>(null);
  const [locationState, setLocationState] = React.useState<'checking' | 'available' | 'unavailable'>('checking');

  React.useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationState('unavailable');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setLocationState('available');
      },
      () => setLocationState('unavailable'),
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60_000 },
    );
  }, []);

  const homeQuery = useHomeSections({ lat: location?.lat, lon: location?.lon });
  const sections = homeQuery.data?.sections ?? [];
  const getSection = (key: HomeSectionKey) =>
    sections.find((section) => section.key === key);

  const sectionKeys = [
    HomeSectionKey.ForYou,
    HomeSectionKey.NearYou,
    HomeSectionKey.AvailableNow,
    HomeSectionKey.Trending,
    HomeSectionKey.TopRated,
    HomeSectionKey.NewNearYou,
  ];

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    router.push(`/${locale}/search${params.size ? `?${params}` : ''}`);
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] animate-fade-in">
      <div className="sticky top-[calc(env(safe-area-inset-top)+3.5rem)] z-30 -mx-4 md:-mx-6 px-4 md:px-6 pt-3 pb-4 bg-gradient-to-b from-surface-0 via-surface-0/95 to-transparent backdrop-blur-md">
        <div className="w-full max-w-5xl mx-auto space-y-3">
          <button
            type="button"
            onClick={() => router.push(`/${locale}/location-permission`)}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-radius-full bg-surface-1 border border-border-subtle hover:border-accent-gold-2/50 transition-colors"
          >
            <MapPin className="w-4 h-4 text-accent-gold-2" />
            <span className="text-sm font-medium text-secondary">
              {locationState === 'available' ? 'Current location' : locationState === 'checking' ? 'Checking location…' : 'Choose location'}
            </span>
          </button>

          <form onSubmit={submitSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t('common.actions.searchPlaceholder')}
                className="w-full h-12 ps-12 pe-4 rounded-radius-xl bg-surface-1 border border-border-subtle text-primary placeholder:text-muted focus:outline-none focus:border-accent-gold-2/60"
              />
            </div>
            <button
              type="button"
              onClick={() => router.push(`/${locale}/search`)}
              className="h-12 w-12 md:w-auto md:px-5 inline-flex items-center justify-center gap-2 rounded-radius-xl bg-surface-1 border border-border-subtle"
              aria-label={t('filter.title')}
            >
              <Filter className="w-5 h-5" />
              <span className="hidden md:inline">{t('filter.title')}</span>
            </button>
          </form>
        </div>
      </div>

      <div className="w-full max-w-5xl mx-auto mt-4 space-y-9 pb-12">
        {homeQuery.isError && (
          <NetworkError variant="inline" onRetry={() => void homeQuery.refetch()} />
        )}
        {sectionKeys.map((key, index) => {
          const section = getSection(key);
          return (
            <HomeSection
              key={key}
              sectionKey={key}
              title={section?.title ?? t(SECTION_TKEY_MAP[key] as any)}
              subtitle={section?.subtitle}
              items={(section?.items ?? []).filter((item): item is DiscoveryBusinessResult => Boolean((item as DiscoveryBusinessResult)?.companyName))}
              isLoading={homeQuery.isLoading}
              error={homeQuery.error}
              onRetry={() => void homeQuery.refetch()}
              compact={index % 3 === 2}
            />
          );
        })}
      </div>
    </div>
  );
}
