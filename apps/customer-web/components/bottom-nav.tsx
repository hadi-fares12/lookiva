'use client';

import * as React from 'react';
import {
  Home,
  Compass,
  Search,
  Map,
  Calendar,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

const NAV_ITEMS = [
  { key: 'home', href: '/home', icon: Home, label: 'home' },
  { key: 'discover', href: '/discover', icon: Compass, label: 'discover' },
  { key: 'search', href: '/search', icon: Search, label: 'search' },
  { key: 'map', href: '/map', icon: Map, label: 'map' },
  { key: 'bookings', href: '/bookings', icon: Calendar, label: 'bookings' },
  { key: 'profile', href: '/profile', icon: User, label: 'profile' },
] as const;

export function BottomNav() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const pathname = usePathname();
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => setIsMounted(true), []);

  if (!isMounted) return null;

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-z-fixed bg-surface-0/95 backdrop-blur-md border-t border-border-subtle safe-area-bottom">
      <div className="grid grid-cols-6 max-w-xl mx-auto">
        {NAV_ITEMS.map((item) => {
          const full = `/${locale}${item.href}`;
          const active =
            pathname === full ||
            (item.key === 'home' && (pathname === `/${locale}` || pathname === `/${locale}/home`)) ||
            (item.key !== 'home' && pathname?.startsWith(full));
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={`/${locale}${item.href}`}
              className={clsx(
                'relative flex flex-col items-center justify-center py-2.5 px-1 gap-0.5 transition-colors',
                active ? 'text-accent-gold-2' : 'text-muted hover:text-secondary'
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] md:text-xs font-medium truncate w-full text-center">
                {t(item.label)}
              </span>
              {active && (
                <span className="absolute top-0 start-1/2 -translate-x-1/2 w-8 h-0.5 rounded-radius-full bg-accent-gold-2" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}


