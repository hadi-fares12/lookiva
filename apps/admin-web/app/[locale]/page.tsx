'use client';

import * as React from 'react';
import { useRouter } from '@/i18n/routing';
import { getAdminSession } from '@/lib/api';

export default function AdminLocaleRootPage() {
  const router = useRouter();

  React.useEffect(() => {
    router.replace(getAdminSession() ? '/dashboard' : '/login');
  }, [router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-secondary">
      Opening LOOKIVA Admin…
    </div>
  );
}
