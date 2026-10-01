'use client';

import * as React from 'react';
import { MapPin, ChevronDown, Check, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';
import { APIPaths } from '@lookiva/api-contracts';
import type { Area } from '@lookiva/shared-types';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

const SEED_AREAS: Pick<Area, 'id' | 'name' | 'latitude' | 'longitude'>[] = [
  { id: 'hamra', name: 'Hamra', latitude: 33.8938, longitude: 35.5018 },
  { id: 'achrafieh', name: 'Achrafieh', latitude: 33.8797, longitude: 35.5231 },
  { id: 'jounieh', name: 'Jounieh', latitude: 33.9828, longitude: 35.6194 },
  { id: 'gemmayze', name: 'Gemmayze', latitude: 33.8972, longitude: 35.5167 },
  { id: 'verdun', name: 'Verdun', latitude: 33.8889, longitude: 35.4861 },
  { id: 'byblos', name: 'Byblos', latitude: 34.1208, longitude: 35.6497 },
  { id: 'tripoli', name: 'Tripoli', latitude: 34.4367, longitude: 35.8497 },
  { id: 'saida', name: 'Saida', latitude: 33.5597, longitude: 35.3736 },
  { id: 'tyre', name: 'Tyre', latitude: 33.2721, longitude: 35.2033 },
  { id: 'zahle', name: 'Zahlé', latitude: 33.8481, longitude: 35.9014 },
  { id: 'baalbek', name: 'Baalbek', latitude: 34.0058, longitude: 36.2181 },
];

const STORAGE_KEY = 'lookiva-area';

interface AreaPickerProps {
  className?: string;
  compact?: boolean;
}

export function AreaPicker({ className, compact = false }: AreaPickerProps) {
  const t = useTranslations('common');
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [selectedId, setSelectedId] = React.useState<string>(() => {
    if (typeof window === 'undefined') return SEED_AREAS[0].id;
    return localStorage.getItem(STORAGE_KEY) ?? SEED_AREAS[0].id;
  });
  const ref = React.useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery<{ items: Area[] }>({
    queryKey: ['geo', 'areas', 'LB'],
    queryFn: async () => {
      try {
        const { data } = await axios.get(`${APIPaths.PLATFORM_COUNTRIES}/LB/areas`);
        return data;
      } catch {
        return { items: SEED_AREAS as Area[] };
      }
    },
    staleTime: 60 * 60 * 1000,
    initialData: { items: SEED_AREAS as Area[] },
  });

  const areas = (data?.items ?? SEED_AREAS) as Area[];

  const filtered = React.useMemo(
    () =>
      areas.filter((a) =>
        (a.name || '').toLowerCase().includes(search.trim().toLowerCase())
      ),
    [areas, search]
  );

  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  React.useEffect(() => {
    if (typeof window !== 'undefined' && selectedId) {
      localStorage.setItem(STORAGE_KEY, selectedId);
    }
  }, [selectedId]);

  const selected = areas.find((a) => a.id === selectedId) ?? SEED_AREAS[0];

  return (
    <div className={twMerge('relative', className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          'inline-flex items-center gap-2 rounded-radius-md border border-border-subtle bg-surface-1 hover:bg-surface-2 text-secondary hover:text-primary transition-colors',
          compact ? 'h-10 px-3 text-sm' : 'h-11 px-4 text-sm md:text-base'
        )}
        aria-label="Select area"
      >
        <MapPin className="w-4 h-4 text-accent-gold-2 shrink-0" />
        <span className="font-medium truncate max-w-[140px] md:max-w-[200px]">
          {selected?.name ?? t('select')}
        </span>
        <ChevronDown className="w-4 h-4 text-muted shrink-0" />
      </button>
      {open && (
        <div className="absolute z-z-popover start-0 mt-2 w-72 md:w-80 rounded-radius-xl border border-border-subtle bg-surface-1 p-2 shadow-shadow-4 animate-fade-in">
          <div className="p-2">
            <div className="relative">
              <MapPin className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="w-full h-10 ps-10 pe-3 rounded-radius-md bg-surface-0 border border-border-subtle text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent-gold-2"
              />
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto p-1">
            {isLoading ? (
              <div className="flex items-center gap-2 px-3 py-4 text-muted text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('actions.loading')}
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-muted text-sm">{t('empty')}</div>
            ) : (
              filtered.map((area) => {
                const isSel = area.id === selectedId;
                return (
                  <button
                    key={area.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(area.id);
                      setOpen(false);
                    }}
                    className={clsx(
                      'w-full inline-flex items-center gap-3 px-3 py-2 rounded-radius-md text-sm transition-colors text-left',
                      isSel
                        ? 'bg-accent-gold-2/10 text-accent-gold-2'
                        : 'text-secondary hover:bg-surface-2 hover:text-primary'
                    )}
                  >
                    <MapPin className="w-4 h-4 shrink-0" />
                    <span className="flex-1 font-medium">{area.name}</span>
                    {isSel && <Check className="w-4 h-4" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}


