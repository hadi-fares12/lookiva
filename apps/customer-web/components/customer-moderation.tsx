'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import axios from '@/lib/axios';

function dt(value: unknown) {
  if (!value) return '—';
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

function statusClass(status?: string) {
  const s = (status || '').toLowerCase();
  if (['reversed', 'resolved', 'inactive'].includes(s)) return 'bg-accent-green/10 text-accent-green';
  if (['upheld', 'critical', 'major', 'dismissed'].includes(s)) return 'bg-accent-red/10 text-accent-red';
  return 'bg-accent-gold-2/10 text-accent-gold-2';
}

export function CustomerModeration() {
  const t = useTranslations('customerAccount');
  const [strikes, setStrikes] = React.useState<any[]>([]);
  const [appeals, setAppeals] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState('');
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');

  const load = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const responses = await Promise.all([
        axios.get('/platform-ops-v2/moderation/strikes/mine'),
        axios.get('/platform-ops-v2/moderation/appeals/mine'),
      ]);
      setStrikes(Array.isArray(responses[0].data) ? responses[0].data : []);
      setAppeals(Array.isArray(responses[1].data) ? responses[1].data : []);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || t('loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function appealStrike(strike: any) {
    const reason = window.prompt(t('labels.appealReasonPrompt'), '');
    if (!reason || reason.trim().length < 10) return;
    setBusy(strike.id);
    setError('');
    setNotice('');
    try {
      await axios.post('/platform-ops-v2/moderation/appeals', {
        targetType: 'strike',
        targetId: strike.id,
        strikeId: strike.id,
        reasonReversal: reason.trim(),
      });
      setNotice(t('messages.appealSubmitted'));
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || t('operationError'));
    } finally {
      setBusy('');
    }
  }

  if (loading) {
    return <div className="mt-6 grid gap-3 md:grid-cols-2">{[1, 2].map((key) => <div key={key} className="h-40 animate-pulse rounded-radius-xl bg-surface-2" />)}</div>;
  }

  return (
    <div className="mt-6 space-y-5">
      {notice && <div className="rounded-radius-lg border border-accent-green/30 bg-accent-green/10 px-4 py-3 text-sm font-semibold text-accent-green">{notice}</div>}
      {error && <div className="rounded-radius-lg border border-accent-red/30 bg-accent-red/5 px-4 py-3 text-sm font-semibold text-accent-red">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-radius-xl border border-border-subtle bg-surface-1 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-primary">{t('labels.myStrikes')}</h2>
            <span className="rounded-radius-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-secondary">{strikes.length}</span>
          </div>
          <div className="mt-4 space-y-3">
            {strikes.length ? strikes.map((strike) => (
              <article key={strike.id} className="rounded-radius-lg border border-border-subtle bg-surface-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-primary">{String(strike.reason_type || t('labels.moderationAction')).replaceAll('_', ' ')}</p>
                    <p className="mt-1 text-sm text-secondary">{strike.reason_text || t('labels.noModerationDetails')}</p>
                    <p className="mt-2 text-xs text-muted">{dt(strike.created_at)}{strike.expires_at ? ' · ' + t('labels.expires') + ' ' + dt(strike.expires_at) : ''}</p>
                  </div>
                  <span className={'rounded-radius-full px-2.5 py-1 text-xs font-semibold ' + (strike.is_active === false ? 'bg-surface-0 text-muted' : statusClass(strike.severity))}>
                    {strike.is_active === false ? t('labels.inactive') : String(strike.severity || 'warning')}
                  </span>
                </div>
                {strike.is_active !== false && (
                  <button
                    disabled={busy === strike.id}
                    onClick={() => void appealStrike(strike)}
                    className="mt-4 text-sm font-semibold text-accent-gold-2 disabled:opacity-50"
                  >
                    {busy === strike.id ? t('actions.saving') : t('actions.appeal')}
                  </button>
                )}
              </article>
            )) : <p className="py-5 text-sm text-muted">{t('empty.strikes')}</p>}
          </div>
        </section>

        <section className="rounded-radius-xl border border-border-subtle bg-surface-1 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-primary">{t('labels.myAppeals')}</h2>
            <span className="rounded-radius-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-secondary">{appeals.length}</span>
          </div>
          <div className="mt-4 space-y-3">
            {appeals.length ? appeals.map((appeal) => (
              <article key={appeal.id} className="rounded-radius-lg border border-border-subtle bg-surface-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-primary">{String(appeal.target_type || 'moderation').replaceAll('_', ' ')}</p>
                    <p className="mt-1 text-sm text-secondary">{appeal.reason_reversal}</p>
                    {appeal.resolution && <p className="mt-2 text-sm font-medium text-primary">{t('labels.resolution')}: {appeal.resolution}</p>}
                    {appeal.resolution_notes && <p className="mt-1 text-xs text-muted">{appeal.resolution_notes}</p>}
                    <p className="mt-2 text-xs text-muted">{dt(appeal.created_at)}</p>
                  </div>
                  <span className={'rounded-radius-full px-2.5 py-1 text-xs font-semibold ' + statusClass(appeal.status)}>
                    {String(appeal.status || 'pending').replaceAll('_', ' ')}
                  </span>
                </div>
              </article>
            )) : <p className="py-5 text-sm text-muted">{t('empty.appeals')}</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
