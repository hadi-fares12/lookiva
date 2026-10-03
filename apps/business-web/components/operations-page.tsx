'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { businessFetch, businessUpload, getBusinessSession } from '@/lib/api';

const CONFIG: Record<string, { key: string; endpoint: (company: string, branch?: string) => string }> = {
  'calendar': { key: 'calendar', endpoint: (c, b) => `/business-ops/${c}/appointments${b ? `?branchId=${b}` : ''}` },
  'floor': { key: 'floor', endpoint: (c, b) => `/business-ops/${c}/resources${b ? `?branchId=${b}` : ''}` },
  'resources': { key: 'resources', endpoint: (c, b) => `/business-ops/${c}/resources${b ? `?branchId=${b}` : ''}` },
  'queue': { key: 'queue', endpoint: (c, b) => `/business-ops/${c}/queues${b ? `?branchId=${b}` : ''}` },
  'customers': { key: 'customers', endpoint: (c) => `/business-ops/${c}/customers` },
  'professionals': { key: 'professionals', endpoint: (c) => `/business-ops/${c}/professionals` },
  'services': { key: 'services', endpoint: (c) => `/business-ops/${c}/services` },
  'payments': { key: 'payments', endpoint: (c) => `/business-ops/${c}/payments` },
  'finance': { key: 'finance', endpoint: (c) => `/finance-v2/companies/${c}/ledger` },
  'analytics': { key: 'analytics', endpoint: (c) => `/analytics-v2/companies/${c}/dashboard` },
  'reports': { key: 'reports', endpoint: (c) => `/analytics-v2/companies/${c}/dashboard` },
  'promotions': { key: 'promotions', endpoint: (c) => `/business-ops/${c}/promotions` },
  'reviews': { key: 'reviews', endpoint: (c) => `/business-ops/${c}/reviews` },
  'staff': { key: 'staff', endpoint: (c) => `/business-ops/${c}/staff` },
  'branches': { key: 'branches', endpoint: (c) => `/business-ops/${c}/branches` },
  'subscriptions': { key: 'subscriptions', endpoint: (c) => `/business-ops/${c}/subscriptions` },
  'audit': { key: 'audit', endpoint: (c) => `/business-ops/${c}/audit` },
  'settings': { key: 'settings', endpoint: (c) => `/businesses/${c}` },
};

type Option = { id: string; name: string; avatarMediaId?: string | null };

function flattenRows(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.entries)) return data.entries;
  if (data && typeof data === 'object') return Object.entries(data).map(([key, value]) => ({ key, value: typeof value === 'object' ? JSON.stringify(value) : String(value) }));
  return [];
}

function statusClass(status?: string) {
  const s = (status || '').toLowerCase();
  if (['completed', 'succeeded', 'available', 'active'].includes(s)) return 'bg-accent-green/10 text-accent-green';
  if (['cancelled', 'cancelled_by_customer', 'cancelled_by_business', 'failed', 'inactive', 'no_show'].includes(s)) return 'bg-accent-red/10 text-accent-red';
  return 'bg-accent-gold-2/10 text-accent-gold-2';
}

export function OperationsPage({ section }: { section: string }) {
  const t = useTranslations('businessOps');
  const config = CONFIG[section] || CONFIG.analytics;
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [updated, setUpdated] = useState<Date | null>(null);
  const [branches, setBranches] = useState<Option[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const session = useMemo(() => getBusinessSession(), []);
  const [professionals, setProfessionals] = useState<Option[]>([]);
  const [analyticsBranchId, setAnalyticsBranchId] = useState(session?.branchId ?? '');
  const [analyticsProfessionalId, setAnalyticsProfessionalId] = useState('');
  const [analyticsFrom, setAnalyticsFrom] = useState('');
  const [analyticsTo, setAnalyticsTo] = useState('');
  const [branchLat, setBranchLat] = useState('');
  const [branchLon, setBranchLon] = useState('');

  async function load() {
    if (!session) return;
    setLoading(true); setError('');
    try {
      let endpoint = config.endpoint(session.companyId, session.branchId);
      if (section === 'analytics' || section === 'reports') {
        const params = new URLSearchParams();
        if (analyticsBranchId) params.set('branchId', analyticsBranchId);
        if (analyticsProfessionalId) params.set('professionalId', analyticsProfessionalId);
        if (analyticsFrom) params.set('from', new Date(`${analyticsFrom}T00:00:00`).toISOString());
        if (analyticsTo) params.set('to', new Date(`${analyticsTo}T23:59:59.999`).toISOString());
        endpoint = `/analytics-v2/companies/${session.companyId}/dashboard${params.size ? `?${params.toString()}` : ''}`;
      }
      const result = await businessFetch(endpoint);
      setData(result); setUpdated(new Date());
    } catch (e) { setError(e instanceof Error ? e.message : t('loadError')); }
    finally { setLoading(false); }
  }

  async function loadLookups() {
    if (!session) return;
    try {
      const [branchRows, categoryRows, professionalRows] = await Promise.all([
        businessFetch<any[]>(`/business-ops/${session.companyId}/branches`),
        businessFetch<any[]>(`/business-ops/${session.companyId}/categories`),
        businessFetch<any[]>(`/business-ops/${session.companyId}/professionals`),
      ]);
      setBranches((branchRows || []).map((row) => ({ id: row.id, name: row.name })));
      setCategories((categoryRows || []).map((row) => ({ id: row.id, name: row.name })));
      setProfessionals((professionalRows || []).map((row) => ({ id: row.id, name: row.display_name || row.name || t('labels.professional'), avatarMediaId: row.avatar_media_id ?? null })));
    } catch { /* main page will still work without creation lookups */ }
  }

  useEffect(() => { void loadLookups(); }, [section]);
  useEffect(() => { void load(); }, [section, analyticsBranchId, analyticsProfessionalId, analyticsFrom, analyticsTo]);

  async function mutate(path: string, init: RequestInit, success: string) {
    setBusy(path); setMessage(''); setError('');
    try { await businessFetch(path, init); setMessage(success); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : t('operationError')); }
    finally { setBusy(''); }
  }

  const rows = flattenRows(data).slice(0, 150);
  const columns = rows.length ? Object.keys(rows[0]).filter((k) => !['raw_response', 'gateway_response', 'metadata', 'password_hash'].includes(k)).slice(0, 8) : [];

  async function submitService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!session) return;
    const fd = new FormData(event.currentTarget);
    const branchId = String(fd.get('branchId') || session.branchId || '');
    await mutate(`/business-ops/${session.companyId}/services`, {
      method: 'POST', body: JSON.stringify({
        categoryId: String(fd.get('categoryId') || ''), name: String(fd.get('name') || ''),
        branchIds: branchId ? [branchId] : [], professionalIds: [], resourceIds: [],
        durationMinutes: Number(fd.get('durationMinutes') || 30), basePrice: Number(fd.get('basePrice') || 0),
        currencyCode: String(fd.get('currencyCode') || 'USD'), walkInsAllowed: true,
      }),
    }, t('messages.serviceCreated'));
    event.currentTarget.reset();
  }

  async function submitResource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!session) return;
    const fd = new FormData(event.currentTarget);
    await mutate(`/business-ops/${session.companyId}/resources`, {
      method: 'POST', body: JSON.stringify({ branchId: String(fd.get('branchId') || session.branchId || '') || undefined, name: String(fd.get('name') || ''), type: String(fd.get('type') || 'barber_chair'), quantity: 1, capacityPerSlot: 1 }),
    }, t('messages.resourceCreated'));
    event.currentTarget.reset();
  }

  async function submitPromotion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!session) return;
    const fd = new FormData(event.currentTarget); const type = String(fd.get('promotionType') || 'percentage');
    await mutate(`/business-ops/${session.companyId}/promotions`, {
      method: 'POST', body: JSON.stringify({
        branchId: String(fd.get('branchId') || session.branchId || '') || undefined,
        name: String(fd.get('name') || ''), promotionType: type,
        valuePercent: type === 'percentage' ? Number(fd.get('value') || 0) : undefined,
        valueFixed: type === 'fixed' ? Number(fd.get('value') || 0) : undefined,
        startsAt: new Date(String(fd.get('startsAt'))).toISOString(), endsAt: fd.get('endsAt') ? new Date(String(fd.get('endsAt'))).toISOString() : undefined,
      }),
    }, t('messages.promotionCreated'));
    event.currentTarget.reset();
  }

  async function submitQueue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!session) return;
    const fd = new FormData(event.currentTarget);
    const branchId = String(fd.get('branchId') || session.branchId || '');
    if (!branchId) { setError('Choose a branch before creating a queue.'); return; }
    await mutate(`/business-ops/${session.companyId}/queues`, {
      method: 'POST', body: JSON.stringify({
        branchId,
        name: String(fd.get('name') || 'Default').trim() || 'Default',
        estimatedWaitPerPersonMinutes: Number(fd.get('estimatedWaitPerPersonMinutes') || 15),
        maxWaiting: Number(fd.get('maxWaiting') || 50),
      }),
    }, 'Queue created.');
    event.currentTarget.reset();
  }

  async function submitStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!session) return;
    const form = event.currentTarget;
    const fd = new FormData(form);
    const roleKey = String(fd.get('roleKey') || 'staff');
    const branchId = String(fd.get('branchId') || '');
    setBusy('staff-create'); setMessage(''); setError('');
    try {
      const result = await businessFetch<any>(`/business-ops/${session.companyId}/staff`, {
        method: 'POST',
        body: JSON.stringify({
          fullName: String(fd.get('fullName') || '').trim(),
          email: String(fd.get('email') || '').trim() || undefined,
          phone: String(fd.get('phone') || '').trim() || undefined,
          roleKey,
          branchId: roleKey === 'business_manager' ? undefined : (branchId || undefined),
          professionalDisplayName: roleKey === 'professional' ? String(fd.get('professionalDisplayName') || '').trim() || undefined : undefined,
          specialties: roleKey === 'professional'
            ? String(fd.get('specialties') || '').split(',').map((x)=>x.trim()).filter(Boolean)
            : undefined,
        }),
      });
      setMessage(`User created. Temporary password: ${result.temporaryPassword}. Give it securely to the user and have them change it after sign-in.`);
      form.reset();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('operationError'));
    } finally {
      setBusy('');
    }
  }

  async function updateStaffRole(event: FormEvent<HTMLFormElement>, userId: string) {
    event.preventDefault(); if (!session) return;
    const fd = new FormData(event.currentTarget);
    const roleKey = String(fd.get('roleKey') || 'staff');
    const branchId = String(fd.get('branchId') || '');
    await mutate(`/business-ops/${session.companyId}/staff/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        roleKey,
        branchId: roleKey === 'business_manager' ? undefined : (branchId || undefined),
      }),
    }, 'User role and branch updated.');
  }

  function captureBranchLocation() {
    if (!navigator.geolocation) { setError('GPS is not available in this browser.'); return; }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setBranchLat(String(position.coords.latitude));
        setBranchLon(String(position.coords.longitude));
        setMessage('Current GPS location captured for the new branch.');
      },
      () => setError('Unable to read location. Allow location permission or enter coordinates manually.'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  }

  async function submitBranch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!session) return;
    const form = event.currentTarget;
    const fd = new FormData(form);
    await mutate(`/business-ops/${session.companyId}/branches`, {
      method: 'POST',
      body: JSON.stringify({
        name: String(fd.get('name') || '').trim(),
        addressLine1: String(fd.get('addressLine1') || '').trim() || undefined,
        phone: String(fd.get('phone') || '').trim() || undefined,
        whatsapp: String(fd.get('whatsapp') || '').trim() || undefined,
        instagramHandle: String(fd.get('instagramHandle') || '').trim() || undefined,
        latitude: branchLat ? Number(branchLat) : undefined,
        longitude: branchLon ? Number(branchLon) : undefined,
        bookingEnabled: true,
        walkInsEnabled: true,
      }),
    }, 'Branch created.');
    form.reset(); setBranchLat(''); setBranchLon('');
    await loadLookups();
  }

  async function updateBranch(event: FormEvent<HTMLFormElement>, branchId: string) {
    event.preventDefault(); if (!session) return;
    const fd = new FormData(event.currentTarget);
    const numberOrUndefined = (name: string) => {
      const raw = String(fd.get(name) ?? '').trim();
      return raw === '' ? undefined : Number(raw);
    };
    await mutate(`/business-ops/${session.companyId}/branches/${branchId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: String(fd.get('name') || '').trim(),
        addressLine1: String(fd.get('addressLine1') || '').trim(),
        phone: String(fd.get('phone') || '').trim(),
        whatsapp: String(fd.get('whatsapp') || '').trim(),
        instagramHandle: String(fd.get('instagramHandle') || '').trim(),
        latitude: numberOrUndefined('latitude'),
        longitude: numberOrUndefined('longitude'),
        bookingEnabled: fd.get('bookingEnabled') === 'on',
        walkInsEnabled: fd.get('walkInsEnabled') === 'on',
        homeServiceEnabled: fd.get('homeServiceEnabled') === 'on',
        isActive: fd.get('isActive') === 'on',
      }),
    }, 'Branch updated.');
    await loadLookups();
  }

  async function uploadBranding(file: File | undefined, field: 'logo_media_id' | 'cover_media_id') {
    if (!session || !file) return;
    setBusy(field); setMessage(''); setError('');
    try {
      const media = await businessUpload<any>(
        `/media/upload?isPublic=true&companyId=${encodeURIComponent(session.companyId)}`,
        file,
      );
      await businessFetch(`/businesses/${session.companyId}`, {
        method: 'PATCH',
        body: JSON.stringify({ [field]: media.id }),
      });
      setMessage(field === 'logo_media_id' ? 'Business logo updated.' : 'Business cover updated.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to upload branding');
    } finally {
      setBusy('');
    }
  }

  async function submitSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!session) return;
    const fd = new FormData(event.currentTarget);
    const numberOrUndefined = (name: string) => { const raw = String(fd.get(name) ?? '').trim(); return raw === '' ? undefined : Number(raw); };
    await mutate(`/businesses/${session.companyId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        display_name: String(fd.get('display_name') || '').trim(),
        tagline: String(fd.get('tagline') || '').trim() || null,
        website_url: String(fd.get('website_url') || '').trim() || null,
        booking_enabled: fd.get('booking_enabled') === 'on',
        walk_ins_enabled: fd.get('walk_ins_enabled') === 'on',
        online_payments_enabled: fd.get('online_payments_enabled') === 'on',
        auto_confirm_bookings: fd.get('auto_confirm_bookings') === 'on',
        deposit_required: fd.get('deposit_required') === 'on',
        deposit_percent: numberOrUndefined('deposit_percent'),
        min_booking_notice_minutes: numberOrUndefined('min_booking_notice_minutes'),
        max_booking_advance_days: numberOrUndefined('max_booking_advance_days'),
        cancellation_policy_hours: numberOrUndefined('cancellation_policy_hours'),
      }),
    }, t('messages.settingsSaved'));
  }

  const inputClass = 'h-11 rounded-radius-md border border-border-subtle bg-surface-0 px-3 text-sm text-primary outline-none focus:border-accent-gold-2';

  return <div className="space-y-6">
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-gold-2">{t('eyebrow')}</p><h1 className="mt-2 text-3xl font-bold text-primary">{t(`sections.${config.key}.title`)}</h1><p className="mt-2 text-secondary">{t(`sections.${config.key}.subtitle`)}</p></div>
      <button onClick={() => void load()} className="h-10 rounded-radius-md border border-border-subtle bg-surface-1 px-4 text-sm font-semibold text-primary hover:bg-surface-2">{t('actions.refresh')}</button>
    </div>
    {updated && <p className="text-xs text-muted">Last synchronized {updated.toLocaleTimeString()}</p>}
    {message && <div className="rounded-radius-lg border border-accent-green/30 bg-accent-green/10 px-4 py-3 text-sm text-accent-green">{message}</div>}
    {error && <div className="rounded-radius-xl border border-accent-red/40 bg-accent-red/10 p-5"><p className="font-semibold text-accent-red">{t('operationPanelError')}</p><p className="mt-1 text-sm text-secondary">{error}</p><button onClick={() => void load()} className="mt-4 rounded-radius-md bg-accent-gold-2 px-4 py-2 text-sm font-semibold text-surface-0">{t('actions.retry')}</button></div>}

    {section === 'services' && <form onSubmit={submitService} className="grid gap-3 rounded-radius-xl border border-border-subtle bg-surface-1 p-5 md:grid-cols-6">
      <input name="name" required placeholder={t('labels.serviceName')} className={`${inputClass} md:col-span-2`} />
      <select name="categoryId" required className={inputClass}><option value="">Category</option>{categories.map((o)=><option key={o.id} value={o.id}>{o.name}</option>)}</select>
      <select name="branchId" defaultValue={session?.branchId || ''} className={inputClass}><option value="">All branches</option>{branches.map((o)=><option key={o.id} value={o.id}>{o.name}</option>)}</select>
      <input name="durationMinutes" type="number" min="1" defaultValue="30" required className={inputClass} title="Duration minutes" />
      <div className="flex gap-2"><input name="basePrice" type="number" min="0" step="0.01" placeholder={t('labels.price')} required className={`${inputClass} min-w-0 flex-1`} /><input name="currencyCode" defaultValue="USD" maxLength={3} className={`${inputClass} w-20`} /></div>
      <button disabled={!!busy} className="h-11 rounded-radius-md bg-accent-gold-2 px-5 font-semibold text-surface-0 md:col-span-6 md:justify-self-start">Add service</button>
    </form>}

    {(section === 'resources' || section === 'floor') && <form onSubmit={submitResource} className="grid gap-3 rounded-radius-xl border border-border-subtle bg-surface-1 p-5 md:grid-cols-4">
      <input name="name" required placeholder={t('labels.resourceName')} className={inputClass} />
      <select name="type" className={inputClass}><option value="barber_chair">Barber chair</option><option value="styling_chair">Styling chair</option><option value="washing_station">Washing station</option><option value="nail_table">Nail table</option><option value="treatment_room">Treatment room</option><option value="equipment">Equipment</option></select>
      <select name="branchId" required={!!session?.branchId} defaultValue={session?.branchId || ''} className={inputClass}><option value="">Company-wide</option>{branches.map((o)=><option key={o.id} value={o.id}>{o.name}</option>)}</select>
      <button disabled={!!busy} className="h-11 rounded-radius-md bg-accent-gold-2 px-5 font-semibold text-surface-0">Add resource</button>
    </form>}

    {section === 'branches' && <form onSubmit={submitBranch} className="grid gap-3 rounded-radius-xl border border-border-subtle bg-surface-1 p-5 md:grid-cols-2 xl:grid-cols-6">
      <input name="name" required placeholder="Branch name" className={`${inputClass} xl:col-span-2`} />
      <input name="addressLine1" placeholder="Address" className={`${inputClass} xl:col-span-2`} />
      <input name="phone" placeholder="Phone" className={inputClass} />
      <input name="whatsapp" placeholder="WhatsApp" className={inputClass} />
      <input name="instagramHandle" placeholder="Instagram handle" className={`${inputClass} xl:col-span-2`} />
      <input value={branchLat} onChange={(e)=>setBranchLat(e.target.value)} type="number" step="any" placeholder="Latitude" className={inputClass} />
      <input value={branchLon} onChange={(e)=>setBranchLon(e.target.value)} type="number" step="any" placeholder="Longitude" className={inputClass} />
      <button type="button" onClick={captureBranchLocation} className="h-11 rounded-radius-md border border-border-subtle bg-surface-2 px-4 text-sm font-semibold text-primary">Use current GPS</button>
      <button disabled={!!busy} className="h-11 rounded-radius-md bg-accent-gold-2 px-5 font-semibold text-surface-0">Add branch</button>
    </form>}

    {section === 'staff' && <form onSubmit={submitStaff} className="grid gap-3 rounded-radius-xl border border-border-subtle bg-surface-1 p-5 md:grid-cols-2 xl:grid-cols-6">
      <input name="fullName" required placeholder="Full name" className={`${inputClass} xl:col-span-2`} />
      <input name="email" type="email" placeholder="Email" className={inputClass} />
      <input name="phone" placeholder="Phone" className={inputClass} />
      <select name="roleKey" defaultValue="staff" className={inputClass}>
        <option value="business_manager">Business manager</option>
        <option value="branch_manager">Branch manager</option>
        <option value="professional">Professional / barber</option>
        <option value="staff">Staff</option>
      </select>
      <select name="branchId" defaultValue="" className={inputClass}>
        <option value="">Choose branch when required</option>
        {branches.map((o)=><option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
      <input name="professionalDisplayName" placeholder="Professional display name (optional)" className={`${inputClass} xl:col-span-2`} />
      <input name="specialties" placeholder="Specialties: Fade, Beard, Color…" className={`${inputClass} xl:col-span-3`} />
      <button disabled={!!busy} className="h-11 rounded-radius-md bg-accent-gold-2 px-5 font-semibold text-surface-0">{busy==='staff-create'?'Creating…':'Add user'}</button>
    </form>}

    {section === 'settings' && data && <form key={String(data.updated_at || data.id || 'settings')} onSubmit={submitSettings} className="grid gap-4 rounded-radius-xl border border-border-subtle bg-surface-1 p-5 md:grid-cols-2 xl:grid-cols-4">
      <label className="space-y-1 xl:col-span-2"><span className="text-xs font-semibold uppercase text-muted">Business name</span><input name="display_name" required defaultValue={data.display_name || ''} className={`${inputClass} w-full`} /></label>
      <label className="space-y-1 xl:col-span-2"><span className="text-xs font-semibold uppercase text-muted">Tagline</span><input name="tagline" defaultValue={data.tagline || ''} className={`${inputClass} w-full`} /></label>
      <label className="space-y-1 md:col-span-2 xl:col-span-4"><span className="text-xs font-semibold uppercase text-muted">Website</span><input name="website_url" type="url" defaultValue={data.website_url || ''} className={`${inputClass} w-full`} /></label>
      <div className="grid gap-3 md:col-span-2 xl:col-span-4 sm:grid-cols-2">
        <label className="rounded-radius-lg border border-border-subtle bg-surface-2 p-4">
          <span className="block text-xs font-semibold uppercase text-muted">Business logo</span>
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e)=>void uploadBranding(e.target.files?.[0],'logo_media_id')} className="mt-3 block w-full text-sm text-secondary" />
          <span className="mt-2 block text-xs text-muted">{busy==='logo_media_id'?'Uploading…':data.logo_media_id?'Logo uploaded':'Choose a square logo image'}</span>
        </label>
        <label className="rounded-radius-lg border border-border-subtle bg-surface-2 p-4">
          <span className="block text-xs font-semibold uppercase text-muted">Profile cover</span>
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e)=>void uploadBranding(e.target.files?.[0],'cover_media_id')} className="mt-3 block w-full text-sm text-secondary" />
          <span className="mt-2 block text-xs text-muted">{busy==='cover_media_id'?'Uploading…':data.cover_media_id?'Cover uploaded':'Choose a wide cover image'}</span>
        </label>
      </div>
      <label className="space-y-1"><span className="text-xs font-semibold uppercase text-muted">Minimum notice (minutes)</span><input name="min_booking_notice_minutes" type="number" min="0" defaultValue={data.min_booking_notice_minutes ?? 0} className={`${inputClass} w-full`} /></label>
      <label className="space-y-1"><span className="text-xs font-semibold uppercase text-muted">Maximum advance (days)</span><input name="max_booking_advance_days" type="number" min="1" defaultValue={data.max_booking_advance_days ?? 90} className={`${inputClass} w-full`} /></label>
      <label className="space-y-1"><span className="text-xs font-semibold uppercase text-muted">Cancellation window (hours)</span><input name="cancellation_policy_hours" type="number" min="0" defaultValue={data.cancellation_policy_hours ?? 0} className={`${inputClass} w-full`} /></label>
      <label className="space-y-1"><span className="text-xs font-semibold uppercase text-muted">Default deposit %</span><input name="deposit_percent" type="number" min="0" max="100" step="0.01" defaultValue={data.deposit_percent ?? 0} className={`${inputClass} w-full`} /></label>
      <div className="grid gap-2 md:col-span-2 xl:col-span-4 sm:grid-cols-2 xl:grid-cols-5">
        {[['booking_enabled','Online booking',data.booking_enabled],['walk_ins_enabled','Walk-ins',data.walk_ins_enabled],['online_payments_enabled','Online payments',data.online_payments_enabled],['auto_confirm_bookings','Auto confirm',data.auto_confirm_bookings],['deposit_required','Deposit required',data.deposit_required]].map(([name,label,checked])=><label key={String(name)} className="flex items-center gap-3 rounded-radius-lg bg-surface-2 p-3 text-sm text-primary"><input name={String(name)} type="checkbox" defaultChecked={Boolean(checked)} className="h-4 w-4 accent-accent-gold-2" /><span>{String(label)}</span></label>)}
      </div>
      <button disabled={!!busy} className="h-11 rounded-radius-md bg-accent-gold-2 px-5 font-semibold text-surface-0 md:col-span-2 xl:col-span-4 xl:justify-self-start">{busy?t('actions.saving'):t('actions.save')}</button>
    </form>}

    {section === 'queue' && <form onSubmit={submitQueue} className="grid gap-3 rounded-radius-xl border border-border-subtle bg-surface-1 p-5 md:grid-cols-5">
      <select name="branchId" required defaultValue={session?.branchId || ''} className={inputClass}><option value="">Choose branch</option>{branches.map((o)=><option key={o.id} value={o.id}>{o.name}</option>)}</select>
      <input name="name" placeholder={t('labels.queueName')} defaultValue="Default" className={inputClass} />
      <input name="estimatedWaitPerPersonMinutes" type="number" min="1" max="240" defaultValue="15" aria-label="Estimated wait per person in minutes" className={inputClass} />
      <input name="maxWaiting" type="number" min="1" max="500" defaultValue="50" aria-label="Maximum waiting customers" className={inputClass} />
      <button disabled={!!busy} className="h-11 rounded-radius-md bg-accent-gold-2 px-5 font-semibold text-surface-0">{t('actions.createQueue')}</button>
    </form>}

    {section === 'promotions' && <form onSubmit={submitPromotion} className="grid gap-3 rounded-radius-xl border border-border-subtle bg-surface-1 p-5 md:grid-cols-6">
      <input name="name" required placeholder={t('labels.promotionName')} className={`${inputClass} md:col-span-2`} />
      <select name="promotionType" className={inputClass}><option value="percentage">Percentage</option><option value="fixed">Fixed amount</option></select>
      <input name="value" required type="number" min="0" step="0.01" placeholder={t('labels.value')} className={inputClass} />
      <input name="startsAt" required type="datetime-local" className={inputClass} />
      <input name="endsAt" type="datetime-local" className={inputClass} />
      <select name="branchId" defaultValue={session?.branchId || ''} className={inputClass}><option value="">All branches</option>{branches.map((o)=><option key={o.id} value={o.id}>{o.name}</option>)}</select>
      <button disabled={!!busy} className="h-11 rounded-radius-md bg-accent-gold-2 px-5 font-semibold text-surface-0 md:col-span-5 md:justify-self-start">{t('actions.createPromotion')}</button>
    </form>}

    {(section === 'analytics' || section === 'reports') && <div className="space-y-4">
      <div className="grid gap-3 rounded-radius-xl border border-border-subtle bg-surface-1 p-5 md:grid-cols-5">
        <select value={analyticsBranchId} onChange={(e)=>setAnalyticsBranchId(e.target.value)} className={inputClass}><option value="">{t('labels.allAuthorizedBranches')}</option>{branches.map((o)=><option key={o.id} value={o.id}>{o.name}</option>)}</select>
        <select value={analyticsProfessionalId} onChange={(e)=>setAnalyticsProfessionalId(e.target.value)} className={inputClass}><option value="">{t('labels.allProfessionals')}</option>{professionals.map((o)=><option key={o.id} value={o.id}>{o.name}</option>)}</select>
        <input type="date" value={analyticsFrom} onChange={(e)=>setAnalyticsFrom(e.target.value)} aria-label="Analytics from date" className={inputClass} />
        <input type="date" value={analyticsTo} onChange={(e)=>setAnalyticsTo(e.target.value)} aria-label="Analytics to date" className={inputClass} />
        <button type="button" onClick={()=>{setAnalyticsBranchId(session?.branchId ?? '');setAnalyticsProfessionalId('');setAnalyticsFrom('');setAnalyticsTo('');}} className="h-11 rounded-radius-md border border-border-subtle bg-surface-2 px-4 text-sm font-semibold text-primary">{t('labels.resetFilters')}</button>
      </div>
      {!loading && !error && data?.finance && <div className="space-y-3">{data.finance.map((finance:any)=><section key={finance.currency} className="rounded-radius-xl border border-border-subtle bg-surface-1 p-5"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-primary">{finance.currency} {t('labels.financials')}</h2><span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{t('labels.actualVsBooked')}</span></div><div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">{[
        [t('labels.booked'),finance.bookedRevenue],[t('labels.completed'),finance.completedRevenue],[t('labels.collected'),finance.collectedRevenue],[t('labels.outstanding'),finance.outstanding],[t('labels.cash'),finance.cash],[t('labels.card'),finance.card],[t('labels.online'),finance.online],[t('labels.refunds'),finance.refunds],[t('labels.netCollected'),finance.netCollected],
      ].map(([label,value])=><div key={String(label)} className="rounded-radius-lg bg-surface-2 p-4"><p className="text-xs text-muted">{String(label)}</p><p className="mt-1 text-xl font-bold text-primary">{new Intl.NumberFormat(undefined,{style:'currency',currency:finance.currency}).format(Number(value||0))}</p></div>)}</div></section>)}</div>}
      {!loading && !error && Array.isArray(data?.professionalBreakdown) && data.professionalBreakdown.length>0 && <section className="rounded-radius-xl border border-border-subtle bg-surface-1 p-5"><div className="mb-4"><h2 className="text-lg font-semibold text-primary">{t('labels.professionalPerformance')}</h2><p className="text-sm text-muted">{t('labels.professionalPerformanceHint')}</p></div><div className="grid gap-3 lg:grid-cols-2">{data.professionalBreakdown.map((professional:any)=><button type="button" key={professional.professionalId} onClick={()=>setAnalyticsProfessionalId(professional.professionalId)} className="rounded-radius-lg border border-border-subtle bg-surface-2 p-4 text-left hover:border-accent-gold-2/50"><div className="flex items-center justify-between"><div><p className="font-semibold text-primary">{professional.name}</p><p className="text-xs text-muted">{professional.bookings} {t('labels.bookings')} · {professional.completed} {t('labels.completed')}{professional.rating ? ` · ★ ${Number(professional.rating).toFixed(1)}` : ''}</p></div><span className="text-xs font-semibold text-accent-gold-2">{t('actions.viewOnly')}</span></div>{Array.isArray(professional.financeByCurrency)&&professional.financeByCurrency.map((f:any)=><div key={f.currency} className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4"><div><p className="text-xs text-muted">{t('labels.booked')}</p><p className="font-semibold text-primary">{f.currency} {Number(f.bookedRevenue||0).toLocaleString()}</p></div><div><p className="text-xs text-muted">{t('labels.collected')}</p><p className="font-semibold text-primary">{f.currency} {Number(f.collectedRevenue||0).toLocaleString()}</p></div><div><p className="text-xs text-muted">{t('labels.cash')}</p><p className="font-semibold text-primary">{f.currency} {Number(f.cash||0).toLocaleString()}</p></div><div><p className="text-xs text-muted">{t('labels.outstanding')}</p><p className="font-semibold text-primary">{f.currency} {Number(f.outstanding||0).toLocaleString()}</p></div></div>)}</button>)}</div></section>}
    </div>}

    {loading && <div className="grid gap-3 md:grid-cols-3">{[1,2,3].map(i => <div key={i} className="h-28 animate-pulse rounded-radius-xl bg-surface-2" />)}</div>}

    {!loading && !error && (section === 'floor' || section === 'resources') && Array.isArray(data) && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{data.map((resource:any) => {
      const booking=resource.activeBookings?.[0]?.appointment; const status=resource.maintenance?.length?'maintenance':booking?.status||'available';
      return <article key={resource.id} className="rounded-radius-xl border border-border-subtle bg-surface-1 p-5 shadow-shadow-1"><div className="flex items-start justify-between gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-radius-lg bg-accent-gold-2/10 text-xl">{resource.icon_key ? '✦' : '✂️'}</div><span className={`rounded-radius-full px-2.5 py-1 text-xs font-semibold ${statusClass(status)}`}>{String(status).replaceAll('_',' ')}</span></div><h2 className="mt-4 text-lg font-semibold text-primary">{resource.name}</h2><p className="text-sm text-muted">{resource.type?.replaceAll('_',' ')}{resource.branch_id ? '' : ` · ${t('labels.companyWide')}`}</p>{booking&&<div className="mt-4 rounded-radius-lg bg-surface-2 p-3 text-sm"><p className="font-semibold text-primary">{booking.participants?.[0]?.professional?.display_name || t('labels.assignedProfessional')}</p><p className="mt-1 text-muted">{booking.customer?.user?.full_name || t('labels.customer')} · {t('labels.until')} {new Date(booking.ends_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</p></div>}<button onClick={()=>void mutate(`/business-ops/${session!.companyId}/resources/${resource.id}`,{method:'PATCH',body:JSON.stringify({isActive:!resource.is_active})},resource.is_active?t('messages.resourceDisabled'):t('messages.resourceEnabled'))} className="mt-4 text-sm font-semibold text-accent-gold-2">{resource.is_active?t('actions.disable'):t('actions.enable')}</button></article>})}</div>}

    {!loading && !error && section === 'calendar' && Array.isArray(data) && <div className="space-y-3">{data.map((a:any)=><article key={a.id} className="rounded-radius-xl border border-border-subtle bg-surface-1 p-5"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><div className="flex items-center gap-2"><h2 className="font-semibold text-primary">{a.customer?.user?.full_name || t('labels.customer')}</h2><span className={`rounded-radius-full px-2.5 py-1 text-xs font-semibold ${statusClass(a.status)}`}>{String(a.status).replaceAll('_',' ')}</span></div><p className="mt-1 text-sm text-secondary">{a.services?.map((s:any)=>s.service?.name).filter(Boolean).join(', ') || t('labels.service')} · {a.participants?.map((p:any)=>p.professional?.display_name).filter(Boolean).join(', ') || t('labels.anyProfessional')}</p><p className="mt-1 text-xs text-muted">{new Date(a.starts_at).toLocaleString()} → {new Date(a.ends_at).toLocaleTimeString()} · {a.branch?.name}</p>{a.notes_customer&&<p className="mt-2 rounded-radius-md bg-surface-2 p-2 text-xs text-secondary">Customer note: {a.notes_customer}</p>}</div><div className="flex flex-wrap gap-2">{a.status==='pending'&&<button onClick={()=>void mutate(`/booking-v2/appointments/${a.id}/confirm`,{method:'PATCH',body:'{}'},'Booking approved and customer notified.')} className="rounded-radius-md bg-accent-green px-3 py-2 text-xs font-semibold text-surface-0">Approve</button>}{['pending','confirmed'].includes(a.status)&&<button onClick={()=>{const reason=window.prompt('Reason for rejecting this reservation?','');if(!reason?.trim())return;const note=window.prompt('Optional message to customer','')||undefined;void mutate(`/booking-v2/appointments/${a.id}/reject`,{method:'PATCH',body:JSON.stringify({reason:reason.trim(),note:note?.trim()||undefined})},'Booking rejected and customer notified.');}} className="rounded-radius-md border border-accent-red/40 px-3 py-2 text-xs font-semibold text-accent-red">Reject</button>}{a.status==='confirmed'&&<><button onClick={()=>void mutate(`/booking-v2/appointments/${a.id}/check-in`,{method:'PATCH',body:'{}'},t('messages.checkedIn'))} className="rounded-radius-md bg-accent-gold-2 px-3 py-2 text-xs font-semibold text-surface-0">{t('actions.checkIn')}</button><button onClick={()=>void mutate(`/booking-v2/appointments/${a.id}/no-show`,{method:'PATCH',body:JSON.stringify({notes:'Marked from business dashboard'})},t('messages.markedNoShow'))} className="rounded-radius-md border border-border-subtle px-3 py-2 text-xs font-semibold text-primary">{t('actions.noShow')}</button></>}{a.status==='checked_in'&&<button onClick={()=>void mutate(`/booking-v2/appointments/${a.id}/start`,{method:'PATCH',body:'{}'},t('messages.serviceStarted'))} className="rounded-radius-md bg-accent-gold-2 px-3 py-2 text-xs font-semibold text-surface-0">{t('actions.start')}</button>}{a.status==='in_progress'&&<button onClick={()=>void mutate(`/booking-v2/appointments/${a.id}/complete`,{method:'PATCH',body:'{}'},t('messages.appointmentCompleted'))} className="rounded-radius-md bg-accent-green px-3 py-2 text-xs font-semibold text-surface-0">{t('actions.complete')}</button>}</div></div></article>)}</div>}

    {!loading && !error && section === 'queue' && Array.isArray(data) && <div className="space-y-5">{data.map((queue:any)=><section key={queue.id} className="rounded-radius-xl border border-border-subtle bg-surface-1 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-primary">{queue.name}</h2><p className="text-xs text-muted">{queue.branch?.name || t('labels.branch')} · {queue.estimated_wait_per_person_minutes} {t('labels.minutesPerPerson')} · {t('labels.max')} {queue.max_waiting}</p></div><button onClick={()=>void mutate(`/business-ops/${session!.companyId}/queues/${queue.id}`,{method:'PATCH',body:JSON.stringify({isActive:!queue.is_active})},queue.is_active?t('messages.queuePaused'):t('messages.queueActivated'))} className="rounded-radius-md border border-border-subtle px-3 py-2 text-xs font-semibold text-primary">{queue.is_active?t('actions.pause'):t('actions.activate')}</button></div><div className="mt-4 space-y-2">{(queue.entries||[]).map((entry:any)=><div key={entry.id} className="flex flex-col gap-3 rounded-radius-lg bg-surface-2 p-4 md:flex-row md:items-center md:justify-between"><div><p className="font-semibold text-primary">#{entry.position} · {entry.customer_name || entry.customer?.user?.full_name || t('labels.customer')}</p><p className="text-sm text-muted">{t('labels.estimatedWait')} {entry.estimated_wait_minutes ?? '—'} min · {entry.status}</p></div><div className="flex gap-2">{entry.status==='waiting'&&<button onClick={()=>void mutate(`/booking-v2/queue-entries/${entry.id}/call`,{method:'PATCH',body:'{}'},t('messages.customerCalled'))} className="rounded-radius-md bg-accent-gold-2 px-3 py-2 text-xs font-semibold text-surface-0">{t('actions.call')}</button>}<button onClick={()=>void mutate(`/booking-v2/queue-entries/${entry.id}/serve`,{method:'PATCH',body:'{}'},t('messages.queueServed'))} className="rounded-radius-md border border-border-subtle px-3 py-2 text-xs font-semibold text-primary">{t('actions.served')}</button></div></div>)}{!(queue.entries||[]).length&&<p className="text-sm text-muted">{t('messages.noCustomersWaiting')}</p>}</div></section>)}</div>}

    {!loading && !error && section === 'branches' && Array.isArray(data) && <div className="grid gap-4 xl:grid-cols-2">{data.map((branch:any)=><form key={branch.id} onSubmit={(e)=>void updateBranch(e,branch.id)} className="rounded-radius-xl border border-border-subtle bg-surface-1 p-5">
      <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="font-semibold text-primary">{branch.name}</h2><p className="text-xs text-muted">{branch.is_main?'Main branch':'Branch'} · {branch.is_active?'Active':'Inactive'}</p></div>{branch.is_main&&<span className="rounded-radius-full bg-accent-gold-2/10 px-2.5 py-1 text-xs font-semibold text-accent-gold-2">MAIN</span>}</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="name" defaultValue={branch.name||''} required className={inputClass} aria-label="Branch name"/>
        <input name="addressLine1" defaultValue={branch.address_line_1||''} placeholder="Address" className={inputClass}/>
        <input name="phone" defaultValue={branch.phone||''} placeholder="Phone" className={inputClass}/>
        <input name="whatsapp" defaultValue={branch.whatsapp||''} placeholder="WhatsApp" className={inputClass}/>
        <input name="instagramHandle" defaultValue={branch.instagram_handle||''} placeholder="Instagram" className={inputClass}/>
        <div className="grid grid-cols-2 gap-2"><input name="latitude" type="number" step="any" defaultValue={branch.latitude??''} placeholder="Latitude" className={inputClass}/><input name="longitude" type="number" step="any" defaultValue={branch.longitude??''} placeholder="Longitude" className={inputClass}/></div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {[['isActive','Active',branch.is_active],['bookingEnabled','Booking',branch.booking_enabled],['walkInsEnabled','Walk-ins',branch.walk_ins_enabled],['homeServiceEnabled','Home service',branch.home_service_enabled]].map(([name,label,checked])=><label key={String(name)} className="flex items-center gap-2 rounded-radius-md bg-surface-2 p-3 text-xs text-primary"><input name={String(name)} type="checkbox" defaultChecked={Boolean(checked)} className="accent-accent-gold-2"/>{String(label)}</label>)}
      </div>
      <div className="mt-4 flex flex-wrap gap-2"><button className="rounded-radius-md bg-accent-gold-2 px-4 py-2 text-xs font-semibold text-surface-0">Save branch</button>{!branch.is_main&&<button type="button" onClick={()=>{if(window.confirm(`Delete branch ${branch.name}?`))void mutate(`/business-ops/${session!.companyId}/branches/${branch.id}`,{method:'DELETE'},'Branch deleted.')}} className="rounded-radius-md border border-accent-red/40 px-4 py-2 text-xs font-semibold text-accent-red">Delete</button>}</div>
    </form>)}</div>}

    {!loading && !error && section === 'staff' && Array.isArray(data) && <div className="grid gap-4 lg:grid-cols-2">{data.map((scope:any)=>{
      const staffUser=scope.user||{}; const staffRole=scope.role||{};
      return <article key={scope.id} className="rounded-radius-xl border border-border-subtle bg-surface-1 p-5">
        <div className="flex items-start justify-between gap-4">
          <div><h2 className="font-semibold text-primary">{staffUser.full_name||'Business user'}</h2><p className="mt-1 text-sm text-secondary">{staffUser.email||staffUser.phone||'No contact'} · {staffRole.name||scope.role_key}</p><p className="mt-1 text-xs text-muted">{staffUser.is_active?'Active':'Disabled'}{scope.branch_id?' · Branch-scoped':' · Company-wide'}</p></div>
          <span className={`rounded-radius-full px-2.5 py-1 text-xs font-semibold ${staffUser.is_active?'bg-accent-green/10 text-accent-green':'bg-accent-red/10 text-accent-red'}`}>{staffUser.is_active?'Active':'Disabled'}</span>
        </div>
        <form onSubmit={(e)=>void updateStaffRole(e,staffUser.id)} className="mt-4 grid gap-2 sm:grid-cols-2">
          <select name="roleKey" defaultValue={scope.role_key} className={inputClass}>
            <option value="business_manager">Business manager</option>
            <option value="branch_manager">Branch manager</option>
            <option value="professional">Professional / barber</option>
            <option value="staff">Staff</option>
          </select>
          <select name="branchId" defaultValue={scope.branch_id||''} className={inputClass}>
            <option value="">Company-wide / choose branch</option>
            {branches.map((o)=><option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <button className="h-10 rounded-radius-md border border-accent-gold-2/50 px-3 text-xs font-semibold text-accent-gold-2">Save role & branch</button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={()=>void mutate(`/business-ops/${session!.companyId}/staff/${staffUser.id}`,{method:'PATCH',body:JSON.stringify({isActive:!staffUser.is_active})},staffUser.is_active?'User disabled.':'User enabled.')} className="rounded-radius-md border border-border-subtle px-3 py-2 text-xs font-semibold text-primary">{staffUser.is_active?'Disable':'Enable'}</button>
          <button onClick={()=>{if(window.confirm(`Remove ${staffUser.full_name||'this user'} from the business?`))void mutate(`/business-ops/${session!.companyId}/staff/${staffUser.id}`,{method:'DELETE'},'User removed from business.')}} className="rounded-radius-md border border-accent-red/40 px-3 py-2 text-xs font-semibold text-accent-red">Remove</button>
        </div>
      </article>;
    })}</div>}

    {!loading && !error && !['floor','resources','calendar','queue','settings','analytics','reports','staff','branches'].includes(section) && rows.length === 0 && <div className="rounded-radius-xl border border-border-subtle bg-surface-1 p-10 text-center"><h2 className="text-lg font-semibold text-primary">{t('noRecords')}</h2><p className="mt-2 text-sm text-muted">{t('liveEmpty')}</p></div>}

    {!loading && !error && !['floor','resources','calendar','queue','settings','analytics','reports','staff','branches'].includes(section) && rows.length > 0 && <div className="overflow-x-auto rounded-radius-xl border border-border-subtle bg-surface-1"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-surface-2 text-xs uppercase text-muted"><tr>{columns.map(c => <th key={c} className="px-4 py-3">{c.replaceAll('_',' ')}</th>)}{['services','promotions','customers'].includes(section)&&<th className="px-4 py-3">{t('labels.actions')}</th>}</tr></thead><tbody className="divide-y divide-border-subtle">{rows.map((row, i) => <tr key={row.id || i} className="align-top hover:bg-surface-2/60">{columns.map(c => <td key={c} className="max-w-[260px] px-4 py-3 text-secondary"><span className="line-clamp-3 break-words">{typeof row[c] === 'object' ? JSON.stringify(row[c]) : String(row[c] ?? '—')}</span></td>)}{section==='services'&&<td className="px-4 py-3"><button onClick={()=>void mutate(`/business-ops/${session!.companyId}/services/${row.id}`,{method:'PATCH',body:JSON.stringify({isActive:!row.is_active})},row.is_active?t('messages.serviceDisabled'):t('messages.serviceEnabled'))} className="text-xs font-semibold text-accent-gold-2">{row.is_active?t('actions.disable'):t('actions.enable')}</button></td>}{section==='promotions'&&<td className="px-4 py-3"><button onClick={()=>void mutate(`/business-ops/${session!.companyId}/promotions/${row.id}`,{method:'PATCH',body:JSON.stringify({isActive:!row.is_active})},row.is_active?t('messages.promotionPaused'):t('messages.promotionActivated'))} className="text-xs font-semibold text-accent-gold-2">{row.is_active?t('actions.pause'):t('actions.activate')}</button></td>}{section==='customers'&&<td className="px-4 py-3">{(()=>{const blocked=Array.isArray(row.blocked_by_company_ids)&&row.blocked_by_company_ids.includes(session!.companyId);return <button onClick={()=>void mutate(`/business-ops/${session!.companyId}/customers/${row.id}/block`,{method:blocked?'DELETE':'POST',body:blocked?undefined:'{}'},blocked?'Customer unblocked.':'Customer blocked.')} className={`text-xs font-semibold ${blocked?'text-accent-green':'text-accent-red'}`}>{blocked?'Unblock':'Block'}</button>})()}</td>}</tr>)}</tbody></table></div>}
  </div>;
}
