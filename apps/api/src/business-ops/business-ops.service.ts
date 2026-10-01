import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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

}
