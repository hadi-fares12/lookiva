'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import {
  ArrowLeft,
  SlidersHorizontal,
  MapPin,
  Star,
  DollarSign,
  Clock,
  Tag,
  Check,
  X,
  ChevronDown,
  Home,
  BadgeCheck,
  Percent,
  CreditCard,
  Car,
  Accessibility,
  CalendarCheck,
  Users,
  Sparkles,
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { DiscoverySearchRequest } from '@lookiva/api-contracts';

type SortKey = NonNullable<DiscoverySearchRequest['sort']>;

const FILTERS_KEY = 'lookiva-search-filters';

const CATEGORIES = [
  { id: 'cat-hair', label: 'Hair Salon', color: 'from-amber-400 to-yellow-500' },
  { id: 'cat-spa', label: 'Spa & Wellness', color: 'from-teal-400 to-emerald-500' },
  { id: 'cat-barber', label: 'Barbershop', color: 'from-rose-400 to-pink-500' },
  { id: 'cat-nails', label: 'Nail Studio', color: 'from-fuchsia-400 to-purple-500' },
  { id: 'cat-makeup', label: 'Makeup', color: 'from-orange-400 to-red-500' },
  { id: 'cat-laser', label: 'Laser & Skin', color: 'from-sky-400 to-blue-500' },
  { id: 'cat-facial', label: 'Facial Care', color: 'from-cyan-400 to-teal-500' },
  { id: 'cat-massage', label: 'Massage Therapy', color: 'from-lime-400 to-green-500' },
  { id: 'cat-tanning', label: 'Tanning', color: 'from-yellow-400 to-orange-500' },
  { id: 'cat-bridal', label: 'Bridal Packages', color: 'from-pink-400 to-rose-500' },
  { id: 'cat-hommes', label: "Men's Grooming", color: 'from-slate-400 to-zinc-500' },
  { id: 'cat-piercing', label: 'Piercing & Tattoo', color: 'from-violet-400 to-indigo-500' },
];

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash', icon: DollarSign },
  { id: 'card', label: 'Card', icon: CreditCard },
  { id: 'apple_pay', label: 'Apple Pay', icon: CreditCard },
  { id: 'google_pay', label: 'Google Pay', icon: CreditCard },
  { id: 'wallet', label: 'Wallet', icon: CreditCard },
  { id: 'bank_transfer', label: 'Bank Transfer', icon: CreditCard },
];

const PARKING_OPTIONS = [
  { id: 'parking_free', labelKey: 'filter.facility.parking_free', defaultLabel: 'Free Parking' },
  { id: 'parking_paid', labelKey: 'filter.facility.parking_paid', defaultLabel: 'Paid Parking' },
  { id: 'valet', labelKey: 'filter.facility.valet', defaultLabel: 'Valet Parking' },
  { id: 'street', label: 'Street Parking' },
];

const ACCESSIBILITY_OPTIONS = [
  { id: 'wheelchair', labelKey: 'filter.facility.wheelchair', defaultLabel: 'Wheelchair Access' },
  { id: 'restroom', labelKey: 'filter.facility.restroom', defaultLabel: 'Restroom' },
  { id: 'waiting', labelKey: 'filter.facility.waiting', defaultLabel: 'Waiting Area' },
  { id: 'kids', labelKey: 'filter.facility.kids', defaultLabel: 'Kids Friendly' },
  { id: 'wifi', labelKey: 'filter.facility.wifi', defaultLabel: 'Free Wi-Fi' },
  { id: 'ac', labelKey: 'filter.facility.ac', defaultLabel: 'Air Conditioning' },
];

const GENDER_OPTIONS = [
  { id: 'any', labelKey: 'filter.anyGender', defaultLabel: 'Any' },
  { id: 'female', labelKey: 'filter.femaleOnly', defaultLabel: 'Female' },
  { id: 'male', labelKey: 'filter.maleOnly', defaultLabel: 'Male' },
  { id: 'nonbinary', labelKey: 'filter.nonBinary', defaultLabel: 'Non-binary Preferred' },
];

const SORT_OPTIONS: Array<{ value: SortKey; labelKey: string; defaultLabel: string; icon: React.ComponentType<any> }> = [
  { value: 'nearest', labelKey: 'filter.nearest', defaultLabel: 'Nearest First', icon: MapPin },
  { value: 'topRated', labelKey: 'filter.topRated', defaultLabel: 'Highest Rated', icon: Star },
  { value: 'mostBooked', labelKey: 'filter.mostBooked', defaultLabel: 'Most Booked', icon: Users },
  { value: 'lowPrice', labelKey: 'filter.lowPrice', defaultLabel: 'Price: Low to High', icon: DollarSign },
  { value: 'highPrice', labelKey: 'filter.highPrice', defaultLabel: 'Price: High to Low', icon: DollarSign },
  { value: 'earliest', labelKey: 'filter.earliest', defaultLabel: 'Earliest Availability', icon: CalendarCheck },
  { value: 'trending', labelKey: 'filter.trending', defaultLabel: 'Trending Now', icon: Sparkles },
  { value: 'newest', labelKey: 'filter.newest', defaultLabel: 'Newest First', icon: Sparkles },
];

const PRICE_LEVELS = [1, 2, 3, 4] as const;

interface FilterState {
  distanceKm: number;
  minRating: number;
  priceMin: number;
  priceMax: number;
  priceLevels: typeof PRICE_LEVELS[number][];
  openNow: boolean;
  availableNow: boolean;
  categoryIds: string[];
  genderPreference: string;
  homeService: boolean;
  verified: boolean;
  promotion: boolean;
  paymentMethods: string[];
  parking: string[];
  accessibility: string[];
  earliestSlot: string;
  sort: SortKey;
}

const DEFAULT_STATE: FilterState = {
  distanceKm: 10,
  minRating: 0,
  priceMin: 0,
  priceMax: 1000000,
  priceLevels: [],
  openNow: false,
  availableNow: false,
  categoryIds: [],
  genderPreference: 'any',
  homeService: false,
  verified: false,
  promotion: false,
  paymentMethods: [],
  parking: [],
  accessibility: [],
  earliestSlot: '',
  sort: 'relevance',
};

function loadStored(): FilterState {
  try {
    const raw = localStorage.getItem(FILTERS_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw) as Partial<FilterState>;
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function RatingStar({ filled, onClick }: { filled: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="p-1 transition-transform hover:scale-110 active:scale-95"
    >
      <Star
        className={twMerge(
          'w-7 h-7 md:w-8 md:h-8 transition-colors',
          filled ? 'text-accent-gold-2 fill-accent-gold-2' : 'text-border-strong'
        )}
        strokeWidth={filled ? 2.2 : 1.8}
      />
    </button>
  );
}

function Chip({
  selected,
  onToggle,
  children,
  className,
}: {
  selected: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={twMerge(
        'inline-flex items-center gap-1.5 h-9 px-3.5 rounded-radius-full text-sm font-medium transition-all border',
        selected
          ? 'border-accent-gold-2/60 bg-gradient-to-r from-accent-gold-1/20 to-accent-gold-2/15 text-accent-gold-2 shadow-shadow-1'
          : 'border-border-subtle bg-surface-1 text-secondary hover:text-primary hover:bg-surface-2 hover:border-border-strong',
        className
      )}
    >
      {selected && <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />}
      {children}
    </button>
  );
}

function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={twMerge(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-radius-full transition-colors border',
        checked ? 'bg-gradient-to-r from-accent-gold-1 to-accent-gold-2 border-transparent' : 'bg-surface-2 border-border-strong',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span
        className={twMerge(
          'inline-block h-5 w-5 rounded-radius-full bg-surface-0 shadow-shadow-1 transform transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5'
        )}
      />
    </button>
  );
}

function SectionCard({
  icon: Icon,
  title,
  children,
  className,
}: {
  icon: React.ComponentType<any>;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={twMerge(
        'rounded-radius-2xl border border-border-subtle bg-surface-1 overflow-hidden animate-fade-in',
        className
      )}
    >
      <header className="flex items-center gap-3 px-4 md:px-5 py-4 border-b border-border-subtle">
        <div className="shrink-0 w-9 h-9 rounded-radius-xl bg-gradient-to-br from-accent-gold-1/15 to-accent-silver-1/10 flex items-center justify-center">
          <Icon className="w-4.5 h-4.5 text-accent-gold-2" strokeWidth={1.8} />
        </div>
        <h3 className="text-sm md:text-base font-semibold text-primary">{title}</h3>
      </header>
      <div className="p-4 md:p-5">{children}</div>
    </section>
  );
}

export default function FiltersPage() {
  const t = useTranslations();
  const tf = useTranslations('filter');
  const locale = useLocale();
  const router = useRouter();

  const [state, setState] = React.useState<FilterState>(() => ({ ...DEFAULT_STATE }));
  const [sortOpen, setSortOpen] = React.useState(false);

  React.useEffect(() => {
    setState(loadStored());
  }, []);

  const update = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setState((s) => ({ ...s, [key]: value }));
  };

  const toggleInArray = <K extends keyof FilterState>(key: K, value: string) => {
    setState((s) => {
      const current = (s[key] as unknown as string[]) || [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...s, [key]: next as FilterState[K] };
    });
  };

  const activeCount = React.useMemo(() => {
    let c = 0;
    if (state.distanceKm !== DEFAULT_STATE.distanceKm) c++;
    if (state.minRating > 0) c++;
    if (state.priceLevels.length > 0) c++;
    if (state.openNow) c++;
    if (state.availableNow) c++;
    if (state.categoryIds.length > 0) c += state.categoryIds.length;
    if (state.genderPreference !== DEFAULT_STATE.genderPreference) c++;
    if (state.homeService) c++;
    if (state.verified) c++;
    if (state.promotion) c++;
    if (state.paymentMethods.length > 0) c += state.paymentMethods.length;
    if (state.parking.length > 0) c += state.parking.length;
    if (state.accessibility.length > 0) c += state.accessibility.length;
    if (state.earliestSlot) c++;
    return c;
  }, [state]);

  const handleReset = () => {
    setState({ ...DEFAULT_STATE });
    try {
      localStorage.removeItem(FILTERS_KEY);
    } catch {
      /* ignore */
    }
  };

  const handleApply = () => {
    try {
      localStorage.setItem(FILTERS_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
    router.push(`/${locale}/search`);
  };

  const formatPrice = (v: number) => {
    if (v >= 1000000) return `${(v / 1000000).toFixed(v % 1000000 === 0 ? 0 : 1)}M`;
    if (v >= 1000) return `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 0)}K`;
    return `${v}`;
  };

  const selectedSort = SORT_OPTIONS.find((o) => o.value === state.sort) || SORT_OPTIONS[0];
  const SortIcon = selectedSort.icon;

  return (
    <div className="min-h-[calc(100vh-8rem)] pb-32">
      <div className="sticky top-0 z-30 bg-surface-0/90 backdrop-blur-xl border-b border-border-subtle">
        <div className="w-full max-w-3xl mx-auto flex items-center gap-3 px-4 md:px-6 py-3 md:py-4">
          <Link
            href={`/${locale}/search`}
            className="shrink-0 inline-flex items-center justify-center w-10 h-10 md:w-11 md:h-11 rounded-radius-xl bg-surface-1 border border-border-subtle text-secondary hover:text-primary hover:bg-surface-2 transition-colors"
            aria-label={t('common.actions.back')}
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={1.8} />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-primary">
              <SlidersHorizontal className="w-5 h-5 text-accent-gold-2" strokeWidth={1.8} />
              <h1 className="text-base md:text-lg font-bold truncate">{tf('title')}</h1>
            </div>
            {activeCount > 0 && (
              <p className="text-xs md:text-sm text-muted mt-0.5">
                {activeCount} {tf('filtersApplied')}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="shrink-0 inline-flex items-center gap-1.5 h-10 px-4 rounded-radius-xl text-sm text-muted hover:text-accent-red transition-colors font-medium"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">{t('common.actions.reset')}</span>
          </button>
        </div>
      </div>

      <div className="w-full max-w-3xl mx-auto px-4 md:px-6 py-5 md:py-6 space-y-4 md:space-y-5">
        <SectionCard icon={Sparkles} title={tf('sortBy')}>
          <div className="relative">
            <button
              type="button"
              onClick={() => setSortOpen((o) => !o)}
              className="w-full flex items-center gap-3 h-12 px-4 rounded-radius-xl bg-surface-2 border border-border-subtle hover:border-border-strong transition-colors"
            >
              <div className="shrink-0 w-8 h-8 rounded-radius-lg bg-gradient-to-br from-accent-gold-1/20 to-accent-silver-1/10 flex items-center justify-center">
                <SortIcon className="w-4 h-4 text-accent-gold-2" strokeWidth={1.8} />
              </div>
              <span className="flex-1 text-start">
                <span className="block text-xs text-muted">{tf('sortBy')}</span>
                <span className="block text-sm md:text-base font-semibold text-primary">
                  {t(selectedSort.labelKey as any) || selectedSort.defaultLabel}
                </span>
              </span>
              <ChevronDown className={twMerge('w-5 h-5 text-muted transition-transform', sortOpen && 'rotate-180')} />
            </button>
            {sortOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
                <div className="absolute left-0 right-0 top-full mt-2 rounded-radius-2xl bg-surface-1 border border-border-subtle shadow-shadow-5 z-20 py-2 overflow-hidden animate-fade-in">
                  {SORT_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const active = state.sort === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          update('sort', opt.value);
                          setSortOpen(false);
                        }}
                        className={twMerge(
                          'w-full flex items-center gap-3 px-4 py-3.5 text-sm transition-colors',
                          active ? 'bg-accent-gold-2/10' : 'hover:bg-surface-2'
                        )}
                      >
                        <div
                          className={twMerge(
                            'shrink-0 w-8 h-8 rounded-radius-lg flex items-center justify-center',
                            active
                              ? 'bg-gradient-to-br from-accent-gold-1/30 to-accent-gold-2/20 text-accent-gold-2'
                              : 'bg-surface-2 text-muted'
                          )}
                        >
                          <Icon className="w-4 h-4" strokeWidth={1.8} />
                        </div>
                        <span
                          className={twMerge(
                            'flex-1 text-start font-medium',
                            active ? 'text-accent-gold-2' : 'text-primary'
                          )}
                        >
                          {t(opt.labelKey as any) || opt.defaultLabel}
                        </span>
                        {active && <Check className="w-4.5 h-4.5 text-accent-gold-2 shrink-0" strokeWidth={2.5} />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </SectionCard>

        <SectionCard icon={MapPin} title={tf('distance')}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-secondary">Radius</span>
              <span className="text-sm font-bold text-accent-gold-2">
                {state.distanceKm <= 1 ? `${Math.round(state.distanceKm * 1000)} m` : `${state.distanceKm.toFixed(state.distanceKm % 1 === 0 ? 0 : 1)} km`}
              </span>
            </div>
            <div className="relative">
              <input
                type="range"
                min={0.5}
                max={50}
                step={0.5}
                value={state.distanceKm}
                onChange={(e) => update('distanceKm', parseFloat(e.target.value))}
                className="w-full h-2 rounded-radius-full bg-surface-2 accent-accent-gold-2 appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-5
                  [&::-webkit-slider-thumb]:h-5
                  [&::-webkit-slider-thumb]:rounded-radius-full
                  [&::-webkit-slider-thumb]:bg-gradient-to-br
                  [&::-webkit-slider-thumb]:from-accent-gold-1
                  [&::-webkit-slider-thumb]:to-accent-gold-3
                  [&::-webkit-slider-thumb]:shadow-shadow-2
                  [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-webkit-slider-thumb]:border-2
                  [&::-webkit-slider-thumb]:border-surface-0
                  [&::-moz-range-thumb]:w-5
                  [&::-moz-range-thumb]:h-5
                  [&::-moz-range-thumb]:rounded-radius-full
                  [&::-moz-range-thumb]:border-0
                  [&::-moz-range-thumb]:bg-gradient-to-br
                  [&::-moz-range-thumb]:from-accent-gold-1
                  [&::-moz-range-thumb]:to-accent-gold-3"
              />
              <div className="mt-2 flex justify-between text-xs text-muted">
                <span>500m</span>
                <span>10 km</span>
                <span>25 km</span>
                <span>50 km</span>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={DollarSign} title={tf('price')}>
          <div className="space-y-5">
            <div>
              <p className="text-xs text-muted mb-2.5">{tf('priceLevel')}</p>
              <div className="flex flex-wrap gap-2">
                {PRICE_LEVELS.map((lvl) => {
                  const selected = state.priceLevels.includes(lvl);
                  const label =
                    lvl === 1 ? t('filter.budget') :
                    lvl === 2 ? t('filter.moderate') :
                    lvl === 3 ? t('filter.premium') :
                    t('filter.luxury');
                  return (
                    <Chip
                      key={lvl}
                      selected={selected}
                      onToggle={() => {
                        setState((s) => ({
                          ...s,
                          priceLevels: s.priceLevels.includes(lvl)
                            ? s.priceLevels.filter((x) => x !== lvl)
                            : [...s.priceLevels, lvl],
                        }));
                      }}
                    >
                      <span className="font-bold tracking-wide" style={{ letterSpacing: '0.08em' }}>
                        {'$'.repeat(lvl)}
                      </span>
                      <span className="text-xs opacity-75">({label})</span>
                    </Chip>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Custom Range (LBP)</span>
                <span className="text-xs font-medium text-secondary">
                  {formatPrice(state.priceMin)} — {formatPrice(state.priceMax)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <span className="absolute start-3 top-1/2 -translate-y-1/2 text-xs text-muted font-medium">Min</span>
                  <input
                    type="number"
                    value={state.priceMin}
                    onChange={(e) => update('priceMin', Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full h-11 rounded-radius-xl bg-surface-2 border border-border-subtle text-primary text-sm ps-14 pe-4 outline-none focus:border-accent-gold-2/50 transition-colors"
                  />
                </div>
                <div className="relative">
                  <span className="absolute start-3 top-1/2 -translate-y-1/2 text-xs text-muted font-medium">Max</span>
                  <input
                    type="number"
                    value={state.priceMax}
                    onChange={(e) => update('priceMax', Math.max(state.priceMin, parseInt(e.target.value) || 0))}
                    className="w-full h-11 rounded-radius-xl bg-surface-2 border border-border-subtle text-primary text-sm ps-14 pe-4 outline-none focus:border-accent-gold-2/50 transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={Star} title={tf('rating')}>
          <div className="space-y-4">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <RatingStar
                  key={n}
                  filled={state.minRating >= n}
                  onClick={() => update('minRating', state.minRating === n ? 0 : n)}
                />
              ))}
              <span className="ms-3 text-sm font-semibold text-primary">
                {state.minRating === 0 ? tf('reviews') : `${state.minRating}+ ★`}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {[3, 4, 4.5].map((r) => (
                <Chip
                  key={r}
                  selected={state.minRating === r}
                  onToggle={() => update('minRating', state.minRating === r ? 0 : r)}
                >
                  <Star className="w-3.5 h-3.5 fill-current" strokeWidth={0} />
                  <span className="font-medium">{r}+</span>
                </Chip>
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={Clock} title={t('business.openNow')}>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium text-primary">{tf('openNow')}</p>
                <p className="text-xs text-muted mt-0.5">Show only businesses currently open</p>
              </div>
              <ToggleSwitch checked={state.openNow} onChange={(v) => update('openNow', v)} />
            </div>
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium text-primary">{tf('availableNow')}</p>
                <p className="text-xs text-muted mt-0.5">Bookable within the next hour</p>
              </div>
              <ToggleSwitch checked={state.availableNow} onChange={(v) => update('availableNow', v)} />
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={CalendarCheck} title={tf('earliestSlot')}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: '', label: 'Anytime' },
              { id: 'today', label: t('common.time.today') },
              { id: 'tomorrow', label: t('common.time.tomorrow') },
              { id: 'week', label: t('business.week') },
            ].map((opt) => (
              <Chip
                key={opt.id || 'any'}
                selected={state.earliestSlot === opt.id}
                onToggle={() => update('earliestSlot', opt.id)}
                className="justify-center h-11"
              >
                {opt.label}
              </Chip>
            ))}
          </div>
        </SectionCard>

        <SectionCard icon={Tag} title={tf('category')}>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <Chip
                key={cat.id}
                selected={state.categoryIds.includes(cat.id)}
                onToggle={() => toggleInArray('categoryIds', cat.id)}
              >
                <span
                  className={twMerge(
                    'w-2 h-2 rounded-radius-full bg-gradient-to-br',
                    cat.color
                  )}
                />
                {cat.label}
              </Chip>
            ))}
          </div>
        </SectionCard>

        <SectionCard icon={Users} title={tf('genderPreference')}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {GENDER_OPTIONS.map((opt) => (
              <Chip
                key={opt.id}
                selected={state.genderPreference === opt.id}
                onToggle={() => update('genderPreference', opt.id)}
                className="justify-center h-11"
              >
                {t(opt.labelKey as any) || opt.defaultLabel}
              </Chip>
            ))}
          </div>
        </SectionCard>

        <SectionCard icon={Home} title={tf('homeService')}>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium text-primary">{tf('homeService')}</p>
                <p className="text-xs text-muted mt-0.5">Professionals who come to your location</p>
              </div>
              <ToggleSwitch checked={state.homeService} onChange={(v) => update('homeService', v)} />
            </div>
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium text-primary">{tf('verified')}</p>
                <p className="text-xs text-muted mt-0.5">{t('common.verified')} businesses only</p>
              </div>
              <ToggleSwitch checked={state.verified} onChange={(v) => update('verified', v)} />
            </div>
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium text-primary">{tf('promotion')}</p>
                <p className="text-xs text-muted mt-0.5">Active discounts and special offers</p>
              </div>
              <ToggleSwitch checked={state.promotion} onChange={(v) => update('promotion', v)} />
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={CreditCard} title={tf('payment')}>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_METHODS.map((pm) => {
              const Icon = pm.icon;
              return (
                <Chip
                  key={pm.id}
                  selected={state.paymentMethods.includes(pm.id)}
                  onToggle={() => toggleInArray('paymentMethods', pm.id)}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.8} />
                  {pm.label}
                </Chip>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard icon={Car} title={tf('parking')}>
          <div className="flex flex-wrap gap-2">
            {PARKING_OPTIONS.map((opt) => (
              <Chip
                key={opt.id}
                selected={state.parking.includes(opt.id)}
                onToggle={() => toggleInArray('parking', opt.id)}
              >
                {t(opt.labelKey as any) || opt.defaultLabel}
              </Chip>
            ))}
          </div>
        </SectionCard>

        <SectionCard icon={Accessibility} title={tf('accessibility')}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ACCESSIBILITY_OPTIONS.map((opt) => (
              <Chip
                key={opt.id}
                selected={state.accessibility.includes(opt.id)}
                onToggle={() => toggleInArray('accessibility', opt.id)}
                className="justify-start"
              >
                {t(opt.labelKey as any) || opt.defaultLabel}
              </Chip>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="fixed bottom-0 inset-x-0 z-40 border-t border-border-subtle bg-surface-0/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
        <div className="w-full max-w-3xl mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="shrink-0 h-12 px-5 md:px-6 rounded-radius-2xl border border-border-subtle bg-surface-1 text-secondary hover:text-primary hover:bg-surface-2 text-sm md:text-base font-semibold transition-colors"
          >
            {tf('resetFilters')}
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex-1 h-12 md:h-13 px-6 rounded-radius-2xl bg-gradient-to-r from-accent-gold-1 via-accent-gold-2 to-accent-gold-3 text-surface-0 text-sm md:text-base font-bold inline-flex items-center justify-center gap-2 hover:shadow-shadow-4 hover:shadow-accent-gold-2/20 active:scale-[0.98] transition-all shadow-shadow-2"
          >
            <BadgeCheck className="w-4.5 h-4.5" strokeWidth={2.2} />
            <span>{tf('applyFilters')}</span>
            {activeCount > 0 && (
              <span className="shrink-0 ms-1 min-w-[22px] h-[22px] px-1.5 rounded-radius-full bg-surface-0/20 backdrop-blur-sm text-surface-0 text-[11px] font-bold flex items-center justify-center">
                {activeCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}




