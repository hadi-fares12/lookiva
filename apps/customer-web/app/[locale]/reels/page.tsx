'use client';

import * as React from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import axios, { API_BASE, getAccessToken } from '@/lib/axios';

export default function ReelsPage() {
  const locale = useLocale();
  const t = useTranslations('customerReels');
  const [items, setItems] = React.useState<any[]>([]);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState('');

  const load = React.useCallback(async () => {
    if (!getAccessToken()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('/social-v2/feed', { params: { limit: 30 } });
      setItems(Array.isArray(response.data?.items) ? response.data.items : []);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || t('loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function save(post: any) {
    if (post.savedByMe || saving) return;
    setSaving(post.id);
    try {
      await axios.post(`/social-v2/posts/${post.id}/save`);
      setItems((current) =>
        current.map((item) =>
          item.id === post.id
            ? { ...item, savedByMe: true, bookmark_count: Number(item.bookmark_count || 0) + 1 }
            : item,
        ),
      );
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || t('loadError'));
    } finally {
      setSaving('');
    }
  }

  if (!getAccessToken()) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 md:px-6">
        <section className="rounded-radius-2xl border border-border-subtle bg-surface-1 p-8 text-center">
          <h1 className="text-3xl font-bold text-primary">{t('title')}</h1>
          <p className="mx-auto mt-3 max-w-xl text-secondary">{t('signIn')}</p>
          <Link
            href={`/${locale}/login`}
            className="mt-6 inline-flex rounded-radius-md bg-accent-gold-2 px-5 py-3 font-semibold text-surface-0"
          >
            {t('signIn')}
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-8 md:px-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-gold-2">
          LOOKIVA
        </p>
        <h1 className="mt-2 text-3xl font-bold text-primary">{t('title')}</h1>
        <p className="mt-2 text-secondary">{t('subtitle')}</p>
      </header>

      {error && (
        <div className="rounded-radius-lg border border-accent-red/30 bg-accent-red/5 p-4 text-sm text-accent-red">
          {error}
        </div>
      )}

      {loading && (
        <div className="grid gap-5 md:grid-cols-2">
          {[1, 2, 3, 4].map((key) => (
            <div key={key} className="h-80 animate-pulse rounded-radius-2xl bg-surface-2" />
          ))}
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="rounded-radius-2xl border border-border-subtle bg-surface-1 p-10 text-center text-secondary">
          {t('empty')}
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="grid gap-5 md:grid-cols-2">
          {items.map((post) => {
            const service = post.bookableService;
            const firstMedia = Array.isArray(post.media_list) ? post.media_list[0] : null;
            const mediaId = firstMedia?.media_id ? encodeURIComponent(String(firstMedia.media_id)) : '';
            const mediaBase = mediaId ? `${API_BASE}/media/public/${mediaId}` : '';
            const author =
              post.professional?.display_name ||
              post.company?.display_name ||
              post.author?.full_name ||
              'LOOKIVA';
            return (
              <article
                key={post.id}
                className="overflow-hidden rounded-radius-2xl border border-border-subtle bg-surface-1 shadow-shadow-1"
              >
                {mediaBase ? (
                  firstMedia?.media_type === 'video' ? (
                    <video
                      className="aspect-[4/5] w-full bg-black object-cover"
                      controls
                      playsInline
                      preload="metadata"
                      poster={`${mediaBase}?variant=thumb`}
                      src={`${mediaBase}?variant=medium`}
                    />
                  ) : (
                    <img
                      src={`${mediaBase}?variant=medium`}
                      alt={post.title || service?.name || author}
                      className="aspect-[4/5] w-full bg-surface-2 object-cover"
                      loading="lazy"
                    />
                  )
                ) : (
                  <div className="flex min-h-64 items-center justify-center bg-gradient-to-br from-surface-2 via-surface-1 to-accent-gold-2/10 p-8">
                    <div className="text-center">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-radius-full bg-accent-gold-2/10 text-3xl">✦</div>
                      <p className="mt-4 text-xs uppercase tracking-[0.18em] text-muted">
                        {post.media_list?.length || post.media_ids?.length || 0} media
                      </p>
                    </div>
                  </div>
                )}
                <div className="space-y-4 p-5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-semibold text-accent-gold-2">
                        {t('by')} {author}
                      </p>
                      {post.verifiedWork && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-accent-gold-2/40 bg-accent-gold-2/10 px-2.5 py-1 text-[11px] font-bold text-accent-gold-2">
                          ✓ {t('verifiedWork')}
                          {Number(post.verifiedWork.rating) > 0
                            ? ` · ${Number(post.verifiedWork.rating).toFixed(1)}★`
                            : ''}
                        </span>
                      )}
                    </div>
                    <h2 className="mt-1 text-xl font-bold text-primary">
                      {post.title || service?.name || author}
                    </h2>
                    {post.body_plain && (
                      <p className="mt-2 line-clamp-3 text-sm text-secondary">{post.body_plain}</p>
                    )}
                  </div>

                  {service && (
                    <div className="rounded-radius-lg bg-surface-2 p-4">
                      <p className="font-semibold text-primary">{service.name}</p>
                      <p className="mt-1 text-sm text-muted">
                        {service.duration_minutes} min · {service.base_price} {service.currency_code}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {service && (
                      <Link
                        href={`/${locale}/book/${service.id}?postId=${post.id}`}
                        className="rounded-radius-md bg-accent-gold-2 px-4 py-2.5 text-sm font-semibold text-surface-0"
                      >
                        {t('bookThisLook')}
                      </Link>
                    )}
                    <button
                      type="button"
                      disabled={post.savedByMe || saving === post.id}
                      onClick={() => void save(post)}
                      className="rounded-radius-md border border-border-subtle px-4 py-2.5 text-sm font-semibold text-primary disabled:opacity-60"
                    >
                      {post.savedByMe ? t('saved') : t('save')}
                    </button>
                  </div>

                  <div className="flex gap-4 text-xs text-muted">
                    <span>♥ {Number(post.like_count || 0).toLocaleString()}</span>
                    <span>💬 {Number(post.comment_count || 0).toLocaleString()}</span>
                    <span>🔖 {Number(post.bookmark_count || 0).toLocaleString()}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
