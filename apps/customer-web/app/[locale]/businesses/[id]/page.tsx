'use client';

import * as React from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { useRouter } from '@/i18n/routing';
import {
  BadgeCheck,
  CalendarDays,
  Globe2,
  Instagram,
  MapPin,
  MessageCircle,
  Play,
  Star,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import axios, { ensureFreshAccessToken, getAccessToken } from '@/lib/axios';
import { useBusiness } from '@/hooks/useBusiness';

function mediaUrl(media: any): string | null {
  const variants = Array.isArray(media?.variants) ? media.variants : [];
  const preferred = variants.find((v: any) => v?.variant === 'medium')
    || variants.find((v: any) => v?.variant === 'thumb')
    || variants[0];
  if (preferred?.url) return preferred.url;
  const base = (process.env.NEXT_PUBLIC_MEDIA_BASE_URL || '').replace(/\/$/, '');
  if (base && media?.storage_bucket && media?.storage_key) {
    return `${base}/${media.storage_bucket}/${media.storage_key}`;
  }
  return null;
}

export default function BusinessPage() {
  const { id } = useParams<{ id: string }>();
  const locale = useLocale();
  const t = useTranslations('publicDetails');
  const router = useRouter();
  const q = useBusiness(id);
  const [media, setMedia] = React.useState<any[]>([]);
  const [following, setFollowing] = React.useState(false);
  const [working, setWorking] = React.useState('');
  const [actionError, setActionError] = React.useState('');

  React.useEffect(() => {
    if (!id) return;
    axios.get(`/businesses/${id}/media`).then((r) => setMedia(Array.isArray(r.data) ? r.data : [])).catch(() => setMedia([]));
  }, [id]);

  React.useEffect(() => {
    if (!id || !getAccessToken()) return;
    let active = true;

    void (async () => {
      const token = await ensureFreshAccessToken();
      if (!active || !token) {
        if (active) setFollowing(false);
        return;
      }

      try {
        const response = await axios.get('/customer/following', {
          params: { targetType: 'business', limit: 100 },
        });
        if (!active) return;
        const rows = Array.isArray(response.data) ? response.data : [];
        setFollowing(rows.some((item: any) => item.target_id === id));
      } catch {
        if (active) setFollowing(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [id]);

  if (q.isLoading) return <div className="mx-auto max-w-6xl p-6 text-secondary">{t('loadingBusiness')}</div>;
  if (q.error || !q.data) return <div className="mx-auto max-w-6xl p-6 text-accent-red">{t('businessError')}</div>;

  const d: any = q.data;
  const branches = Array.isArray(d.branches) ? d.branches : [];
  const services = Array.isArray(d.services) ? d.services : [];
  const professionals = Array.isArray(d.professionals) ? d.professionals : [];
  const mainBranch = branches.find((b: any) => b.is_main) || branches[0];
  const rating = Number(d.aggregate_reviews?.avg_rating ?? d.avg_rating ?? 0);
  const reviewCount = Number(d.aggregate_reviews?.count ?? d.review_count ?? 0);
  const followers = Number(d.followers_count ?? d.follower_count ?? 0) + (following ? 0 : 0);
  const returnPath = `/businesses/${id}`;
  const requireAuth = () => {
    router.push(`/login?next=${encodeURIComponent(returnPath)}`);
  };

  async function toggleFollow() {
    setActionError('');
    if (!getAccessToken()) return requireAuth();
    setWorking('follow');
    try {
      if (following) {
        await axios.delete(`/customer/following/target/business/${id}`);
        setFollowing(false);
      } else {
        await axios.post('/customer/following', { targetType: 'business', targetId: id, companyId: id });
        setFollowing(true);
      }
      await q.refetch();
    } catch (e: any) {
      setActionError(e?.response?.data?.message || e?.message || 'Unable to update follow status');
    } finally {
      setWorking('');
    }
  }

  async function messageBusiness() {
    setActionError('');
    if (!getAccessToken()) return requireAuth();
    setWorking('message');
    try {
      const { data } = await axios.post('/customer-ops/conversations', { companyId: id });
      router.push(`/chat/${data.id}`);
    } catch (e: any) {
      setActionError(e?.response?.data?.message || e?.message || 'Unable to open chat');
    } finally {
      setWorking('');
    }
  }

  function book(serviceId?: string) {
    if (!serviceId) return;
    if (!getAccessToken()) {
      router.push(`/login?next=${encodeURIComponent(`/book/${serviceId}`)}`);
      return;
    }
    router.push(`/book/${serviceId}`);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-6">
      <section className="overflow-hidden rounded-radius-2xl border border-border-subtle bg-surface-1">
        <div className="relative h-44 bg-gradient-to-br from-accent-gold-1/30 via-surface-2 to-accent-silver-1/10 md:h-64">
          {media[0] && mediaUrl(media[0]) && (
            <img src={mediaUrl(media[0])!} alt={d.display_name || 'Business cover'} className="h-full w-full object-cover" />
          )}
        </div>

        <div className="px-5 pb-6 md:px-8">
          <div className="-mt-10 flex flex-col gap-4 md:-mt-12 md:flex-row md:items-end md:justify-between">
            <div className="flex items-end gap-4">
              <div className="flex h-24 w-24 items-center justify-center rounded-radius-2xl border-4 border-surface-1 bg-gradient-to-br from-accent-gold-1 to-accent-gold-3 text-3xl font-black text-surface-0 shadow-shadow-3">
                {String(d.display_name || 'L').slice(0, 1).toUpperCase()}
              </div>
              <div className="pb-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-primary md:text-3xl">{d.display_name}</h1>
                  {d.is_verified && <BadgeCheck className="h-5 w-5 text-accent-blue" />}
                </div>
                <p className="mt-1 text-sm text-muted">{d.tagline || d.category_coverage?.join(' · ') || t('business')}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button onClick={() => void toggleFollow()} disabled={working === 'follow'} className="inline-flex h-10 items-center gap-2 rounded-radius-md bg-accent-gold-2 px-4 text-sm font-semibold text-surface-0 disabled:opacity-50">
                {following ? <UserCheck className="h-4 w-4"/> : <UserPlus className="h-4 w-4"/>}
                {following ? 'Following' : 'Follow'}
              </button>
              <button onClick={() => void messageBusiness()} disabled={working === 'message'} className="inline-flex h-10 items-center gap-2 rounded-radius-md border border-border-subtle bg-surface-2 px-4 text-sm font-semibold text-primary disabled:opacity-50">
                <MessageCircle className="h-4 w-4"/> Message
              </button>
              {services[0] && (
                <button onClick={() => book(services[0].id)} className="inline-flex h-10 items-center gap-2 rounded-radius-md border border-accent-gold-2/50 px-4 text-sm font-semibold text-accent-gold-2">
                  <CalendarDays className="h-4 w-4"/> Book
                </button>
              )}
            </div>
          </div>

          {actionError && <div className="mt-4 rounded-radius-md border border-accent-red/30 bg-accent-red/10 p-3 text-sm text-accent-red">{actionError}</div>}

          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-secondary">
            <span className="inline-flex items-center gap-1"><Star className="h-4 w-4 fill-accent-gold-2 text-accent-gold-2"/> <b className="text-primary">{rating.toFixed(1)}</b> ({reviewCount})</span>
            <span><b className="text-primary">{followers}</b> followers</span>
            <span><b className="text-primary">{professionals.length}</b> professionals</span>
            <span><b className="text-primary">{services.length}</b> services</span>
            {d.distance_meters != null && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4"/> {d.distance_meters < 1000 ? `${d.distance_meters} m` : `${(d.distance_meters / 1000).toFixed(1)} km`}</span>}
          </div>

          <p className="mt-4 max-w-4xl text-sm leading-6 text-secondary">
            {d.description_long || d.description_short || t('businessFallback')}
          </p>

          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            {mainBranch?.address_line_1 && <span className="inline-flex items-center gap-1 text-secondary"><MapPin className="h-4 w-4"/>{mainBranch.address_line_1}</span>}
            {d.website_url && <a href={d.website_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-accent-gold-2"><Globe2 className="h-4 w-4"/>Website</a>}
            {mainBranch?.instagram_handle && <span className="inline-flex items-center gap-1 text-secondary"><Instagram className="h-4 w-4"/>{mainBranch.instagram_handle}</span>}
            {d.is_open != null && <span className={d.is_open ? 'font-semibold text-accent-green' : 'font-semibold text-accent-red'}>{d.is_open ? 'Open now' : 'Closed now'}</span>}
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-semibold text-primary">Photos & videos</h2><span className="text-sm text-muted">{media.length} items</span></div>
        {media.length ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {media.slice(0, 12).map((m: any) => {
              const url = mediaUrl(m);
              return <div key={m.id} className="relative aspect-square overflow-hidden rounded-radius-xl border border-border-subtle bg-surface-2">
                {url ? <img src={url} alt={m.alt_text || d.display_name || 'Business media'} className="h-full w-full object-cover"/> : <div className="flex h-full items-center justify-center text-muted">Media</div>}
                {m.mime_category === 'video' && <div className="absolute right-2 top-2 rounded-full bg-black/60 p-2 text-white"><Play className="h-4 w-4" fill="currentColor"/></div>}
              </div>;
            })}
          </div>
        ) : <div className="rounded-radius-xl border border-border-subtle bg-surface-1 p-8 text-center text-sm text-muted">No public media uploaded yet.</div>}
      </section>

      <section>
        <h2 className="text-xl font-semibold text-primary">{t('services')}</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {services.map((s: any) => (
            <article key={s.id} className="rounded-radius-xl border border-border-subtle bg-surface-1 p-5">
              <Link href={`/${locale}/services/${s.id}`} className="font-semibold text-primary hover:text-accent-gold-2">{s.name}</Link>
              <p className="mt-1 text-sm text-secondary">{s.duration_minutes} {t('minutes')}</p>
              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="font-bold text-accent-gold-2">{s.base_price} {s.currency_code}</p>
                <button onClick={() => book(s.id)} className="rounded-radius-md bg-accent-gold-2 px-3 py-2 text-xs font-semibold text-surface-0">Book</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-primary">{t('professionals')}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {professionals.map((p: any) => {
            const avatarUrl = mediaUrl(p.avatar_media);
            return (
              <Link key={p.id} href={`/${locale}/professionals/${p.id}`} className="rounded-radius-xl border border-border-subtle bg-surface-1 p-5 hover:bg-surface-2">
                <div className="flex items-center gap-3">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={p.display_name || 'Professional'} className="h-14 w-14 rounded-full border border-border-subtle object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-gold-2/15 font-bold text-accent-gold-2">
                      {String(p.display_name || 'P').slice(0,1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-primary">{p.display_name}</p>
                    <p className="mt-1 text-sm text-secondary">{p.specialties?.join(', ') || t('beautyProfessional')}</p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted">★ {Number(p.avg_rating || 0).toFixed(1)} · {p.review_count || 0} reviews</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-primary">Branches</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {branches.map((branch: any) => (
            <article key={branch.id} className="rounded-radius-xl border border-border-subtle bg-surface-1 p-5">
              <p className="font-semibold text-primary">{branch.name}</p>
              <p className="mt-1 text-sm text-secondary">{branch.address_line_1 || 'Address not added yet'}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
                {branch.phone && <span>{branch.phone}</span>}
                {branch.whatsapp && <span>WhatsApp {branch.whatsapp}</span>}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
