'use client';

import * as React from 'react';
import {
  MapPin,
  Target,
  ListChecks,
  ArrowRight,
  XCircle,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import clsx from 'clsx';
import { AreaPicker } from '@/components/area-picker';
import { toast } from 'sonner';

const AREA_KEY = 'lookiva-area';
const DEFAULT_AREA = { id: 'hamra', name: 'Hamra' };

export default function LocationPermissionPage() {
  const t = useTranslations();
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();

  const [showAreaPicker, setShowAreaPicker] = React.useState(false);
  const [allowing, setAllowing] = React.useState(false);
  const [chosen, setChosen] = React.useState<{ id: string; name: string } | null>(null);

  const BULLETS = [
    { key: 'nearby', titleKey: 'homeSections.nearYou', default: 'See nearby businesses sorted by walkable distance' },
    { key: 'now', titleKey: 'homeSections.availableNow', default: 'Available now slots for salons closest to you' },
    { key: 'map', titleKey: 'nav.map', default: 'Browse every spot on an interactive map' },
  ];

  function goHome(extra?: { area?: { id: string; name: string } }) {
    if (extra?.area) {
      localStorage.setItem(AREA_KEY, JSON.stringify(extra.area));
    }
    router.push(`/${locale}/home`);
  }

  function notNow() {
    localStorage.setItem(AREA_KEY, JSON.stringify(DEFAULT_AREA));
    toast.success(DEFAULT_AREA.name, {
      description: `Using ${DEFAULT_AREA.name} as default. Change anytime from the header.`,
    });
    goHome();
  }

  async function allowLocation() {
    try {
      setAllowing(true);
      if (!navigator.geolocation) {
        toast.warning('Geolocation unsupported', { description: 'Pick an area instead.' });
        setShowAreaPicker(true);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          try {
            localStorage.setItem(
              'lookiva-coords',
              JSON.stringify({
                lat: pos.coords.latitude,
                lon: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
              })
            );
          } catch {
            // ignore
          }
          toast.success('Location enabled');
          setAllowing(false);
          goHome();
        },
        () => {
          setAllowing(false);
          toast.warning('Permission denied', { description: 'Choose an area to continue.' });
          setShowAreaPicker(true);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 }
      );
    } finally {
      // handled in callbacks
    }
  }

  return (
    <div className="min-h-[calc(100vh-6rem)] flex items-center justify-center py-12 px-4 md:px-8 animate-fade-in">
      <div className="w-full max-w-xl">
        <div className="flex flex-col items-center text-center mb-10">
          <div className="relative mb-8">
            <div className="absolute -inset-6 bg-accent-gold-2/10 rounded-radius-3xl blur-2xl animate-pulse" />
            <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-radius-3xl bg-gradient-to-br from-accent-gold-1/80 via-accent-gold-2 to-accent-gold-3/80 flex items-center justify-center shadow-shadow-4 border border-accent-gold-2/40">
              <MapPin className="w-14 h-14 md:w-16 md:h-16 text-surface-0" strokeWidth={1.7} />
            </div>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary mb-3">
            Enable location access
          </h1>
          <p className="text-secondary text-sm md:text-base max-w-md leading-relaxed">
            To discover salons and pros near you, share your location or pick a neighborhood.
            You can change this anytime.
          </p>
        </div>

        <div className="space-y-3 mb-10">
          {BULLETS.map((b) => (
            <div
              key={b.key}
              className="flex items-start gap-4 rounded-radius-xl border border-border-subtle bg-surface-1 p-4 md:p-5"
            >
              <div className="w-11 h-11 md:w-12 md:h-12 rounded-radius-lg bg-accent-gold-2/10 border border-accent-gold-2/20 flex items-center justify-center shrink-0">
                {b.key === 'nearby' && <Target className="w-5 h-5 md:w-6 md:h-6 text-accent-gold-2" />}
                {b.key === 'now' && <ListChecks className="w-5 h-5 md:w-6 md:h-6 text-accent-gold-2" />}
                {b.key === 'map' && <MapPin className="w-5 h-5 md:w-6 md:h-6 text-accent-gold-2" />}
              </div>
              <div className="flex-1 pt-1">
                <p className="text-sm md:text-base text-primary font-semibold">
                  {t(b.titleKey as any)}
                </p>
                <p className="text-xs md:text-sm text-muted mt-0.5 leading-relaxed">
                  {b.default}
                </p>
              </div>
            </div>
          ))}
        </div>

        {!showAreaPicker ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={allowLocation}
              disabled={allowing}
              className="w-full h-12 rounded-radius-xl bg-gradient-to-r from-accent-gold-1 to-accent-gold-2 text-surface-0 font-semibold text-base inline-flex items-center justify-center gap-2 hover:from-accent-gold-2 hover:to-accent-gold-3 transition-all shadow-shadow-3 disabled:opacity-60 active:scale-[0.99]"
            >
              <Target className="w-5 h-5" />
              {allowing ? tCommon('actions.loading') : 'Allow location access'}
            </button>

            <button
              type="button"
              onClick={() => setShowAreaPicker(true)}
              className="w-full h-12 rounded-radius-xl border border-border-strong bg-surface-1 text-secondary hover:text-primary hover:bg-surface-2 font-semibold text-sm inline-flex items-center justify-center gap-2 transition-all"
            >
              <MapPin className="w-4 h-4 text-accent-gold-2" />
              Choose area instead
            </button>

            <button
              type="button"
              onClick={notNow}
              className="w-full h-12 rounded-radius-xl text-muted hover:text-secondary font-medium text-sm inline-flex items-center justify-center gap-2 transition-all"
            >
              <XCircle className="w-4 h-4" />
              Not now — use Hamra
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-radius-xl border border-border-subtle bg-surface-1 p-5">
              <h3 className="text-sm font-semibold text-primary mb-4 inline-flex items-center gap-2">
                <MapPin className="w-4 h-4 text-accent-gold-2" />
                Pick your area
              </h3>
              <div className="mb-5">
                <AreaPicker />
              </div>
              <div className="text-xs text-muted leading-relaxed">
                We&apos;ll use this as your default search area until you enable precise location.
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowAreaPicker(false)}
                className="h-12 px-5 rounded-radius-xl border border-border-strong text-secondary hover:text-primary hover:bg-surface-2 text-sm font-medium transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => goHome({ area: chosen ?? DEFAULT_AREA })}
                className="flex-1 h-12 rounded-radius-xl bg-gradient-to-r from-accent-gold-1 to-accent-gold-2 text-surface-0 font-semibold text-sm inline-flex items-center justify-center gap-2 hover:from-accent-gold-2 hover:to-accent-gold-3 transition-all shadow-shadow-2"
              >
                {tCommon('actions.continue')}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



