'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { businessFetch, getBusinessSession } from '@/lib/api';

type FinanceOverview = { primaryCurrency?: string; bookedRevenue?: number; completedRevenue?: number; collectedRevenue?: number; outstanding?: number; cash?: number; card?: number; online?: number; byCurrency?: Array<Record<string, unknown>> };
type Overview = { company?: { display_name?: string }; appointments?: Record<string, number>; finance?: FinanceOverview; operations?: Record<string, number> };

export default function DashboardPage() {
  const { locale } = useParams<{ locale: string }>();
  const session = useMemo(() => getBusinessSession(), []);
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { if (!session) return; businessFetch<Overview>(`/business-ops/${session.companyId}/overview`).then(setData).catch(e => setError(e instanceof Error ? e.message : 'Unable to load dashboard')); }, []);
  const currency = data?.finance?.primaryCurrency || 'USD';
  const money = (value: unknown) => new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(value ?? 0));
  const metrics = [
    ['Appointments', data?.appointments?.total ?? '—', 'calendar'],
    ['Confirmed', data?.appointments?.confirmed ?? 0, 'calendar'],
    ['Completed', data?.appointments?.completed ?? 0, 'calendar'],
    ['Booked revenue', data?.finance ? money(data.finance.bookedRevenue) : '—', 'analytics'],
    ['Collected', data?.finance ? money(data.finance.collectedRevenue) : '—', 'payments'],
    ['Cash', data?.finance ? money(data.finance.cash) : '—', 'finance'],
    ['Outstanding', data?.finance ? money(data.finance.outstanding) : '—', 'payments'],
    ['Waiting queue', data?.operations?.waitingQueue ?? 0, 'queue'],
  ];
  return <div className="space-y-7">
    <section><p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent-gold-2">Business command center</p><h1 className="mt-2 text-3xl font-bold text-primary">Today{data?.company?.display_name ? ` at ${data.company.display_name}` : ''}</h1><p className="mt-2 text-secondary">Live bookings, real collected cash, chairs, staff and customer operations.</p></section>
    {error && <div className="rounded-radius-xl border border-accent-red/40 bg-accent-red/10 p-5 text-accent-red">{error}</div>}
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">{metrics.map(([label,value,href]) => <Link key={String(label)} href={`/${locale}/${href}`} className="rounded-radius-xl border border-border-subtle bg-surface-1 p-5 shadow-shadow-1 hover:bg-surface-2"><p className="text-sm text-muted">{label}</p><p className="mt-2 text-2xl font-bold text-primary">{String(value)}</p></Link>)}</section>
    <section className="grid gap-4 md:grid-cols-3">
      <Link href={`/${locale}/floor`} className="rounded-radius-xl border border-border-subtle bg-surface-1 p-6"><h2 className="text-lg font-semibold text-primary">Live floor</h2><p className="mt-2 text-sm text-secondary">{data?.operations?.activeResources ?? '—'} active resources. Open the realtime chair/resource view.</p></Link>
      <Link href={`/${locale}/professionals`} className="rounded-radius-xl border border-border-subtle bg-surface-1 p-6"><h2 className="text-lg font-semibold text-primary">Professionals</h2><p className="mt-2 text-sm text-secondary">{data?.operations?.activeProfessionals ?? '—'} active professionals in this company scope.</p></Link>
      <Link href={`/${locale}/analytics`} className="rounded-radius-xl border border-border-subtle bg-surface-1 p-6"><h2 className="text-lg font-semibold text-primary">Analytics</h2><p className="mt-2 text-sm text-secondary">Booked and collected revenue remain separated for correct cash reporting.</p></Link>
    </section>
  </div>;
}
