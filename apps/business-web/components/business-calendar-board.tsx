'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { businessFetch, getBusinessSession } from '@/lib/api';
import { useBusinessRealtimeReload } from '@/lib/realtime';

type CalendarView = 'day' | 'fourDay' | 'week' | 'twoWeek' | 'month' | 'list';
type Row = Record<string, any>;

const VIEW_ORDER: CalendarView[] = ['day', 'fourDay', 'week', 'twoWeek', 'month', 'list'];
const ACTIVE_RESCHEDULE = new Set(['awaiting_payment', 'pending', 'confirmed']);

function startOfDay(value: Date) {
  const result = new Date(value);
  result.setHours(0, 0, 0, 0);
  return result;
}

function addDays(value: Date, days: number) {
  const result = new Date(value);
  result.setDate(result.getDate() + days);
  return result;
}

function startOfWeek(value: Date) {
  const result = startOfDay(value);
  const day = result.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  return addDays(result, offset);
}

function monthStart(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function monthEndExclusive(value: Date) {
  return new Date(value.getFullYear(), value.getMonth() + 1, 1);
}

function rangeFor(view: CalendarView, focus: Date) {
  if (view === 'day') {
    const from = startOfDay(focus);
    return { from, to: addDays(from, 1) };
  }
  if (view === 'fourDay') {
    const from = startOfDay(focus);
    return { from, to: addDays(from, 4) };
  }
  if (view === 'week') {
    const from = startOfWeek(focus);
    return { from, to: addDays(from, 7) };
  }
  if (view === 'twoWeek') {
    const from = startOfWeek(focus);
    return { from, to: addDays(from, 14) };
  }
  if (view === 'month') {
    return { from: monthStart(focus), to: monthEndExclusive(focus) };
  }
  const from = addDays(startOfDay(focus), -7);
  return { from, to: addDays(from, 45) };
}

function daysFor(view: CalendarView, focus: Date) {
  const { from, to } = rangeFor(view, focus);
  const days: Date[] = [];
  for (let cursor = from; cursor < to; cursor = addDays(cursor, 1)) {
    days.push(cursor);
  }
  return days;
}

function dayKey(value: Date | string) {
  const date = typeof value === 'string' ? new Date(value) : value;
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function toLocalInput(date: Date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function statusClass(status?: string) {
  const value = String(status || '').toLowerCase();
  if (['completed', 'succeeded'].includes(value)) return 'bg-accent-green/10 text-accent-green';
  if (['cancelled', 'cancelled_by_customer', 'cancelled_by_business', 'no_show'].includes(value)) {
    return 'bg-accent-red/10 text-accent-red';
  }
  return 'bg-accent-gold-2/10 text-accent-gold-2';
}

export function BusinessCalendarBoard() {
  const t = useTranslations('businessOps');
  const session = React.useMemo(() => getBusinessSession(), []);
  const [view, setView] = React.useState<CalendarView>('week');
  const [focus, setFocus] = React.useState(() => new Date());
  const [appointments, setAppointments] = React.useState<Row[]>([]);
  const [branches, setBranches] = React.useState<Row[]>([]);
  const [professionals, setProfessionals] = React.useState<Row[]>([]);
  const [services, setServices] = React.useState<Row[]>([]);
  const [customers, setCustomers] = React.useState<Row[]>([]);
  const [resources, setResources] = React.useState<Row[]>([]);
  const [branchId, setBranchId] = React.useState(session?.branchId ?? '');
  const [professionalId, setProfessionalId] = React.useState('');
  const [resourceId, setResourceId] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState('');
  const [error, setError] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [showQuickAdd, setShowQuickAdd] = React.useState(false);

  const range = React.useMemo(() => rangeFor(view, focus), [view, focus]);

  const loadLookups = React.useCallback(async () => {
    if (!session) return;
    const [branchRows, professionalRows, serviceRows, customerRows, resourceRows] =
      await Promise.all([
        businessFetch<Row[]>(`/business-ops/${session.companyId}/branches`),
        businessFetch<Row[]>(`/business-ops/${session.companyId}/professionals`),
        businessFetch<Row[]>(`/business-ops/${session.companyId}/services`),
        businessFetch<Row[]>(`/business-ops/${session.companyId}/customers?limit=250`),
        businessFetch<Row[]>(
          `/business-ops/${session.companyId}/resources${branchId ? `?branchId=${encodeURIComponent(branchId)}` : ''}`,
        ),
      ]);
    setBranches(Array.isArray(branchRows) ? branchRows : []);
    setProfessionals(Array.isArray(professionalRows) ? professionalRows : []);
    setServices(Array.isArray(serviceRows) ? serviceRows.filter((row) => row.is_active !== false) : []);
    setCustomers(Array.isArray(customerRows) ? customerRows : []);
    setResources(Array.isArray(resourceRows) ? resourceRows.filter((row) => row.is_active !== false) : []);
  }, [session, branchId]);

  const loadAppointments = React.useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        from: range.from.toISOString(),
        to: range.to.toISOString(),
        limit: '250',
      });
      if (branchId) params.set('branchId', branchId);
      const result = await businessFetch<Row[]>(
        `/business-ops/${session.companyId}/appointments?${params.toString()}`,
      );
      setAppointments(Array.isArray(result) ? result : []);
    } catch (error) {
      setError(error instanceof Error ? error.message : t('loadError'));
    } finally {
      setLoading(false);
    }
  }, [session, range.from.getTime(), range.to.getTime(), branchId, t]);

  React.useEffect(() => {
    void loadLookups().catch((error) => {
      setError(error instanceof Error ? error.message : t('loadError'));
    });
  }, [loadLookups, t]);

  React.useEffect(() => {
    void loadAppointments();
  }, [loadAppointments]);

  useBusinessRealtimeReload(
    ['booking:changed'],
    () => void loadAppointments(),
    branchId || session?.branchId,
  );

  const filtered = React.useMemo(
    () =>
      appointments.filter((appointment) => {
        if (
          professionalId &&
          !(appointment.participants || []).some(
            (item: Row) => String(item.professional_id || item.professional?.id) === professionalId,
          )
        ) {
          return false;
        }
        if (
          resourceId &&
          !(appointment.resources || []).some(
            (item: Row) => String(item.resource_id || item.resource?.id) === resourceId,
          )
        ) {
          return false;
        }
        return true;
      }),
    [appointments, professionalId, resourceId],
  );

  async function mutate(path: string, init: RequestInit, success: string) {
    setBusy(path);
    setError('');
    setMessage('');
    try {
      await businessFetch(path, init);
      setMessage(success);
      await loadAppointments();
    } catch (error) {
      setError(error instanceof Error ? error.message : t('operationError'));
    } finally {
      setBusy('');
    }
  }

  async function submitQuickAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || busy) return;
    const form = event.currentTarget;
    const fd = new FormData(form);
    const selectedBranch = String(fd.get('branchId') || branchId || session.branchId || '');
    const selectedCustomer = String(fd.get('customerId') || '');
    const selectedService = String(fd.get('serviceId') || '');
    const startsAtRaw = String(fd.get('startsAt') || '');
    if (!selectedBranch || !selectedCustomer || !selectedService || !startsAtRaw) {
      setError(t('messages.calendarQuickAddRequired'));
      return;
    }

    setBusy('quick-add');
    setError('');
    setMessage('');
    try {
      await businessFetch('/booking-v2/appointments', {
        method: 'POST',
        body: JSON.stringify({
          companyId: session.companyId,
          branchId: selectedBranch,
          customerId: selectedCustomer,
          serviceIds: [selectedService],
          professionalId: String(fd.get('professionalId') || '') || undefined,
          resourceIds: String(fd.get('resourceId') || '')
            ? [String(fd.get('resourceId'))]
            : [],
          startsAt: new Date(startsAtRaw).toISOString(),
          notesStaff: String(fd.get('notesStaff') || '').trim() || undefined,
          source: 'business_web_quick_add',
        }),
      });
      setMessage(t('messages.calendarBookingCreated'));
      form.reset();
      setShowQuickAdd(false);
      await loadAppointments();
    } catch (error) {
      setError(error instanceof Error ? error.message : t('operationError'));
    } finally {
      setBusy('');
    }
  }

  async function moveAppointment(appointmentId: string, targetDay: Date) {
    const appointment = appointments.find((item) => String(item.id) === appointmentId);
    if (!appointment || !ACTIVE_RESCHEDULE.has(String(appointment.status))) return;
    const oldStart = new Date(appointment.starts_at);
    const nextStart = new Date(targetDay);
    nextStart.setHours(
      oldStart.getHours(),
      oldStart.getMinutes(),
      oldStart.getSeconds(),
      oldStart.getMilliseconds(),
    );
    if (nextStart.getTime() === oldStart.getTime()) return;

    await mutate(
      `/booking-v2/appointments/${appointmentId}/reschedule`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          startsAt: nextStart.toISOString(),
          reason: 'calendar_drag_drop',
        }),
      },
      t('messages.calendarBookingMoved'),
    );
  }

  function navigate(direction: -1 | 1) {
    if (view === 'month') {
      setFocus(
        (current) =>
          new Date(current.getFullYear(), current.getMonth() + direction, 1),
      );
      return;
    }
    const amount =
      view === 'day' ? 1 : view === 'fourDay' ? 4 : view === 'week' ? 7 : view === 'twoWeek' ? 14 : 7;
    setFocus((current) => addDays(current, amount * direction));
  }

  function appointmentCard(appointment: Row) {
    const status = String(appointment.status || '');
    const canMove = ACTIVE_RESCHEDULE.has(status);
    const customer = appointment.customer?.user?.full_name || t('labels.customer');
    const serviceNames = (appointment.services || [])
      .map((item: Row) => item.service?.name)
      .filter(Boolean)
      .join(', ');
    const professionalNames = (appointment.participants || [])
      .map((item: Row) => item.professional?.display_name)
      .filter(Boolean)
      .join(', ');
    const starts = new Date(appointment.starts_at);
    const ends = new Date(appointment.ends_at);

    return (
      <article
        key={appointment.id}
        draggable={canMove}
        onDragStart={(event) => {
          if (!canMove) return;
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/lookiva-appointment', String(appointment.id));
        }}
        className="rounded-radius-lg border border-border-subtle bg-surface-1 p-3 shadow-shadow-1"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-primary">{customer}</p>
            <p className="mt-0.5 truncate text-xs text-secondary">
              {serviceNames || t('labels.service')}
            </p>
          </div>
          <span className={`shrink-0 rounded-radius-full px-2 py-1 text-[10px] font-bold ${statusClass(status)}`}>
            {status.replaceAll('_', ' ')}
          </span>
        </div>
        <p className="mt-2 text-xs font-semibold text-accent-gold-2">
          {starts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} →{' '}
          {ends.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
        <p className="mt-1 truncate text-[11px] text-muted">
          {professionalNames || t('labels.anyProfessional')}
          {appointment.resources?.length
            ? ` · ${appointment.resources.map((item: Row) => item.resource?.name).filter(Boolean).join(', ')}`
            : ''}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {['pending', 'confirmed'].includes(status) && (
            <>
              <button
                type="button"
                disabled={!!busy}
                onClick={() =>
                  void mutate(
                    `/booking-v2/appointments/${appointment.id}/check-in`,
                    { method: 'PATCH', body: '{}' },
                    t('messages.checkedIn'),
                  )
                }
                className="rounded-radius-md bg-accent-gold-2 px-2.5 py-1.5 text-[11px] font-bold text-surface-0"
              >
                {t('actions.checkIn')}
              </button>
              <button
                type="button"
                disabled={!!busy}
                onClick={() =>
                  void mutate(
                    `/booking-v2/appointments/${appointment.id}/no-show`,
                    { method: 'PATCH', body: JSON.stringify({ notes: 'Marked from calendar board' }) },
                    t('messages.markedNoShow'),
                  )
                }
                className="rounded-radius-md border border-border-subtle px-2.5 py-1.5 text-[11px] font-bold text-primary"
              >
                {t('actions.noShow')}
              </button>
            </>
          )}
          {status === 'checked_in' && (
            <button
              type="button"
              disabled={!!busy}
              onClick={() =>
                void mutate(
                  `/booking-v2/appointments/${appointment.id}/start`,
                  { method: 'PATCH', body: '{}' },
                  t('messages.serviceStarted'),
                )
              }
              className="rounded-radius-md bg-accent-gold-2 px-2.5 py-1.5 text-[11px] font-bold text-surface-0"
            >
              {t('actions.start')}
            </button>
          )}
          {status === 'in_progress' && (
            <button
              type="button"
              disabled={!!busy}
              onClick={() =>
                void mutate(
                  `/booking-v2/appointments/${appointment.id}/complete`,
                  { method: 'PATCH', body: '{}' },
                  t('messages.appointmentCompleted'),
                )
              }
              className="rounded-radius-md bg-accent-green px-2.5 py-1.5 text-[11px] font-bold text-surface-0"
            >
              {t('actions.complete')}
            </button>
          )}
        </div>
      </article>
    );
  }

  const visibleDays = daysFor(view, focus);
  const inputClass =
    'h-10 rounded-radius-md border border-border-subtle bg-surface-0 px-3 text-sm text-primary outline-none focus:border-accent-gold-2';

  return (
    <section className="space-y-4">
      <div className="rounded-radius-xl border border-border-subtle bg-surface-1 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {VIEW_ORDER.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setView(item)}
              className={`rounded-radius-md px-3 py-2 text-xs font-bold ${
                view === item
                  ? 'bg-accent-gold-2 text-surface-0'
                  : 'border border-border-subtle text-secondary hover:bg-surface-2'
              }`}
            >
              {t(`calendarViews.${item}`)}
            </button>
          ))}
          <span className="mx-1 h-6 w-px bg-border-subtle" />
          <button type="button" onClick={() => navigate(-1)} className="rounded-radius-md border border-border-subtle px-3 py-2 text-xs font-bold text-primary">
            ← {t('actions.previous')}
          </button>
          <button type="button" onClick={() => setFocus(new Date())} className="rounded-radius-md border border-border-subtle px-3 py-2 text-xs font-bold text-primary">
            {t('actions.today')}
          </button>
          <button type="button" onClick={() => navigate(1)} className="rounded-radius-md border border-border-subtle px-3 py-2 text-xs font-bold text-primary">
            {t('actions.next')} →
          </button>
          <input
            type="date"
            value={dayKey(focus)}
            onChange={(event) => {
              if (event.target.value) setFocus(new Date(event.target.value + 'T12:00:00'));
            }}
            aria-label={t('labels.calendarDate')}
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => setShowQuickAdd((value) => !value)}
            className="ms-auto rounded-radius-md bg-accent-gold-2 px-4 py-2 text-xs font-bold text-surface-0"
          >
            {showQuickAdd ? t('actions.close') : t('actions.quickAdd')}
          </button>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-3">
          <select value={branchId} onChange={(event) => setBranchId(event.target.value)} className={inputClass}>
            <option value="">{t('labels.allBranches')}</option>
            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
          <select value={professionalId} onChange={(event) => setProfessionalId(event.target.value)} className={inputClass}>
            <option value="">{t('labels.allProfessionals')}</option>
            {professionals.map((professional) => <option key={professional.id} value={professional.id}>{professional.display_name || professional.name}</option>)}
          </select>
          <select value={resourceId} onChange={(event) => setResourceId(event.target.value)} className={inputClass}>
            <option value="">{t('labels.allResources')}</option>
            {resources.map((resource) => <option key={resource.id} value={resource.id}>{resource.name}</option>)}
          </select>
        </div>

        <p className="mt-3 text-xs text-muted">{t('labels.calendarDragHint')}</p>
      </div>

      {showQuickAdd && (
        <form onSubmit={submitQuickAdd} className="grid gap-3 rounded-radius-xl border border-accent-gold-2/30 bg-accent-gold-2/5 p-4 md:grid-cols-3 xl:grid-cols-6">
          <select name="branchId" required defaultValue={branchId || session?.branchId || ''} className={inputClass}>
            <option value="">{t('labels.branch')}</option>
            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
          <select name="customerId" required className={inputClass}>
            <option value="">{t('labels.customer')}</option>
            {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.user?.full_name || customer.user?.phone || customer.id}</option>)}
          </select>
          <select name="serviceId" required className={inputClass}>
            <option value="">{t('labels.service')}</option>
            {services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
          </select>
          <select name="professionalId" className={inputClass}>
            <option value="">{t('labels.anyProfessional')}</option>
            {professionals.map((professional) => <option key={professional.id} value={professional.id}>{professional.display_name || professional.name}</option>)}
          </select>
          <select name="resourceId" className={inputClass}>
            <option value="">{t('labels.anyResource')}</option>
            {resources.map((resource) => <option key={resource.id} value={resource.id}>{resource.name}</option>)}
          </select>
          <input
            name="startsAt"
            type="datetime-local"
            required
            defaultValue={toLocalInput(new Date(Math.max(Date.now() + 15 * 60_000, focus.getTime())))}
            className={inputClass}
            aria-label={t('labels.startTime')}
          />
          <input name="notesStaff" placeholder={t('labels.staffNote')} className={`${inputClass} md:col-span-2 xl:col-span-5`} />
          <button disabled={!!busy} className="h-10 rounded-radius-md bg-accent-gold-2 px-4 text-sm font-bold text-surface-0 disabled:opacity-50">
            {busy === 'quick-add' ? t('saving') : t('actions.createBooking')}
          </button>
        </form>
      )}

      {message && <div className="rounded-radius-lg border border-accent-green/30 bg-accent-green/10 px-4 py-3 text-sm text-accent-green">{message}</div>}
      {error && <div className="rounded-radius-lg border border-accent-red/30 bg-accent-red/10 px-4 py-3 text-sm text-accent-red">{error}</div>}

      {loading ? (
        <div className="grid gap-3 md:grid-cols-3">
          {[1, 2, 3].map((item) => <div key={item} className="h-40 animate-pulse rounded-radius-xl bg-surface-2" />)}
        </div>
      ) : view === 'list' ? (
        <div className="space-y-3">
          {filtered.length ? filtered.map(appointmentCard) : <p className="rounded-radius-xl border border-border-subtle bg-surface-1 p-8 text-center text-sm text-muted">{t('noRecords')}</p>}
        </div>
      ) : (
        <div className={`grid gap-3 overflow-x-auto ${
          view === 'month'
            ? 'grid-cols-7'
            : view === 'twoWeek'
              ? 'min-w-[1400px] [grid-template-columns:repeat(14,minmax(0,1fr))]'
              : view === 'week'
                ? 'min-w-[900px] grid-cols-7'
                : view === 'fourDay'
                  ? 'min-w-[620px] grid-cols-4'
                  : 'grid-cols-1'
        }`}>
          {visibleDays.map((day) => {
            const key = dayKey(day);
            const rows = filtered.filter((appointment) => dayKey(appointment.starts_at) === key);
            return (
              <section
                key={key}
                onDragOver={(event) => {
                  if (event.dataTransfer.types.includes('text/lookiva-appointment')) {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                  }
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const id = event.dataTransfer.getData('text/lookiva-appointment');
                  if (id) void moveAppointment(id, day);
                }}
                className="min-h-48 rounded-radius-xl border border-border-subtle bg-surface-0 p-2"
              >
                <div className="mb-2 rounded-radius-md bg-surface-2 px-2 py-2 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                    {day.toLocaleDateString(undefined, { weekday: 'short' })}
                  </p>
                  <p className="text-sm font-bold text-primary">
                    {day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <div className="space-y-2">
                  {rows.map(appointmentCard)}
                  {!rows.length && <p className="px-2 py-6 text-center text-[11px] text-muted">{t('labels.emptyDay')}</p>}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}
