import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PermissionKey, ScopeType, UserRole } from '@lookiva/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/types/request-with-user';
import { calculateFinancialMetrics } from '../common/finance/financial-metrics';
import {
  TrackAnalyticsEventDto,
  UpsertDailySnapshotDto,
} from './dto/analytics-v2.dto';

const platformRoles = new Set<UserRole>([
  UserRole.SuperAdmin,
  UserRole.PlatformAdmin,
  UserRole.CountryManager,
]);

function parseOptionalDate(value: string | undefined, fallback: Date): Date {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new BadRequestException('Invalid date range');
  return date;
}
function dayKey(date: Date): string { return date.toISOString().slice(0, 10); }
function money(value: number): number { return Math.round((value + Number.EPSILON) * 100) / 100; }

type Access = { allBranches: boolean; branchIds: string[] };
type ProCurrency = {
  bookedRevenue: number; completedRevenue: number; collectedRevenue: number;
  cash: number; card: number; online: number; refunds: number;
};

@Injectable()
export class AnalyticsV2Service {
  constructor(private readonly prisma: PrismaService) {}

  private companyAccess(user: AuthenticatedUser, companyId: string): Access {
    if (user.roleScopes.some((scope) => platformRoles.has(scope.roleKey))) {
      return { allBranches: true, branchIds: [] };
    }
    if (user.roleScopes.some((scope) =>
      scope.scopeType === ScopeType.Company && (scope.companyId === companyId || scope.scopeId === companyId),
    )) return { allBranches: true, branchIds: [] };

    const branchIds = Array.from(new Set(user.roleScopes
      .filter((scope) => scope.scopeType === ScopeType.Branch && scope.companyId === companyId)
      .map((scope) => scope.branchId ?? scope.scopeId)
      .filter(Boolean) as string[]));
    if (branchIds.length) return { allBranches: false, branchIds };
    throw new ForbiddenException('This account is not authorized for the requested company');
  }

  private assertBranch(access: Access, branchId?: string) {
    if (!branchId || access.allBranches) return;
    if (!access.branchIds.includes(branchId)) throw new ForbiddenException('This account is not authorized for the requested branch');
  }

  track(user: AuthenticatedUser, dto: TrackAnalyticsEventDto) {
    if (dto.companyId) this.companyAccess(user, dto.companyId);
    return this.prisma.analytics_events.create({
      data: {
        event_name: dto.eventName,
        event_category: dto.eventCategory,
        user_id: user.id,
        company_id: dto.companyId ?? null,
        branch_id: dto.branchId ?? null,
        professional_id: dto.professionalId ?? null,
        service_id: dto.serviceId ?? null,
        appointment_id: dto.appointmentId ?? null,
        screen_name: dto.screenName ?? null,
        properties: {} as Prisma.InputJsonValue,
      },
    });
  }

  async dashboard(
    user: AuthenticatedUser,
    companyId: string,
    from?: string,
    to?: string,
    branchId?: string,
    professionalId?: string,
  ) {
    const access = this.companyAccess(user, companyId);
    this.assertBranch(access, branchId);
    const toDate = parseOptionalDate(to, new Date());
    const fromDate = parseOptionalDate(from, new Date(toDate.getTime() - 30 * 86_400_000));
    if (fromDate > toDate) throw new BadRequestException('from must be before to');

    if (professionalId) {
      const professional = await this.prisma.professionals.findFirst({
        where: {
          id: professionalId,
          company_id: companyId,
          ...(branchId ? { branches: { some: { branch_id: branchId } } } : access.allBranches ? {} : { branches: { some: { branch_id: { in: access.branchIds } } } }),
        },
        select: { id: true },
      });
      if (!professional) throw new NotFoundException('Professional not found in the authorized scope');
    }

    const appointmentWhere: Prisma.appointmentsWhereInput = {
      company_id: companyId,
      starts_at: { gte: fromDate, lte: toDate },
      ...(branchId ? { branch_id: branchId } : access.allBranches ? {} : { branch_id: { in: access.branchIds } }),
      ...(professionalId ? { OR: [
        { participants: { some: { professional_id: professionalId } } },
        { services: { some: { professional_id: professionalId } } },
      ] } : {}),
    };
    const paymentAppointmentWhere: Prisma.appointmentsWhereInput = {
      ...(branchId ? { branch_id: branchId } : access.allBranches ? {} : { branch_id: { in: access.branchIds } }),
      ...(professionalId ? { OR: [
        { participants: { some: { professional_id: professionalId } } },
        { services: { some: { professional_id: professionalId } } },
      ] } : {}),
    };

    const [company, appointments, payments, resources, professionals] = await Promise.all([
      this.prisma.companies.findUnique({ where: { id: companyId }, select: { id: true, display_name: true, country: { select: { currency_code: true } } } }),
      this.prisma.appointments.findMany({
        where: appointmentWhere,
        include: {
          financial_snapshot: true,
          services: true,
          resources: true,
          participants: { include: { professional: { select: { id: true, display_name: true, avatar_media_id: true } } } },
        },
      }),
      this.prisma.payments.findMany({
        where: {
          company_id: companyId,
          created_at: { gte: fromDate, lte: toDate },
          ...(Object.keys(paymentAppointmentWhere).length ? { appointment: paymentAppointmentWhere } : {}),
        },
        include: {
          refunds: true,
          appointment: { include: { services: true, participants: { include: { professional: { select: { id: true, display_name: true, avatar_media_id: true } } } } } },
        },
      }),
      this.prisma.resources.findMany({
        where: { company_id: companyId, is_active: true, deleted_at: null, ...(branchId ? { branch_id: branchId } : access.allBranches ? {} : { OR: [{ branch_id: { in: access.branchIds } }, { branch_id: null }] }) },
        select: { id: true, name: true, type: true },
      }),
      this.prisma.professionals.findMany({
        where: { company_id: companyId, is_active: true, deleted_at: null, ...(professionalId ? { id: professionalId } : branchId ? { branches: { some: { branch_id: branchId } } } : access.allBranches ? {} : { branches: { some: { branch_id: { in: access.branchIds } } } }) },
        select: { id: true, display_name: true, avatar_media_id: true, avg_rating: true },
        orderBy: { display_name: 'asc' },
      }),
    ]);
    if (!company) throw new NotFoundException('Company not found');

    const canViewFinancial = user.permissions.includes(PermissionKey.DashboardViewFinancial);
    const bookingInputs = appointments.filter((a) => a.financial_snapshot).map((a) => ({
      status: a.status,
      total: Number(a.financial_snapshot!.grand_total),
      currency: a.financial_snapshot!.currency_code,
    }));
    const paymentInputs = payments.map((p) => ({ status: p.status, amount: Number(p.amount), currency: p.currency_code, method: p.payment_method }));
    const financeByCurrency = calculateFinancialMetrics(bookingInputs, paymentInputs);
    const refundsByCurrency = payments.reduce<Record<string, number>>((acc, payment) => {
      const refunded = payment.refunds.filter((r) => r.status === 'succeeded').reduce((sum, r) => sum + Number(r.amount), 0);
      acc[payment.currency_code] = (acc[payment.currency_code] ?? 0) + refunded;
      return acc;
    }, {});

    const revenueTrend = new Map<string, Record<string, number>>();
    const bookingsTrend = new Map<string, number>();
    const paymentMethods = new Map<string, Record<string, number>>();
    const statusMix = new Map<string, number>();
    const serviceCounts = new Map<string, number>();
    const resourceMinutes = new Map<string, number>();
    const professionalStats = new Map<string, {
      id: string; name: string; avatarMediaId: string | null; rating: number | null;
      appointmentIds: Set<string>; completedIds: Set<string>; status: Record<string, number>;
      byCurrency: Record<string, ProCurrency>;
    }>();
    for (const p of professionals) professionalStats.set(p.id, {
      id: p.id, name: p.display_name, avatarMediaId: p.avatar_media_id, rating: p.avg_rating,
      appointmentIds: new Set(), completedIds: new Set(), status: {}, byCurrency: {},
    });
    const proCurrency = (professionalIdKey: string, currency: string) => {
      const row = professionalStats.get(professionalIdKey);
      if (!row) return null;
      row.byCurrency[currency] ??= { bookedRevenue: 0, completedRevenue: 0, collectedRevenue: 0, cash: 0, card: 0, online: 0, refunds: 0 };
      return row.byCurrency[currency];
    };

    for (const appointment of appointments) {
      const date = dayKey(appointment.starts_at);
      bookingsTrend.set(date, (bookingsTrend.get(date) ?? 0) + 1);
      statusMix.set(appointment.status, (statusMix.get(appointment.status) ?? 0) + 1);
      const participantIds = Array.from(new Set(appointment.participants.map((p) => p.professional_id)));
      participantIds.forEach((id) => {
        const row = professionalStats.get(id); if (!row) return;
        row.appointmentIds.add(appointment.id);
        row.status[appointment.status] = (row.status[appointment.status] ?? 0) + 1;
        if (appointment.status === 'completed') row.completedIds.add(appointment.id);
      });
      for (const service of appointment.services) {
        serviceCounts.set(service.service_id, (serviceCounts.get(service.service_id) ?? 0) + service.quantity);
        const assigned = service.professional_id ?? (participantIds.length === 1 ? participantIds[0] : null);
        if (assigned) {
          const currency = appointment.financial_snapshot?.currency_code ?? company.country?.currency_code ?? 'USD';
          const row = proCurrency(assigned, currency);
          if (row) {
            const value = Number(service.final_price);
            if (['pending','confirmed','checked_in','in_progress','completed'].includes(appointment.status)) row.bookedRevenue += value;
            if (appointment.status === 'completed') row.completedRevenue += value;
          }
        }
      }
      for (const resource of appointment.resources) {
        const start = resource.starts_at ?? appointment.starts_at;
        const end = resource.ends_at ?? appointment.ends_at;
        const minutes = Math.max(0, (end.getTime() - start.getTime()) / 60_000);
        resourceMinutes.set(resource.resource_id, (resourceMinutes.get(resource.resource_id) ?? 0) + minutes);
      }
    }

    for (const payment of payments) {
      if (!['succeeded', 'partially_refunded', 'refunded'].includes(payment.status)) continue;
      const date = dayKey(payment.created_at);
      const byCurrency = revenueTrend.get(date) ?? {};
      byCurrency[payment.currency_code] = (byCurrency[payment.currency_code] ?? 0) + Number(payment.amount);
      revenueTrend.set(date, byCurrency);
      const methodByCurrency = paymentMethods.get(payment.payment_method) ?? {};
      methodByCurrency[payment.currency_code] = (methodByCurrency[payment.currency_code] ?? 0) + Number(payment.amount);
      paymentMethods.set(payment.payment_method, methodByCurrency);

      const appt = payment.appointment;
      if (!appt) continue;
      const participantIds = Array.from(new Set(appt.participants.map((p) => p.professional_id))).filter((id) => professionalStats.has(id));
      const serviceValues = appt.services.map((s) => ({
        professionalId: s.professional_id ?? (participantIds.length === 1 ? participantIds[0] : null),
        value: Math.max(0, Number(s.final_price)),
      })).filter((s) => s.professionalId && professionalStats.has(s.professionalId!));
      const serviceTotal = serviceValues.reduce((sum, s) => sum + s.value, 0);
      let shares: { professionalId: string; share: number }[] = [];
      if (serviceTotal > 0) {
        const grouped = new Map<string, number>();
        serviceValues.forEach((s) => grouped.set(s.professionalId!, (grouped.get(s.professionalId!) ?? 0) + s.value));
        shares = Array.from(grouped.entries()).map(([id, value]) => ({ professionalId: id, share: value / serviceTotal }));
      } else if (participantIds.length) {
        shares = participantIds.map((id) => ({ professionalId: id, share: 1 / participantIds.length }));
      }
      const refunded = payment.refunds.filter((r) => r.status === 'succeeded').reduce((sum, r) => sum + Number(r.amount), 0);
      for (const item of shares) {
        const row = proCurrency(item.professionalId, payment.currency_code); if (!row) continue;
        const allocated = Number(payment.amount) * item.share;
        row.collectedRevenue += allocated;
        const method = payment.payment_method.toLowerCase();
        if (method === 'cash') row.cash += allocated;
        else if (method === 'card') row.card += allocated;
        else row.online += allocated;
        row.refunds += refunded * item.share;
      }
    }

    const professionalBreakdown = Array.from(professionalStats.values()).map((p) => ({
      professionalId: p.id,
      name: p.name,
      avatarMediaId: p.avatarMediaId,
      rating: p.rating,
      bookings: p.appointmentIds.size,
      completed: p.completedIds.size,
      status: p.status,
      financeByCurrency: Object.entries(p.byCurrency).map(([currency, value]) => ({
        currency,
        bookedRevenue: money(value.bookedRevenue),
        completedRevenue: money(value.completedRevenue),
        collectedRevenue: money(value.collectedRevenue),
        outstanding: money(Math.max(0, value.bookedRevenue - value.collectedRevenue)),
        cash: money(value.cash), card: money(value.card), online: money(value.online), refunds: money(value.refunds),
        netCollected: money(value.collectedRevenue - value.refunds),
        averageTicket: money(p.appointmentIds.size ? value.bookedRevenue / p.appointmentIds.size : 0),
      })),
    }));

    return {
      company: { id: company.id, name: company.display_name },
      range: { from: fromDate, to: toDate },
      filters: { branchId: branchId ?? null, professionalId: professionalId ?? null },
      kpis: {
        bookings: appointments.length,
        status: Object.fromEntries(statusMix),
        activeResources: resources.length,
      },
      finance: canViewFinancial ? financeByCurrency.map((row) => ({
        ...row,
        refunds: money(refundsByCurrency[row.currency] ?? 0),
        netCollected: money(row.collectedRevenue - (refundsByCurrency[row.currency] ?? 0)),
      })) : null,
      financialAccess: canViewFinancial,
      professionalBreakdown: canViewFinancial ? professionalBreakdown : professionalBreakdown.map(({ financeByCurrency, ...row }) => row),
      revenueTrend: canViewFinancial ? Array.from(revenueTrend.entries()).map(([date, byCurrency]) => ({
        date,
        byCurrency: Object.fromEntries(Object.entries(byCurrency).map(([currency, value]) => [currency, money(value)])),
      })) : [],
      bookingsTrend: Array.from(bookingsTrend.entries()).map(([date, count]) => ({ date, count })),
      statusMix: Array.from(statusMix.entries()).map(([status, count]) => ({ status, count })),
      paymentMethods: canViewFinancial ? Array.from(paymentMethods.entries()).map(([method, byCurrency]) => ({
        method,
        byCurrency: Object.fromEntries(Object.entries(byCurrency).map(([currency, value]) => [currency, money(value)])),
      })) : [],
      topServices: Array.from(serviceCounts.entries()).map(([serviceId, count]) => ({
        serviceId, count, drilldown: `/api/v1/analytics-v2/companies/${companyId}/drilldown/service:${serviceId}`,
      })),
      chairUtilization: resources.map((resource) => ({
        resourceId: resource.id, name: resource.name, type: resource.type,
        bookedMinutes: money(resourceMinutes.get(resource.id) ?? 0),
        drilldown: `/api/v1/analytics-v2/companies/${companyId}/drilldown/resource:${resource.id}`,
      })),
    };
  }

  async drilldown(user: AuthenticatedUser, companyId: string, metric: string, branchId?: string) {
    const access = this.companyAccess(user, companyId);
    this.assertBranch(access, branchId);
    const appointmentScope = branchId ? { branch_id: branchId } : access.allBranches ? {} : { branch_id: { in: access.branchIds } };
    if (metric === 'cash') {
      return this.prisma.payments.findMany({
        where: { company_id: companyId, payment_method: 'cash', ...(Object.keys(appointmentScope).length ? { appointment: appointmentScope } : {}) },
        orderBy: { created_at: 'desc' }, take: 100,
      });
    }
    if (metric === 'confirmed') {
      return this.prisma.appointments.findMany({ where: { company_id: companyId, status: 'confirmed', ...appointmentScope }, orderBy: { starts_at: 'desc' }, take: 100 });
    }
    if (metric.startsWith('service:')) {
      const serviceId = metric.slice('service:'.length);
      return this.prisma.appointment_services.findMany({
        where: { service_id: serviceId, appointment: { company_id: companyId, ...appointmentScope } },
        include: { appointment: true }, orderBy: { created_at: 'desc' }, take: 100,
      });
    }
    if (metric.startsWith('resource:')) {
      const resourceId = metric.slice('resource:'.length);
      return this.prisma.appointment_resources.findMany({
        where: { resource_id: resourceId, appointment: { company_id: companyId, ...appointmentScope } },
        include: { appointment: true }, orderBy: { created_at: 'desc' }, take: 100,
      });
    }
    return this.prisma.daily_analytics_snapshots.findMany({
      where: { company_id: companyId, metric_key: metric, ...(branchId ? { branch_id: branchId } : access.allBranches ? {} : { branch_id: { in: access.branchIds } }) },
      orderBy: { snapshot_date: 'desc' }, take: 100,
    });
  }

  upsertSnapshot(user: AuthenticatedUser, dto: UpsertDailySnapshotDto) {
    this.companyAccess(user, dto.companyId);
    const snapshotDate = new Date(dto.snapshotDate);
    if (Number.isNaN(snapshotDate.getTime())) throw new BadRequestException('snapshotDate must be a valid ISO date');
    return this.prisma.daily_analytics_snapshots.upsert({
      where: { snapshot_date_company_id_branch_id_professional_id_metric_key: {
        snapshot_date: snapshotDate, company_id: dto.companyId, branch_id: dto.branchId ?? null,
        professional_id: dto.professionalId ?? null, metric_key: dto.metricKey,
      } },
      create: {
        snapshot_date: snapshotDate, company_id: dto.companyId, branch_id: dto.branchId ?? null,
        professional_id: dto.professionalId ?? null, metric_key: dto.metricKey, metric_value: dto.metricValue,
        category: dto.category, currency_code: dto.currencyCode ?? null,
      },
      update: { metric_value: dto.metricValue, category: dto.category, currency_code: dto.currencyCode ?? null },
    });
  }
}
