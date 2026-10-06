'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getBusinessSession } from '@/lib/api';

export function SessionGuard({ children, locale }: { children: React.ReactNode; locale: string }) {
  const path = usePathname();
  const router = useRouter();
  const isPublic = path.endsWith('/login') || path.endsWith('/register') || path.endsWith('/forgot-password');
  const [ready, setReady] = useState(isPublic);
  useEffect(() => {
    if (isPublic) { setReady(true); return; }
    if (!getBusinessSession()) { router.replace(`/${locale}/login`); return; }
    setReady(true);
  }, [isPublic, locale, router]);
  if (!ready) return <div className="p-8 text-secondary">Verifying secure session…</div>;
  return <>{children}</>;
}
