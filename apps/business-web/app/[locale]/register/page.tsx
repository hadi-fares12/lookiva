'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { API_BASE } from '@/lib/api';

type Country = { id: string; name: string; iso_code?: string };
type Category = { id: string; name: string; depth_level?: number };

async function json<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { cache: 'no-store' });
  const raw = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(raw?.message || `Request failed (${response.status})`);
  return (raw?.data ?? raw) as T;
}

export default function RegisterBusinessPage() {
  const params = useParams<{ locale: string }>();
  const [countries, setCountries] = React.useState<Country[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>([]);
  const [location, setLocation] = React.useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [loadingOptions, setLoadingOptions] = React.useState(true);
  const [message, setMessage] = React.useState('');
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    Promise.all([
      json<Country[]>('/platform/countries'),
      json<Category[]>('/platform/categories'),
    ]).then(([countryRows, categoryRows]) => {
      setCountries(countryRows);
      setCategories(categoryRows);
    }).catch((e) => setError(e instanceof Error ? e.message : 'Unable to load registration options'))
      .finally(() => setLoadingOptions(false));
  }, []);

  function toggleCategory(id: string) {
    setSelectedCategories((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  function useLocation() {
    setError('');
    if (!navigator.geolocation) {
      setError('Location is not supported by this browser. Enter your address manually.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => setError('Location permission was denied. You can still enter the address manually.'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!selectedCategories.length) {
      setError('Select at least one business category.');
      return;
    }
    const fd = new FormData(event.currentTarget);
    const payload = {
      ownerFullName: String(fd.get('ownerFullName') || '').trim(),
      ownerEmail: String(fd.get('ownerEmail') || '').trim(),
      ownerPhone: String(fd.get('ownerPhone') || '').trim() || undefined,
      businessName: String(fd.get('businessName') || '').trim(),
      countryId: String(fd.get('countryId') || ''),
      categoryIds: selectedCategories,
      description: String(fd.get('description') || '').trim() || undefined,
      websiteUrl: String(fd.get('websiteUrl') || '').trim() || undefined,
      addressLine1: String(fd.get('addressLine1') || '').trim() || undefined,
      whatsapp: String(fd.get('whatsapp') || '').trim() || undefined,
      instagramHandle: String(fd.get('instagramHandle') || '').trim() || undefined,
      registrationNumber: String(fd.get('registrationNumber') || '').trim() || undefined,
      taxIdNumber: String(fd.get('taxIdNumber') || '').trim() || undefined,
      latitude: location?.latitude,
      longitude: location?.longitude,
    };

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/businesses/applications`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const raw = await response.json().catch(() => ({}));
      const data = raw?.data ?? raw;
      if (!response.ok) throw new Error(raw?.message || 'Unable to submit business application');
      setMessage(`Application submitted successfully. Status: ${data.status || 'pending'}. LOOKIVA Admin will review it and contact you by email/WhatsApp.`);
      event.currentTarget.reset();
      setSelectedCategories([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to submit business application');
    } finally {
      setLoading(false);
    }
  }

  const input = 'h-11 w-full rounded-radius-md border border-border-subtle bg-surface-0 px-3 text-primary outline-none focus:border-accent-gold-2';

  return (
    <div className="mx-auto w-full max-w-5xl py-6">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-gold-2">LOOKIVA Business</p>
        <h1 className="mt-2 text-3xl font-bold text-primary">Register your business</h1>
        <p className="mt-2 max-w-3xl text-secondary">
          Submit your salon, barbershop, spa or beauty business. The account remains private until LOOKIVA Admin approves it.
        </p>
      </div>

      {error && <div className="mb-5 rounded-radius-lg border border-accent-red/30 bg-accent-red/10 p-4 text-sm text-accent-red">{error}</div>}
      {message && <div className="mb-5 rounded-radius-lg border border-accent-green/30 bg-accent-green/10 p-4 text-sm text-accent-green">{message}</div>}

      <form onSubmit={submit} className="grid gap-5 rounded-radius-2xl border border-border-subtle bg-surface-1 p-5 md:grid-cols-2 md:p-7">
        <label><span className="mb-1.5 block text-sm font-medium text-secondary">Owner full name</span><input name="ownerFullName" required className={input}/></label>
        <label><span className="mb-1.5 block text-sm font-medium text-secondary">Owner email</span><input name="ownerEmail" type="email" required className={input}/></label>
        <label><span className="mb-1.5 block text-sm font-medium text-secondary">Owner phone</span><input name="ownerPhone" className={input} placeholder="+961..."/></label>
        <label><span className="mb-1.5 block text-sm font-medium text-secondary">WhatsApp</span><input name="whatsapp" className={input} placeholder="+961..."/></label>
        <label><span className="mb-1.5 block text-sm font-medium text-secondary">Business name</span><input name="businessName" required className={input}/></label>
        <label><span className="mb-1.5 block text-sm font-medium text-secondary">Country</span>
          <select name="countryId" required disabled={loadingOptions} className={input}>
            <option value="">Select country</option>
            {countries.map((country)=><option key={country.id} value={country.id}>{country.name}</option>)}
          </select>
        </label>

        <div className="md:col-span-2">
          <span className="mb-2 block text-sm font-medium text-secondary">Business categories</span>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category)=>(
              <label key={category.id} className="flex items-center gap-3 rounded-radius-lg border border-border-subtle bg-surface-2 p-3 text-sm text-primary">
                <input type="checkbox" checked={selectedCategories.includes(category.id)} onChange={()=>toggleCategory(category.id)} className="accent-accent-gold-2"/>
                <span>{category.name}</span>
              </label>
            ))}
          </div>
        </div>

        <label className="md:col-span-2"><span className="mb-1.5 block text-sm font-medium text-secondary">Business description</span><textarea name="description" rows={4} className={input + ' h-auto py-3'}/></label>
        <label className="md:col-span-2"><span className="mb-1.5 block text-sm font-medium text-secondary">Main branch address</span><input name="addressLine1" className={input}/></label>

        <div className="md:col-span-2 rounded-radius-lg border border-border-subtle bg-surface-2 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-primary">Main branch GPS</p>
              <p className="text-xs text-muted">{location ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}` : 'Not captured yet'}</p>
            </div>
            <button type="button" onClick={useLocation} className="h-10 rounded-radius-md bg-accent-gold-2 px-4 text-sm font-semibold text-surface-0">Use current location</button>
          </div>
        </div>

        <label><span className="mb-1.5 block text-sm font-medium text-secondary">Instagram handle</span><input name="instagramHandle" className={input} placeholder="@business"/></label>
        <label><span className="mb-1.5 block text-sm font-medium text-secondary">Website</span><input name="websiteUrl" type="url" className={input} placeholder="https://..."/></label>
        <label><span className="mb-1.5 block text-sm font-medium text-secondary">Registration number</span><input name="registrationNumber" className={input}/></label>
        <label><span className="mb-1.5 block text-sm font-medium text-secondary">Tax ID</span><input name="taxIdNumber" className={input}/></label>

        <div className="md:col-span-2 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href={`/${params.locale}/login`} className="text-sm font-semibold text-accent-gold-2">Already approved? Sign in</Link>
          <button disabled={loading || loadingOptions} className="h-11 rounded-radius-md bg-gradient-to-r from-accent-gold-1 to-accent-gold-2 px-6 font-semibold text-surface-0 disabled:opacity-50">
            {loading ? 'Submitting…' : 'Submit for admin approval'}
          </button>
        </div>
      </form>
    </div>
  );
}
