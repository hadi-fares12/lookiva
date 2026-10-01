import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function pageArgs(page: number, limit: number, max = 250) {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(max, Math.max(1, limit));
  return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit };
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  private async writeAudit(actorUserId: string, action: string, entityType: string, entityId: string, oldValue?: unknown, newValue?: unknown, companyId?: string | null) {
    await this.prisma.audit_logs.create({
      data: {
        actor_user_id: actorUserId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        company_id: companyId ?? null,
        old_value: oldValue as any,
        new_value: newValue as any,
      },
    });
  }

  async setUserActive(actorUserId: string, userId: string, isActive: boolean, reason?: string) {
    if (actorUserId === userId && !isActive) throw new BadRequestException('You cannot suspend your own admin account');
    const existing = await this.prisma.users.findUnique({ where: { id: userId }, select: { id: true, is_active: true, full_name: true } });
    if (!existing) throw new NotFoundException('User not found');
    const updated = await this.prisma.users.update({ where: { id: userId }, data: { is_active: isActive, ...(isActive ? { deleted_at: null } : {}) }, select: { id: true, full_name: true, email: true, phone: true, is_active: true, updated_at: true } });
    if (!isActive) await this.prisma.sessions.updateMany({ where: { user_id: userId, revoked_at: null }, data: { revoked_at: new Date() } });
    await this.writeAudit(actorUserId, isActive ? 'user.reactivate' : 'user.suspend', 'user', userId, existing, { ...updated, reason });
    return updated;
  }

  async setBusinessActive(actorUserId: string, companyId: string, isActive: boolean, reason?: string) {
    const existing = await this.prisma.companies.findUnique({ where: { id: companyId }, select: { id: true, display_name: true, is_active: true } });
    if (!existing) throw new NotFoundException('Business not found');
    const updated = await this.prisma.companies.update({ where: { id: companyId }, data: { is_active: isActive }, select: { id: true, display_name: true, is_active: true, is_verified: true, updated_at: true } });
    await this.writeAudit(actorUserId, isActive ? 'business.reactivate' : 'business.suspend', 'company', companyId, existing, { ...updated, reason }, companyId);
    return updated;
  }

  async reviewBusinessVerification(actorUserId: string, companyId: string, status: 'approved' | 'rejected' | 'reviewing', reason?: string) {
    const company = await this.prisma.companies.findUnique({ where: { id: companyId }, include: { verification: true } });
    if (!company) throw new NotFoundException('Business not found');
    if (!company.verification) throw new BadRequestException('Business has no verification submission');
    if (status === 'rejected' && !reason?.trim()) throw new BadRequestException('A rejection reason is required');
    const now = new Date();
    const result = await this.prisma.$transaction(async (tx) => {
      const verification = await tx.company_verification.update({
        where: { company_id: companyId },
        data: { status, reviewed_by_user_id: actorUserId, reviewed_at: status === 'reviewing' ? null : now, rejection_reason: status === 'rejected' ? reason : null },
      });
      const updatedCompany = await tx.companies.update({
        where: { id: companyId },
        data: { is_verified: status === 'approved', verified_at: status === 'approved' ? now : null },
      });
      return { verification, company: updatedCompany };
    });
    await this.writeAudit(actorUserId, `business.verification.${status}`, 'company_verification', company.verification.id, { status: company.verification.status }, { status, reason }, companyId);
    return result;
  }

  async updateFeatureFlag(actorUserId: string, key: string, patch: any) {
    const existing = await this.prisma.feature_flags.findUnique({ where: { key } });
    if (!existing) throw new NotFoundException('Feature flag not found');
    const updated = await this.prisma.feature_flags.update({
      where: { key },
      data: {
        ...(patch.isEnabled !== undefined ? { is_enabled: patch.isEnabled } : {}),
        ...(patch.rolloutPercent !== undefined ? { rollout_percent: patch.rolloutPercent } : {}),
        ...(patch.userIds !== undefined ? { user_ids: patch.userIds } : {}),
        ...(patch.countryCodes !== undefined ? { country_codes: patch.countryCodes } : {}),
        ...(patch.environment !== undefined ? { environment: patch.environment || null } : {}),
      },
    });
    await this.writeAudit(actorUserId, 'feature_flag.update', 'feature_flag', existing.id, existing, updated);
    return updated;
  }

  async updateRemoteConfig(actorUserId: string, key: string, patch: any) {
    const existing = await this.prisma.remote_config.findUnique({ where: { key } });
    if (!existing) throw new NotFoundException('Remote config key not found');
    const updated = await this.prisma.remote_config.update({
      where: { key },
      data: {
        value_json: patch.value as any,
        ...(patch.valueType !== undefined ? { value_type: patch.valueType } : {}),
        ...(patch.description !== undefined ? { description: patch.description || null } : {}),
        ...(patch.isPublic !== undefined ? { is_public: patch.isPublic } : {}),
        ...(patch.minAppVersion !== undefined ? { min_app_version: patch.minAppVersion || null } : {}),
        ...(patch.platforms !== undefined ? { platforms: patch.platforms } : {}),
      },
    });
    await this.writeAudit(actorUserId, 'remote_config.update', 'remote_config', existing.id, existing, updated);
    return updated;
  }

  async updateCategory(actorUserId: string, id: string, patch: any) {
    const existing = await this.prisma.service_categories.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Category not found');
    const updated = await this.prisma.service_categories.update({ where: { id }, data: {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.description !== undefined ? { description: patch.description || null } : {}),
      ...(patch.iconKey !== undefined ? { icon_key: patch.iconKey || null } : {}),
      ...(patch.isActive !== undefined ? { is_active: patch.isActive } : {}),
      ...(patch.isFeatured !== undefined ? { is_featured: patch.isFeatured } : {}),
      ...(patch.sortOrder !== undefined ? { sort_order: patch.sortOrder } : {}),
    } });
    await this.writeAudit(actorUserId, 'category.update', 'service_category', id, existing, updated);
    return updated;
  }

  async updateCountry(actorUserId: string, id: string, patch: any) {
    const existing = await this.prisma.countries.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Country not found');
    const updated = await this.prisma.countries.update({ where: { id }, data: {
      ...(patch.isActive !== undefined ? { is_active: patch.isActive } : {}),
      ...(patch.currencyCode !== undefined ? { currency_code: patch.currencyCode } : {}),
      ...(patch.timezones !== undefined ? { timezones: patch.timezones } : {}),
      ...(patch.sortOrder !== undefined ? { sort_order: patch.sortOrder } : {}),
    } });
    await this.writeAudit(actorUserId, 'country.update', 'country', id, existing, updated);
    return updated;
  }

  async updateTheme(actorUserId: string, id: string, patch: any) {
    const existing = await this.prisma.theme_settings.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Theme not found');
    const updated = await this.prisma.$transaction(async (tx) => {
      if (patch.isDefault === true) await tx.theme_settings.updateMany({ where: { id: { not: id }, is_default: true }, data: { is_default: false } });
      return tx.theme_settings.update({ where: { id }, data: {
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.palette !== undefined ? { palette: patch.palette as any } : {}),
        ...(patch.isActive !== undefined ? { is_active: patch.isActive } : {}),
        ...(patch.isDefault !== undefined ? { is_default: patch.isDefault } : {}),
        ...(patch.sortOrder !== undefined ? { sort_order: patch.sortOrder } : {}),
      } });
    });
    await this.writeAudit(actorUserId, 'theme.update', 'theme', id, existing, updated);
    return updated;
  }

  async updateSupportTicket(actorUserId: string, id: string, patch: any) {
    const existing = await this.prisma.support_tickets.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Support ticket not found');
    const terminal = ['resolved', 'closed'].includes(patch.status ?? existing.status);
    const updated = await this.prisma.support_tickets.update({ where: { id }, data: {
      ...(patch.status !== undefined ? { status: patch.status, closed_at: terminal ? new Date() : null } : {}),
      ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
      ...(patch.assignedToId !== undefined ? { assigned_to_id: patch.assignedToId || null } : {}),
    } });
    await this.writeAudit(actorUserId, 'support_ticket.update', 'support_ticket', id, existing, updated, existing.company_id);
    return updated;
  }

  async resolveDispute(actorUserId: string, id: string, patch: any) {
    const existing = await this.prisma.disputes.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Dispute not found');
    const resolved = ['resolved', 'closed', 'rejected'].includes(patch.status);
    const updated = await this.prisma.disputes.update({ where: { id }, data: {
      status: patch.status,
      resolution: patch.resolution ?? existing.resolution,
      resolution_amount: patch.resolutionAmount ?? existing.resolution_amount,
      resolved_by_id: resolved ? actorUserId : null,
      resolved_at: resolved ? new Date() : null,
    } });
    await this.writeAudit(actorUserId, 'dispute.update', 'dispute', id, existing, updated, existing.company_id);
    return updated;
  }

  async getStats() {
    const [usersCount, businessesCount, bookingsCount, revenueAgg, pendingVerification, openDisputes] = await Promise.all([
      this.prisma.users.count(),
      this.prisma.companies.count(),
      this.prisma.appointments.count(),
      this.prisma.payments.aggregate({ where: { status: { in: ['succeeded', 'partially_refunded'] } }, _sum: { amount: true } }),
      this.prisma.company_verification.count({ where: { status: { in: ['pending', 'submitted', 'reviewing'] } } }),
      this.prisma.disputes.count({ where: { status: { notIn: ['resolved', 'closed'] } } }),
    ]);
    return { usersCount, businessesCount, bookingsCount, revenue: Number(revenueAgg._sum.amount ?? 0), pendingVerification, openDisputes };
  }

  async listBusinesses(page = 1, limit = 20) {
    const p = pageArgs(page, limit);
    const [items, total] = await Promise.all([
      this.prisma.companies.findMany({ orderBy: { created_at: 'desc' }, take: p.limit, skip: p.skip, include: { owner_user: { select: { id: true, full_name: true, email: true } }, verification: true, _count: { select: { branches: true, professionals: true, appointments: true } } } }),
      this.prisma.companies.count(),
    ]);
    return { items, total, page: p.page, limit: p.limit, totalPages: Math.ceil(total / p.limit) };
  }

  async listUsers(page = 1, limit = 20) {
    const p = pageArgs(page, limit);
    const [items, total] = await Promise.all([
      this.prisma.users.findMany({ orderBy: { created_at: 'desc' }, take: p.limit, skip: p.skip, include: { role_scopes: { select: { role_key: true, scope_type: true, company_id: true, branch_id: true } } } }),
      this.prisma.users.count(),
    ]);
    return { items, total, page: p.page, limit: p.limit, totalPages: Math.ceil(total / p.limit) };
  }

  async bookings(page = 1, limit = 50, status?: string) {
    const p = pageArgs(page, limit);
    const where = status ? { status } : {};
    const [items, total] = await Promise.all([
      this.prisma.appointments.findMany({ where, orderBy: { starts_at: 'desc' }, take: p.limit, skip: p.skip, include: { company: { select: { id: true, display_name: true } }, branch: { select: { id: true, name: true } }, customer: { include: { user: { select: { full_name: true, email: true, phone: true } } } }, financial_snapshot: true } }),
      this.prisma.appointments.count({ where }),
    ]);
    return { items, total, page: p.page, limit: p.limit, totalPages: Math.ceil(total / p.limit) };
  }

  async payments(page = 1, limit = 50) {
    const p = pageArgs(page, limit);
    const [items, total] = await Promise.all([
      this.prisma.payments.findMany({ orderBy: { created_at: 'desc' }, take: p.limit, skip: p.skip, include: { company: { select: { id: true, display_name: true } }, refunds: true } }),
      this.prisma.payments.count(),
    ]);
    return { items, total, page: p.page, limit: p.limit, totalPages: Math.ceil(total / p.limit) };
  }

  async refunds(page = 1, limit = 50) {
    const p = pageArgs(page, limit);
    const [items, total] = await Promise.all([
      this.prisma.refunds.findMany({ orderBy: { created_at: 'desc' }, take: p.limit, skip: p.skip, include: { payment: { select: { id: true, payment_method: true, reference_code: true } } } }),
      this.prisma.refunds.count(),
    ]);
    return { items, total, page: p.page, limit: p.limit, totalPages: Math.ceil(total / p.limit) };
  }

  categories() {
    return this.prisma.service_categories.findMany({ orderBy: [{ depth_level: 'asc' }, { sort_order: 'asc' }, { name: 'asc' }] });
  }

  countries() {
    return this.prisma.countries.findMany({ orderBy: [{ is_active: 'desc' }, { sort_order: 'asc' }, { name: 'asc' }], include: { regions: { select: { id: true, name: true, is_active: true } } } });
  }

  themes() {
    return Promise.all([
      this.prisma.theme_settings.findMany({ orderBy: { created_at: 'desc' } }),
      this.prisma.platform_settings.findMany({ orderBy: { updated_at: 'desc' } }),
    ]).then(([themes, settings]) => ({ themes, settings }));
  }

  async subscriptions(page = 1, limit = 50) {
    const p = pageArgs(page, limit);
    const [items, total] = await Promise.all([
      this.prisma.subscriptions.findMany({ orderBy: { created_at: 'desc' }, take: p.limit, skip: p.skip, include: { plan: true, company: { select: { id: true, display_name: true } } } }),
      this.prisma.subscriptions.count(),
    ]);
    return { items, total, page: p.page, limit: p.limit, totalPages: Math.ceil(total / p.limit) };
  }

  async promotions(page = 1, limit = 50) {
    const p = pageArgs(page, limit);
    const [items, total] = await Promise.all([
      this.prisma.promotions.findMany({ orderBy: { created_at: 'desc' }, take: p.limit, skip: p.skip, include: { company: { select: { id: true, display_name: true } }, branch: { select: { id: true, name: true } } } }),
      this.prisma.promotions.count(),
    ]);
    return { items, total, page: p.page, limit: p.limit, totalPages: Math.ceil(total / p.limit) };
  }

  async support(page = 1, limit = 50) {
    const p = pageArgs(page, limit);
    const [items, total] = await Promise.all([
      this.prisma.support_tickets.findMany({ orderBy: { created_at: 'desc' }, take: p.limit, skip: p.skip }),
      this.prisma.support_tickets.count(),
    ]);
    return { items, total, page: p.page, limit: p.limit, totalPages: Math.ceil(total / p.limit) };
  }

  async disputes(page = 1, limit = 50) {
    const p = pageArgs(page, limit);
    const [items, total] = await Promise.all([
      this.prisma.disputes.findMany({ orderBy: { created_at: 'desc' }, take: p.limit, skip: p.skip, include: { company: { select: { id: true, display_name: true } } } }),
      this.prisma.disputes.count(),
    ]);
    return { items, total, page: p.page, limit: p.limit, totalPages: Math.ceil(total / p.limit) };
  }

  async audit(page = 1, limit = 100) {
    const p = pageArgs(page, limit);
    const [items, total] = await Promise.all([
      this.prisma.audit_logs.findMany({ orderBy: { created_at: 'desc' }, take: p.limit, skip: p.skip, include: { actor: { select: { id: true, full_name: true, email: true } } } }),
      this.prisma.audit_logs.count(),
    ]);
    return { items, total, page: p.page, limit: p.limit, totalPages: Math.ceil(total / p.limit) };
  }

  featureFlags() { return this.prisma.feature_flags.findMany({ orderBy: { key: 'asc' } }); }
  remoteConfig() { return this.prisma.remote_config.findMany({ orderBy: { key: 'asc' } }); }
}
