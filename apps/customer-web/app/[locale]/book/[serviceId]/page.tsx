'use client';

import * as React from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import axios, { getAccessToken } from '@/lib/axios';

function isoLocalValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function BookingPage() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const locale = useLocale();
  const t = useTranslations('customerBooking');

  const [service, setService] = React.useState<any>(null);
  const [branches, setBranches] = React.useState<any[]>([]);
  const [resources, setResources] = React.useState<any[]>([]);
  const [branchId, setBranchId] = React.useState('');
  const [professionalId, setProfessionalId] = React.useState('');
  const [resourceId, setResourceId] = React.useState('');
  const [startsAt, setStartsAt] = React.useState(() => isoLocalValue(new Date(Date.now() + 2 * 60 * 60 * 1000)));
  const [notes, setNotes] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [createdBooking, setCreatedBooking] = React.useState<any>(null);
  const [paymentOptions, setPaymentOptions] = React.useState<any>(null);
  const [paymentMethod, setPaymentMethod] = React.useState('');
  const [giftCardCode, setGiftCardCode] = React.useState('');
  const [paying, setPaying] = React.useState(false);

  React.useEffect(() => {
    axios
      .get(`/services/${serviceId}`)
      .then(async (response) => {
        setService(response.data);
        const companyId = response.data?.company?.id || response.data?.company_id;
        if (companyId) {
          const branchResponse = await axios.get(`/businesses/${companyId}/branches`);
          const rows = Array.isArray(branchResponse.data)
            ? branchResponse.data
            : branchResponse.data?.items || [];
          setBranches(rows);
          if (rows[0]) setBranchId(rows[0].id);
        }
      })
      .catch((error) => setStatus(error instanceof Error ? error.message : t('loadError')))
      .finally(() => setLoading(false));
  }, [serviceId, t]);

  React.useEffect(() => {
    if (!branchId) return;
    axios
      .get(`/branches/${branchId}/resources`)
      .then((response) =>
        setResources(Array.isArray(response.data) ? response.data : response.data?.items || []),
      )
      .catch(() => setResources([]));
  }, [branchId]);

  async function loadPaymentOptions(appointmentId: string) {
    const response = await axios.get(
      `/finance-v2/appointments/${appointmentId}/payment-options`,
    );
    const options = response.data;
    setPaymentOptions(options);
    const firstAvailable = (options?.methods || []).find((method: any) => method.available);
    setPaymentMethod(firstAvailable?.key || '');
    return options;
  }

  async function confirm() {
    if (!getAccessToken()) {
      setStatus(t('signInRequired'));
      return;
    }
    if (!service || !branchId || !startsAt) {
      setStatus(t('selectBranchTime'));
      return;
    }

    setSubmitting(true);
    setStatus(t('checking'));
    try {
      const start = new Date(startsAt);
      const end = new Date(start.getTime() + Number(service.duration_minutes || 30) * 60000);
      const companyId = service.company?.id || service.company_id;
      const common = {
        companyId,
        branchId,
        professionalId: professionalId || undefined,
        resourceIds: resourceId ? [resourceId] : [],
        serviceIds: [serviceId],
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
      };

      const available = await axios.get('/booking-v2/availability', {
        params: {
          branchId,
          startsAt: start.toISOString(),
          endsAt: end.toISOString(),
          professionalId: professionalId || undefined,
          resourceIds: resourceId || undefined,
        },
      });
      if (available.data?.available === false) {
        setStatus(t('unavailable'));
        return;
      }

      setStatus(t('holding'));
      const hold = await axios.post('/booking-v2/holds', common);
      const token = hold.data?.hold_token || hold.data?.holdToken;
      setStatus(t('confirming'));

      const created = await axios.post('/booking-v2/appointments', {
        ...common,
        holdToken: token,
        notesCustomer: notes || undefined,
        source: 'customer_web',
      });
      setCreatedBooking(created.data);

      if (created.data?.status === 'awaiting_payment') {
        await loadPaymentOptions(created.data.id);
        setStatus(t('depositReserved'));
      } else {
        setStatus(`${t('confirmed')}${created.data?.id ? ` — ${created.data.id}` : ''}.`);
      }
    } catch (error: any) {
      setStatus(error?.response?.data?.message || error?.message || t('failed'));
    } finally {
      setSubmitting(false);
    }
  }

  async function payDeposit() {
    if (!createdBooking?.id || !paymentOptions?.remainingDeposit || !paymentMethod) return;
    if (paymentMethod === 'gift_card' && !giftCardCode.trim()) {
      setStatus(t('giftCardCode'));
      return;
    }

    setPaying(true);
    setStatus(t('paying'));
    try {
      const payment = await axios.post('/finance-v2/payments', {
        companyId: createdBooking.company_id || service?.company?.id || service?.company_id,
        appointmentId: createdBooking.id,
        paymentMethod,
        currencyCode: paymentOptions.currencyCode,
        amount: Number(paymentOptions.remainingDeposit),
        depositAmount: Number(paymentOptions.remainingDeposit),
        referenceCode: paymentMethod === 'gift_card' ? giftCardCode.trim().toUpperCase() : undefined,
        idempotencyKey:
          paymentMethod === 'online_card'
            ? `booking:${createdBooking.id}:deposit:${Number(paymentOptions.remainingDeposit).toFixed(2)}`
            : undefined,
        notes: 'Required booking deposit',
      });

      const checkoutUrl = payment.data?.gateway_response?.checkoutUrl;
      if (payment.data?.status === 'pending' && checkoutUrl) {
        setStatus(t('paymentPending'));
        window.location.assign(checkoutUrl);
        return;
      }

      const refreshed = await loadPaymentOptions(createdBooking.id);
      if (payment.data?.status === 'succeeded') {
        setCreatedBooking((previous: any) => ({
          ...previous,
          status: refreshed.status,
        }));
        setStatus(
          refreshed.status === 'confirmed'
            ? t('depositPaid')
            : t('bookingPendingBusiness'),
        );
      } else {
        setStatus(t('paymentPending'));
      }
    } catch (error: any) {
      setStatus(error?.response?.data?.message || error?.message || t('failed'));
    } finally {
      setPaying(false);
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-3xl p-6 text-secondary">{t('loading')}</div>;
  }
  if (!service) {
    return <div className="mx-auto max-w-3xl p-6 text-accent-red">{status || t('notFound')}</div>;
  }

  const professionals = service.professionals || [];
  const availableMethods = (paymentOptions?.methods || []).filter((method: any) => method.available);

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-8 md:px-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-gold-2">
          {t('secure')}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-primary">{service.name}</h1>
        <p className="mt-2 text-secondary">
          {service.duration_minutes} {t('minutes')} · {service.base_price} {service.currency_code}
        </p>
      </div>

      <div className="space-y-5 rounded-radius-2xl border border-border-subtle bg-surface-1 p-5 md:p-6">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-secondary">{t('branch')}</span>
          <select
            value={branchId}
            disabled={!!createdBooking}
            onChange={(event) => setBranchId(event.target.value)}
            className="h-11 w-full rounded-radius-md border border-border-subtle bg-surface-0 px-3 text-primary"
          >
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-secondary">{t('professional')}</span>
          <select
            value={professionalId}
            disabled={!!createdBooking}
            onChange={(event) => setProfessionalId(event.target.value)}
            className="h-11 w-full rounded-radius-md border border-border-subtle bg-surface-0 px-3 text-primary"
          >
            <option value="">{t('anyProfessional')}</option>
            {professionals.map((professional: any) => (
              <option key={professional.id} value={professional.id}>{professional.display_name}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-secondary">{t('dateTime')}</span>
          <input
            type="datetime-local"
            value={startsAt}
            disabled={!!createdBooking}
            onChange={(event) => setStartsAt(event.target.value)}
            className="h-11 w-full rounded-radius-md border border-border-subtle bg-surface-0 px-3 text-primary"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-secondary">{t('resource')}</span>
          <select
            value={resourceId}
            disabled={!!createdBooking}
            onChange={(event) => setResourceId(event.target.value)}
            className="h-11 w-full rounded-radius-md border border-border-subtle bg-surface-0 px-3 text-primary"
          >
            <option value="">{t('anyResource')}</option>
            {resources.map((resource) => (
              <option key={resource.id} value={resource.id}>{resource.name} · {resource.type}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-secondary">{t('notes')}</span>
          <textarea
            value={notes}
            disabled={!!createdBooking}
            onChange={(event) => setNotes(event.target.value)}
            rows={4}
            className="w-full rounded-radius-md border border-border-subtle bg-surface-0 p-3 text-primary"
            placeholder={t('notesPlaceholder')}
          />
        </label>

        {status && (
          <div className="rounded-radius-md border border-border-subtle bg-surface-2 p-3 text-sm text-secondary">
            {status}
          </div>
        )}

        {!createdBooking && (
          <button
            disabled={submitting}
            onClick={() => void confirm()}
            className="w-full rounded-radius-md bg-accent-gold-2 px-5 py-3 font-semibold text-surface-0 disabled:opacity-50"
          >
            {submitting ? t('processing') : t('confirm')}
          </button>
        )}

        {createdBooking?.status === 'awaiting_payment' && paymentOptions && (
          <section className="space-y-4 rounded-radius-xl border border-accent-gold-2/30 bg-accent-gold-2/5 p-5">
            <div>
              <p className="font-semibold text-primary">{t('paymentRequired')}</p>
              <p className="mt-1 text-sm text-secondary">
                {t('amountDueNow')}: <strong>{paymentOptions.remainingDeposit} {paymentOptions.currencyCode}</strong>
              </p>
            </div>

            {availableMethods.length ? (
              <>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-secondary">{t('paymentMethod')}</span>
                  <select
                    value={paymentMethod}
                    onChange={(event) => setPaymentMethod(event.target.value)}
                    className="h-11 w-full rounded-radius-md border border-border-subtle bg-surface-0 px-3 text-primary"
                  >
                    {availableMethods.map((method: any) => (
                      <option key={method.key} value={method.key}>{method.label}</option>
                    ))}
                  </select>
                </label>

                {paymentMethod === 'gift_card' && (
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-secondary">{t('giftCardCode')}</span>
                    <input
                      value={giftCardCode}
                      onChange={(event) => setGiftCardCode(event.target.value)}
                      className="h-11 w-full rounded-radius-md border border-border-subtle bg-surface-0 px-3 text-primary"
                    />
                  </label>
                )}

                <button
                  disabled={paying}
                  onClick={() => void payDeposit()}
                  className="w-full rounded-radius-md bg-accent-gold-2 px-5 py-3 font-semibold text-surface-0 disabled:opacity-50"
                >
                  {paying ? t('paying') : t('payDeposit')}
                </button>
              </>
            ) : (
              <p className="text-sm text-secondary">{t('noPaymentMethods')}</p>
            )}
          </section>
        )}

        {createdBooking?.id && createdBooking?.status !== 'awaiting_payment' && (
          <Link
            href={`/${locale}/bookings/${createdBooking.id}`}
            className="block rounded-radius-md border border-border-subtle px-5 py-3 text-center font-semibold text-primary"
          >
            {t('confirmed')} · {createdBooking.id}
          </Link>
        )}

        {!getAccessToken() && (
          <Link href={`/${locale}/login`} className="block text-center text-sm text-accent-gold-2">
            {t('signIn')}
          </Link>
        )}
      </div>
    </div>
  );
}
