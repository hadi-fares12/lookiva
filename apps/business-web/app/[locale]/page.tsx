'use client';

import * as React from 'react';
import { useRouter } from '@/i18n/routing';
import { getBusinessSession } from '@/lib/api';

export default function BusinessLocaleRoot() {
  const router = useRouter();

  React.useEffect(() => {
    router.replace(getBusinessSession() ? '/dashboard' : '/login');
  }, [router]);

  return <div className="p-8 text-secondary">Opening LOOKIVA Business…</div>;
}
