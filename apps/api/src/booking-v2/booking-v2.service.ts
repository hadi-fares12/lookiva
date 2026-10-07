import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ScopeType, UserRole } from '@lookiva/shared-types';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeService } from '../realtime/realtime.service';
import { AuthenticatedUser } from '../auth/types/request-with-user';
import {
  CancelAppointmentDto,
  CheckInDto,
  CreateAppointmentDto,
  CreateGroupBookingDto,
  CreateHoldDto,
  JoinQueueDto,
  RescheduleAppointmentDto,
} from './dto/booking-v2.dto';

type Db = Prisma.TransactionClient | PrismaService;

interface BookingConflictInput {
  branchId: string;
  startsAt: Date;
  endsAt: Date;
  professionalId?: string | null;
  resourceIds: string[];
  excludeAppointmentId?: string;
  excludeHoldToken?: string;
}

interface PreparedBooking {
  company: any;
  branch: any;
  customerId: string;
  customerUserId: string;
  professional: any | null;
  services: any[];
  resources: any[];
  startsAt: Date;
  endsAt: Date;
  durationMinutes: number;
  servicesTotal: number;
  discountTotal: number;
  resourceSurcharges: number;
  taxTotal: number;
  depositPercent: number | null;
  depositAmount: number;
  grandTotal: number;
  amountDueLater: number;
}

const ACTIVE_APPOINTMENT_STATUSES = [
  'awaiting_payment',
  'pending',
  'confirmed',
  'checked_in',
  'in_progress',
];

function unique(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter(Boolean) as string[]));
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function parseDate(value: string, label: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`${label} must be a valid ISO date`);
  }
  return date;
}

@Injectable()
export class BookingV2Service {
  private readonly logger = new Logger(BookingV2Service.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly realtime: RealtimeService,
  ) {}

  private async notifyCustomer(
    appointment: { id: string; customer_user_id?: string | null; company_id: string; branch_id: string; starts_at?: Date | null; status?: string },
    type: string,
    title: string,
    body: string,
  ) {
    const payload = {
      appointmentId: appointment.id,
      status: appointment.status,
      startsAt: appointment.starts_at?.toISOString(),
      changeType: type,
    };
    this.realtime.emitAppointment(appointment.id, 'booking:changed', payload);
    this.realtime.emitCompany(appointment.company_id, 'booking:changed', payload);
    this.realtime.emitBranch(appointment.branch_id, 'booking:changed', payload);
    if (appointment.customer_user_id) {
      this.realtime.emitUser(appointment.customer_user_id, 'booking:changed', payload);
    }

    if (!appointment.customer_user_id) return;
    try {
      await this.notifications.dispatch({
        recipientUserId: appointment.customer_user_id,
        notificationType: type,
        title,
        body,
        companyId: appointment.company_id,
        branchId: appointment.branch_id,
        deepLink: `/bookings/${appointment.id}`,
        payload,
      });
    } catch (error) {
      this.logger.error(`Failed to dispatch ${type} notification for appointment ${appointment.id}: ${(error as Error).message}`);
    }
  }


  private hasPlatformRole(user: AuthenticatedUser) {
    return user.roleScopes.some((scope) => [UserRole.SuperAdmin, UserRole.PlatformAdmin, UserRole.CountryManager].includes(scope.roleKey));
  }

  private hasBusinessScope(user: AuthenticatedUser, companyId: string, branchId?: string | null) {
    if (this.hasPlatformRole(user)) return true;
    return user.roleScopes.some((scope) => {
      if (scope.scopeType === ScopeType.Company) {
        return scope.companyId === companyId || scope.scopeId === companyId;
      }
      if (scope.scopeType === ScopeType.Branch) {
        if (!branchId) return false;
        return scope.branchId === branchId || scope.scopeId === branchId;
      }
      return false;
    });
  }

  private hasManagementBusinessScope(user: AuthenticatedUser, companyId: string, branchId?: string | null) {
    if (this.hasPlatformRole(user)) return true;
    const managementRoles = new Set<UserRole>([
      UserRole.BusinessOwner,
      UserRole.BusinessManager,
      UserRole.BranchManager,
      UserRole.Staff,
    ]);
    return user.roleScopes.some((scope) => {
      if (!managementRoles.has(scope.roleKey)) return false;
      if (scope.scopeType === ScopeType.Company) {
        return scope.companyId === companyId || scope.scopeId === companyId;
      }
      if (scope.scopeType === ScopeType.Branch) {
        if (!branchId) return false;
        return scope.branchId === branchId || scope.scopeId === branchId;
      }
      return false;
    });
  }

  private assertBusinessScope(user: AuthenticatedUser, companyId: string, branchId?: string | null) {
    if (!this.hasBusinessScope(user, companyId, branchId)) throw new ForbiddenException('This account is not authorized for the requested business scope');
  }

  private async assertAppointmentAccess(
    tx: Db,
    user: AuthenticatedUser,
    appointment: { id: string; company_id: string; branch_id: string; customer_user_id?: string | null },
    options: { customerAllowed?: boolean; professionalAllowed?: boolean } = {},
  ) {
    if (options.customerAllowed !== false && appointment.customer_user_id === user.id) return;
    if (this.hasManagementBusinessScope(user, appointment.company_id, appointment.branch_id)) return;

    if (options.professionalAllowed) {
      const participating = await tx.appointment_participants.count({
        where: {
          appointment_id: appointment.id,
          professional: { user_id: user.id },
        },
      });
      if (participating > 0) return;
    }

    throw new ForbiddenException('This account is not authorized for this appointment');
  }

  async checkAvailability(query: {
    branchId: string;
    startsAt: string;
    endsAt: string;
    professionalId?: string;
    resourceIds?: string[];
  }) {
    const startsAt = parseDate(query.startsAt, 'startsAt');
    const endsAt = parseDate(query.endsAt, 'endsAt');
    this.assertWindow(startsAt, endsAt);

    const conflicts = await this.findConflicts(this.prisma, {
      branchId: query.branchId,
      startsAt,
      endsAt,
      professionalId: query.professionalId,
      resourceIds: unique(query.resourceIds ?? []),
    });

    return {
      available: conflicts.length === 0,
      conflicts,
      startsAt,
      endsAt,
    };
  }

  async createHold(user: AuthenticatedUser, dto: CreateHoldDto) {
    return this.prisma.$transaction(
      async (tx) => {
        const prepared = await this.prepareBooking(tx, user, dto);
        await this.assertNoConflicts(tx, {
          branchId: prepared.branch.id,
          startsAt: prepared.startsAt,
          endsAt: prepared.endsAt,
          professionalId: prepared.professional?.id,
          resourceIds: prepared.resources.map((resource: any) => resource.id),
        });

        const heldUntil = addMinutes(new Date(), dto.holdMinutes ?? 10);
        return tx.appointment_holds.create({
          data: {
            customer_id: prepared.customerId,
            company_id: prepared.company.id,
            branch_id: prepared.branch.id,
            professional_id: prepared.professional?.id ?? null,
            resource_ids: prepared.resources.map((resource: any) => resource.id),
            service_ids: prepared.services.map((service: any) => service.id),
            hold_token: randomUUID(),
            expires_at: heldUntil,
            held_until: heldUntil,
            starts_at: prepared.startsAt,
            ends_at: prepared.endsAt,
            created_by_ip: dto.createdByIp ?? null,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async createAppointment(user: AuthenticatedUser, dto: CreateAppointmentDto) {
    const appointment = await this.prisma.$transaction(
      async (tx) => {
        const hold = dto.holdToken
          ? await tx.appointment_holds.findUnique({
              where: { hold_token: dto.holdToken },
            })
          : null;

        if (dto.holdToken && !hold) {
          throw new NotFoundException('Booking hold not found');
        }
        if (hold && (hold.status !== 'active' || hold.held_until < new Date())) {
          throw new ConflictException('Booking hold is no longer active');
        }
        if (hold) {
          const ownCustomerId = await this.findOptionalCustomerId(tx, user.id);
          const canManageHold = this.hasManagementBusinessScope(user, hold.company_id, hold.branch_id);
          if (hold.customer_id !== ownCustomerId && !canManageHold) {
            throw new ForbiddenException('This booking hold belongs to another customer');
          }
        }

        const merged: CreateAppointmentDto = hold
          ? {
              ...dto,
              companyId: hold.company_id,
              branchId: hold.branch_id,
              customerId: hold.customer_id,
              professionalId: hold.professional_id ?? undefined,
              resourceIds: hold.resource_ids ?? [],
              serviceIds: hold.service_ids ?? [],
              startsAt: (hold.starts_at ?? parseDate(dto.startsAt, 'startsAt')).toISOString(),
              endsAt: hold.ends_at?.toISOString() ?? dto.endsAt,
            }
          : dto;

        const prepared = await this.prepareBooking(tx, user, merged);
        await this.assertNoConflicts(tx, {
          branchId: prepared.branch.id,
          startsAt: prepared.startsAt,
          endsAt: prepared.endsAt,
          professionalId: prepared.professional?.id,
          resourceIds: prepared.resources.map((resource: any) => resource.id),
          excludeHoldToken: dto.holdToken,
        });

        const appointment = await this.persistAppointment(tx, user, prepared, {
          status: prepared.depositAmount > 0
            ? 'awaiting_payment'
            : prepared.company.auto_confirm_bookings
              ? 'confirmed'
              : 'pending',
          notesCustomer: dto.notesCustomer,
          notesStaff: dto.notesStaff,
          isWalkIn: dto.isWalkIn,
          isHomeService: dto.isHomeService,
          source: dto.source ?? (hold ? 'hold_conversion' : 'direct'),
          guestCount: merged.guestCount ?? 1,
        });

        if (hold) {
          await tx.appointment_holds.update({
            where: { id: hold.id },
            data: {
              appointment_id: appointment.id,
              status: 'converted',
              converted_at: new Date(),
            },
          });
        }

        return appointment;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    if (appointment) {
      await this.notifyCustomer(
        appointment,
        'booking_created',
        appointment.status === 'confirmed'
          ? 'Booking confirmed'
          : appointment.status === 'awaiting_payment'
            ? 'Deposit required'
            : 'Booking received',
        appointment.status === 'awaiting_payment'
          ? `Your appointment is reserved and requires a deposit before confirmation.`
          : `Your appointment is ${appointment.status === 'confirmed' ? 'confirmed' : 'pending confirmation'} for ${appointment.starts_at.toLocaleString()}.`,
      );
    }
    return appointment;
  }

  async createGroupBooking(user: AuthenticatedUser, dto: CreateGroupBookingDto) {
    const appointment = await this.prisma.$transaction(
      async (tx) => {
        this.assertBusinessScope(user, dto.companyId, dto.branchId);
        const serviceIds = unique(
          dto.participants.flatMap((participant) => participant.serviceIds),
        );
        const resourceIds = unique(
          dto.participants.flatMap((participant) => participant.resourceIds ?? []),
        );
        const professionalIds = unique(
          dto.participants.map((participant) => participant.professionalId),
        );

        const base: CreateAppointmentDto = {
          companyId: dto.companyId,
          branchId: dto.branchId,
          customerId: dto.participants[0]?.customerId,
          resourceIds,
          serviceIds,
          startsAt: dto.startsAt,
          notesCustomer: dto.notesCustomer,
          guestCount: dto.participants.length,
          source: 'group_booking',
        };

        const prepared = await this.prepareBooking(tx, user, base);
        if (professionalIds.length === 0) {
          await this.assertNoConflicts(tx, {
            branchId: prepared.branch.id,
            startsAt: prepared.startsAt,
            endsAt: prepared.endsAt,
            resourceIds,
          });
        }
        for (const professionalId of professionalIds) {
          await this.assertNoConflicts(tx, {
            branchId: prepared.branch.id,
            startsAt: prepared.startsAt,
            endsAt: prepared.endsAt,
            professionalId,
            resourceIds,
          });
        }

        const appointment = await this.persistAppointment(tx, user, prepared, {
          status: prepared.depositAmount > 0
            ? 'awaiting_payment'
            : prepared.company.auto_confirm_bookings
              ? 'confirmed'
              : 'pending',
          notesCustomer: dto.notesCustomer,
          guestCount: dto.participants.length,
          source: 'group_booking',
        });

        for (const participant of dto.participants) {
          if (participant.professionalId) {
            await tx.appointment_participants.create({
              data: {
                appointment_id: appointment.id,
                professional_id: participant.professionalId,
                customer_id: participant.customerId ?? prepared.customerId,
                notes: participant.notes ?? null,
              },
            });
          }
        }

        return tx.appointments.findUnique({
          where: { id: appointment.id },
          include: this.appointmentInclude(),
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    if (appointment) {
      await this.notifyCustomer(
        appointment,
        'booking_group_created',
        appointment.status === 'confirmed' ? 'Group booking confirmed' : 'Group booking received',
        'Your group booking has been created.',
      );
    }
    return appointment;
  }

  async cancelAppointment(
    user: AuthenticatedUser,
    appointmentId: string,
    dto: CancelAppointmentDto,
  ) {
    const appointment = await this.prisma.appointments.findUnique({
      where: { id: appointmentId },
    });
    if (!appointment) throw new NotFoundException('Appointment not found');
    await this.assertAppointmentAccess(this.prisma, user, appointment);
    if (!['awaiting_payment', 'pending', 'confirmed', 'checked_in'].includes(appointment.status)) {
      throw new ConflictException(`Appointment cannot be cancelled from ${appointment.status}`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.appointments.update({
        where: { id: appointmentId },
        data: {
          status: appointment.customer_user_id === user.id ? 'cancelled_by_customer' : 'cancelled_by_business',
          cancelled_at: new Date(),
          cancelled_by_user_id: user.id,
          cancellation_reason: dto.reason,
        },
      });
      await tx.appointment_services.updateMany({ where: { appointment_id: appointmentId }, data: { status: 'cancelled' } });
      await tx.appointment_status_history.create({
        data: {
          appointment_id: appointmentId,
          old_status: appointment.status,
          new_status: updated.status,
          changed_by_id: user.id,
          reason: dto.reason,
          notes: dto.notes ?? null,
        },
      });
      return updated;
    });
    await this.notifyCustomer(updated, 'booking_cancelled', 'Booking cancelled', `Your appointment has been cancelled. Reason: ${dto.reason}.`);
    return updated;
  }

  async rescheduleAppointment(
    user: AuthenticatedUser,
    appointmentId: string,
    dto: RescheduleAppointmentDto,
  ) {
    const updated = await this.prisma.$transaction(
      async (tx) => {
        const existing = await tx.appointments.findUnique({
          where: { id: appointmentId },
          include: {
            services: true,
            resources: true,
            participants: true,
          },
        });
        if (!existing) throw new NotFoundException('Appointment not found');
        await this.assertAppointmentAccess(tx, user, existing, { professionalAllowed: true });
        if (!['awaiting_payment', 'pending', 'confirmed'].includes(existing.status)) throw new ConflictException(`Appointment cannot be rescheduled from ${existing.status}`);

        const serviceIds = existing.services.map((service: any) => service.service_id);
        const resourceIds = dto.resourceIds ?? existing.resources.map((resource: any) => resource.resource_id);
        const professionalId =
          dto.professionalId ?? existing.participants[0]?.professional_id ?? undefined;
        const start = parseDate(dto.startsAt, 'startsAt');
        const end = dto.endsAt
          ? parseDate(dto.endsAt, 'endsAt')
          : addMinutes(start, existing.duration_minutes);
        this.assertWindow(start, end);

        await this.assertNoConflicts(tx, {
          branchId: existing.branch_id,
          startsAt: start,
          endsAt: end,
          professionalId,
          resourceIds,
          excludeAppointmentId: existing.id,
        });

        await tx.appointment_resources.deleteMany({
          where: { appointment_id: existing.id },
        });
        for (const resourceId of resourceIds) {
          await tx.appointment_resources.create({
            data: {
              appointment_id: existing.id,
              resource_id: resourceId,
              starts_at: start,
              ends_at: end,
            },
          });
        }

        if (professionalId) {
          await tx.appointment_participants.deleteMany({
            where: { appointment_id: existing.id },
          });
          await tx.appointment_participants.create({
            data: {
              appointment_id: existing.id,
              professional_id: professionalId,
              customer_id: existing.customer_id ?? null,
            },
          });
        }

        const updated = await tx.appointments.update({
          where: { id: existing.id },
          data: {
            starts_at: start,
            ends_at: end,
            duration_minutes: Math.max(1, Math.round((end.getTime() - start.getTime()) / 60_000)),
            status: existing.status === 'awaiting_payment'
              ? 'awaiting_payment'
              : existing.status === 'pending'
                ? 'pending'
                : 'confirmed',
          },
        });

        await tx.appointment_status_history.create({
          data: {
            appointment_id: existing.id,
            old_status: existing.status,
            new_status: updated.status,
            changed_by_id: user.id,
            reason: dto.reason ?? 'rescheduled',
            notes: `Moved from ${existing.starts_at.toISOString()} to ${start.toISOString()}; services=${serviceIds.join(',')}`,
          },
        });

        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    await this.notifyCustomer(updated, 'booking_rescheduled', 'Booking rescheduled', `Your appointment is now scheduled for ${updated.starts_at.toLocaleString()}.`);
    return updated;
  }

  async checkIn(user: AuthenticatedUser, appointmentId: string, dto: CheckInDto) {
    const appointment = await this.prisma.appointments.findUnique({
      where: { id: appointmentId },
    });
    if (!appointment) throw new NotFoundException('Appointment not found');
    await this.assertAppointmentAccess(this.prisma, user, appointment, { professionalAllowed: true });
    if (!['pending', 'confirmed'].includes(appointment.status)) {
      throw new ConflictException(`Appointment cannot be checked in from ${appointment.status}`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const changed = await tx.appointments.update({
        where: { id: appointmentId },
        data: {
          status: 'checked_in',
          checked_in_at: new Date(),
          arrival_latitude: dto.latitude ?? null,
          arrival_longitude: dto.longitude ?? null,
        },
      });
      await tx.appointment_status_history.create({
        data: {
          appointment_id: appointmentId,
          old_status: appointment.status,
          new_status: 'checked_in',
          changed_by_id: user.id,
        },
      });
      return changed;
    });
    await this.notifyCustomer(updated, 'booking_checked_in', 'Checked in', 'You are checked in for your appointment.');
    return updated;
  }

  async startAppointment(user: AuthenticatedUser, appointmentId: string, notes?: string) {
    const updated = await this.transitionAppointment(user, appointmentId, ['checked_in'], 'in_progress', { started_at: new Date() }, notes);
    await this.notifyCustomer(updated, 'booking_started', 'Service started', 'Your appointment is now in progress.');
    return updated;
  }

  async completeAppointment(user: AuthenticatedUser, appointmentId: string, notes?: string) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const appointment = await tx.appointments.findUnique({ where: { id: appointmentId } });
      if (!appointment) throw new NotFoundException('Appointment not found');
      await this.assertAppointmentAccess(tx, user, appointment, { customerAllowed: false, professionalAllowed: true });
      if (appointment.status !== 'in_progress') throw new ConflictException(`Appointment cannot be completed from ${appointment.status}`);
      const now = new Date();
      const updated = await tx.appointments.update({ where: { id: appointmentId }, data: { status: 'completed', completed_at: now } });
      await tx.appointment_services.updateMany({ where: { appointment_id: appointmentId }, data: { status: 'completed' } });
      await tx.appointment_status_history.create({ data: { appointment_id: appointmentId, old_status: appointment.status, new_status: 'completed', changed_by_id: user.id, notes: notes ?? null } });
      return updated;
    });
    await this.notifyCustomer(updated, 'booking_completed', 'Appointment completed', 'Your appointment is complete. You can now leave a verified review or book again.');
    return updated;
  }

  async markNoShow(user: AuthenticatedUser, appointmentId: string, notes?: string) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const appointment = await tx.appointments.findUnique({ where: { id: appointmentId } });
      if (!appointment) throw new NotFoundException('Appointment not found');
      await this.assertAppointmentAccess(tx, user, appointment, { customerAllowed: false, professionalAllowed: true });
      if (!['awaiting_payment', 'pending', 'confirmed'].includes(appointment.status)) throw new ConflictException(`Appointment cannot be marked no-show from ${appointment.status}`);
      const changed = await tx.appointments.update({ where: { id: appointmentId }, data: { status: 'no_show', no_show_at: new Date() } });
      await tx.appointment_services.updateMany({ where: { appointment_id: appointmentId }, data: { status: 'no_show' } });
      await tx.appointment_status_history.create({ data: { appointment_id: appointmentId, old_status: appointment.status, new_status: 'no_show', changed_by_id: user.id, notes: notes ?? null } });
      return changed;
    });
    await this.notifyCustomer(updated, 'booking_no_show', 'Appointment marked no-show', 'This appointment was marked as a no-show.');
    return updated;
  }

  private async transitionAppointment(user: AuthenticatedUser, appointmentId: string, allowed: string[], nextStatus: string, patch: Record<string, unknown>, notes?: string) {
    return this.prisma.$transaction(async (tx) => {
      const appointment = await tx.appointments.findUnique({ where: { id: appointmentId } });
      if (!appointment) throw new NotFoundException('Appointment not found');
      await this.assertAppointmentAccess(tx, user, appointment, { customerAllowed: false, professionalAllowed: true });
      if (!allowed.includes(appointment.status)) throw new ConflictException(`Appointment cannot move to ${nextStatus} from ${appointment.status}`);
      const updated = await tx.appointments.update({ where: { id: appointmentId }, data: { ...patch, status: nextStatus } });
      if (nextStatus === 'in_progress') {
        await tx.appointment_services.updateMany({
          where: { appointment_id: appointmentId, status: { in: ['pending', 'confirmed', 'checked_in'] } },
          data: { status: 'in_progress' },
        });
      }
      await tx.appointment_status_history.create({ data: { appointment_id: appointmentId, old_status: appointment.status, new_status: nextStatus, changed_by_id: user.id, notes: notes ?? null } });
      return updated;
    });
  }

  async getQueues(user: AuthenticatedUser, branchId: string) {
    const branch = await this.prisma.branches.findUnique({ where: { id: branchId }, select: { company_id: true, id: true } });
    if (!branch) throw new NotFoundException('Branch not found');
    this.assertBusinessScope(user, branch.company_id, branch.id);

    return this.prisma.queues.findMany({
      where: { branch_id: branchId, is_active: true },
      include: {
        entries: {
          where: { status: { in: ['waiting', 'called'] } },
          orderBy: [{ position: 'asc' }, { joined_at: 'asc' }],
        },
      },
      orderBy: { created_at: 'asc' },
    });
  }

  async joinQueue(user: AuthenticatedUser, branchId: string, dto: JoinQueueDto) {
    const created = await this.prisma.$transaction(async (tx) => {
      const branch = await tx.branches.findUnique({ where: { id: branchId } });
      if (!branch || !branch.is_active || branch.deleted_at) throw new NotFoundException('Branch not found');

      let queue = dto.queueId
        ? await tx.queues.findUnique({ where: { id: dto.queueId } })
        : await tx.queues.findFirst({
            where: { branch_id: branchId, is_active: true },
            orderBy: { created_at: 'asc' },
          });

      if (queue && queue.branch_id !== branchId) {
        throw new BadRequestException('Queue does not belong to the requested branch');
      }
      if (queue && !queue.is_active) {
        throw new ConflictException('Queue is not active');
      }

      if (!queue) {
        if (!this.hasBusinessScope(user, branch.company_id, branch.id)) {
          throw new ConflictException('No active walk-in queue is currently available');
        }
        queue = await tx.queues.create({
          data: {
            branch_id: branchId,
            name: 'Default',
            max_waiting: 50,
          },
        });
      }

      const ownCustomerId = await this.findOptionalCustomerId(tx, user.id);
      const canManageQueue = this.hasManagementBusinessScope(user, branch.company_id, branch.id);
      const customerId = dto.customerId ?? ownCustomerId;
      if (!customerId) {
        throw new BadRequestException('A customerId is required when staff joins a customer to the queue');
      }
      if (customerId !== ownCustomerId && !canManageQueue) {
        throw new ForbiddenException('Customers may only join a queue for their own customer profile');
      }
      const customer = await tx.customers.findUnique({
        where: { id: customerId },
        include: { user: { select: { full_name: true, phone: true } } },
      });
      if (!customer) throw new BadRequestException('Customer is invalid');

      if (dto.professionalId) {
        const professional = await tx.professionals.findFirst({
          where: {
            id: dto.professionalId,
            is_active: true,
            deleted_at: null,
            branches: { some: { branch_id: branchId } },
          },
          select: { id: true },
        });
        if (!professional) throw new BadRequestException('Professional is not available at this branch');
      }

      const serviceIds = unique(dto.serviceIds ?? []);
      if (serviceIds.length) {
        const services = await tx.services.count({
          where: {
            id: { in: serviceIds },
            company_id: branch.company_id,
            is_active: true,
            deleted_at: null,
          },
        });
        if (services !== serviceIds.length) throw new BadRequestException('One or more services are invalid');
      }

      const duplicate = await tx.queue_entries.findFirst({
        where: {
          queue_id: queue.id,
          customer_id: customerId,
          status: { in: ['waiting', 'called'] },
        },
        select: { id: true },
      });
      if (duplicate) throw new ConflictException('Customer is already waiting in this queue');

      const waitingAhead = await tx.queue_entries.count({
        where: { queue_id: queue.id, status: { in: ['waiting', 'called'] } },
      });
      if (waitingAhead >= queue.max_waiting) {
        throw new ConflictException('Queue is full');
      }

      return tx.queue_entries.create({
        data: {
          queue_id: queue.id,
          customer_id: customerId,
          customer_name: dto.customerName ?? customer.user.full_name ?? null,
          customer_phone: dto.customerPhone ?? customer.user.phone ?? null,
          service_ids: serviceIds,
          professional_id: dto.professionalId ?? null,
          position: waitingAhead + 1,
          estimated_wait_minutes:
            (waitingAhead + 1) * queue.estimated_wait_per_person_minutes,
          notes: dto.notes ?? null,
        },
      });
    });
    this.realtime.emitBranch(branchId, 'queue:changed', {
      branchId,
      queueEntryId: created.id,
      queueId: created.queue_id,
      status: created.status,
      action: 'joined',
    });
    return created;
  }

  async updateQueueEntryStatus(
    user: AuthenticatedUser,
    entryId: string,
    status: 'cancelled' | 'called' | 'served',
    notes?: string,
    customerAllowed = false,
  ) {
    const entry = await this.prisma.queue_entries.findUnique({
      where: { id: entryId },
      include: {
        queue: { include: { branch: { select: { id: true, company_id: true, name: true } } } },
        customer: { select: { user_id: true } },
      },
    });
    if (!entry) throw new NotFoundException('Queue entry not found');

    const ownsEntry = entry.customer?.user_id === user.id;
    if (!(customerAllowed && ownsEntry)) {
      this.assertBusinessScope(user, entry.queue.branch.company_id, entry.queue.branch.id);
    }

    if (status === 'cancelled' && !['waiting', 'called'].includes(entry.status)) {
      throw new ConflictException(`Queue entry cannot be cancelled from ${entry.status}`);
    }
    if (status === 'called' && entry.status !== 'waiting') {
      throw new ConflictException(`Queue entry cannot be called from ${entry.status}`);
    }
    if (status === 'served' && !['waiting', 'called'].includes(entry.status)) {
      throw new ConflictException(`Queue entry cannot be served from ${entry.status}`);
    }

    const data: any = { status, notes: notes ?? entry.notes };
    if (status === 'cancelled') data.cancelled_at = new Date();
    if (status === 'called') data.called_at = new Date();
    if (status === 'served') data.served_at = new Date();

    const updated = await this.prisma.queue_entries.update({
      where: { id: entryId },
      data,
    });

    if (status === 'called' && entry.customer?.user_id) {
      try {
        await this.notifications.dispatch({
          recipientUserId: entry.customer.user_id,
          notificationType: 'booking_queue_called',
          title: "It's your turn",
          body: `${entry.queue.name}: please head to ${entry.queue.branch.name}.`,
          companyId: entry.queue.branch.company_id,
          branchId: entry.queue.branch.id,
          deepLink: '/bookings',
          payload: { queueEntryId: entry.id, queueId: entry.queue_id, status: 'called' },
          channels: ['in_app', 'push'],
          priority: 'high',
        });
      } catch (error) {
        this.logger.error(`Failed to notify called queue entry ${entry.id}: ${(error as Error).message}`);
      }
    }

    this.realtime.emitBranch(entry.queue.branch.id, 'queue:changed', {
      branchId: entry.queue.branch.id,
      queueId: entry.queue_id,
      queueEntryId: entry.id,
      status,
      action: 'status_changed',
    });
    if (entry.customer?.user_id) {
      this.realtime.emitUser(entry.customer.user_id, 'queue:changed', {
        branchId: entry.queue.branch.id,
        queueId: entry.queue_id,
        queueEntryId: entry.id,
        status,
      });
    }

    return updated;
  }

  private async prepareBooking(
    tx: Db,
    user: AuthenticatedUser,
    dto: CreateHoldDto,
  ): Promise<PreparedBooking> {
    const startsAt = parseDate(dto.startsAt, 'startsAt');
    const company = await tx.companies.findUnique({
      where: { id: dto.companyId },
      include: { settings: true },
    });
    if (!company || !company.is_active || company.deleted_at) {
      throw new NotFoundException('Company not found or inactive');
    }

    const branch = await tx.branches.findUnique({
      where: { id: dto.branchId },
    });
    if (!branch || branch.company_id !== company.id || !branch.is_active || branch.deleted_at) {
      throw new NotFoundException('Branch not found or inactive');
    }

    const ownCustomerId = await this.findOptionalCustomerId(tx, user.id);
    const canManageBooking = this.hasManagementBusinessScope(user, company.id, branch.id);
    const customerId = dto.customerId ?? ownCustomerId;
    if (!customerId) {
      throw new BadRequestException('A customerId is required when staff creates a booking');
    }
    if (customerId !== ownCustomerId && !canManageBooking) {
      throw new ForbiddenException('Customers may only create bookings for their own customer profile');
    }
    const customer = await tx.customers.findUnique({ where: { id: customerId } });
    if (!customer) throw new BadRequestException('Customer is invalid');

    const services = await tx.services.findMany({
      where: {
        id: { in: dto.serviceIds },
        company_id: company.id,
        is_active: true,
        deleted_at: null,
      },
    });
    if (services.length !== unique(dto.serviceIds).length) {
      throw new BadRequestException('One or more services are invalid');
    }

    const durationMinutes = services.reduce(
      (total: number, service: any) =>
        total +
        service.duration_minutes +
        service.buffer_before_minutes +
        service.buffer_after_minutes,
      0,
    );
    const endsAt = dto.endsAt
      ? parseDate(dto.endsAt, 'endsAt')
      : addMinutes(startsAt, durationMinutes);
    this.assertWindow(startsAt, endsAt);

    const resourceIds = unique(dto.resourceIds ?? []);
    const resources = resourceIds.length
      ? await tx.resources.findMany({
          where: {
            id: { in: resourceIds },
            company_id: company.id,
            OR: [{ branch_id: branch.id }, { branch_id: null }],
            is_active: true,
            deleted_at: null,
          },
        })
      : [];
    if (resources.length !== resourceIds.length) {
      throw new BadRequestException('One or more resources are invalid');
    }

    const professional = dto.professionalId
      ? await tx.professionals.findFirst({
          where: {
            id: dto.professionalId,
            company_id: company.id,
            is_active: true,
            deleted_at: null,
            branches: { some: { branch_id: branch.id } },
          },
        })
      : null;
    if (dto.professionalId && !professional) {
      throw new BadRequestException('Professional is invalid');
    }

    const priced = this.calculateFinancials(company, services, resources);

    return {
      company,
      branch,
      customerId,
      customerUserId: customer.user_id,
      professional,
      services,
      resources,
      startsAt,
      endsAt,
      durationMinutes: Math.max(
        1,
        Math.round((endsAt.getTime() - startsAt.getTime()) / 60_000),
      ),
      ...priced,
    };
  }

  private async persistAppointment(
    tx: Prisma.TransactionClient,
    user: AuthenticatedUser,
    prepared: PreparedBooking,
    options: {
      status: string;
      notesCustomer?: string;
      notesStaff?: string;
      isWalkIn?: boolean;
      isHomeService?: boolean;
      source?: string;
      guestCount?: number;
    },
  ) {
    const appointment = await tx.appointments.create({
      data: {
        company_id: prepared.company.id,
        branch_id: prepared.branch.id,
        customer_id: prepared.customerId,
        customer_user_id: prepared.customerUserId,
        status: options.status,
        starts_at: prepared.startsAt,
        ends_at: prepared.endsAt,
        duration_minutes: prepared.durationMinutes,
        guest_count: options.guestCount ?? 1,
        notes_customer: options.notesCustomer ?? null,
        notes_staff: options.notesStaff ?? null,
        is_walk_in: options.isWalkIn ?? false,
        is_home_service: options.isHomeService ?? false,
        source: options.source ?? 'direct',
        created_by_user_id: user.id,
      },
    });

    for (const service of prepared.services) {
      const pricing = this.calculateServicePrice(service);
      await tx.appointment_services.create({
        data: {
          appointment_id: appointment.id,
          service_id: service.id,
          professional_id: prepared.professional?.id ?? null,
          unit_price: service.base_price,
          discount_percent: service.discount_percent ?? null,
          discount_amount: pricing.discount,
          final_price: pricing.finalPrice,
          duration_minutes: service.duration_minutes,
          tax_percent: service.tax_percent ?? prepared.company.settings?.default_tax_percent ?? null,
          tax_amount: pricing.tax,
          starts_at: prepared.startsAt,
          ends_at: prepared.endsAt,
          status: 'pending',
        },
      });
      await tx.services.update({
        where: { id: service.id },
        data: { booking_count: { increment: 1 } },
      });
    }

    for (const resource of prepared.resources) {
      await tx.appointment_resources.create({
        data: {
          appointment_id: appointment.id,
          resource_id: resource.id,
          starts_at: prepared.startsAt,
          ends_at: prepared.endsAt,
          surcharge_amount: resource.hourly_cost ?? null,
        },
      });
    }

    if (prepared.professional) {
      await tx.appointment_participants.create({
        data: {
          appointment_id: appointment.id,
          professional_id: prepared.professional.id,
          customer_id: prepared.customerId,
        },
      });
    }

    await tx.appointment_status_history.create({
      data: {
        appointment_id: appointment.id,
        old_status: null,
        new_status: options.status,
        changed_by_id: user.id,
        reason: 'created',
      },
    });

    await tx.booking_snapshots.create({
      data: {
        appointment_id: appointment.id,
        services_snapshot: prepared.services.map((service: any) => ({
          id: service.id,
          name: service.name,
          price: service.base_price,
          durationMinutes: service.duration_minutes,
          currencyCode: service.currency_code,
        })) as Prisma.InputJsonValue,
        professionals_snapshot: prepared.professional
          ? ([{
              id: prepared.professional.id,
              displayName: prepared.professional.display_name,
              commissionPercent: prepared.professional.commission_percent,
            }] as Prisma.InputJsonValue)
          : ([] as Prisma.InputJsonValue),
        resources_snapshot: prepared.resources.map((resource: any) => ({
          id: resource.id,
          name: resource.name,
          type: resource.type,
          surcharge: resource.hourly_cost,
        })) as Prisma.InputJsonValue,
        branches_snapshot: {
          id: prepared.branch.id,
          name: prepared.branch.name,
          address: prepared.branch.address_line_1,
        } as Prisma.InputJsonValue,
        company_snapshot: {
          id: prepared.company.id,
          name: prepared.company.display_name,
          cancellationPolicyHours: prepared.company.cancellation_policy_hours,
          cancellationFeePercent: prepared.company.cancellation_fee_percent,
        } as Prisma.InputJsonValue,
        pricing_snapshot: {
          servicesTotal: prepared.servicesTotal,
          discountTotal: prepared.discountTotal,
          resourceSurcharges: prepared.resourceSurcharges,
          taxTotal: prepared.taxTotal,
          grandTotal: prepared.grandTotal,
        } as Prisma.InputJsonValue,
        policies_snapshot: {
          companyPolicy: prepared.company.settings?.cancellation_policy ?? null,
          refundPolicy: prepared.company.settings?.refund_policy ?? null,
        } as Prisma.InputJsonValue,
      },
    });

    await tx.booking_financial_snapshots.create({
      data: {
        appointment_id: appointment.id,
        currency_code: prepared.services[0]?.currency_code ?? 'USD',
        services_total: prepared.servicesTotal,
        discount_total: prepared.discountTotal,
        resource_surcharges: prepared.resourceSurcharges,
        tax_total: prepared.taxTotal,
        deposit_percent: prepared.depositPercent,
        deposit_amount: prepared.depositAmount,
        cancellation_fee: 0,
        grand_total: prepared.grandTotal,
        amount_due_now: prepared.depositAmount,
        amount_due_later: prepared.amountDueLater,
        tax_breakdown: {
          defaultTaxPercent: prepared.company.settings?.default_tax_percent ?? null,
        } as Prisma.InputJsonValue,
        commission_rule_snapshot: prepared.professional
          ? ({
              professionalId: prepared.professional.id,
              commissionPercent: prepared.professional.commission_percent,
            } as Prisma.InputJsonValue)
          : undefined,
      },
    });

    return tx.appointments.findUnique({
      where: { id: appointment.id },
      include: this.appointmentInclude(),
    });
  }

  private async findOptionalCustomerId(tx: Db, userId: string): Promise<string | null> {
    const customer = await tx.customers.findFirst({
      where: { user_id: userId },
      select: { id: true },
    });
    return customer?.id ?? null;
  }

  private async findCustomerId(tx: Db, userId: string): Promise<string> {
    const customerId = await this.findOptionalCustomerId(tx, userId);
    if (!customerId) {
      throw new BadRequestException('Current user does not have a customer profile');
    }
    return customerId;
  }

  private async assertNoConflicts(tx: Db, input: BookingConflictInput) {
    const conflicts = await this.findConflicts(tx, input);
    if (conflicts.length > 0) {
      throw new ConflictException({
        message: 'Requested slot conflicts with existing booking, hold, or resource block',
        conflicts,
      });
    }
  }

  private async findConflicts(tx: Db, input: BookingConflictInput) {
    const or: Prisma.appointmentsWhereInput[] = [];
    if (input.professionalId) {
      or.push({ participants: { some: { professional_id: input.professionalId } } });
    }
    if (input.resourceIds.length > 0) {
      or.push({ resources: { some: { resource_id: { in: input.resourceIds } } } });
    }

    const appointmentConflicts = or.length
      ? await tx.appointments.findMany({
          where: {
            id: input.excludeAppointmentId ? { not: input.excludeAppointmentId } : undefined,
            branch_id: input.branchId,
            status: { in: ACTIVE_APPOINTMENT_STATUSES },
            starts_at: { lt: input.endsAt },
            ends_at: { gt: input.startsAt },
            OR: or,
          },
          select: { id: true, status: true, starts_at: true, ends_at: true },
          take: 10,
        })
      : [];

    const holdOr: Prisma.appointment_holdsWhereInput[] = [];
    if (input.professionalId) holdOr.push({ professional_id: input.professionalId });
    if (input.resourceIds.length > 0) {
      holdOr.push({ resource_ids: { hasSome: input.resourceIds } });
    }

    const holdConflicts = holdOr.length
      ? await tx.appointment_holds.findMany({
          where: {
            hold_token: input.excludeHoldToken ? { not: input.excludeHoldToken } : undefined,
            branch_id: input.branchId,
            status: 'active',
            held_until: { gt: new Date() },
            starts_at: { lt: input.endsAt },
            ends_at: { gt: input.startsAt },
            OR: holdOr,
          },
          select: { id: true, hold_token: true, starts_at: true, ends_at: true },
          take: 10,
        })
      : [];

    const resourceBlockConflicts = input.resourceIds.length
      ? await tx.resource_blocks.findMany({
          where: {
            resource_id: { in: input.resourceIds },
            starts_at: { lt: input.endsAt },
            ends_at: { gt: input.startsAt },
          },
          select: { id: true, resource_id: true, block_type: true, starts_at: true, ends_at: true },
          take: 10,
        })
      : [];

    const maintenanceConflicts = input.resourceIds.length
      ? await tx.resource_maintenance.findMany({
          where: {
            resource_id: { in: input.resourceIds },
            status: { notIn: ['completed', 'cancelled'] },
            scheduled_at: { gte: input.startsAt, lt: input.endsAt },
          },
          select: { id: true, resource_id: true, status: true, scheduled_at: true },
          take: 10,
        })
      : [];

    return [
      ...appointmentConflicts.map((item) => ({ type: 'appointment', ...item })),
      ...holdConflicts.map((item) => ({ type: 'hold', ...item })),
      ...resourceBlockConflicts.map((item) => ({ type: 'resource_block', ...item })),
      ...maintenanceConflicts.map((item) => ({ type: 'resource_maintenance', ...item })),
    ];
  }

  private assertWindow(startsAt: Date, endsAt: Date) {
    if (endsAt <= startsAt) {
      throw new BadRequestException('endsAt must be after startsAt');
    }
  }

  private calculateServicePrice(service: any) {
    const discountPercent = service.discount_percent ?? 0;
    const discountFixed = service.discount_fixed ?? 0;
    const percentDiscount = service.base_price * (discountPercent / 100);
    const discount = Math.min(service.base_price, percentDiscount + discountFixed);
    const finalPrice = Math.max(0, service.base_price - discount);
    const taxPercent = service.tax_percent ?? 0;
    const tax = service.tax_inclusive ? 0 : finalPrice * (taxPercent / 100);
    return { discount, finalPrice, tax };
  }

  private calculateFinancials(company: any, services: any[], resources: any[]) {
    const priced = services.map((service) => this.calculateServicePrice(service));
    const servicesTotal = services.reduce(
      (sum: number, service: any) => sum + service.base_price,
      0,
    );
    const discountTotal = priced.reduce((sum, item) => sum + item.discount, 0);
    const taxTotal = priced.reduce((sum, item) => sum + item.tax, 0);
    const resourceSurcharges = resources.reduce(
      (sum: number, resource: any) => sum + (resource.hourly_cost ?? 0),
      0,
    );
    const grandTotal = servicesTotal - discountTotal + taxTotal + resourceSurcharges;
    const serviceDepositPercents = services
      .map((service: any) => service.deposit_percent)
      .filter((value: number | null | undefined): value is number => value != null);
    const depositPercent =
      serviceDepositPercents.length > 0
        ? Math.max(...serviceDepositPercents)
        : company.deposit_required
          ? company.deposit_percent ?? 0
          : null;
    const depositAmount = depositPercent ? grandTotal * (depositPercent / 100) : 0;
    return {
      servicesTotal,
      discountTotal,
      resourceSurcharges,
      taxTotal,
      depositPercent,
      depositAmount,
      grandTotal,
      amountDueLater: Math.max(0, grandTotal - depositAmount),
    };
  }

  private appointmentInclude() {
    return {
      services: true,
      resources: true,
      participants: true,
      booking_snapshot: true,
      financial_snapshot: true,
      status_history: {
        orderBy: { created_at: 'asc' as const },
      },
    };
  }
}
