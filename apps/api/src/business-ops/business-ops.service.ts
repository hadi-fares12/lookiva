import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PermissionKey, ScopeType, UserRole } from '@lookiva/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/types/request-with-user';
import { calculateFinancialMetrics } from '../common/finance/financial-metrics';
import { CreateBranchDto, CreateBusinessUserDto, CreateQueueDto, UpdateBranchDto, UpdateBusinessUserDto, UpdateQueueDto } from './dto/business-management.dto';
import { NotificationsService } from '../notifications/notifications.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const platformRoles = new Set<UserRole>([
  UserRole.SuperAdmin,
  UserRole.PlatformAdmin,
  UserRole.CountryManager,
]);

function parseDate(value: string | undefined, fallback: Date): Date {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function slugify(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120) || `service-${Date.now()}`;
}

@Injectable()
export class BusinessOpsService {
  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService) {}

  private companyAccess(user: AuthenticatedUser, companyId: string) {
    if (user.roleScopes.some((scope) => platformRoles.has(scope.roleKey))) {
      return { allBranches: true, branchIds: [] as string[] };
    }
    const hasCompanyScope = user.roleScopes.some(
      (scope) => scope.scopeType === ScopeType.Company && (scope.companyId === companyId || scope.scopeId === companyId),
    );
    if (hasCompanyScope) return { allBranches: true, branchIds: [] as string[] };

    const branchIds = Array.from(new Set(user.roleScopes
      .filter((scope) => scope.scopeType === ScopeType.Branch && scope.companyId === companyId)
      .map((scope) => scope.branchId ?? scope.scopeId)
      .filter(Boolean) as string[]));
    if (branchIds.length > 0) return { allBranches: false, branchIds };

    throw new ForbiddenException('This account is not authorized for the requested company');
  }

  private assertRequestedBranch(access: { allBranches: boolean; branchIds: string[] }, branchId?: string) {
    if (!branchId || access.allBranches) return;
    if (!access.branchIds.includes(branchId)) {
      throw new ForbiddenException('This account is not authorized for the requested branch');
    }
  }

  async overview(user: AuthenticatedUser, companyId: string) {
    const access = this.companyAccess(user, companyId);
    const appointmentScope = access.allBranches ? {} : { branch_id: { in: access.branchIds } };
    const appointmentRelationScope = access.allBranches ? {} : { appointment: { branch_id: { in: access.branchIds } } };
    const queueScope = access.allBranches ? {} : { branch_id: { in: access.branchIds } };
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    const [company, appointments, payments, professionals, resources, queueEntries] = await Promise.all([
      this.prisma.companies.findUnique({ where: { id: companyId }, select: { id: true, display_name: true, is_verified: true, avg_rating: true, country: { select: { currency_code: true } } } }),
      this.prisma.appointments.findMany({
        where: { company_id: companyId, ...appointmentScope, starts_at: { gte: start, lte: end } },
        include: { financial_snapshot: true },
      }),
      this.prisma.payments.findMany({ where: { company_id: companyId, ...appointmentRelationScope, created_at: { gte: start, lte: end } } }),
      this.prisma.professionals.count({ where: { company_id: companyId, is_active: true, deleted_at: null, ...(access.allBranches ? {} : { branches: { some: { branch_id: { in: access.branchIds } } } }) } }),
      this.prisma.resources.count({ where: { company_id: companyId, is_active: true, deleted_at: null, ...(access.allBranches ? {} : { OR: [{ branch_id: { in: access.branchIds } }, { branch_id: null }] }) } }),
      this.prisma.queue_entries.count({ where: { queue: { branch: { company_id: companyId }, ...queueScope }, status: 'waiting' } }),
    ]);

    const financeByCurrency = calculateFinancialMetrics(
      appointments.map((appointment) => ({
        status: appointment.status,
        total: Number(appointment.financial_snapshot?.grand_total ?? 0),
        currency: appointment.financial_snapshot?.currency_code ?? company?.country?.currency_code ?? 'USD',
      })),
      payments.map((payment) => ({
        status: payment.status,
        amount: Number(payment.amount),
        currency: payment.currency_code,
        method: payment.payment_method,
      })),
    );
    const primaryCurrency = company?.country?.currency_code ?? financeByCurrency[0]?.currency ?? 'USD';
    const primaryFinance = financeByCurrency.find((item) => item.currency === primaryCurrency) ?? {
      currency: primaryCurrency, bookedRevenue: 0, completedRevenue: 0, collectedRevenue: 0, outstanding: 0, cash: 0, card: 0, online: 0,
    };

    const counts = appointments.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = (acc[item.status] ?? 0) + 1;
      return acc;
    }, {});

    const canViewFinancial = user.permissions.includes(PermissionKey.DashboardViewFinancial);
    return {
      company,
      date: start.toISOString().slice(0, 10),
      appointments: { total: appointments.length, ...counts },
      finance: canViewFinancial
        ? {
            primaryCurrency,
            ...primaryFinance,
            byCurrency: financeByCurrency,
          }
        : null,
      financialAccess: canViewFinancial,
      operations: { activeProfessionals: professionals, activeResources: resources, waitingQueue: queueEntries },
    };
  }

  appointments(user: AuthenticatedUser, companyId: string, filters: { from?: string; to?: string; status?: string; branchId?: string; limit: number }) {
    const access = this.companyAccess(user, companyId);
    this.assertRequestedBranch(access, filters.branchId);
    const now = new Date();
    const from = parseDate(filters.from, new Date(now.getTime() - 7 * 86_400_000));
    const to = parseDate(filters.to, new Date(now.getTime() + 30 * 86_400_000));
    return this.prisma.appointments.findMany({
      where: {
        company_id: companyId,
        starts_at: { gte: from, lte: to },
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.branchId ? { branch_id: filters.branchId } : access.allBranches ? {} : { branch_id: { in: access.branchIds } }),
      },
      include: {
        branch: { select: { id: true, name: true } },
        customer: { include: { user: { select: { id: true, full_name: true, phone: true, email: true } } } },
        participants: { include: { professional: { select: { id: true, display_name: true, avatar_media_id: true } } } },
        services: { include: { service: { select: { id: true, name: true, currency_code: true } } } },
        resources: { include: { resource: { select: { id: true, name: true, type: true, icon_key: true } } } },
        financial_snapshot: true,
      },
      orderBy: { starts_at: 'asc' },
      take: Math.min(filters.limit, 250),
    });
  }

  branches(user: AuthenticatedUser, companyId: string) {
    const access = this.companyAccess(user, companyId);
    return this.prisma.branches.findMany({ where: { company_id: companyId, deleted_at: null, ...(access.allBranches ? {} : { id: { in: access.branchIds } }) }, orderBy: [{ is_main: 'desc' }, { sort_order: 'asc' }, { name: 'asc' }] });
  }

  async createBranch(user: AuthenticatedUser, companyId: string, dto: CreateBranchDto) {
    const access = this.companyAccess(user, companyId);
    if (!access.allBranches) throw new ForbiddenException('Creating branches requires company-level access');

    const company = await this.prisma.companies.findUnique({
      where: { id: companyId },
      select: { id: true, country_id: true },
    });
    if (!company) throw new NotFoundException('Company not found');

    const baseSlug = slugify(dto.name);
    let slug = baseSlug;
    let suffix = 1;
    while (await this.prisma.branches.findFirst({ where: { company_id: companyId, slug } })) {
      slug = `${baseSlug}-${++suffix}`;
    }

    const branch = await this.prisma.$transaction(async (tx) => {
      const created = await tx.branches.create({
        data: {
          company_id: companyId,
          country_id: company.country_id,
          name: dto.name.trim(),
          slug,
          address_line_1: dto.addressLine1?.trim() || null,
          phone: dto.phone?.trim() || null,
          whatsapp: dto.whatsapp?.trim() || null,
          instagram_handle: dto.instagramHandle?.trim() || null,
          latitude: dto.latitude ?? null,
          longitude: dto.longitude ?? null,
          booking_enabled: dto.bookingEnabled ?? true,
          walk_ins_enabled: dto.walkInsEnabled ?? true,
          home_service_enabled: dto.homeServiceEnabled ?? false,
          is_active: true,
        },
      });

      if (dto.latitude != null && dto.longitude != null) {
        await tx.$executeRawUnsafe(
          `INSERT INTO branch_locations (id, branch_id, address, point, created_at, updated_at)
           VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326), NOW(), NOW())
           ON CONFLICT (branch_id) DO UPDATE
           SET address = EXCLUDED.address, point = EXCLUDED.point, updated_at = NOW()`,
          crypto.randomUUID(),
          created.id,
          dto.addressLine1?.trim() || null,
          dto.longitude,
          dto.latitude,
        );
      }

      return created;
    });

    await this.auditMutation(user, companyId, 'branch.create', 'branch', branch.id, undefined, branch, branch.id);
    return branch;
  }

  async updateBranch(user: AuthenticatedUser, companyId: string, branchId: string, dto: UpdateBranchDto) {
    const access = this.companyAccess(user, companyId);
    this.assertRequestedBranch(access, branchId);
    const existing = await this.prisma.branches.findFirst({
      where: { id: branchId, company_id: companyId, deleted_at: null },
    });
    if (!existing) throw new NotFoundException('Branch not found');

    const latitude = dto.latitude !== undefined ? dto.latitude : existing.latitude;
    const longitude = dto.longitude !== undefined ? dto.longitude : existing.longitude;
    const address = dto.addressLine1 !== undefined ? dto.addressLine1.trim() || null : existing.address_line_1;

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.branches.update({
        where: { id: branchId },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.addressLine1 !== undefined ? { address_line_1: address } : {}),
          ...(dto.phone !== undefined ? { phone: dto.phone.trim() || null } : {}),
          ...(dto.whatsapp !== undefined ? { whatsapp: dto.whatsapp.trim() || null } : {}),
          ...(dto.instagramHandle !== undefined ? { instagram_handle: dto.instagramHandle.trim() || null } : {}),
          ...(dto.latitude !== undefined ? { latitude: dto.latitude } : {}),
          ...(dto.longitude !== undefined ? { longitude: dto.longitude } : {}),
          ...(dto.bookingEnabled !== undefined ? { booking_enabled: dto.bookingEnabled } : {}),
          ...(dto.walkInsEnabled !== undefined ? { walk_ins_enabled: dto.walkInsEnabled } : {}),
          ...(dto.homeServiceEnabled !== undefined ? { home_service_enabled: dto.homeServiceEnabled } : {}),
          ...(dto.isActive !== undefined ? { is_active: dto.isActive } : {}),
        },
      });

      if (latitude != null && longitude != null) {
        await tx.$executeRawUnsafe(
          `INSERT INTO branch_locations (id, branch_id, address, point, created_at, updated_at)
           VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326), NOW(), NOW())
           ON CONFLICT (branch_id) DO UPDATE
           SET address = EXCLUDED.address, point = EXCLUDED.point, updated_at = NOW()`,
          crypto.randomUUID(),
          branchId,
          address,
          longitude,
          latitude,
        );
      } else {
        await tx.branch_locations.upsert({
          where: { branch_id: branchId },
          create: { branch_id: branchId, address },
          update: { address },
        });
      }
      return row;
    });

    await this.auditMutation(user, companyId, 'branch.update', 'branch', branchId, existing, updated, branchId);
    return updated;
  }

  async deleteBranch(user: AuthenticatedUser, companyId: string, branchId: string) {
    const access = this.companyAccess(user, companyId);
    if (!access.allBranches) throw new ForbiddenException('Deleting branches requires company-level access');
    const existing = await this.prisma.branches.findFirst({
      where: { id: branchId, company_id: companyId, deleted_at: null },
    });
    if (!existing) throw new NotFoundException('Branch not found');
    if (existing.is_main) throw new BadRequestException('The main branch cannot be deleted');

    const activeAppointments = await this.prisma.appointments.count({
      where: {
        branch_id: branchId,
        status: { in: ['pending', 'confirmed', 'checked_in', 'in_progress'] },
        ends_at: { gt: new Date() },
      },
    });
    if (activeAppointments > 0) {
      throw new BadRequestException('Branch has active or future appointments and cannot be deleted');
    }

    const updated = await this.prisma.branches.update({
      where: { id: branchId },
      data: { is_active: false, booking_enabled: false, deleted_at: new Date() },
    });
    await this.auditMutation(user, companyId, 'branch.delete', 'branch', branchId, existing, updated, branchId);
    return { id: branchId, deleted: true };
  }

  customers(user: AuthenticatedUser, companyId: string, limit: number) {
    const access = this.companyAccess(user, companyId);
    return this.prisma.customers.findMany({
      where: { appointments: { some: { company_id: companyId, ...(access.allBranches ? {} : { branch_id: { in: access.branchIds } }) } } },
      include: { user: { select: { id: true, full_name: true, phone: true, email: true, created_at: true } } },
      orderBy: { last_booking_at: 'desc' },
      take: Math.min(limit, 250),
    });
  }

  professionals(user: AuthenticatedUser, companyId: string) {
    const access = this.companyAccess(user, companyId);
    return this.prisma.professionals.findMany({
      where: { company_id: companyId, deleted_at: null, ...(access.allBranches ? {} : { branches: { some: { branch_id: { in: access.branchIds } } } }) },
      include: {
        user: { select: { id: true, full_name: true, avatar_media_id: true, is_active: true } },
        resources_links: { include: { resource: { select: { id: true, name: true, type: true, branch_id: true, is_active: true } } }, orderBy: [{ is_default: 'desc' }, { priority: 'asc' }] },
        services_links: { include: { service: { select: { id: true, name: true, base_price: true, currency_code: true } } } },
        branches: { include: { branch: { select: { id: true, name: true } } } },
        schedules: { orderBy: [{ day_of_week: 'asc' }, { starts_at: 'asc' }] },
      },
      orderBy: [{ is_active: 'desc' }, { sort_order: 'asc' }, { display_name: 'asc' }],
    });
  }

  services(user: AuthenticatedUser, companyId: string) {
    const access = this.companyAccess(user, companyId);
    return this.prisma.services.findMany({
      where: { company_id: companyId, deleted_at: null, ...(access.allBranches ? {} : { OR: [{ branch_ids: { hasSome: access.branchIds } }, { branch_settings: { some: { branch_id: { in: access.branchIds } } } }] }) },
      include: { category: { select: { id: true, name: true } }, resource_requirements: true, professionals_links: true },
      orderBy: [{ is_active: 'desc' }, { sort_order: 'asc' }, { name: 'asc' }],
    });
  }

  categories(user: AuthenticatedUser, companyId: string) {
    this.companyAccess(user, companyId);
    return this.prisma.service_categories.findMany({
      where: { is_active: true },
      select: { id: true, name: true, parent_id: true, icon_key: true, home_service_allowed: true },
      orderBy: [{ depth_level: 'asc' }, { sort_order: 'asc' }, { name: 'asc' }],
    });
  }

  async resources(user: AuthenticatedUser, companyId: string, branchId?: string) {
    const access = this.companyAccess(user, companyId);
    this.assertRequestedBranch(access, branchId);
    const now = new Date();
    const end = new Date(now.getTime() + 12 * 60 * 60 * 1000);
    const items = await this.prisma.resources.findMany({
      where: { company_id: companyId, deleted_at: null, ...(branchId ? { branch_id: branchId } : access.allBranches ? {} : { OR: [{ branch_id: { in: access.branchIds } }, { branch_id: null }] }) },
      include: { maintenance: { where: { status: { in: ['scheduled', 'in_progress'] } }, orderBy: { scheduled_at: 'asc' }, take: 1 }, professionals_links: { include: { professional: { select: { id: true, display_name: true, avatar_media_id: true } } } } },
      orderBy: [{ is_active: 'desc' }, { sort_order: 'asc' }, { name: 'asc' }],
    });
    const bookings = await this.prisma.appointment_resources.findMany({
      where: { resource: { company_id: companyId, ...(access.allBranches ? {} : { OR: [{ branch_id: { in: access.branchIds } }, { branch_id: null }] }) }, appointment: { ...(access.allBranches ? {} : { branch_id: { in: access.branchIds } }), status: { in: ['confirmed', 'checked_in', 'in_progress'] }, starts_at: { lte: end }, ends_at: { gte: now } } },
      include: { appointment: { select: { id: true, status: true, starts_at: true, ends_at: true, customer: { include: { user: { select: { full_name: true } } } }, participants: { include: { professional: { select: { id: true, display_name: true, avatar_media_id: true } } } } } } },
    });
    return items.map((resource) => {
      const resourceBookings = bookings
        .filter((booking) => booking.resource_id === resource.id)
        .sort((a, b) => a.appointment.starts_at.getTime() - b.appointment.starts_at.getTime());
      const currentBooking = resourceBookings.find((booking) => booking.appointment.starts_at <= now && booking.appointment.ends_at > now) ?? null;
      const nextBooking = resourceBookings.find((booking) => booking.appointment.starts_at > now) ?? null;
      const availabilityStatus = !resource.is_active
        ? 'inactive'
        : resource.maintenance.length
          ? 'maintenance'
          : currentBooking
            ? 'busy'
            : 'available';
      return { ...resource, activeBookings: resourceBookings, currentBooking, nextBooking, availabilityStatus };
    });
  }

  async updateProfessionalProfile(
    user: AuthenticatedUser,
    companyId: string,
    professionalId: string,
    dto: { avatarMediaId?: string | null; defaultResourceId?: string | null },
  ) {
    const access = this.companyAccess(user, companyId);
    const professional = await this.prisma.professionals.findFirst({
      where: {
        id: professionalId,
        company_id: companyId,
        deleted_at: null,
        ...(access.allBranches ? {} : { branches: { some: { branch_id: { in: access.branchIds } } } }),
      },
    });
    if (!professional) throw new NotFoundException('Professional not found');

    if (dto.avatarMediaId) {
      const media = await this.prisma.media.findFirst({
        where: { id: dto.avatarMediaId, company_id: companyId },
        select: { id: true },
      });
      if (!media) throw new BadRequestException('Professional photo is invalid for this business');
    }

    let resource: any = null;
    if (dto.defaultResourceId) {
      resource = await this.prisma.resources.findFirst({
        where: {
          id: dto.defaultResourceId,
          company_id: companyId,
          deleted_at: null,
          is_active: true,
          ...(access.allBranches ? {} : { OR: [{ branch_id: { in: access.branchIds } }, { branch_id: null }] }),
        },
      });
      if (!resource) throw new BadRequestException('Assigned chair/resource is invalid');
      if (resource.branch_id && !professional.branch_ids.includes(resource.branch_id)) {
        throw new BadRequestException('Assigned chair/resource must belong to the professional branch');
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.professionals.update({
        where: { id: professionalId },
        data: {
          ...(dto.avatarMediaId !== undefined ? { avatar_media_id: dto.avatarMediaId || null } : {}),
        },
      });
      if (dto.avatarMediaId !== undefined) {
        await tx.users.update({
          where: { id: professional.user_id },
          data: { avatar_media_id: dto.avatarMediaId || null },
        });
      }
      if (dto.defaultResourceId !== undefined) {
        await tx.professional_resources.deleteMany({ where: { professional_id: professionalId } });
        if (dto.defaultResourceId) {
          await tx.professional_resources.create({
            data: {
              professional_id: professionalId,
              resource_id: dto.defaultResourceId,
              is_default: true,
              priority: 0,
            },
          });
        }
      }
      return row;
    });

    await this.auditMutation(user, companyId, 'professional.profile.update', 'professional', professionalId, professional, updated);
    return this.professionals(user, companyId).then((rows) => rows.find((row) => row.id === professionalId) ?? updated);
  }

  async professionalDay(
    user: AuthenticatedUser,
    companyId: string,
    professionalId: string,
    date?: string,
    branchId?: string,
  ) {
    const access = this.companyAccess(user, companyId);
    this.assertRequestedBranch(access, branchId);
    const professional = await this.prisma.professionals.findFirst({
      where: {
        id: professionalId,
        company_id: companyId,
        deleted_at: null,
        ...(branchId ? { branches: { some: { branch_id: branchId } } } : access.allBranches ? {} : { branches: { some: { branch_id: { in: access.branchIds } } } }),
      },
      include: {
        branches: { include: { branch: true } },
        resources_links: { include: { resource: true }, orderBy: [{ is_default: 'desc' }, { priority: 'asc' }] },
      },
    });
    if (!professional) throw new NotFoundException('Professional not found');

    const selectedBranchId = branchId
      || professional.branches.find((item) => item.is_primary)?.branch_id
      || professional.branches[0]?.branch_id;
    if (!selectedBranchId) throw new BadRequestException('Professional has no branch assignment');
    this.assertRequestedBranch(access, selectedBranchId);

    const target = date ? new Date(`${date}T00:00:00`) : new Date();
    if (Number.isNaN(target.getTime())) throw new BadRequestException('date must be YYYY-MM-DD');
    const dayStart = new Date(target); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(target); dayEnd.setHours(23, 59, 59, 999);
    const dayOfWeek = dayStart.getDay();

    const [schedule, exception, branchHours, appointments] = await Promise.all([
      this.prisma.professional_schedules.findFirst({
        where: {
          professional_id: professionalId,
          branch_id: selectedBranchId,
          day_of_week: dayOfWeek,
          AND: [
            { OR: [{ effective_from: null }, { effective_from: { lte: dayEnd } }] },
            { OR: [{ effective_to: null }, { effective_to: { gte: dayStart } }] },
          ],
        },
        orderBy: { updated_at: 'desc' },
      }),
      this.prisma.professional_schedule_exceptions.findFirst({
        where: { professional_id: professionalId, OR: [{ branch_id: selectedBranchId }, { branch_id: null }], exception_date: { gte: dayStart, lte: dayEnd } },
        orderBy: { updated_at: 'desc' },
      }),
      this.prisma.branch_hours.findFirst({ where: { branch_id: selectedBranchId, day_of_week: dayOfWeek } }),
      this.prisma.appointments.findMany({
        where: {
          company_id: companyId,
          branch_id: selectedBranchId,
          starts_at: { lt: dayEnd },
          ends_at: { gt: dayStart },
          status: { notIn: ['cancelled', 'cancelled_by_customer', 'cancelled_by_business', 'no_show'] },
          OR: [
            { participants: { some: { professional_id: professionalId } } },
            { services: { some: { professional_id: professionalId } } },
          ],
        },
        include: {
          customer: { include: { user: { select: { id: true, full_name: true, phone: true } } } },
          services: { include: { service: { select: { id: true, name: true } } } },
          resources: { include: { resource: { select: { id: true, name: true, type: true } } } },
        },
        orderBy: { starts_at: 'asc' },
      }),
    ]);

    let isOff = false;
    let startsAt: string | null = null;
    let endsAt: string | null = null;
    let scheduleSource = 'default';
    if (exception) {
      isOff = exception.is_off;
      startsAt = exception.starts_at;
      endsAt = exception.ends_at;
      scheduleSource = 'exception';
    } else if (schedule) {
      isOff = schedule.is_off;
      startsAt = schedule.starts_at;
      endsAt = schedule.ends_at;
      scheduleSource = 'professional';
    } else if (branchHours) {
      isOff = branchHours.is_closed;
      startsAt = branchHours.opens_at;
      endsAt = branchHours.closes_at;
      scheduleSource = 'branch';
    } else {
      startsAt = '09:00';
      endsAt = '18:00';
    }

    const timeToMinutes = (value: string | null) => {
      if (!value) return null;
      const [hours, minutes] = value.split(':').map(Number);
      if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
      return hours * 60 + minutes;
    };
    const minutesToTime = (value: number) => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;

    const workStart = isOff ? null : timeToMinutes(startsAt);
    const workEnd = isOff ? null : timeToMinutes(endsAt);
    const busy = appointments.map((appointment) => ({
      start: Math.max(0, Math.floor((appointment.starts_at.getTime() - dayStart.getTime()) / 60000)),
      end: Math.min(1440, Math.ceil((appointment.ends_at.getTime() - dayStart.getTime()) / 60000)),
      appointment,
    })).sort((a, b) => a.start - b.start);

    const freeWindows: Array<{ startsAt: string; endsAt: string }> = [];
    if (workStart != null && workEnd != null && workEnd > workStart) {
      let cursor = workStart;
      for (const interval of busy) {
        if (interval.end <= workStart || interval.start >= workEnd) continue;
        const clippedStart = Math.max(workStart, interval.start);
        const clippedEnd = Math.min(workEnd, interval.end);
        if (clippedStart > cursor) freeWindows.push({ startsAt: minutesToTime(cursor), endsAt: minutesToTime(clippedStart) });
        cursor = Math.max(cursor, clippedEnd);
      }
      if (cursor < workEnd) freeWindows.push({ startsAt: minutesToTime(cursor), endsAt: minutesToTime(workEnd) });
    }

    const now = new Date();
    const isToday = now >= dayStart && now <= dayEnd;
    const currentAppointment = isToday ? appointments.find((appointment) => appointment.starts_at <= now && appointment.ends_at > now) ?? null : null;
    const defaultResourceLink = professional.resources_links.find((link) => link.is_default) ?? professional.resources_links[0] ?? null;
    const defaultResource = defaultResourceLink?.resource ?? null;

    let availabilityStatus = professional.is_active ? 'available' : 'inactive';
    if (isOff) availabilityStatus = 'off';
    else if (isToday && currentAppointment) availabilityStatus = 'busy';
    else if (isToday && defaultResource && !defaultResource.is_active) availabilityStatus = 'chair_unavailable';

    return {
      professional: {
        id: professional.id,
        displayName: professional.display_name,
        avatarMediaId: professional.avatar_media_id,
        specialties: professional.specialties,
        isActive: professional.is_active,
      },
      branchId: selectedBranchId,
      date: dayStart.toISOString(),
      availabilityStatus,
      schedule: { isOff, startsAt, endsAt, source: scheduleSource },
      defaultResource: defaultResource ? { id: defaultResource.id, name: defaultResource.name, type: defaultResource.type, isActive: defaultResource.is_active } : null,
      freeWindows,
      appointments: appointments.map((appointment) => ({
        id: appointment.id,
        status: appointment.status,
        startsAt: appointment.starts_at,
        endsAt: appointment.ends_at,
        customer: appointment.customer?.user ? { id: appointment.customer.user.id, name: appointment.customer.user.full_name, phone: appointment.customer.user.phone } : null,
        services: appointment.services.map((item) => ({ id: item.service.id, name: item.service.name, quantity: item.quantity })),
        resources: appointment.resources.map((item) => ({ id: item.resource.id, name: item.resource.name, type: item.resource.type })),
      })),
    };
  }

  reviews(user: AuthenticatedUser, companyId: string, limit: number) {
    const access = this.companyAccess(user, companyId);
    return this.prisma.reviews.findMany({ where: { company_id: companyId, ...(access.allBranches ? {} : { branch_id: { in: access.branchIds } }) }, include: { author_user: { select: { id: true, full_name: true } }, professional: { select: { id: true, display_name: true } }, service: { select: { id: true, name: true } } }, orderBy: { created_at: 'desc' }, take: Math.min(limit, 250) });
  }

  payments(user: AuthenticatedUser, companyId: string, limit: number) {
    const access = this.companyAccess(user, companyId);
    return this.prisma.payments.findMany({ where: { company_id: companyId, ...(access.allBranches ? {} : { appointment: { branch_id: { in: access.branchIds } } }) }, include: { customer: { include: { user: { select: { full_name: true } } } }, refunds: true }, orderBy: { created_at: 'desc' }, take: Math.min(limit, 250) });
  }

  promotions(user: AuthenticatedUser, companyId: string) {
    const access = this.companyAccess(user, companyId);
    return this.prisma.promotions.findMany({ where: { company_id: companyId, ...(access.allBranches ? {} : { OR: [{ branch_id: { in: access.branchIds } }, { branch_id: null }] }) }, orderBy: { created_at: 'desc' } });
  }


  private async assertCompanyLevelStaffManagement(user: AuthenticatedUser, companyId: string) {
    const access = this.companyAccess(user, companyId);
    if (!access.allBranches) throw new ForbiddenException('Staff management requires company-level access');
    const company = await this.prisma.companies.findUnique({
      where: { id: companyId },
      select: { id: true, owner_user_id: true },
    });
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  async createBusinessUser(user: AuthenticatedUser, companyId: string, dto: CreateBusinessUserDto) {
    await this.assertCompanyLevelStaffManagement(user, companyId);

    if (!dto.email && !dto.phone) {
      throw new BadRequestException('Email or phone is required');
    }
    const email = dto.email?.trim().toLowerCase() || null;
    const phone = dto.phone?.trim() || null;
    const duplicate = await this.prisma.users.findFirst({
      where: { OR: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])] },
      select: { id: true },
    });
    if (duplicate) throw new BadRequestException('A LOOKIVA account already exists for this email or phone');

    const requiresBranch = ['branch_manager', 'professional', 'staff'].includes(dto.roleKey);
    if (requiresBranch && !dto.branchId) {
      throw new BadRequestException('A branch is required for this role');
    }
    if (dto.branchId) {
      const branch = await this.prisma.branches.findFirst({
        where: { id: dto.branchId, company_id: companyId, is_active: true, deleted_at: null },
        select: { id: true },
      });
      if (!branch) throw new BadRequestException('Branch is invalid');
    }

    const role = await this.prisma.roles.findUnique({ where: { key: dto.roleKey } });
    if (!role) throw new BadRequestException('Role is not configured');

    const temporaryPassword = crypto.randomBytes(9).toString('base64url');
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    const result = await this.prisma.$transaction(async (tx) => {
      const created = await tx.users.create({
        data: {
          email,
          phone,
          full_name: dto.fullName.trim(),
          password_hash: passwordHash,
          is_active: true,
        },
      });

      const scopeType = dto.roleKey === 'business_manager' ? ScopeType.Company : ScopeType.Branch;
      const scopeId = dto.roleKey === 'business_manager' ? companyId : dto.branchId!;
      await tx.user_role_scopes.create({
        data: {
          user_id: created.id,
          role_id: role.id,
          role_key: dto.roleKey,
          scope_type: scopeType,
          scope_id: scopeId,
          company_id: companyId,
          branch_id: dto.roleKey === 'business_manager' ? null : dto.branchId!,
          granted_by_user_id: user.id,
        },
      });

      let professional: any = null;
      if (dto.roleKey === 'professional') {
        professional = await tx.professionals.create({
          data: {
            user_id: created.id,
            company_id: companyId,
            branch_ids: [dto.branchId!],
            display_name: dto.professionalDisplayName?.trim() || dto.fullName.trim(),
            specialties: dto.specialties ?? [],
          },
        });
        await tx.professional_branches.create({
          data: {
            professional_id: professional.id,
            branch_id: dto.branchId!,
            is_primary: true,
          },
        });
      }

      return { user: created, professional };
    });

    await this.auditMutation(
      user,
      companyId,
      'staff.create',
      'user',
      result.user.id,
      undefined,
      { roleKey: dto.roleKey, branchId: dto.branchId ?? null, fullName: dto.fullName },
      dto.branchId ?? null,
    );

    return {
      id: result.user.id,
      fullName: result.user.full_name,
      email: result.user.email,
      phone: result.user.phone,
      roleKey: dto.roleKey,
      branchId: dto.branchId ?? null,
      professionalId: result.professional?.id ?? null,
      temporaryPassword,
    };
  }

  async updateBusinessUser(user: AuthenticatedUser, companyId: string, targetUserId: string, dto: UpdateBusinessUserDto) {
    const company = await this.assertCompanyLevelStaffManagement(user, companyId);
    if (company.owner_user_id === targetUserId) {
      throw new ForbiddenException('The business owner account cannot be modified from staff management');
    }

    const scope = await this.prisma.user_role_scopes.findFirst({
      where: { user_id: targetUserId, company_id: companyId },
      include: { user: true },
    });
    if (!scope) throw new NotFoundException('Business user not found');

    const nextRoleKey = dto.roleKey ?? scope.role_key;
    const requiresBranch = ['branch_manager', 'professional', 'staff'].includes(nextRoleKey);
    const nextBranchId = dto.branchId !== undefined ? (dto.branchId || null) : scope.branch_id;
    if (requiresBranch && !nextBranchId) throw new BadRequestException('A branch is required for this role');

    if (nextBranchId) {
      const branch = await this.prisma.branches.findFirst({
        where: { id: nextBranchId, company_id: companyId, deleted_at: null },
        select: { id: true },
      });
      if (!branch) throw new BadRequestException('Branch is invalid');
    }

    const role = await this.prisma.roles.findUnique({ where: { key: nextRoleKey } });
    if (!role) throw new BadRequestException('Role is not configured');

    const updated = await this.prisma.$transaction(async (tx) => {
      const userRow = await tx.users.update({
        where: { id: targetUserId },
        data: {
          ...(dto.fullName !== undefined ? { full_name: dto.fullName.trim() } : {}),
          ...(dto.phone !== undefined ? { phone: dto.phone.trim() || null } : {}),
          ...(dto.isActive !== undefined ? { is_active: dto.isActive } : {}),
        },
      });
      if (dto.isActive === false) {
        await tx.sessions.updateMany({ where: { user_id: targetUserId, revoked_at: null }, data: { revoked_at: new Date() } });
      }

      await tx.user_role_scopes.deleteMany({ where: { user_id: targetUserId, company_id: companyId } });
      const scopeType = nextRoleKey === 'business_manager' ? ScopeType.Company : ScopeType.Branch;
      await tx.user_role_scopes.create({
        data: {
          user_id: targetUserId,
          role_id: role.id,
          role_key: nextRoleKey,
          scope_type: scopeType,
          scope_id: nextRoleKey === 'business_manager' ? companyId : nextBranchId!,
          company_id: companyId,
          branch_id: nextRoleKey === 'business_manager' ? null : nextBranchId!,
          granted_by_user_id: user.id,
        },
      });

      const existingProfessional = await tx.professionals.findFirst({ where: { user_id: targetUserId, company_id: companyId } });
      if (nextRoleKey === 'professional') {
        let professional = existingProfessional;
        if (!professional) {
          professional = await tx.professionals.create({
            data: {
              user_id: targetUserId,
              company_id: companyId,
              branch_ids: [nextBranchId!],
              display_name: dto.professionalDisplayName?.trim() || userRow.full_name,
              specialties: dto.specialties ?? [],
            },
          });
        } else {
          professional = await tx.professionals.update({
            where: { id: professional.id },
            data: {
              branch_ids: [nextBranchId!],
              display_name: dto.professionalDisplayName?.trim() || professional.display_name,
              ...(dto.specialties !== undefined ? { specialties: dto.specialties } : {}),
              is_active: dto.isActive ?? professional.is_active,
              deleted_at: null,
            },
          });
          await tx.professional_branches.deleteMany({ where: { professional_id: professional.id } });
        }
        await tx.professional_branches.create({
          data: { professional_id: professional.id, branch_id: nextBranchId!, is_primary: true },
        });
      } else if (existingProfessional) {
        await tx.professionals.update({
          where: { id: existingProfessional.id },
          data: { is_active: false, deleted_at: new Date() },
        });
        await tx.professional_branches.deleteMany({ where: { professional_id: existingProfessional.id } });
      }

      return userRow;
    });

    await this.auditMutation(user, companyId, 'staff.update', 'user', targetUserId, { roleKey: scope.role_key, branchId: scope.branch_id }, { roleKey: nextRoleKey, branchId: nextBranchId, isActive: updated.is_active }, nextBranchId);
    return updated;
  }

  async removeBusinessUser(user: AuthenticatedUser, companyId: string, targetUserId: string) {
    const company = await this.assertCompanyLevelStaffManagement(user, companyId);
    if (company.owner_user_id === targetUserId) {
      throw new ForbiddenException('The business owner cannot be removed');
    }
    const scope = await this.prisma.user_role_scopes.findFirst({
      where: { user_id: targetUserId, company_id: companyId },
    });
    if (!scope) throw new NotFoundException('Business user not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.user_role_scopes.deleteMany({ where: { user_id: targetUserId, company_id: companyId } });
      await tx.professionals.updateMany({
        where: { user_id: targetUserId, company_id: companyId },
        data: { is_active: false, deleted_at: new Date() },
      });
      await tx.users.update({ where: { id: targetUserId }, data: { is_active: false } });
      await tx.sessions.updateMany({ where: { user_id: targetUserId, revoked_at: null }, data: { revoked_at: new Date() } });
    });

    await this.auditMutation(user, companyId, 'staff.remove', 'user', targetUserId, { roleKey: scope.role_key }, { removed: true }, scope.branch_id);
    return { id: targetUserId, removed: true };
  }

  async staff(user: AuthenticatedUser, companyId: string) {
    const access = this.companyAccess(user, companyId);
    const scopes = await this.prisma.user_role_scopes.findMany({
      where: { company_id: companyId, ...(access.allBranches ? {} : { branch_id: { in: access.branchIds } }) },
      include: { user: { select: { id: true, full_name: true, email: true, phone: true, avatar_media_id: true, is_active: true, last_login_at: true } }, role: { select: { id: true, key: true, name: true } } },
      orderBy: { created_at: 'desc' },
    });
    const userIds = Array.from(new Set(scopes.map((scope) => scope.user_id)));
    const professionals = userIds.length
      ? await this.prisma.professionals.findMany({
          where: { company_id: companyId, user_id: { in: userIds }, deleted_at: null },
          include: {
            resources_links: { include: { resource: { select: { id: true, name: true, type: true, branch_id: true, is_active: true } } }, orderBy: [{ is_default: 'desc' }, { priority: 'asc' }] },
            branches: { include: { branch: { select: { id: true, name: true } } } },
          },
        })
      : [];
    const byUser = new Map(professionals.map((professional) => [professional.user_id, professional]));
    return scopes.map((scope) => ({ ...scope, professional: byUser.get(scope.user_id) ?? null }));
  }

  audit(user: AuthenticatedUser, companyId: string, limit: number) {
    const access = this.companyAccess(user, companyId);
    return this.prisma.audit_logs.findMany({ where: { company_id: companyId, ...(access.allBranches ? {} : { branch_id: { in: access.branchIds } }) }, include: { actor: { select: { id: true, full_name: true, email: true } } }, orderBy: { created_at: 'desc' }, take: Math.min(limit, 250) });
  }

  subscriptions(user: AuthenticatedUser, companyId: string) {
    const access = this.companyAccess(user, companyId);
    if (!access.allBranches) throw new ForbiddenException('Subscriptions require company-level access');
    return this.prisma.subscriptions.findMany({ where: { company_id: companyId }, include: { plan: true }, orderBy: { created_at: 'desc' } });
  }



  async conversations(user: AuthenticatedUser, companyId: string, limit = 100) {
    this.companyAccess(user, companyId);
    return this.prisma.conversations.findMany({
      where: { company_id: companyId },
      include: {
        members: { include: { user: { select: { id: true, full_name: true, email: true, phone: true } } } },
        messages: { orderBy: { created_at: 'desc' }, take: 1, include: { sender: { select: { id: true, full_name: true } } } },
      },
      orderBy: [{ last_message_at: 'desc' }, { updated_at: 'desc' }],
      take: Math.min(limit, 250),
    });
  }

  async conversationMessages(user: AuthenticatedUser, companyId: string, conversationId: string, limit = 100) {
    this.companyAccess(user, companyId);
    const conversation = await this.prisma.conversations.findFirst({ where: { id: conversationId, company_id: companyId } });
    if (!conversation) throw new NotFoundException('Conversation not found');
    return this.prisma.messages.findMany({
      where: { conversation_id: conversationId, deleted_at: null },
      include: { sender: { select: { id: true, full_name: true } }, attachments: true },
      orderBy: { created_at: 'asc' },
      take: Math.min(limit, 250),
    });
  }

  async sendConversationMessage(user: AuthenticatedUser, companyId: string, conversationId: string, body: string, messageType = 'text') {
    this.companyAccess(user, companyId);
    const clean = body?.trim();
    if (!clean) throw new BadRequestException('Message body is required');
    const conversation = await this.prisma.conversations.findFirst({ where: { id: conversationId, company_id: companyId } });
    if (!conversation) throw new NotFoundException('Conversation not found');

    const result = await this.prisma.$transaction(async (tx) => {
      const message = await tx.messages.create({
        data: { conversation_id: conversationId, sender_user_id: user.id, message_type: messageType, body_plain: clean },
      });
      await tx.conversations.update({
        where: { id: conversationId },
        data: { last_message_id: message.id, last_message_at: message.created_at },
      });
      const recipients = await tx.conversation_members.findMany({
        where: { conversation_id: conversationId, user_id: { not: user.id }, left_at: null },
        select: { user_id: true },
      });
      return { message, recipients };
    });

    for (const recipient of result.recipients) {
      await this.notifications.dispatch({
        recipientUserId: recipient.user_id,
        notificationType: 'new_message',
        title: 'New message from business',
        body: clean.length > 120 ? `${clean.slice(0, 117)}...` : clean,
        companyId,
        deepLink: `/chat/${conversationId}`,
        payload: { conversationId, companyId },
      });
    }
    return result.message;
  }

  async setCustomerBlocked(user: AuthenticatedUser, companyId: string, customerId: string, blocked: boolean) {
    const access = this.companyAccess(user, companyId);
    if (!access.allBranches) throw new ForbiddenException('Blocking customers requires company-level access');
    const customer = await this.prisma.customers.findUnique({
      where: { id: customerId },
      include: { user: { select: { id: true, full_name: true } } },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    const current = new Set(customer.blocked_by_company_ids ?? []);
    if (blocked) current.add(companyId); else current.delete(companyId);
    const updated = await this.prisma.customers.update({
      where: { id: customerId },
      data: { blocked_by_company_ids: Array.from(current) },
    });
    await this.auditMutation(user, companyId, blocked ? 'customer.block' : 'customer.unblock', 'customer', customerId, { blocked: !blocked }, { blocked });
    return { customerId, blocked, customer: updated };
  }

  async queues(user: AuthenticatedUser, companyId: string, branchId?: string) {
    const access = this.companyAccess(user, companyId);
    this.assertRequestedBranch(access, branchId);
    return this.prisma.queues.findMany({
      where: {
        branch: {
          company_id: companyId,
          ...(branchId ? { id: branchId } : access.allBranches ? {} : { id: { in: access.branchIds } }),
        },
      },
      include: {
        branch: { select: { id: true, name: true } },
        entries: {
          where: { status: { in: ['waiting', 'called'] } },
          include: { customer: { include: { user: { select: { full_name: true, phone: true } } } } },
          orderBy: [{ position: 'asc' }, { joined_at: 'asc' }],
        },
      },
      orderBy: [{ branch_id: 'asc' }, { created_at: 'asc' }],
    });
  }

  async createQueue(user: AuthenticatedUser, companyId: string, dto: CreateQueueDto) {
    const access = this.companyAccess(user, companyId);
    this.assertRequestedBranch(access, dto.branchId);
    const branch = await this.prisma.branches.findFirst({ where: { id: dto.branchId, company_id: companyId, deleted_at: null }, select: { id: true } });
    if (!branch) throw new BadRequestException('Branch does not belong to this company');
    const queue = await this.prisma.queues.create({
      data: {
        branch_id: dto.branchId,
        name: dto.name?.trim() || 'Default',
        estimated_wait_per_person_minutes: dto.estimatedWaitPerPersonMinutes ?? 15,
        max_waiting: dto.maxWaiting ?? 50,
      },
    });
    await this.auditMutation(user, companyId, 'queue.create', 'queue', queue.id, null, queue, dto.branchId);
    return queue;
  }

  async updateQueue(user: AuthenticatedUser, companyId: string, queueId: string, dto: UpdateQueueDto) {
    const access = this.companyAccess(user, companyId);
    const queue = await this.prisma.queues.findUnique({ where: { id: queueId }, include: { branch: { select: { company_id: true } } } });
    if (!queue || queue.branch.company_id !== companyId) throw new NotFoundException('Queue not found');
    this.assertRequestedBranch(access, queue.branch_id);
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.estimatedWaitPerPersonMinutes !== undefined) data.estimated_wait_per_person_minutes = dto.estimatedWaitPerPersonMinutes;
    if (dto.maxWaiting !== undefined) data.max_waiting = dto.maxWaiting;
    if (dto.isActive !== undefined) data.is_active = dto.isActive;
    if (!Object.keys(data).length) return queue;
    const updated = await this.prisma.queues.update({ where: { id: queueId }, data });
    await this.auditMutation(user, companyId, 'queue.update', 'queue', queueId, queue, updated, queue.branch_id);
    return updated;
  }

  private async auditMutation(user: AuthenticatedUser, companyId: string, action: string, entityType: string, entityId: string, oldValue?: unknown, newValue?: unknown, branchId?: string | null) {
    await this.prisma.audit_logs.create({
      data: {
        actor_user_id: user.id,
        actor_role: user.roleScopes[0]?.roleKey ?? null,
        action,
        entity_type: entityType,
        entity_id: entityId,
        company_id: companyId,
        branch_id: branchId ?? null,
        old_value: oldValue as any,
        new_value: newValue as any,
      },
    });
  }

  private async assertBranchesBelongToCompany(companyId: string, branchIds: string[], access: { allBranches: boolean; branchIds: string[] }) {
    const uniqueIds = Array.from(new Set(branchIds.filter(Boolean)));
    if (!access.allBranches && uniqueIds.some((id) => !access.branchIds.includes(id))) {
      throw new ForbiddenException('One or more branches are outside your authorized scope');
    }
    if (!uniqueIds.length) return;
    const count = await this.prisma.branches.count({ where: { id: { in: uniqueIds }, company_id: companyId, deleted_at: null } });
    if (count !== uniqueIds.length) throw new BadRequestException('One or more branches are invalid');
  }

  async createService(user: AuthenticatedUser, companyId: string, dto: any) {
    const access = this.companyAccess(user, companyId);
    await this.assertBranchesBelongToCompany(companyId, dto.branchIds ?? [], access);
    if (!access.allBranches && !(dto.branchIds ?? []).length) throw new BadRequestException('Branch-scoped users must select an authorized branch');
    const category = await this.prisma.service_categories.findUnique({ where: { id: dto.categoryId }, select: { id: true, is_active: true } });
    if (!category?.is_active) throw new BadRequestException('Category is invalid or inactive');
    const professionalIds = Array.from(new Set(dto.professionalIds ?? [])) as string[];
    if (professionalIds.length) {
      const count = await this.prisma.professionals.count({ where: { id: { in: professionalIds }, company_id: companyId, is_active: true, deleted_at: null } });
      if (count !== professionalIds.length) throw new BadRequestException('One or more professionals are invalid');
    }
    const resourceIds = Array.from(new Set(dto.resourceIds ?? [])) as string[];
    if (resourceIds.length) {
      const count = await this.prisma.resources.count({ where: { id: { in: resourceIds }, company_id: companyId, is_active: true, deleted_at: null } });
      if (count !== resourceIds.length) throw new BadRequestException('One or more resources are invalid');
    }
    const baseSlug = slugify(dto.slug || dto.name);
    let slug = baseSlug;
    let suffix = 1;
    while (await this.prisma.services.findFirst({ where: { company_id: companyId, slug } })) slug = `${baseSlug}-${++suffix}`;
    const service = await this.prisma.services.create({ data: {
      company_id: companyId,
      category_id: dto.categoryId,
      branch_ids: dto.branchIds ?? [],
      professional_ids: professionalIds,
      resource_ids: resourceIds,
      slug,
      name: dto.name,
      summary: dto.summary ?? null,
      description: dto.description ?? null,
      duration_minutes: dto.durationMinutes,
      base_price: dto.basePrice,
      currency_code: dto.currencyCode.toUpperCase(),
      deposit_percent: dto.depositPercent ?? null,
      home_service_allowed: dto.homeServiceAllowed ?? false,
      walk_ins_allowed: dto.walkInsAllowed ?? true,
      online_payment_required: dto.onlinePaymentRequired ?? false,
      tags: dto.tags ?? [],
    } });
    await this.auditMutation(user, companyId, 'service.create', 'service', service.id, undefined, service);
    return service;
  }

  async updateService(user: AuthenticatedUser, companyId: string, serviceId: string, dto: any) {
    const access = this.companyAccess(user, companyId);
    const existing = await this.prisma.services.findFirst({ where: { id: serviceId, company_id: companyId, deleted_at: null } });
    if (!existing) throw new NotFoundException('Service not found');
    if (!access.allBranches) {
      const currentBranches = existing.branch_ids ?? [];
      if (currentBranches.length && !currentBranches.some((id) => access.branchIds.includes(id))) throw new ForbiddenException('Service is outside your authorized branch scope');
    }
    if (dto.branchIds !== undefined) await this.assertBranchesBelongToCompany(companyId, dto.branchIds, access);
    if (dto.categoryId) {
      const category = await this.prisma.service_categories.findUnique({ where: { id: dto.categoryId }, select: { is_active: true } });
      if (!category?.is_active) throw new BadRequestException('Category is invalid or inactive');
    }
    const professionalIds = dto.professionalIds !== undefined ? Array.from(new Set(dto.professionalIds)) as string[] : undefined;
    if (professionalIds?.length) {
      const count = await this.prisma.professionals.count({ where: { id: { in: professionalIds }, company_id: companyId, deleted_at: null } });
      if (count !== professionalIds.length) throw new BadRequestException('One or more professionals are invalid');
    }
    const resourceIds = dto.resourceIds !== undefined ? Array.from(new Set(dto.resourceIds)) as string[] : undefined;
    if (resourceIds?.length) {
      const count = await this.prisma.resources.count({ where: { id: { in: resourceIds }, company_id: companyId, deleted_at: null } });
      if (count !== resourceIds.length) throw new BadRequestException('One or more resources are invalid');
    }
    const updated = await this.prisma.services.update({ where: { id: serviceId }, data: {
      ...(dto.categoryId !== undefined ? { category_id: dto.categoryId } : {}),
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.summary !== undefined ? { summary: dto.summary || null } : {}),
      ...(dto.description !== undefined ? { description: dto.description || null } : {}),
      ...(dto.branchIds !== undefined ? { branch_ids: dto.branchIds } : {}),
      ...(professionalIds !== undefined ? { professional_ids: professionalIds } : {}),
      ...(resourceIds !== undefined ? { resource_ids: resourceIds } : {}),
      ...(dto.durationMinutes !== undefined ? { duration_minutes: dto.durationMinutes } : {}),
      ...(dto.basePrice !== undefined ? { base_price: dto.basePrice } : {}),
      ...(dto.currencyCode !== undefined ? { currency_code: dto.currencyCode.toUpperCase() } : {}),
      ...(dto.depositPercent !== undefined ? { deposit_percent: dto.depositPercent } : {}),
      ...(dto.homeServiceAllowed !== undefined ? { home_service_allowed: dto.homeServiceAllowed } : {}),
      ...(dto.walkInsAllowed !== undefined ? { walk_ins_allowed: dto.walkInsAllowed } : {}),
      ...(dto.onlinePaymentRequired !== undefined ? { online_payment_required: dto.onlinePaymentRequired } : {}),
      ...(dto.tags !== undefined ? { tags: dto.tags } : {}),
      ...(dto.isActive !== undefined ? { is_active: dto.isActive } : {}),
      ...(dto.isFeatured !== undefined ? { is_featured: dto.isFeatured } : {}),
    } });
    await this.auditMutation(user, companyId, 'service.update', 'service', serviceId, existing, updated);
    return updated;
  }

  async deleteService(user: AuthenticatedUser, companyId: string, serviceId: string) {
    const access = this.companyAccess(user, companyId);
    const existing = await this.prisma.services.findFirst({ where: { id: serviceId, company_id: companyId, deleted_at: null } });
    if (!existing) throw new NotFoundException('Service not found');
    if (!access.allBranches && existing.branch_ids.length && !existing.branch_ids.some((id) => access.branchIds.includes(id))) throw new ForbiddenException('Service is outside your authorized branch scope');
    const updated = await this.prisma.services.update({ where: { id: serviceId }, data: { is_active: false, deleted_at: new Date() } });
    await this.auditMutation(user, companyId, 'service.delete', 'service', serviceId, existing, updated);
    return { id: serviceId, deleted: true };
  }

  async createResource(user: AuthenticatedUser, companyId: string, dto: any) {
    const access = this.companyAccess(user, companyId);
    if (dto.branchId) await this.assertBranchesBelongToCompany(companyId, [dto.branchId], access);
    if (!access.allBranches && !dto.branchId) throw new BadRequestException('Branch-scoped users must select an authorized branch');
    if (dto.resourceTypeId) {
      const type = await this.prisma.resource_types.findUnique({ where: { id: dto.resourceTypeId }, select: { id: true, is_active: true } });
      if (!type?.is_active) throw new BadRequestException('Resource type is invalid or inactive');
    }
    const resource = await this.prisma.resources.create({ data: {
      company_id: companyId,
      branch_id: dto.branchId ?? null,
      resource_type_id: dto.resourceTypeId ?? null,
      name: dto.name,
      type: dto.type,
      description: dto.description ?? null,
      icon_key: dto.iconKey ?? null,
      quantity: dto.quantity ?? 1,
      capacity_per_slot: dto.capacityPerSlot ?? 1,
      hourly_cost: dto.hourlyCost ?? null,
      currency_code: dto.currencyCode?.toUpperCase() ?? null,
      tags: dto.tags ?? [],
    } });
    await this.auditMutation(user, companyId, 'resource.create', 'resource', resource.id, undefined, resource, resource.branch_id);
    return resource;
  }

  async updateResource(user: AuthenticatedUser, companyId: string, resourceId: string, dto: any) {
    const access = this.companyAccess(user, companyId);
    const existing = await this.prisma.resources.findFirst({ where: { id: resourceId, company_id: companyId, deleted_at: null } });
    if (!existing) throw new NotFoundException('Resource not found');
    this.assertRequestedBranch(access, existing.branch_id ?? undefined);
    if (dto.branchId !== undefined && dto.branchId) await this.assertBranchesBelongToCompany(companyId, [dto.branchId], access);
    const updated = await this.prisma.resources.update({ where: { id: resourceId }, data: {
      ...(dto.branchId !== undefined ? { branch_id: dto.branchId || null } : {}),
      ...(dto.resourceTypeId !== undefined ? { resource_type_id: dto.resourceTypeId || null } : {}),
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.type !== undefined ? { type: dto.type } : {}),
      ...(dto.description !== undefined ? { description: dto.description || null } : {}),
      ...(dto.iconKey !== undefined ? { icon_key: dto.iconKey || null } : {}),
      ...(dto.quantity !== undefined ? { quantity: dto.quantity } : {}),
      ...(dto.capacityPerSlot !== undefined ? { capacity_per_slot: dto.capacityPerSlot } : {}),
      ...(dto.hourlyCost !== undefined ? { hourly_cost: dto.hourlyCost } : {}),
      ...(dto.currencyCode !== undefined ? { currency_code: dto.currencyCode?.toUpperCase() || null } : {}),
      ...(dto.tags !== undefined ? { tags: dto.tags } : {}),
      ...(dto.isActive !== undefined ? { is_active: dto.isActive } : {}),
    } });
    await this.auditMutation(user, companyId, 'resource.update', 'resource', resourceId, existing, updated, updated.branch_id);
    return updated;
  }

  async deleteResource(user: AuthenticatedUser, companyId: string, resourceId: string) {
    const access = this.companyAccess(user, companyId);
    const existing = await this.prisma.resources.findFirst({ where: { id: resourceId, company_id: companyId, deleted_at: null } });
    if (!existing) throw new NotFoundException('Resource not found');
    this.assertRequestedBranch(access, existing.branch_id ?? undefined);
    const activeBookings = await this.prisma.appointment_resources.count({ where: { resource_id: resourceId, appointment: { status: { in: ['pending','confirmed','checked_in','in_progress'] }, ends_at: { gt: new Date() } } } });
    if (activeBookings) throw new BadRequestException('Resource has active/future appointments and cannot be removed');
    const updated = await this.prisma.resources.update({ where: { id: resourceId }, data: { is_active: false, deleted_at: new Date() } });
    await this.auditMutation(user, companyId, 'resource.delete', 'resource', resourceId, existing, updated, existing.branch_id);
    return { id: resourceId, deleted: true };
  }

  async createPromotion(user: AuthenticatedUser, companyId: string, dto: any) {
    const access = this.companyAccess(user, companyId);
    if (dto.branchId) await this.assertBranchesBelongToCompany(companyId, [dto.branchId], access);
    if (!access.allBranches && !dto.branchId) throw new BadRequestException('Branch-scoped users must select an authorized branch');
    const startsAt = new Date(dto.startsAt);
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    if (endsAt && endsAt <= startsAt) throw new BadRequestException('Promotion end must be after start');
    if (dto.promotionType === 'percentage' && dto.valuePercent == null) throw new BadRequestException('Percentage promotion requires valuePercent');
    if (dto.promotionType === 'fixed' && dto.valueFixed == null) throw new BadRequestException('Fixed promotion requires valueFixed');
    const promotion = await this.prisma.promotions.create({ data: {
      company_id: companyId,
      branch_id: dto.branchId ?? null,
      name: dto.name,
      description: dto.description ?? null,
      promotion_type: dto.promotionType,
      value_percent: dto.valuePercent ?? null,
      value_fixed: dto.valueFixed ?? null,
      eligible_service_ids: dto.eligibleServiceIds ?? [],
      eligible_professional_ids: dto.eligibleProfessionalIds ?? [],
      starts_at: startsAt,
      ends_at: endsAt,
      usage_limit: dto.usageLimit ?? null,
      is_public: dto.isPublic ?? true,
    } });
    await this.auditMutation(user, companyId, 'promotion.create', 'promotion', promotion.id, undefined, promotion, promotion.branch_id);
    return promotion;
  }

  async updatePromotion(user: AuthenticatedUser, companyId: string, promotionId: string, dto: any) {
    const access = this.companyAccess(user, companyId);
    const existing = await this.prisma.promotions.findFirst({ where: { id: promotionId, company_id: companyId } });
    if (!existing) throw new NotFoundException('Promotion not found');
    this.assertRequestedBranch(access, existing.branch_id ?? undefined);
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : existing.starts_at;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : existing.ends_at;
    if (endsAt && endsAt <= startsAt) throw new BadRequestException('Promotion end must be after start');
    const updated = await this.prisma.promotions.update({ where: { id: promotionId }, data: {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.description !== undefined ? { description: dto.description || null } : {}),
      ...(dto.valuePercent !== undefined ? { value_percent: dto.valuePercent } : {}),
      ...(dto.valueFixed !== undefined ? { value_fixed: dto.valueFixed } : {}),
      ...(dto.startsAt !== undefined ? { starts_at: startsAt } : {}),
      ...(dto.endsAt !== undefined ? { ends_at: endsAt } : {}),
      ...(dto.eligibleServiceIds !== undefined ? { eligible_service_ids: dto.eligibleServiceIds } : {}),
      ...(dto.eligibleProfessionalIds !== undefined ? { eligible_professional_ids: dto.eligibleProfessionalIds } : {}),
      ...(dto.usageLimit !== undefined ? { usage_limit: dto.usageLimit } : {}),
      ...(dto.isPublic !== undefined ? { is_public: dto.isPublic } : {}),
      ...(dto.isActive !== undefined ? { is_active: dto.isActive } : {}),
    } });
    await this.auditMutation(user, companyId, 'promotion.update', 'promotion', promotionId, existing, updated, existing.branch_id);
    return updated;
  }

}
