'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import axios from '@/lib/axios';
import { QRCodeSVG } from 'qrcode.react';
import { useCustomerRealtimeReload } from '@/lib/realtime';

function value(v: any, fallback: string) {
  return v === null || v === undefined || v === '' ? fallback : String(v);
}

export default function BookingDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const locale = useLocale();
  const t = useTranslations('bookingDetails');
  const [data, setData] = React.useState<any>(null);
  const [consents, setConsents] = React.useState<any[]>([]);
  const [error, setError] = React.useState('');
  const [busyConsent, setBusyConsent] = React.useState('');
  const [qr, setQr] = React.useState<any>(null);
  const [qrError, setQrError] = React.useState('');
  const [qrBusy, setQrBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const [bookingResponse, consentResponse] = await Promise.all([
        axios.get(`/customer-ops/bookings/${id}`),
        axios.get(`/customer-ops/bookings/${id}/consents`),
      ]);
      setData(bookingResponse.data);
      setConsents(Array.isArray(consentResponse.data) ? consentResponse.data : []);
      setError('');
    } catch (error) {
      setError(error instanceof Error ? error.message : t('loadError'));
    }
  }, [id, t]);

  React.useEffect(() => {
    void load();
  }, [load]);

  useCustomerRealtimeReload(
    ['booking:changed', 'booking:consent-changed'],
    () => void load(),
    { appointmentId: id },
  );

  async function loadQr() {
    setQrBusy(true);
    setQrError('');
    try {
      const response = await axios.get(
        `/booking-v2/appointments/${id}/check-in-token`,
      );
      setQr(response.data);
    } catch (error: any) {
      setQr(null);
      setQrError(
        error?.response?.data?.message ||
          error?.message ||
          t('qrUnavailable'),
      );
    } finally {
      setQrBusy(false);
    }
  }

  async function signConsent(form: any) {
    const typedSignature = window.prompt(
      `${form.name}\n\n${form.content_plain || ''}\n\n${t('signatureName')}`,
      '',
    );
    if (!typedSignature?.trim()) return;
    const accepted = window.confirm(t('accept'));
    if (!accepted) return;

    setBusyConsent(form.id);
    setError('');
    try {
      await axios.post(
        `/customer-ops/bookings/${id}/consents/${form.id}/sign`,
        {
          accepted: true,
          typedSignature: typedSignature.trim(),
          responses: { acceptedFrom: 'customer_web' },
        },
      );
      await load();
    } catch (error: any) {
      setError(error?.response?.data?.message || error?.message || t('loadError'));
    } finally {
      setBusyConsent('');
    }
  }

  if (error && !data) {
    return <div className="mx-auto max-w-4xl p-6 text-accent-red">{error}</div>;
  }
  if (!data) {
    return <div className="mx-auto max-w-4xl p-6 text-secondary">{t('loading')}</div>;
  }

  const f = data.financial_snapshot || {};
  const rows = [
    [t('subtotal'), f.subtotal],
    [t('discount'), f.discount_total ?? f.discount],
    [t('tax'), f.tax_total ?? f.tax],
    [t('surcharge'), f.resource_surcharge ?? f.surcharge],
    [t('deposit'), f.deposit_amount ?? f.deposit],
    [t('total'), f.grand_total ?? f.total],
    [t('currency'), f.currency_code],
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-8 md:px-6">
      <div className="rounded-radius-2xl border border-border-subtle bg-surface-1 p-6">
        <div className="flex justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-accent-gold-2">
              {t('booking')} {data.id}
            </p>
            <h1 className="mt-2 text-2xl font-bold text-primary">
              {data.company?.display_name}
            </h1>
            <p className="mt-1 text-secondary">
              {data.branch?.name} · {new Date(data.starts_at).toLocaleString(locale)}
            </p>
          </div>
          <span className="h-fit rounded-radius-full bg-accent-gold-2/10 px-3 py-1 text-sm font-semibold text-accent-gold-2">
            {String(data.status || '').replaceAll('_', ' ')}
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded-radius-lg border border-accent-red/30 bg-accent-red/5 p-4 text-sm text-accent-red">
          {error}
        </div>
      )}

      {['pending', 'confirmed'].includes(String(data.status)) && (
        <section className="rounded-radius-xl border border-border-subtle bg-surface-1 p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-semibold text-primary">{t('checkInQr')}</h2>
              <p className="mt-1 text-sm text-secondary">{t('qrHint')}</p>
              {qr?.expiresAt && (
                <p className="mt-1 text-xs text-muted">
                  {t('qrExpires')}: {new Date(qr.expiresAt).toLocaleTimeString(locale)}
                </p>
              )}
              {qrError && <p className="mt-2 text-sm text-accent-red">{qrError}</p>}
            </div>
            {!qr && (
              <button
                onClick={() => void loadQr()}
                disabled={qrBusy}
                className="rounded-radius-md bg-accent-gold-2 px-4 py-2.5 text-sm font-semibold text-surface-0 disabled:opacity-50"
              >
                {qrBusy ? t('loading') : t('showQr')}
              </button>
            )}
          </div>
          {qr?.token && (
            <div className="mt-5 flex justify-center rounded-radius-xl bg-white p-5">
              <QRCodeSVG value={qr.token} size={220} level="M" />
            </div>
          )}
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-radius-xl border border-border-subtle bg-surface-1 p-5">
          <h2 className="font-semibold text-primary">{t('services')}</h2>
          <div className="mt-3 space-y-2">
            {data.services?.map((item: any) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-secondary">{item.service?.name}</span>
                <span className="font-semibold text-primary">
                  {item.final_price} {item.service?.currency_code}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-radius-xl border border-border-subtle bg-surface-1 p-5">
          <h2 className="font-semibold text-primary">{t('professionalResource')}</h2>
          <p className="mt-3 text-sm text-secondary">
            {data.participants
              ?.map((item: any) => item.professional?.display_name)
              .filter(Boolean)
              .join(', ') || t('anyProfessional')}
          </p>
          <p className="mt-2 text-sm text-secondary">
            {data.resources
              ?.map((item: any) => item.resource?.name)
              .filter(Boolean)
              .join(', ') || t('automaticResource')}
          </p>
        </div>
      </div>

      <div className="rounded-radius-xl border border-border-subtle bg-surface-1 p-5">
        <h2 className="font-semibold text-primary">{t('financial')}</h2>
        <dl className="mt-3 divide-y divide-border-subtle">
          {rows.map(([label, fieldValue]) => (
            <div
              key={String(label)}
              className="flex items-center justify-between gap-4 py-2.5 text-sm"
            >
              <dt className="text-secondary">{label}</dt>
              <dd className="font-semibold text-primary">
                {value(fieldValue, t('notAvailable'))}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="rounded-radius-xl border border-border-subtle bg-surface-1 p-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-semibold text-primary">{t('consents')}</h2>
          {consents.some((form) => !form.signed) && (
            <span className="rounded-radius-full bg-accent-gold-2/10 px-3 py-1 text-xs font-semibold text-accent-gold-2">
              {t('consentRequired')}
            </span>
          )}
        </div>
        <div className="mt-3 space-y-3">
          {consents.length === 0 && (
            <p className="text-sm text-muted">{t('noConsents')}</p>
          )}
          {consents.map((form) => (
            <article
              key={form.id}
              className="rounded-radius-lg border border-border-subtle bg-surface-2 p-4"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="font-semibold text-primary">{form.name}</p>
                  {form.description && (
                    <p className="mt-1 text-sm text-secondary">{form.description}</p>
                  )}
                  <p className="mt-2 whitespace-pre-line text-sm text-muted">
                    {form.content_plain}
                  </p>
                  <p className="mt-2 text-xs text-muted">v{form.version}</p>
                </div>
                {form.signed ? (
                  <span className="rounded-radius-full bg-accent-green/10 px-3 py-1 text-xs font-semibold text-accent-green">
                    {t('signed')}
                  </span>
                ) : (
                  <button
                    disabled={busyConsent === form.id}
                    onClick={() => void signConsent(form)}
                    className="rounded-radius-md bg-accent-gold-2 px-4 py-2 text-sm font-semibold text-surface-0 disabled:opacity-50"
                  >
                    {busyConsent === form.id ? t('signing') : t('sign')}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="rounded-radius-xl border border-border-subtle bg-surface-1 p-5">
        <h2 className="font-semibold text-primary">{t('timeline')}</h2>
        <div className="mt-3 space-y-3">
          {data.status_history?.map((item: any) => (
            <div key={item.id} className="border-s border-border-strong ps-4">
              <p className="text-sm font-semibold text-primary">
                {String(item.new_status || '').replaceAll('_', ' ')}
              </p>
              <p className="text-xs text-muted">
                {new Date(item.created_at).toLocaleString(locale)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
