import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ScopeType, UserRole } from '@lookiva/shared-types';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

function pageArgs(page: number, limit: number, max = 250) {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(max, Math.max(1, limit));
  return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit };
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @InjectQueue('email-queue') private readonly emailQueue: Queue,
  ) {}

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
    const company = await this.prisma.companies.findUnique({
      where: { id: companyId },
      include: { verification: true, owner_user: true, branches: { where: { is_main: true }, take: 1 } },
    });
    if (!company) throw new NotFoundException('Business not found');
    if (!company.verification) throw new BadRequestException('Business has no verification submission');
    if (status === 'rejected' && !reason?.trim()) throw new BadRequestException('A rejection reason is required');

    const now = new Date();
    let temporaryPassword: string | null = null;

    const result = await this.prisma.$transaction(async (tx) => {
      const verification = await tx.company_verification.update({
        where: { company_id: companyId },
        data: {
          status,
          reviewed_by_user_id: actorUserId,
          reviewed_at: status === 'reviewing' ? null : now,
          rejection_reason: status === 'rejected' ? reason!.trim() : null,
        },
      });

      const updatedCompany = await tx.companies.update({
        where: { id: companyId },
        data: {
          is_verified: status === 'approved',
          verified_at: status === 'approved' ? now : null,
          is_active: status === 'approved',
          booking_enabled: status === 'approved',
        },
      });

      if (status === 'approved') {
        temporaryPassword = crypto.randomBytes(9).toString('base64url');
        const passwordHash = await bcrypt.hash(temporaryPassword, 12);
        await tx.users.update({
          where: { id: company.owner_user_id },
          data: { password_hash: passwordHash, is_active: true, deleted_at: null },
        });
        await tx.branches.updateMany({
          where: { company_id: companyId },
          data: { is_active: true, booking_enabled: true },
        });

        const role = await tx.roles.findUnique({ where: { key: UserRole.BusinessOwner } });
        if (!role) throw new BadRequestException('Business owner role is not configured');
        const existingScope = await tx.user_role_scopes.findFirst({
          where: {
            user_id: company.owner_user_id,
            role_id: role.id,
            company_id: companyId,
            scope_type: ScopeType.Company,
          },
        });
        if (!existingScope) {
          await tx.user_role_scopes.create({
            data: {
              user_id: company.owner_user_id,
              role_id: role.id,
              role_key: UserRole.BusinessOwner,
              scope_type: ScopeType.Company,
              scope_id: companyId,
              company_id: companyId,
              granted_by_user_id: actorUserId,
            },
          });
        }
      }

      if (status === 'rejected') {
        await tx.companies.update({ where: { id: companyId }, data: { is_active: false, booking_enabled: false } });
        await tx.users.update({ where: { id: company.owner_user_id }, data: { is_active: false } });
        await tx.branches.updateMany({ where: { company_id: companyId }, data: { is_active: false, booking_enabled: false } });
      }

      return { verification, company: updatedCompany };
    });

    await this.writeAudit(
      actorUserId,
      `business.verification.${status}`,
      'company_verification',
      company.verification.id,
      { status: company.verification.status },
      { status, reason },
      companyId,
    );

    if (status === 'approved' && temporaryPassword) {
      await this.sendBusinessDecision(company.owner_user.email, company.owner_user.phone, company.display_name, true, temporaryPassword);
    } else if (status === 'rejected') {
      await this.sendBusinessDecision(company.owner_user.email, company.owner_user.phone, company.display_name, false, null, reason);
    }

    return {
      ...result,
      credentialsDispatched: status === 'approved',
      ownerEmail: company.owner_user.email,
      ownerPhone: company.owner_user.phone,
    };
  }

  private async sendBusinessDecision(
    email: string | null,
    phone: string | null,
    businessName: string,
    approved: boolean,
    temporaryPassword?: string | null,
    reason?: string,
  ) {
    const portal = this.config.get<string>('PUBLIC_BUSINESS_WEB_URL', 'http://localhost:3002').replace(/\/$/, '');
    const subject = approved ? 'LOOKIVA business application approved' : 'LOOKIVA business application update';
    const body = approved
      ? `Your LOOKIVA business "${businessName}" is approved. Login: ${email ?? phone ?? 'your registered account'}. Temporary password: ${temporaryPassword}. Business portal: ${portal}. Change this password immediately after signing in.`
      : `Your LOOKIVA business "${businessName}" was not approved. Reason: ${reason || 'Please contact LOOKIVA support for details.'}`;

    if (email) {
      try {
        await this.emailQueue.add(
          'business-verification-decision',
          { to: email, subject, template: 'notification', vars: { title: subject, body }, text: body },
          { attempts: 5, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: 500, removeOnFail: 1000 },
        );
      } catch (error) {
        this.logger.error(`Unable to queue business decision email: ${(error as Error).message}`);
      }
    }

    if (phone) {
      const provider = this.config.get<string>('WHATSAPP_PROVIDER', 'console');
      if (provider === 'generic_http') {
        const endpoint = this.config.get<string>('WHATSAPP_PROVIDER_BASE_URL');
        const apiKey = this.config.get<string>('WHATSAPP_API_KEY');
        if (endpoint && apiKey) {
          try {
            const response = await fetch(endpoint, {
              method: 'POST',
              headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
              body: JSON.stringify({ to: phone, from: this.config.get<string>('WHATSAPP_FROM'), message: body }),
            });
            if (!response.ok) this.logger.error(`WhatsApp provider returned HTTP ${response.status}`);
          } catch (error) {
            this.logger.error(`Unable to send WhatsApp business decision: ${(error as Error).message}`);
          }
        }
      } else if (this.config.get<string>('NODE_ENV', 'development') !== 'production') {
        this.logger.log(`[DEV-WHATSAPP] to=${phone} message=${body}`);
      }
    }
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
