import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomerOpsService {
  constructor(private readonly prisma: PrismaService) {}

  private async customerForUser(userId: string) {
    const customer = await this.prisma.customers.findFirst({ where: { user_id: userId } });
    if (!customer) throw new NotFoundException('Customer profile not found');
    return customer;
  }

  async dashboard(userId: string) {
    const customer = await this.customerForUser(userId);
    const now = new Date();
    const [upcoming, completed, wallet, loyalty, packages, memberships, unreadNotifications] = await Promise.all([
      this.prisma.appointments.count({ where: { customer_id: customer.id, starts_at: { gte: now }, status: { in: ['pending', 'confirmed', 'checked_in', 'in_progress'] } } }),
      this.prisma.appointments.count({ where: { customer_id: customer.id, status: 'completed' } }),
      this.prisma.wallets.findUnique({ where: { customer_id: customer.id } }),
      this.prisma.loyalty_accounts.findUnique({ where: { customer_id: customer.id } }),
      this.prisma.package_purchases.count({ where: { customer_id: customer.id, status: 'active' } }),
      this.prisma.membership_subscriptions.count({ where: { customer_id: customer.id, status: 'active' } }),
      this.prisma.notifications.count({ where: { recipient_user_id: userId, read_at: null } }),
    ]);
    return { customer, upcoming, completed, wallet, loyalty, activePackages: packages, activeMemberships: memberships, unreadNotifications };
  }

  async bookings(userId: string, status?: string, limit = 100) {
    const customer = await this.customerForUser(userId);
    const statusFilter =
      status === 'upcoming'
        ? { status: { in: ['pending', 'confirmed', 'checked_in', 'in_progress'] } }
        : status === 'cancelled'
          ? { status: { in: ['cancelled', 'cancelled_by_customer', 'cancelled_by_business', 'cancelled_by_system'] } }
          : status
            ? { status }
            : {};
    return this.prisma.appointments.findMany({
      where: { customer_id: customer.id, ...statusFilter },
      include: {
        company: { select: { id: true, display_name: true, logo_media_id: true } },
        branch: { select: { id: true, name: true, address_line_1: true, latitude: true, longitude: true } },
        participants: { include: { professional: { select: { id: true, display_name: true, avatar_media_id: true } } } },
        services: { include: { service: { select: { id: true, name: true, cover_media_id: true, currency_code: true } } } },
        resources: { include: { resource: { select: { id: true, name: true, type: true, icon_key: true } } } },
        financial_snapshot: true,
        review: { select: { id: true, overall_rating: true, body: true, is_verified: true } },
      },
      orderBy: { starts_at: 'desc' },
      take: Math.min(limit, 250),
    });
  }

  async booking(userId: string, id: string) {
    const customer = await this.customerForUser(userId);
    const item = await this.prisma.appointments.findFirst({
      where: { id, customer_id: customer.id },
      include: {
        company: true,
        branch: true,
        participants: { include: { professional: true } },
        services: { include: { service: true } },
        resources: { include: { resource: true } },
        financial_snapshot: true,
        booking_snapshot: true,
        payments: { include: { refunds: true, transactions: true } },
        status_history: { orderBy: { created_at: 'asc' } },
        notes_list: { where: { is_private: false }, orderBy: { created_at: 'asc' } },
        media: true,
        review: true,
      },
    });
    if (!item) throw new NotFoundException('Booking not found');
    return item;
  }

  async selfCheckIn(userId: string, id: string, latitude?: number, longitude?: number) {
    const customer = await this.customerForUser(userId);
    const appointment = await this.prisma.appointments.findFirst({
      where: { id, customer_id: customer.id },
      include: {
        branch: { select: { id: true, name: true, latitude: true, longitude: true } },
      },
    });
    if (!appointment) throw new NotFoundException('Booking not found');
    if (!['pending', 'confirmed'].includes(appointment.status)) {
      throw new BadRequestException('Only pending or confirmed appointments can be checked in');
    }

    const now = new Date();
    const earliest = new Date(appointment.starts_at.getTime() - 60 * 60 * 1000);
    const latest = new Date(appointment.ends_at.getTime() + 30 * 60 * 1000);
    if (now < earliest || now > latest) {
      throw new BadRequestException('Self check-in is available from 60 minutes before the appointment until 30 minutes after it ends');
    }

    const branchLat = appointment.branch.latitude;
    const branchLon = appointment.branch.longitude;
    if (branchLat != null && branchLon != null) {
      if (latitude == null || longitude == null) {
        throw new BadRequestException('Current location is required for self check-in');
      }
      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        throw new BadRequestException('Invalid check-in coordinates');
      }
      const toRad = (value: number) => value * Math.PI / 180;
      const earth = 6371000;
      const dLat = toRad(latitude - branchLat);
      const dLon = toRad(longitude - branchLon);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(branchLat)) * Math.cos(toRad(latitude)) *
        Math.sin(dLon / 2) ** 2;
      const distanceMeters = earth * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      if (distanceMeters > 500) {
        throw new ForbiddenException('Move closer to the branch before checking in');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.appointments.update({
        where: { id: appointment.id },
        data: {
          status: 'checked_in',
          checked_in_at: now,
          arrival_latitude: latitude ?? null,
          arrival_longitude: longitude ?? null,
        },
        include: {
          company: { select: { id: true, display_name: true } },
          branch: { select: { id: true, name: true } },
        },
      });
      await tx.appointment_status_history.create({
        data: {
          appointment_id: appointment.id,
          old_status: appointment.status,
          new_status: 'checked_in',
          changed_by_id: userId,
          reason: 'customer_self_check_in',
        },
      });
      return updated;
    });
  }

  async conversations(userId: string) {
    return this.prisma.conversations.findMany({
      where: { members: { some: { user_id: userId, left_at: null } } },
      include: {
        members: { include: { user: { select: { id: true, full_name: true } } } },
        messages: { orderBy: { created_at: 'desc' }, take: 1, include: { sender: { select: { id: true, full_name: true } } } },
      },
      orderBy: [{ last_message_at: 'desc' }, { updated_at: 'desc' }],
    });
  }

  async messages(userId: string, conversationId: string, limit = 100) {
    await this.assertConversationMember(userId, conversationId);
    return this.prisma.messages.findMany({
      where: { conversation_id: conversationId, deleted_at: null },
      include: { sender: { select: { id: true, full_name: true } }, attachments: true },
      orderBy: { created_at: 'asc' },
      take: Math.min(limit, 250),
    });
  }

  async sendMessage(userId: string, conversationId: string, body: string, messageType: string) {
    await this.assertConversationMember(userId, conversationId);
    const clean = body?.trim();
    if (!clean) throw new BadRequestException('Message body is required');
    return this.prisma.$transaction(async (tx) => {
      const message = await tx.messages.create({ data: { conversation_id: conversationId, sender_user_id: userId, message_type: messageType, body_plain: clean } });
      await tx.conversations.update({ where: { id: conversationId }, data: { last_message_id: message.id, last_message_at: message.created_at } });
      return message;
    });
  }

  async retention(userId: string) {
    const customer = await this.customerForUser(userId);
    const [wallet, loyalty, packages, memberships] = await Promise.all([
      this.prisma.wallets.findUnique({ where: { customer_id: customer.id }, include: { ledger: { orderBy: { created_at: 'desc' }, take: 50 } } }),
      this.prisma.loyalty_accounts.findUnique({ where: { customer_id: customer.id }, include: { ledger: { orderBy: { created_at: 'desc' }, take: 50 } } }),
      this.prisma.package_purchases.findMany({ where: { customer_id: customer.id }, include: { package: true, usage: { orderBy: { used_at: 'desc' } } }, orderBy: { purchased_at: 'desc' } }),
      this.prisma.membership_subscriptions.findMany({ where: { customer_id: customer.id }, include: { membership: true }, orderBy: { created_at: 'desc' } }),
    ]);
    return { wallet, loyalty, packages, memberships };
  }

  reviews(userId: string) {
    return this.prisma.reviews.findMany({
      where: { author_user_id: userId },
      include: { company: { select: { id: true, display_name: true } }, professional: { select: { id: true, display_name: true } }, service: { select: { id: true, name: true } } },
      orderBy: { created_at: 'desc' },
    });
  }

  private async assertConversationMember(userId: string, conversationId: string) {
    const member = await this.prisma.conversation_members.findFirst({ where: { conversation_id: conversationId, user_id: userId, left_at: null } });
    if (!member) throw new ForbiddenException('You do not have access to this conversation');
  }
}
