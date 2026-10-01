'use client';

import * as React from 'react';
import { Swiper, SwiperClass, SwiperSlide } from 'swiper/react';
import { Pagination, EffectFade } from 'swiper/modules';
import { MapPin, Camera, CalendarCheck, Clock2, Compass, ArrowRight } from 'lucide-react';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';

const KEY = 'lookiva-onboarding-complete';

interface SlideDef {
  id: string;
  Icon: React.ComponentType<any>;
  titleKey: string;
  titleDefault: string;
  subKey: string;
  subDefault: string;
  gradientFrom: string;
  gradientTo: string;
}

const SLIDES: SlideDef[] = [
  {
    id: 'discover',
    Icon: MapPin,
    titleKey: 'onboarding.slide1.title',
    titleDefault: 'Discover places nearby',
    subKey: 'onboarding.slide1.subtitle',
    subDefault: 'Find top-rated salons, spas, and barbershops around you — ranked and verified by real guests.',
    gradientFrom: 'from-accent-gold-1/20',
    gradientTo: 'to-accent-gold-3/10',
  },
  {
    id: 'work',
    Icon: Camera,
    titleKey: 'onboarding.slide2.title',
    titleDefault: 'See real professional work',
    subKey: 'onboarding.slide2.subtitle',
    subDefault: 'Browse portfolio photos, reels, and before/afters so you always know what to expect.',
    gradientFrom: 'from-accent-blue/20',
    gradientTo: 'to-accent-gold-2/10',
  },
  {
    id: 'book',
    Icon: CalendarCheck,
    titleKey: 'onboarding.slide3.title',
    titleDefault: 'Book pros & chairs instantly',
    subKey: 'onboarding.slide3.subtitle',
    subDefault: 'Choose a service, professional, chair and time. Lock your slot with one tap.',
    gradientFrom: 'from-accent-green/20',
    gradientTo: 'to-accent-gold-2/10',
  },
  {
    id: 'availability',
    Icon: Clock2,
    titleKey: 'onboarding.slide4.title',
    titleDefault: 'Real availability — always',
    subKey: 'onboarding.slide4.subtitle',
    subDefault: 'No more phone calls. See live opening hours, wait times and same-day slots.',
    gradientFrom: 'from-accent-silver-1/30',
    gradientTo: 'to-accent-gold-2/10',
  },
  {
    id: 'nearby',
    Icon: Compass,
    titleKey: 'onboarding.slide5.title',
    titleDefault: 'Nearby recommendations',
    subKey: 'onboarding.slide5.subtitle',
    subDefault: 'Personalized picks tailored to your taste, budget and location. Explore now.',
    gradientFrom: 'from-accent-gold-1/30',
    gradientTo: 'to-accent-gold-3/20',
  },
];

export default function OnboardingPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [swiper, setSwiper] = React.useState<SwiperClass | null>(null);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const mounted = React.useRef(false);

  const isLast = activeIndex === SLIDES.length - 1;

  const finish = React.useCallback(() => {
    localStorage.setItem(KEY, '1');
    router.push(`/${locale}/home`);
  }, [locale, router]);

  const skip = React.useCallback(() => {
    localStorage.setItem(KEY, '1');
    router.push(`/${locale}/home`);
  }, [locale, router]);

  const next = React.useCallback(() => {
    if (isLast) {
      finish();
      return;
    }
    swiper?.slideNext();
  }, [isLast, finish, swiper]);

  React.useEffect(() => {
    mounted.current = true;
  }, []);

  return (
    <div className="relative min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center py-10 px-4 md:px-8 animate-fade-in">
      <div className="absolute top-0 inset-x-0 max-w-xl mx-auto">
        <button
          type="button"
          onClick={skip}
          className="absolute end-0 top-2 inline-flex items-center gap-1 h-9 px-4 rounded-radius-full bg-surface-1 border border-border-subtle text-sm text-secondary hover:text-primary hover:bg-surface-2 transition-colors"
        >
          {t('common.actions.skip')}
        </button>
      </div>

      <div className="w-full max-w-xl mx-auto pt-14 md:pt-16">
        <Swiper
          modules={[Pagination, EffectFade]}
          effect="fade"
          fadeEffect={{ crossFade: true }}
          speed={450}
          pagination={{ clickable: true, bulletClass: '!w-2 !h-2 !rounded-radius-full !bg-border-strong !opacity-100', bulletActiveClass: '!bg-accent-gold-2 !w-6' }}
          className="!pb-14"
          onSwiper={setSwiper}
          onActiveIndexChange={(s) => setActiveIndex(s.activeIndex)}
          allowTouchMove
        >
          {SLIDES.map((slide) => {
            const Icon = slide.Icon;
            return (
              <SwiperSlide key={slide.id} className="!h-auto">
                <div className="flex flex-col items-center text-center px-2 md:px-4">
                  <div className={`relative mb-10`}>
                    <div className={`absolute -inset-8 bg-gradient-to-br ${slide.gradientFrom} ${slide.gradientTo} rounded-radius-3xl blur-2xl opacity-80`} />
                    <div className="relative w-40 h-40 md:w-48 md:h-48 rounded-radius-3xl bg-surface-1 border border-border-subtle flex items-center justify-center shadow-shadow-3 overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-accent-gold-1/10 via-transparent to-accent-silver-1/10" />
                      <Icon className="relative w-20 h-20 md:w-24 md:h-24 text-accent-gold-2" strokeWidth={1.2} />
                    </div>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-primary mb-4 leading-tight">
                    {t(slide.titleKey as any)}
                  </h2>
                  <p className="text-secondary text-sm md:text-base leading-relaxed max-w-md">
                    {t(slide.subKey as any)}
                  </p>
                </div>
              </SwiperSlide>
            );
          })}
        </Swiper>

        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="h-12 w-28" />
          <button
            type="button"
            onClick={next}
            className="h-12 px-6 md:px-7 rounded-radius-full bg-gradient-to-r from-accent-gold-1 to-accent-gold-2 text-surface-0 font-semibold text-sm md:text-base inline-flex items-center gap-2 hover:from-accent-gold-2 hover:to-accent-gold-3 transition-all shadow-shadow-3 active:scale-[0.98]"
          >
            {isLast ? t('onboarding.getStarted') : t('common.actions.next')}
            {!isLast && <ArrowRight className="w-4 h-4" />}
            {isLast && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}




