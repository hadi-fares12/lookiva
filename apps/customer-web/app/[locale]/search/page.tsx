'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { Search, SlidersHorizontal, Clock, X, Sparkles, MapPin, TrendingUp, ArrowRight, ChevronDown, Check } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useDiscoverySearch } from '@/hooks/useDiscoverySearch';
import { BusinessCard } from '@/components/shared/BusinessCard';
import { SkeletonCard } from '@/components/shared/SkeletonCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { NetworkError } from '@/components/shared/NetworkError';
import type { DiscoveryBusinessResult } from '@lookiva/shared-types';
import type { DiscoverySearchRequest } from '@lookiva/api-contracts';

const RECENT_SEARCHES_KEY = 'lookiva-recent-searches';
const MAX_RECENT = 8;

const SUGGESTED_SEARCHES = [
  { id: '1', label: 'Hair Salon', icon: Sparkles },
  { id: '2', label: 'Spa & Wellness', icon: Sparkles },
  { id: '3', label: 'Barbershop', icon: Sparkles },
  { id: '4', label: 'Nail Studio', icon: Sparkles },
  { id: '5', label: 'Makeup Artist', icon: Sparkles },
  { id: '6', label: 'Laser Hair Removal', icon: Sparkles },
  { id: '7', label: 'Facial Treatment', icon: Sparkles },
  { id: '8', label: 'Home Service', icon: MapPin },
];

function loadRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string').slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return;
  try {
    const current = loadRecentSearches();
    const next = [trimmed, ...current.filter((s) => s.toLowerCase() !== trimmed.toLowerCase())].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

function removeRecentSearch(query: string) {
  try {
    const current = loadRecentSearches();
    const next = current.filter((s) => s.toLowerCase() !== query.toLowerCase());
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

function clearRecentSearches() {
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {
    /* ignore */
  }
}

export default function SearchPage() {
  const t = useTranslations();
  const tf = useTranslations('filter');
  const locale = useLocale();
  const router = useRouter();

  const [mounted, setMounted] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [submittedQuery, setSubmittedQuery] = React.useState('');
  const [recent, setRecent] = React.useState<string[]>([]);
  const [filters, setFilters] = React.useState<Partial<DiscoverySearchRequest>>({});
  const [sortOpen, setSortOpen] = React.useState(false);
  const [activeSort, setActiveSort] = React.useState<NonNullable<DiscoverySearchRequest['sort']>>('relevance');

  const searchInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setMounted(true);
    setRecent(loadRecentSearches());
  }, []);

  const hasSubmitted = submittedQuery.trim().length > 0 || Object.keys(filters).length > 0;

  const searchEnabled = mounted && hasSubmitted;

  const queryResult = useDiscoverySearch({
    q: submittedQuery || undefined,
    sort: activeSort,
    limit: 20,
    ...filters,
    enabled: searchEnabled,
  });

  const resolvedItems: DiscoveryBusinessResult[] = queryResult.data?.items ?? [];

  const resolvedLoading = searchEnabled && queryResult.isLoading;
  const resolvedError = searchEnabled && queryResult.error;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      saveRecentSearch(trimmed);
      setRecent(loadRecentSearches());
    }
    setSubmittedQuery(trimmed);
  };

  const handleSuggestionClick = (label: string) => {
    setQuery(label);
    saveRecentSearch(label);
    setRecent(loadRecentSearches());
    setSubmittedQuery(label);
  };

  const handleRecentClick = (label: string) => {
    setQuery(label);
    setSubmittedQuery(label);
  };

  const handleRemoveRecent = (e: React.MouseEvent, label: string) => {
    e.preventDefault();
    e.stopPropagation();
    removeRecentSearch(label);
    setRecent(loadRecentSearches());
  };

  const handleClearRecent = () => {
    clearRecentSearches();
    setRecent([]);
  };

  const handleClearQuery = () => {
    setQuery('');
    setSubmittedQuery('');
    searchInputRef.current?.focus();
  };

  const handleResetAll = () => {
    setQuery('');
    setSubmittedQuery('');
    setFilters({});
    setActiveSort('relevance');
  };

  const filtersHref = `/${locale}/search/filters`;

  const activeFiltersCount = React.useMemo(() => {
    return Object.values(filters).filter((v) => (Array.isArray(v) ? v.length > 0 : v !== undefined && v !== false)).length;
  }, [filters]);

  const sortOptions: Array<{ value: NonNullable<DiscoverySearchRequest['sort']>; labelKey: string; labelDefault: string }> = [
    { value: 'nearest', labelKey: 'filter.nearest', labelDefault: 'Nearest First' },
    { value: 'topRated', labelKey: 'filter.topRated', labelDefault: 'Highest Rated' },
    { value: 'mostBooked', labelKey: 'filter.mostBooked', labelDefault: 'Most Booked' },
    { value: 'lowPrice', labelKey: 'filter.lowPrice', labelDefault: 'Price: Low to High' },
    { value: 'highPrice', labelKey: 'filter.highPrice', labelDefault: 'Price: High to Low' },
    { value: 'newest', labelKey: 'filter.newest', labelDefault: 'Newest First' },
  ];

  return (
    <div className="min-h-[calc(100vh-8rem)]">
      <div className="sticky top-0 z-30 bg-surface-0/90 backdrop-blur-xl border-b border-border-subtle px-4 md:px-6 py-3 md:py-4">
        <div className="w-full max-w-3xl mx-auto flex items-center gap-2 md:gap-3">
          <form onSubmit={handleSubmit} className="flex-1 relative">
            <div className="relative flex items-center">
              <Search className="absolute start-4 w-5 h-5 text-muted" strokeWidth={1.8} />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('common.actions.searchPlaceholder')}
                className={twMerge(
                  'w-full h-12 md:h-14 rounded-radius-2xl bg-surface-1 border border-border-subtle text-primary text-sm md:text-base placeholder:text-muted',
                  'ps-12 pe-12 outline-none transition-all focus:border-accent-gold-2/60 focus:ring-2 focus:ring-accent-gold-2/20'
                )}
              />
              {query && (
                <button
                  type="button"
                  onClick={handleClearQuery}
                  className="absolute end-3 w-8 h-8 rounded-radius-full flex items-center justify-center text-muted hover:text-primary hover:bg-surface-2 transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>

          <Link
            href={filtersHref}
            className={twMerge(
              'shrink-0 relative inline-flex items-center justify-center h-12 md:h-14 px-4 md:px-5 rounded-radius-2xl border transition-all',
              activeFiltersCount > 0
                ? 'border-accent-gold-2/60 bg-accent-gold-2/10 text-accent-gold-2 hover:bg-accent-gold-2/15'
                : 'border-border-subtle bg-surface-1 text-secondary hover:text-primary hover:bg-surface-2'
            )}
          >
            <SlidersHorizontal className="w-5 h-5" strokeWidth={1.8} />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1.5 -end-1.5 min-w-[20px] h-5 px-1.5 rounded-radius-full bg-gradient-to-r from-accent-gold-1 to-accent-gold-2 text-surface-0 text-[10px] font-bold flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      <div className="w-full max-w-3xl mx-auto px-4 md:px-6 py-5 md:py-6">
        {!hasSubmitted && (
          <div className="space-y-7 md:space-y-8 animate-fade-in">
            {mounted && recent.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3 md:mb-4">
                  <div className="flex items-center gap-2 text-primary">
                    <Clock className="w-4 h-4 md:w-5 md:h-5 text-accent-gold-2" />
                    <h2 className="text-sm md:text-base font-semibold">
                      {t('nav.search')} — Recent
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearRecent}
                    className="text-xs md:text-sm text-muted hover:text-accent-gold-2 transition-colors font-medium"
                  >
                    {t('common.actions.clear')}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recent.map((r) => (
                    <div
                      key={r}
                      className="group inline-flex items-center rounded-radius-full bg-surface-1 border border-border-subtle ps-4 pe-1.5 py-2 hover:border-accent-gold-2/40 transition-colors animate-fade-in"
                    >
                      <button
                        type="button"
                        onClick={() => handleRecentClick(r)}
                        className="text-sm text-secondary hover:text-primary transition-colors pr-1.5 truncate max-w-[200px]"
                      >
                        {r}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleRemoveRecent(e, r)}
                        className="shrink-0 w-6 h-6 rounded-radius-full flex items-center justify-center text-muted hover:text-accent-red hover:bg-accent-red/10 transition-colors opacity-60 group-hover:opacity-100"
                        aria-label="Remove recent search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section>
              <div className="flex items-center gap-2 text-primary mb-3 md:mb-4">
                <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-accent-gold-2" />
                <h2 className="text-sm md:text-base font-semibold">
                  {t('homeSections.trending')} Searches
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                {SUGGESTED_SEARCHES.map((s) => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSuggestionClick(s.label)}
                      className="group w-full flex items-center gap-3 px-4 py-3.5 rounded-radius-xl bg-surface-1 border border-border-subtle hover:border-accent-gold-2/50 hover:bg-surface-2 transition-all animate-fade-in"
                    >
                      <div className="shrink-0 w-9 h-9 md:w-10 md:h-10 rounded-radius-lg bg-gradient-to-br from-accent-gold-1/15 to-accent-silver-1/10 flex items-center justify-center">
                        <Icon className="w-4.5 h-4.5 md:w-5 md:h-5 text-accent-gold-2" strokeWidth={1.8} />
                      </div>
                      <span className="flex-1 text-start text-sm md:text-base text-primary font-medium truncate">
                        {s.label}
                      </span>
                      <ArrowRight className="w-4 h-4 md:w-5 md:h-5 text-muted group-hover:text-accent-gold-2 group-hover:translate-x-0.5 transition-all" strokeWidth={1.8} />
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {hasSubmitted && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm md:text-base text-secondary">
                {resolvedLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-2 h-2 rounded-radius-full bg-accent-gold-2 animate-pulse" />
                    {t('common.actions.loading')}
                  </span>
                ) : resolvedError ? null : (
                  <>
                    <span className="font-semibold text-primary">{resolvedItems.length}</span>{' '}
                    <span className="text-muted">
                      {resolvedItems.length === 1 ? 'result' : 'results'}
                      {submittedQuery && (
                        <>
                          {' '}for{' '}
                          <span className="text-primary font-medium">&ldquo;{submittedQuery}&rdquo;</span>
                        </>
                      )}
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setSortOpen((o) => !o)}
                    className="inline-flex items-center gap-2 h-10 px-4 rounded-radius-xl bg-surface-1 border border-border-subtle text-sm text-secondary hover:text-primary hover:bg-surface-2 transition-colors"
                  >
                    <span>{tf('sortBy')}</span>
                    <span className="font-medium text-primary">
                      {t(sortOptions.find((o) => o.value === activeSort)?.labelKey as any) ||
                        sortOptions.find((o) => o.value === activeSort)?.labelDefault}
                    </span>
                    <ChevronDown
                      className={twMerge('w-4 h-4 text-muted transition-transform', sortOpen && 'rotate-180')}
                    />
                  </button>
                  {sortOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setSortOpen(false)}
                      />
                      <div className="absolute end-0 mt-2 w-64 rounded-radius-xl bg-surface-1 border border-border-subtle shadow-shadow-5 z-20 py-2 overflow-hidden animate-fade-in">
                        {sortOptions.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setActiveSort(opt.value);
                              setSortOpen(false);
                            }}
                            className={twMerge(
                              'w-full flex items-center gap-3 px-4 py-3 text-sm text-start transition-colors',
                              activeSort === opt.value
                                ? 'bg-accent-gold-2/10 text-accent-gold-2'
                                : 'text-secondary hover:text-primary hover:bg-surface-2'
                            )}
                          >
                            <span className="flex-1 font-medium">
                              {t(opt.labelKey as any) || opt.labelDefault}
                            </span>
                            {activeSort === opt.value && (
                              <Check className="w-4 h-4 shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {(submittedQuery || activeFiltersCount > 0) && (
                  <button
                    type="button"
                    onClick={handleResetAll}
                    className="inline-flex items-center gap-1.5 h-10 px-3 rounded-radius-xl text-sm text-muted hover:text-accent-red transition-colors"
                  >
                    <X className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('common.actions.reset')}</span>
                  </button>
                )}
              </div>
            </div>

            {resolvedError && (
              <NetworkError
                variant="block"
                onRetry={() => queryResult.refetch()}
              />
            )}

            {resolvedLoading && (
              <div className="space-y-3 md:space-y-4">
                <SkeletonCard variant="row" count={6} />
              </div>
            )}

            {!resolvedLoading && !resolvedError && resolvedItems.length === 0 && (
              <EmptyState
                illustration="search"
                title={tf('noResults') || 'No results match your filters'}
                description="Try adjusting your search keywords or refining your filters to discover more places near you."
                actionLabel={t('common.actions.reset')}
                onAction={handleResetAll}
              />
            )}

            {!resolvedLoading && !resolvedError && resolvedItems.length > 0 && (
              <div className="space-y-3 md:space-y-4">
                {resolvedItems.map((biz) => (
                  <BusinessCard
                    key={biz.id}
                    business={biz}
                    variant="row"
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}



