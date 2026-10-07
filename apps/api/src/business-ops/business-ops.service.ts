import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PermissionKey, ScopeType, UserRole } from '@lookiva/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/types/request-with-user';
import { calculateFinancialMetrics } from '../common/finance/financial-metrics';
import { CreateQueueDto, UpdateQueueDto } from './dto/business-management.dto';

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
  constructor(private readonly prisma: PrismaService) {}

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

  customers(user: AuthenticatedUser, companyId: string, limit: number) {
    const access = this.companyAccess(user, companyId);
    return this.prisma.customers.findMany({
      where: {
        appointments: {
          some: {
            company_id: companyId,
            ...(access.allBranches ? {} : { branch_id: { in: access.branchIds } }),
          },
        },
        company_profiles: {
          none: {
            company_id: companyId,
            merged_into_customer_id: { not: null },
          },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            full_name: true,
            phone: true,
            email: true,
            created_at: true,
          },
        },
        company_profiles: {
          where: { company_id: companyId },
          take: 1,
        },
      },
      orderBy: { last_booking_at: 'desc' },
      take: Math.min(limit, 250),
    });
  }

  professionals(user: AuthenticatedUser, companyId: string) {
    const access = this.companyAccess(user, companyId);
    return this.prisma.professionals.findMany({
      where: { company_id: companyId, deleted_at: null, ...(access.allBranches ? {} : { branches: { some: { branch_id: { in: access.branchIds } } } }) },
      include: {
        resources_links: { include: { resource: { select: { id: true, name: true, type: true } } } },
        services_links: { include: { service: { select: { id: true, name: true, base_price: true, currency_code: true } } } },
        branches: { include: { branch: { select: { id: true, name: true } } } },
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
    return items.map((resource) => ({ ...resource, activeBookings: bookings.filter((b) => b.resource_id === resource.id) }));
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

  staff(user: AuthenticatedUser, companyId: string) {
    const access = this.companyAccess(user, companyId);
    return this.prisma.user_role_scopes.findMany({
      where: { company_id: companyId, ...(access.allBranches ? {} : { branch_id: { in: access.branchIds } }) },
      include: { user: { select: { id: true, full_name: true, email: true, phone: true, is_active: true, last_login_at: true } }, role: { select: { id: true, key: true, name: true } } },
      orderBy: { created_at: 'desc' },
    });
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

  async customerDetails(user: AuthenticatedUser, companyId: string, customerId: string) {
    const access = this.companyAccess(user, companyId);
    const requestedProfile = await this.prisma.customer_company_profiles.findUnique({
      where: {
        company_id_customer_id: {
          company_id: companyId,
          customer_id: customerId,
        },
      },
    });
    const canonicalCustomerId =
      requestedProfile?.merged_into_customer_id ?? customerId;

    const aliasProfiles = await this.prisma.customer_company_profiles.findMany({
      where: {
        company_id: companyId,
        merged_into_customer_id: canonicalCustomerId,
      },
      select: { customer_id: true },
    });
    const customerIds = Array.from(
      new Set([
        canonicalCustomerId,
        ...aliasProfiles.map((item) => item.customer_id),
      ]),
    );

    const customer = await this.prisma.customers.findFirst({
      where: {
        id: canonicalCustomerId,
        appointments: {
          some: {
            company_id: companyId,
            ...(access.allBranches ? {} : { branch_id: { in: access.branchIds } }),
          },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            full_name: true,
            email: true,
            phone: true,
            created_at: true,
            is_active: true,
          },
        },
        profile: true,
        preferences: true,
        dependents: true,
        addresses: true,
        preferred_resources: {
          include: {
            resource: { select: { id: true, name: true, type: true } },
          },
        },
        company_profiles: {
          where: { company_id: companyId },
          take: 1,
        },
      },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found in this business scope');
    }

    const [appointments, payments, aliases] = await Promise.all([
      this.prisma.appointments.findMany({
        where: {
          company_id: companyId,
          customer_id: { in: customerIds },
          ...(access.allBranches
            ? {}
            : { branch_id: { in: access.branchIds } }),
        },
        include: {
          branch: { select: { id: true, name: true } },
          services: {
            include: {
              service: { select: { id: true, name: true } },
            },
          },
          participants: {
            include: {
            },
          },
          financial_snapshot: true,
        },
        orderBy: { starts_at: 'desc' },
        take: 150,
      }),
      this.prisma.payments.findMany({
        where: {
          company_id: companyId,
          customer_id: { in: customerIds },
        },
        include: { refunds: true },
        orderBy: { created_at: 'desc' },
        take: 150,
      }),
      this.prisma.customers.findMany({
        where: { id: { in: customerIds.filter((id) => id !== canonicalCustomerId) } },
        include: {
          user: {
            select: {
              id: true,
              full_name: true,
              email: true,
              phone: true,
            },
          },
        },
      }),
    ]);

    return {
      ...customer,
      appointments,
      payments,
      crmProfile: customer.company_profiles[0] ?? null,
      mergedAliases: aliases.map((alias) => ({
        id: alias.id,
        user: alias.user,
      })),
      canonicalCustomerId,
      requestedCustomerId: customerId,
    };
  }

  async updateCustomerCrm(
    user: AuthenticatedUser,
    companyId: string,
    customerId: string,
    dto: any,
  ) {
    const access = this.companyAccess(user, companyId);
    const customer = await this.prisma.customers.findFirst({
      where: {
        id: customerId,
        appointments: {
          some: {
            company_id: companyId,
            ...(access.allBranches ? {} : { branch_id: { in: access.branchIds } }),
          },
        },
      },
      select: { id: true },
    });
    if (!customer) throw new NotFoundException('Customer not found in this business scope');

    const existing = await this.prisma.customer_company_profiles.findUnique({
      where: {
        company_id_customer_id: {
          company_id: companyId,
          customer_id: customerId,
        },
      },
    });
    if (existing?.merged_into_customer_id) {
      throw new ConflictException('Edit the canonical customer after merging this duplicate');
    }

    const tags: string[] | undefined = dto.tags === undefined
      ? undefined
      : Array.from(
          new Set<string>(
            (Array.isArray(dto.tags) ? dto.tags : [])
              .map((value: unknown): string =>
                String(value).trim().toLowerCase(),
              )
              .filter((value: string): value is string => value.length > 0),
          ),
        ).slice(0, 50);

    const updated = await this.prisma.customer_company_profiles.upsert({
      where: {
        company_id_customer_id: {
          company_id: companyId,
          customer_id: customerId,
        },
      },
      create: {
        company_id: companyId,
        customer_id: customerId,
        notes: dto.notes ? String(dto.notes).trim() : null,
        tags: tags ?? [],
        created_by_id: user.id,
      },
      update: {
        ...(dto.notes !== undefined
          ? { notes: dto.notes ? String(dto.notes).trim() : null }
          : {}),
        ...(tags !== undefined ? { tags } : {}),
      },
    });
    await this.auditMutation(
      user,
      companyId,
      'customer.crm.update',
      'customer',
      customerId,
      existing,
      updated,
    );
    return updated;
  }

  async mergeCustomerDuplicate(
    user: AuthenticatedUser,
    companyId: string,
    primaryCustomerId: string,
    duplicateCustomerId: string,
  ) {
    const access = this.companyAccess(user, companyId);
    if (primaryCustomerId === duplicateCustomerId) {
      throw new BadRequestException('Primary and duplicate customer must be different');
    }

    const customers = await this.prisma.customers.findMany({
      where: {
        id: { in: [primaryCustomerId, duplicateCustomerId] },
        appointments: {
          some: {
            company_id: companyId,
            ...(access.allBranches ? {} : { branch_id: { in: access.branchIds } }),
          },
        },
      },
      select: { id: true },
    });
    if (customers.length !== 2) {
      throw new NotFoundException('Both customers must exist in this business scope');
    }

    const primaryProfile = await this.prisma.customer_company_profiles.findUnique({
      where: {
        company_id_customer_id: {
          company_id: companyId,
          customer_id: primaryCustomerId,
        },
      },
    });
    if (primaryProfile?.merged_into_customer_id) {
      throw new ConflictException('Selected primary customer is already merged into another customer');
    }

    const duplicateProfile = await this.prisma.customer_company_profiles.findUnique({
      where: {
        company_id_customer_id: {
          company_id: companyId,
          customer_id: duplicateCustomerId,
        },
      },
    });
    const mergedTags = Array.from(
      new Set([
        ...(primaryProfile?.tags ?? []),
        ...(duplicateProfile?.tags ?? []),
      ]),
    );
    const mergedNotes = [
      primaryProfile?.notes,
      duplicateProfile?.notes
        ? '[Merged duplicate notes]\n' + duplicateProfile.notes
        : null,
    ]
      .filter(Boolean)
      .join('\n\n') || null;

    const result = await this.prisma.$transaction(async (tx) => {
      const canonical = await tx.customer_company_profiles.upsert({
        where: {
          company_id_customer_id: {
            company_id: companyId,
            customer_id: primaryCustomerId,
          },
        },
        create: {
          company_id: companyId,
          customer_id: primaryCustomerId,
          notes: mergedNotes,
          tags: mergedTags,
          created_by_id: user.id,
        },
        update: {
          notes: mergedNotes,
          tags: mergedTags,
        },
      });
      const alias = await tx.customer_company_profiles.upsert({
        where: {
          company_id_customer_id: {
            company_id: companyId,
            customer_id: duplicateCustomerId,
          },
        },
        create: {
          company_id: companyId,
          customer_id: duplicateCustomerId,
          merged_into_customer_id: primaryCustomerId,
          created_by_id: user.id,
        },
        update: {
          merged_into_customer_id: primaryCustomerId,
        },
      });
      await tx.customer_company_profiles.updateMany({
        where: {
          company_id: companyId,
          merged_into_customer_id: duplicateCustomerId,
        },
        data: { merged_into_customer_id: primaryCustomerId },
      });
      return { canonical, alias };
    });

    await this.auditMutation(
      user,
      companyId,
      'customer.crm.merge_duplicate',
      'customer',
      duplicateCustomerId,
      duplicateProfile,
      {
        mergedIntoCustomerId: primaryCustomerId,
        aliasId: result.alias.id,
      },
    );
    return {
      primaryCustomerId,
      duplicateCustomerId,
      merged: true,
      canonicalProfile: result.canonical,
    };
  }

  async packagePurchases(
    user: AuthenticatedUser,
    companyId: string,
    limit = 100,
  ) {
    const access = this.companyAccess(user, companyId);
    return this.prisma.package_purchases.findMany({
      where: {
        package: { company_id: companyId },
        status: 'active',
        sessions_remaining: { gt: 0 },
        OR: [{ expires_at: null }, { expires_at: { gt: new Date() } }],
        ...(access.allBranches
          ? {}
          : {
              customer: {
                appointments: {
                  some: {
                    company_id: companyId,
                    branch_id: { in: access.branchIds },
                  },
                },
              },
            }),
      },
      include: {
        package: {
          select: {
            id: true,
            name: true,
            service_ids: true,
            total_sessions_count: true,
            currency_code: true,
          },
        },
        customer: {
          include: {
            user: {
              select: {
                id: true,
                full_name: true,
                phone: true,
                email: true,
              },
            },
          },
        },
        usage: {
          orderBy: { used_at: 'desc' },
          take: 5,
          include: {
            service: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ purchased_at: 'desc' }, { created_at: 'desc' }],
      take: Math.min(Math.max(limit, 1), 250),
    });
  }

  async packageRedemptions(
    user: AuthenticatedUser,
    companyId: string,
    limit = 100,
  ) {
    const access = this.companyAccess(user, companyId);
    return this.prisma.package_usage.findMany({
      where: {
        package_purchase: {
          package: { company_id: companyId },
        },
        ...(access.allBranches
          ? {}
          : {
              appointment: {
                branch_id: { in: access.branchIds },
              },
            }),
      },
      include: {
        package_purchase: {
          include: {
            package: {
              select: {
                id: true,
                name: true,
                service_ids: true,
                total_sessions_count: true,
                currency_code: true,
              },
            },
            customer: {
              include: {
                user: {
                  select: {
                    id: true,
                    full_name: true,
                    phone: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        service: {
          select: { id: true, name: true },
        },
        appointment: {
          select: {
            id: true,
            status: true,
            starts_at: true,
            branch: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ used_at: 'desc' }, { created_at: 'desc' }],
      take: Math.min(Math.max(limit, 1), 250),
    });
  }

  async redeemPackage(
    user: AuthenticatedUser,
    companyId: string,
    dto: any,
  ) {
    const access = this.companyAccess(user, companyId);
    const packagePurchaseId = String(dto.packagePurchaseId || '').trim();
    const serviceId = String(dto.serviceId || '').trim();
    const appointmentId = dto.appointmentId
      ? String(dto.appointmentId).trim()
      : null;
    const professionalId = dto.professionalId
      ? String(dto.professionalId).trim()
      : null;
    const sessionsUsed = Math.max(
      1,
      Math.min(25, Math.trunc(Number(dto.sessionsUsed ?? 1))),
    );

    if (!packagePurchaseId || !serviceId) {
      throw new BadRequestException(
        'packagePurchaseId and serviceId are required',
      );
    }

    const purchase = await this.prisma.package_purchases.findUnique({
      where: { id: packagePurchaseId },
      include: {
        package: true,
        customer: {
          include: {
            user: {
              select: {
                id: true,
                full_name: true,
                phone: true,
                email: true,
              },
            },
          },
        },
      },
    });
    if (!purchase || purchase.package.company_id !== companyId) {
      throw new NotFoundException('Package purchase not found');
    }
    if (purchase.status !== 'active') {
      throw new ConflictException('Package purchase is not active');
    }
    if (purchase.expires_at && purchase.expires_at <= new Date()) {
      throw new ConflictException('Package purchase has expired');
    }
    if (!purchase.package.service_ids.includes(serviceId)) {
      throw new BadRequestException(
        'Selected service is not included in this package',
      );
    }

    const service = await this.prisma.services.findFirst({
      where: {
        id: serviceId,
        company_id: companyId,
        deleted_at: null,
        is_active: true,
      },
      select: { id: true, name: true },
    });
    if (!service) {
      throw new BadRequestException('Selected service is unavailable');
    }

    let appointment:
      | {
          id: string;
          branch_id: string;
          customer_id: string | null;
          status: string;
          services: Array<{ service_id: string }>;
        }
      | null = null;
    if (appointmentId) {
      appointment = await this.prisma.appointments.findFirst({
        where: { id: appointmentId, company_id: companyId },
        select: {
          id: true,
          branch_id: true,
          customer_id: true,
          status: true,
          services: { select: { service_id: true } },
        },
      });
      if (!appointment) {
        throw new NotFoundException('Appointment not found');
      }
      this.assertRequestedBranch(access, appointment.branch_id);
      if (appointment.customer_id !== purchase.customer_id) {
        throw new ConflictException(
          'Package purchase customer does not match the appointment customer',
        );
      }
      if (!appointment.services.some((item) => item.service_id === serviceId)) {
        throw new ConflictException(
          'Selected service is not part of the appointment',
        );
      }
      if (['cancelled', 'no_show'].includes(appointment.status)) {
        throw new ConflictException(
          'Cancelled or no-show appointments cannot redeem package sessions',
        );
      }
    } else if (!access.allBranches) {
      throw new BadRequestException(
        'Branch-scoped users must redeem a package against an appointment',
      );
    }

    if (professionalId) {
      const professional = await this.prisma.professionals.findFirst({
        where: {
          id: professionalId,
          company_id: companyId,
          deleted_at: null,
          is_active: true,
        },
        select: { id: true },
      });
      if (!professional) {
        throw new BadRequestException('Professional is invalid');
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.package_purchases.updateMany({
        where: {
          id: purchase.id,
          status: 'active',
          sessions_remaining: { gte: sessionsUsed },
          OR: [{ expires_at: null }, { expires_at: { gt: new Date() } }],
        },
        data: {
          sessions_remaining: { decrement: sessionsUsed },
        },
      });
      if (consumed.count !== 1) {
        throw new ConflictException(
          'Package sessions are no longer available for this redemption',
        );
      }

      const usage = await tx.package_usage.create({
        data: {
          package_purchase_id: purchase.id,
          appointment_id: appointmentId,
          service_id: serviceId,
          professional_id: professionalId,
          sessions_used: sessionsUsed,
        },
        include: {
          service: { select: { id: true, name: true } },
          appointment: {
            select: {
              id: true,
              status: true,
              starts_at: true,
              branch: { select: { id: true, name: true } },
            },
          },
        },
      });

      const updatedPurchase = await tx.package_purchases.findUnique({
        where: { id: purchase.id },
      });
      if (updatedPurchase && updatedPurchase.sessions_remaining <= 0) {
        await tx.package_purchases.update({
          where: { id: purchase.id },
          data: { status: 'exhausted' },
        });
      }

      return {
        usage,
        packagePurchase: {
          ...updatedPurchase,
          status:
            updatedPurchase && updatedPurchase.sessions_remaining <= 0
              ? 'exhausted'
              : updatedPurchase?.status,
        },
        customer: purchase.customer,
        package: purchase.package,
      };
    });

    await this.auditMutation(
      user,
      companyId,
      'package.redeem',
      'package_purchase',
      purchase.id,
      {
        sessionsRemaining: purchase.sessions_remaining,
        status: purchase.status,
      },
      {
        sessionsUsed,
        serviceId,
        appointmentId,
        professionalId,
        sessionsRemaining: result.packagePurchase?.sessions_remaining,
        status: result.packagePurchase?.status,
      },
      appointment?.branch_id ?? null,
    );

    return result;
  }

  async inventory(user: AuthenticatedUser, companyId: string, branchId?: string) {
    const access = this.companyAccess(user, companyId);
    this.assertRequestedBranch(access, branchId);
    const branchFilter = branchId
      ? { branch_id: branchId }
      : access.allBranches
        ? {}
        : { OR: [{ branch_id: { in: access.branchIds } }, { branch_id: null }] };

    const products = await this.prisma.products.findMany({
      where: { company_id: companyId },
      include: {
        inventory: {
          where: branchFilter as any,
          include: { branch: { select: { id: true, name: true } } },
          orderBy: [{ branch_id: 'asc' }, { created_at: 'asc' }],
        },
      },
      orderBy: [{ is_active: 'desc' }, { name: 'asc' }],
    });

    return products.map((product) => {
      const onHand = product.inventory.reduce((sum, row) => sum + row.quantity_on_hand, 0);
      const reserved = product.inventory.reduce((sum, row) => sum + row.quantity_reserved, 0);
      const lowStock = product.inventory.some(
        (row) => row.is_active && row.quantity_on_hand - row.quantity_reserved <= row.reorder_level,
      );
      return { ...product, onHand, reserved, available: onHand - reserved, lowStock };
    });
  }

  async createProduct(user: AuthenticatedUser, companyId: string, dto: any) {
    const access = this.companyAccess(user, companyId);
    if (!access.allBranches) throw new ForbiddenException('Product creation requires company-level access');
    const name = String(dto.name ?? '').trim();
    const currencyCode = String(dto.currencyCode ?? '').trim().toUpperCase();
    const price = Number(dto.price);
    if (!name) throw new BadRequestException('Product name is required');
    if (!currencyCode || currencyCode.length !== 3) throw new BadRequestException('currencyCode must be 3 characters');
    if (!Number.isFinite(price) || price < 0) throw new BadRequestException('Product price must be zero or greater');

    if (dto.sku) {
      const exists = await this.prisma.products.findFirst({ where: { company_id: companyId, sku: String(dto.sku).trim() } });
      if (exists) throw new ConflictException('SKU already exists for this business');
    }
    if (dto.barcode) {
      const exists = await this.prisma.products.findFirst({ where: { company_id: companyId, barcode: String(dto.barcode).trim() } });
      if (exists) throw new ConflictException('Barcode already exists for this business');
    }

    const product = await this.prisma.products.create({
      data: {
        company_id: companyId,
        category_id: dto.categoryId || null,
        sku: dto.sku ? String(dto.sku).trim() : null,
        barcode: dto.barcode ? String(dto.barcode).trim() : null,
        name,
        description: dto.description || null,
        price,
        cost: dto.cost == null ? null : Number(dto.cost),
        currency_code: currencyCode,
        is_salable: dto.isSalable !== false,
        is_consumable: dto.isConsumable === true,
        tax_percent: dto.taxPercent == null ? null : Number(dto.taxPercent),
        tags: Array.isArray(dto.tags) ? dto.tags.map(String) : [],
      },
    });

    if (dto.branchId || dto.initialQuantity != null) {
      if (dto.branchId) await this.assertBranchesBelongToCompany(companyId, [String(dto.branchId)], access);
      const quantity = Math.trunc(Number(dto.initialQuantity ?? 0));
      const inventory = await this.prisma.inventory_items.create({
        data: {
          product_id: product.id,
          branch_id: dto.branchId || null,
          quantity_on_hand: quantity,
          reorder_level: Math.max(0, Math.trunc(Number(dto.reorderLevel ?? 0))),
          reorder_quantity: dto.reorderQuantity == null ? null : Math.max(0, Math.trunc(Number(dto.reorderQuantity))),
          cost_unit: dto.cost == null ? null : Number(dto.cost),
          location_note: dto.locationNote || null,
          batch_number: dto.batchNumber || null,
          expires_at: dto.expiresAt ? new Date(dto.expiresAt) : null,
          last_restocked_at: quantity > 0 ? new Date() : null,
        },
      });
      if (quantity !== 0) {
        await this.prisma.inventory_movements.create({
          data: {
            product_id: product.id,
            inventory_id: inventory.id,
            branch_id: inventory.branch_id,
            movement_type: 'opening',
            quantity_change: quantity,
            balance_after: quantity,
            reason: 'Initial stock',
            unit_cost: product.cost,
            created_by_id: user.id,
          },
        });
      }
    }

    await this.auditMutation(user, companyId, 'product.create', 'product', product.id, undefined, product);
    return product;
  }

  async updateProduct(user: AuthenticatedUser, companyId: string, productId: string, dto: any) {
    this.companyAccess(user, companyId);
    const existing = await this.prisma.products.findFirst({ where: { id: productId, company_id: companyId } });
    if (!existing) throw new NotFoundException('Product not found');
    if (dto.sku && dto.sku !== existing.sku) {
      const duplicate = await this.prisma.products.findFirst({ where: { company_id: companyId, sku: String(dto.sku).trim(), id: { not: productId } } });
      if (duplicate) throw new ConflictException('SKU already exists for this business');
    }
    if (dto.barcode && dto.barcode !== existing.barcode) {
      const duplicate = await this.prisma.products.findFirst({ where: { company_id: companyId, barcode: String(dto.barcode).trim(), id: { not: productId } } });
      if (duplicate) throw new ConflictException('Barcode already exists for this business');
    }
    const updated = await this.prisma.products.update({
      where: { id: productId },
      data: {
        ...(dto.categoryId !== undefined ? { category_id: dto.categoryId || null } : {}),
        ...(dto.sku !== undefined ? { sku: dto.sku ? String(dto.sku).trim() : null } : {}),
        ...(dto.barcode !== undefined ? { barcode: dto.barcode ? String(dto.barcode).trim() : null } : {}),
        ...(dto.name !== undefined ? { name: String(dto.name).trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description || null } : {}),
        ...(dto.price !== undefined ? { price: Number(dto.price) } : {}),
        ...(dto.cost !== undefined ? { cost: dto.cost == null ? null : Number(dto.cost) } : {}),
        ...(dto.currencyCode !== undefined ? { currency_code: String(dto.currencyCode).toUpperCase() } : {}),
        ...(dto.isActive !== undefined ? { is_active: Boolean(dto.isActive) } : {}),
        ...(dto.isSalable !== undefined ? { is_salable: Boolean(dto.isSalable) } : {}),
        ...(dto.isConsumable !== undefined ? { is_consumable: Boolean(dto.isConsumable) } : {}),
        ...(dto.taxPercent !== undefined ? { tax_percent: dto.taxPercent == null ? null : Number(dto.taxPercent) } : {}),
        ...(dto.tags !== undefined ? { tags: Array.isArray(dto.tags) ? dto.tags.map(String) : [] } : {}),
      },
    });
    await this.auditMutation(user, companyId, 'product.update', 'product', productId, existing, updated);
    return updated;
  }

  async stockMovement(user: AuthenticatedUser, companyId: string, productId: string, dto: any) {
    const access = this.companyAccess(user, companyId);
    const branchId = dto.branchId ? String(dto.branchId) : null;
    if (branchId) await this.assertBranchesBelongToCompany(companyId, [branchId], access);
    if (!access.allBranches && !branchId) {
      throw new BadRequestException('Branch-scoped users must select an authorized branch');
    }
    const delta = Math.trunc(Number(dto.quantityChange));
    if (!Number.isFinite(delta) || delta === 0) throw new BadRequestException('quantityChange must be a non-zero integer');
    const product = await this.prisma.products.findFirst({ where: { id: productId, company_id: companyId, is_active: true } });
    if (!product) throw new NotFoundException('Product not found');

    const result = await this.prisma.$transaction(async (tx) => {
      let inventory = await tx.inventory_items.findFirst({
        where: {
          product_id: productId,
          branch_id: branchId,
          batch_number: dto.batchNumber ? String(dto.batchNumber) : null,
          is_active: true,
        },
      });
      if (!inventory) {
        if (delta < 0) throw new ConflictException('Cannot remove stock from a missing inventory record');
        inventory = await tx.inventory_items.create({
          data: {
            product_id: productId,
            branch_id: branchId,
            batch_number: dto.batchNumber ? String(dto.batchNumber) : null,
            quantity_on_hand: 0,
            reorder_level: Math.max(0, Math.trunc(Number(dto.reorderLevel ?? 0))),
            reorder_quantity: dto.reorderQuantity == null ? null : Math.max(0, Math.trunc(Number(dto.reorderQuantity))),
            cost_unit: dto.unitCost == null ? product.cost : Number(dto.unitCost),
            location_note: dto.locationNote || null,
            expires_at: dto.expiresAt ? new Date(dto.expiresAt) : null,
          },
        });
      }
      const balance = inventory.quantity_on_hand + delta;
      if (balance < inventory.quantity_reserved) {
        throw new ConflictException('Stock movement would reduce quantity below reserved stock');
      }
      const updated = await tx.inventory_items.update({
        where: { id: inventory.id },
        data: {
          quantity_on_hand: balance,
          ...(delta > 0 ? { last_restocked_at: new Date() } : {}),
          ...(dto.reorderLevel !== undefined ? { reorder_level: Math.max(0, Math.trunc(Number(dto.reorderLevel))) } : {}),
          ...(dto.reorderQuantity !== undefined ? { reorder_quantity: dto.reorderQuantity == null ? null : Math.max(0, Math.trunc(Number(dto.reorderQuantity))) } : {}),
          ...(dto.locationNote !== undefined ? { location_note: dto.locationNote || null } : {}),
          ...(dto.expiresAt !== undefined ? { expires_at: dto.expiresAt ? new Date(dto.expiresAt) : null } : {}),
          ...(dto.unitCost !== undefined ? { cost_unit: dto.unitCost == null ? null : Number(dto.unitCost) } : {}),
        },
      });
      const movement = await tx.inventory_movements.create({
        data: {
          product_id: productId,
          inventory_id: inventory.id,
          branch_id: branchId,
          movement_type: String(dto.movementType || (delta > 0 ? 'stock_in' : 'stock_out')),
          quantity_change: delta,
          balance_after: balance,
          reference_id: dto.referenceId || null,
          reference_type: dto.referenceType || null,
          reason: dto.reason || null,
          unit_cost: dto.unitCost == null ? product.cost : Number(dto.unitCost),
          created_by_id: user.id,
        },
      });
      return { inventory: updated, movement };
    });
    await this.auditMutation(user, companyId, 'inventory.movement', 'product', productId, undefined, result, branchId);
    return result;
  }

  async inventoryMovements(user: AuthenticatedUser, companyId: string, productId?: string, branchId?: string, limit = 100) {
    const access = this.companyAccess(user, companyId);
    this.assertRequestedBranch(access, branchId);
    return this.prisma.inventory_movements.findMany({
      where: {
        product: { company_id: companyId },
        ...(productId ? { product_id: productId } : {}),
        ...(branchId ? { branch_id: branchId } : access.allBranches ? {} : { branch_id: { in: access.branchIds } }),
      },
      include: { product: { select: { id: true, name: true, sku: true, barcode: true } }, branch: { select: { id: true, name: true } } },
      orderBy: { created_at: 'desc' },
      take: Math.min(Math.max(limit, 1), 250),
    });
  }

  async professionalSchedules(user: AuthenticatedUser, companyId: string, professionalId: string) {
    const access = this.companyAccess(user, companyId);
    const professional = await this.prisma.professionals.findFirst({ where: { id: professionalId, company_id: companyId, deleted_at: null } });
    if (!professional) throw new NotFoundException('Professional not found');
    return this.prisma.professional_schedules.findMany({
      where: {
        professional_id: professionalId,
        ...(access.allBranches ? {} : { branch_id: { in: access.branchIds } }),
      },
      include: { branch: { select: { id: true, name: true } } },
      orderBy: [{ branch_id: 'asc' }, { day_of_week: 'asc' }, { effective_from: 'desc' }],
    });
  }

  async replaceProfessionalSchedule(user: AuthenticatedUser, companyId: string, professionalId: string, dto: any) {
    const access = this.companyAccess(user, companyId);
    const branchId = String(dto.branchId || '');
    if (!branchId) throw new BadRequestException('branchId is required');
    await this.assertBranchesBelongToCompany(companyId, [branchId], access);
    const professional = await this.prisma.professionals.findFirst({ where: { id: professionalId, company_id: companyId, deleted_at: null } });
    if (!professional) throw new NotFoundException('Professional not found');
    const schedules = Array.isArray(dto.schedules) ? dto.schedules : [];
    for (const row of schedules) {
      const day = Number(row.dayOfWeek);
      if (!Number.isInteger(day) || day < 0 || day > 6) throw new BadRequestException('dayOfWeek must be between 0 and 6');
      if (!row.isOff && (!row.startsAt || !row.endsAt)) throw new BadRequestException('Working days require startsAt and endsAt');
    }
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.professional_schedules.deleteMany({ where: { professional_id: professionalId, branch_id: branchId } });
      if (schedules.length) {
        await tx.professional_schedules.createMany({
          data: schedules.map((row: any) => ({
            professional_id: professionalId,
            branch_id: branchId,
            day_of_week: Number(row.dayOfWeek),
            is_off: row.isOff === true,
            starts_at: row.isOff ? null : String(row.startsAt),
            ends_at: row.isOff ? null : String(row.endsAt),
            break_starts_at: row.breakStartsAt || null,
            break_ends_at: row.breakEndsAt || null,
            effective_from: row.effectiveFrom ? new Date(row.effectiveFrom) : null,
            effective_to: row.effectiveTo ? new Date(row.effectiveTo) : null,
          })),
        });
      }
      return tx.professional_schedules.findMany({
        where: { professional_id: professionalId, branch_id: branchId },
        orderBy: { day_of_week: 'asc' },
      });
    });
    await this.auditMutation(user, companyId, 'professional.schedule.replace', 'professional', professionalId, undefined, result, branchId);
    return result;
  }

  async commissionRules(user: AuthenticatedUser, companyId: string) {
    this.companyAccess(user, companyId);
    return this.prisma.commission_rules.findMany({
      where: { company_id: companyId },
      orderBy: [{ is_active: 'desc' }, { sort_order: 'asc' }, { created_at: 'desc' }],
    });
  }

  async createCommissionRule(user: AuthenticatedUser, companyId: string, dto: any) {
    this.companyAccess(user, companyId);
    const type = String(dto.calculationType || '');
    if (!['percentage', 'fixed', 'tiered'].includes(type)) throw new BadRequestException('Unsupported commission calculation type');
    if (type === 'percentage' && (dto.percentRate == null || Number(dto.percentRate) < 0 || Number(dto.percentRate) > 100)) {
      throw new BadRequestException('percentRate must be between 0 and 100');
    }
    if (type === 'fixed' && (dto.fixedAmount == null || Number(dto.fixedAmount) < 0)) {
      throw new BadRequestException('fixedAmount must be zero or greater');
    }
    const rule = await this.prisma.commission_rules.create({
      data: {
        company_id: companyId,
        name: String(dto.name || '').trim() || 'Commission rule',
        description: dto.description || null,
        professional_id: dto.professionalId || null,
        service_category_id: dto.serviceCategoryId || null,
        service_id: dto.serviceId || null,
        calculation_type: type,
        percent_rate: dto.percentRate == null ? null : Number(dto.percentRate),
        fixed_amount: dto.fixedAmount == null ? null : Number(dto.fixedAmount),
        tiered_rates: dto.tieredRates ?? undefined,
        effective_from: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null,
        effective_to: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        sort_order: Math.trunc(Number(dto.sortOrder ?? 0)),
      },
    });
    await this.auditMutation(user, companyId, 'commission_rule.create', 'commission_rule', rule.id, undefined, rule);
    return rule;
  }

  async updateCommissionRule(user: AuthenticatedUser, companyId: string, ruleId: string, dto: any) {
    this.companyAccess(user, companyId);
    const existing = await this.prisma.commission_rules.findFirst({ where: { id: ruleId, company_id: companyId } });
    if (!existing) throw new NotFoundException('Commission rule not found');
    const updated = await this.prisma.commission_rules.update({
      where: { id: ruleId },
      data: {
        ...(dto.name !== undefined ? { name: String(dto.name).trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description || null } : {}),
        ...(dto.professionalId !== undefined ? { professional_id: dto.professionalId || null } : {}),
        ...(dto.serviceCategoryId !== undefined ? { service_category_id: dto.serviceCategoryId || null } : {}),
        ...(dto.serviceId !== undefined ? { service_id: dto.serviceId || null } : {}),
        ...(dto.calculationType !== undefined ? { calculation_type: String(dto.calculationType) } : {}),
        ...(dto.percentRate !== undefined ? { percent_rate: dto.percentRate == null ? null : Number(dto.percentRate) } : {}),
        ...(dto.fixedAmount !== undefined ? { fixed_amount: dto.fixedAmount == null ? null : Number(dto.fixedAmount) } : {}),
        ...(dto.tieredRates !== undefined ? { tiered_rates: dto.tieredRates } : {}),
        ...(dto.effectiveFrom !== undefined ? { effective_from: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null } : {}),
        ...(dto.effectiveTo !== undefined ? { effective_to: dto.effectiveTo ? new Date(dto.effectiveTo) : null } : {}),
        ...(dto.isActive !== undefined ? { is_active: Boolean(dto.isActive) } : {}),
        ...(dto.sortOrder !== undefined ? { sort_order: Math.trunc(Number(dto.sortOrder)) } : {}),
      },
    });
    await this.auditMutation(user, companyId, 'commission_rule.update', 'commission_rule', ruleId, existing, updated);
    return updated;
  }

  async consentForms(user: AuthenticatedUser, companyId: string) {
    this.companyAccess(user, companyId);
    return this.prisma.consent_forms.findMany({
      where: { company_id: companyId },
      include: { _count: { select: { responses: true } } },
      orderBy: [{ is_active: 'desc' }, { updated_at: 'desc' }],
    });
  }

  async createConsentForm(user: AuthenticatedUser, companyId: string, dto: any) {
    this.companyAccess(user, companyId);
    const name = String(dto.name || '').trim();
    const content = String(dto.contentPlain || '').trim();
    if (!name || !content) throw new BadRequestException('Consent form name and contentPlain are required');
    const form = await this.prisma.consent_forms.create({
      data: {
        company_id: companyId,
        name,
        description: dto.description || null,
        form_type: String(dto.formType || 'general'),
        content_html: dto.contentHtml || null,
        content_plain: content,
        fields_json: dto.fieldsJson ?? undefined,
        require_signature: dto.requireSignature !== false,
        require_photo_id: dto.requirePhotoId === true,
        expires_days: dto.expiresDays == null ? null : Math.max(1, Math.trunc(Number(dto.expiresDays))),
      },
    });
    await this.auditMutation(user, companyId, 'consent_form.create', 'consent_form', form.id, undefined, form);
    return form;
  }

  async updateConsentForm(user: AuthenticatedUser, companyId: string, formId: string, dto: any) {
    this.companyAccess(user, companyId);
    const existing = await this.prisma.consent_forms.findFirst({ where: { id: formId, company_id: companyId } });
    if (!existing) throw new NotFoundException('Consent form not found');
    const contentChanged =
      (dto.contentPlain !== undefined && dto.contentPlain !== existing.content_plain) ||
      (dto.contentHtml !== undefined && dto.contentHtml !== existing.content_html) ||
      (dto.fieldsJson !== undefined && JSON.stringify(dto.fieldsJson) !== JSON.stringify(existing.fields_json));
    const updated = await this.prisma.consent_forms.update({
      where: { id: formId },
      data: {
        ...(dto.name !== undefined ? { name: String(dto.name).trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description || null } : {}),
        ...(dto.formType !== undefined ? { form_type: String(dto.formType) } : {}),
        ...(dto.contentPlain !== undefined ? { content_plain: String(dto.contentPlain) } : {}),
        ...(dto.contentHtml !== undefined ? { content_html: dto.contentHtml || null } : {}),
        ...(dto.fieldsJson !== undefined ? { fields_json: dto.fieldsJson } : {}),
        ...(dto.requireSignature !== undefined ? { require_signature: Boolean(dto.requireSignature) } : {}),
        ...(dto.requirePhotoId !== undefined ? { require_photo_id: Boolean(dto.requirePhotoId) } : {}),
        ...(dto.expiresDays !== undefined ? { expires_days: dto.expiresDays == null ? null : Math.max(1, Math.trunc(Number(dto.expiresDays))) } : {}),
        ...(dto.isActive !== undefined ? { is_active: Boolean(dto.isActive) } : {}),
        ...(contentChanged ? { version: { increment: 1 } } : {}),
      },
    });
    await this.auditMutation(user, companyId, 'consent_form.update', 'consent_form', formId, existing, updated);
    return updated;
  }

  async serviceStructure(user: AuthenticatedUser, companyId: string, serviceId: string) {
    this.companyAccess(user, companyId);
    const service = await this.prisma.services.findFirst({
      where: { id: serviceId, company_id: companyId, deleted_at: null },
      select: { id: true, name: true, duration_minutes: true },
    });
    if (!service) throw new NotFoundException('Service not found');
    const [dependencies, stages] = await Promise.all([
      this.prisma.service_dependencies.findMany({
        where: { service_id: serviceId },
        include: {
          prerequisite: {
            select: { id: true, name: true, duration_minutes: true, is_active: true },
          },
        },
        orderBy: { created_at: 'asc' },
      }),
      this.prisma.service_stages.findMany({
        where: { service_id: serviceId },
        include: {
          resource_type: {
            select: { id: true, code: true, key: true, name: true, is_active: true },
          },
        },
        orderBy: [{ stage_order: 'asc' }, { created_at: 'asc' }],
      }),
    ]);
    return { service, dependencies, stages };
  }

  async replaceServiceDependencies(
    user: AuthenticatedUser,
    companyId: string,
    serviceId: string,
    dto: any,
  ) {
    this.companyAccess(user, companyId);
    const service = await this.prisma.services.findFirst({
      where: { id: serviceId, company_id: companyId, deleted_at: null },
      select: { id: true, name: true },
    });
    if (!service) throw new NotFoundException('Service not found');

    const rows = Array.isArray(dto.dependencies) ? dto.dependencies : [];
    const prerequisiteIds: string[] = Array.from(
      new Set<string>(
        rows
          .map((row: any): string => String(row.prerequisiteId || '').trim())
          .filter((value: string): value is string => value.length > 0),
      ),
    );
    if (prerequisiteIds.includes(serviceId)) {
      throw new BadRequestException('A service cannot depend on itself');
    }
    if (prerequisiteIds.length !== rows.length) {
      throw new BadRequestException('Dependencies must be unique and include prerequisiteId');
    }

    if (prerequisiteIds.length) {
      const validCount = await this.prisma.services.count({
        where: {
          id: { in: prerequisiteIds },
          company_id: companyId,
          is_active: true,
          deleted_at: null,
        },
      });
      if (validCount !== prerequisiteIds.length) {
        throw new BadRequestException('One or more prerequisite services are invalid');
      }
    }

    for (const row of rows) {
      const minGap = Math.trunc(Number(row.minGapMinutes ?? 0));
      const maxGap =
        row.maxGapMinutes === null || row.maxGapMinutes === undefined
          ? null
          : Math.trunc(Number(row.maxGapMinutes));
      if (!Number.isFinite(minGap) || minGap < 0) {
        throw new BadRequestException('minGapMinutes must be zero or greater');
      }
      if (maxGap !== null && (!Number.isFinite(maxGap) || maxGap < minGap)) {
        throw new BadRequestException('maxGapMinutes must be greater than or equal to minGapMinutes');
      }
    }

    const existing = await this.prisma.service_dependencies.findMany({
      where: {
        service: { company_id: companyId },
        service_id: { not: serviceId },
      },
      select: { service_id: true, prerequisite_id: true },
    });
    const graph = new Map<string, string[]>();
    const addEdge = (from: string, to: string) => {
      const list = graph.get(from) ?? [];
      list.push(to);
      graph.set(from, list);
    };
    for (const edge of existing) addEdge(edge.service_id, edge.prerequisite_id);
    for (const prerequisiteId of prerequisiteIds) addEdge(serviceId, prerequisiteId);

    const visiting = new Set<string>();
    const visited = new Set<string>();
    const hasCycle = (node: string): boolean => {
      if (visiting.has(node)) return true;
      if (visited.has(node)) return false;
      visiting.add(node);
      for (const next of graph.get(node) ?? []) {
        if (hasCycle(next)) return true;
      }
      visiting.delete(node);
      visited.add(node);
      return false;
    };
    for (const node of graph.keys()) {
      if (hasCycle(node)) {
        throw new ConflictException('Service dependencies would create a circular dependency');
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.service_dependencies.deleteMany({ where: { service_id: serviceId } });
      if (rows.length) {
        await tx.service_dependencies.createMany({
          data: rows.map((row: any) => ({
            service_id: serviceId,
            prerequisite_id: String(row.prerequisiteId),
            min_gap_minutes: Math.trunc(Number(row.minGapMinutes ?? 0)),
            max_gap_minutes:
              row.maxGapMinutes === null || row.maxGapMinutes === undefined
                ? null
                : Math.trunc(Number(row.maxGapMinutes)),
            is_optional: row.isOptional === true,
          })),
        });
      }
      return tx.service_dependencies.findMany({
        where: { service_id: serviceId },
        include: {
          prerequisite: { select: { id: true, name: true, duration_minutes: true } },
        },
        orderBy: { created_at: 'asc' },
      });
    });
    await this.auditMutation(
      user,
      companyId,
      'service.dependencies.replace',
      'service',
      serviceId,
      undefined,
      result,
    );
    return result;
  }

  async replaceServiceStages(
    user: AuthenticatedUser,
    companyId: string,
    serviceId: string,
    dto: any,
  ) {
    this.companyAccess(user, companyId);
    const service = await this.prisma.services.findFirst({
      where: { id: serviceId, company_id: companyId, deleted_at: null },
      select: { id: true, name: true, duration_minutes: true },
    });
    if (!service) throw new NotFoundException('Service not found');

    const rows = Array.isArray(dto.stages) ? dto.stages : [];
    const orders = rows.map((row: any) => Math.trunc(Number(row.stageOrder)));
    if (new Set(orders).size !== orders.length) {
      throw new BadRequestException('Each service stage must have a unique stageOrder');
    }
    for (const row of rows) {
      const name = String(row.name || '').trim();
      const order = Math.trunc(Number(row.stageOrder));
      const duration = Math.trunc(Number(row.durationMinutes));
      if (!name) throw new BadRequestException('Each service stage requires a name');
      if (!Number.isInteger(order) || order < 1) {
        throw new BadRequestException('stageOrder must be a positive integer');
      }
      if (!Number.isInteger(duration) || duration < 1) {
        throw new BadRequestException('durationMinutes must be a positive integer');
      }
    }

    const resourceTypeIds: string[] = Array.from(
      new Set<string>(
        rows
          .map((row: any): string =>
            row.resourceTypeId ? String(row.resourceTypeId) : '',
          )
          .filter((value: string): value is string => value.length > 0),
      ),
    );
    if (resourceTypeIds.length) {
      const validCount = await this.prisma.resource_types.count({
        where: { id: { in: resourceTypeIds }, is_active: true },
      });
      if (validCount !== resourceTypeIds.length) {
        throw new BadRequestException('One or more resource types are invalid');
      }
    }

    const totalStageDuration = rows.reduce(
      (sum: number, row: any) => sum + Math.trunc(Number(row.durationMinutes)),
      0,
    );
    if (rows.length && totalStageDuration > service.duration_minutes) {
      throw new BadRequestException(
        'Combined stage duration cannot exceed the service duration',
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.service_stages.deleteMany({ where: { service_id: serviceId } });
      if (rows.length) {
        await tx.service_stages.createMany({
          data: rows.map((row: any) => ({
            service_id: serviceId,
            stage_order: Math.trunc(Number(row.stageOrder)),
            name: String(row.name).trim(),
            description: row.description ? String(row.description).trim() : null,
            duration_minutes: Math.trunc(Number(row.durationMinutes)),
            resource_type_id: row.resourceTypeId ? String(row.resourceTypeId) : null,
          })),
        });
      }
      return tx.service_stages.findMany({
        where: { service_id: serviceId },
        include: {
          resource_type: { select: { id: true, code: true, key: true, name: true } },
        },
        orderBy: { stage_order: 'asc' },
      });
    });
    await this.auditMutation(
      user,
      companyId,
      'service.stages.replace',
      'service',
      serviceId,
      undefined,
      result,
    );
    return result;
  }

  consentFormTemplates(user: AuthenticatedUser, companyId: string) {
    this.companyAccess(user, companyId);
    return [
      {
        key: 'general_service',
        name: 'General service consent',
        formType: 'general',
        description: 'General acknowledgement of service scope, aftercare and risks.',
        contentPlain:
          'I confirm that the service, expected result, aftercare, relevant risks and opportunity to ask questions were explained to me. I consent to receive the selected service.',
        requireSignature: true,
        requirePhotoId: false,
        expiresDays: null,
      },
      {
        key: 'client_intake',
        name: 'Client intake',
        formType: 'intake',
        description: 'Reusable intake template for preferences, sensitivities and service history.',
        contentPlain:
          'I confirm that the information I provide about preferences, sensitivities, allergies, medications and relevant service history is accurate to the best of my knowledge.',
        fieldsJson: {
          fields: [
            { key: 'allergies', type: 'textarea', required: false },
            { key: 'medications', type: 'textarea', required: false },
            { key: 'sensitivities', type: 'textarea', required: false },
            { key: 'serviceHistory', type: 'textarea', required: false },
          ],
        },
        requireSignature: true,
        requirePhotoId: false,
        expiresDays: 365,
      },
      {
        key: 'medical_allergy',
        name: 'Medical & allergy acknowledgement',
        formType: 'medical',
        description: 'Medical/allergy acknowledgement before higher-risk services.',
        contentPlain:
          'I have disclosed known allergies, sensitivities, medical conditions and medications relevant to this service. I understand I should stop the service and inform staff if I experience discomfort or a reaction.',
        requireSignature: true,
        requirePhotoId: false,
        expiresDays: 180,
      },
      {
        key: 'media_release',
        name: 'Photo & media release',
        formType: 'media',
        description: 'Optional authorization for before/after portfolio and social content.',
        contentPlain:
          'I authorize the business to use approved before/after photos or videos of the completed work for portfolio and promotional purposes. I understand this consent may be revoked for future use.',
        requireSignature: true,
        requirePhotoId: false,
        expiresDays: null,
      },
      {
        key: 'health_screening',
        name: 'Health screening',
        formType: 'health',
        description: 'Reusable health-screening template for services requiring a current wellness declaration.',
        contentPlain:
          'I confirm that I have disclosed any current symptoms, conditions or exposure information that may affect whether this service should proceed safely today.',
        requireSignature: true,
        requirePhotoId: false,
        expiresDays: 30,
      },
    ];
  }

  async createConsentFormFromTemplate(
    user: AuthenticatedUser,
    companyId: string,
    templateKey: string,
    overrides: any,
  ) {
    const template = this.consentFormTemplates(user, companyId).find(
      (item) => item.key === templateKey,
    );
    if (!template) throw new NotFoundException('Consent form template not found');
    return this.createConsentForm(user, companyId, {
      ...template,
      ...overrides,
      name: overrides?.name || template.name,
      formType: overrides?.formType || template.formType,
      contentPlain: overrides?.contentPlain || template.contentPlain,
      fieldsJson: overrides?.fieldsJson ?? (template as any).fieldsJson,
      requireSignature:
        overrides?.requireSignature ?? template.requireSignature,
      requirePhotoId:
        overrides?.requirePhotoId ?? template.requirePhotoId,
      expiresDays: overrides?.expiresDays ?? template.expiresDays,
    });
  }


}
