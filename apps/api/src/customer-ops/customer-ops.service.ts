import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeService } from '../realtime/realtime.service';

@Injectable()
export class CustomerOpsService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly notifications?: NotificationsService,
    @Optional() private readonly realtime?: RealtimeService,
  ) {}

  private async customerForUser(userId: string) {
    const customer = await this.prisma.customers.findFirst({ where: { user_id: userId } });
    if (!customer) throw new NotFoundException('Customer profile not found');
    return customer;
  }

  async dashboard(userId: string) {
    const customer = await this.customerForUser(userId);
    const now = new Date();
    const [upcoming, completed, wallet, loyalty, packages, memberships, unreadNotifications] = await Promise.all([
      this.prisma.appointments.count({ where: { customer_id: customer.id, starts_at: { gte: now }, status: { notIn: ['cancelled', 'no_show', 'completed'] } } }),
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
    return this.prisma.appointments.findMany({
      where: { customer_id: customer.id, ...(status ? { status } : {}) },
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

    const message = await this.prisma.$transaction(async (tx) => {
      const created = await tx.messages.create({
        data: {
          conversation_id: conversationId,
          sender_user_id: userId,
          message_type: messageType,
          body_plain: clean,
        },
        include: { sender: { select: { id: true, full_name: true } } },
      });
      await tx.conversations.update({
        where: { id: conversationId },
        data: { last_message_id: created.id, last_message_at: created.created_at },
      });
      return created;
    });

    const payload = {
      conversationId,
      message,
    };
    this.realtime?.emitConversation(conversationId, 'message:created', payload);

    const members = await this.prisma.conversation_members.findMany({
      where: { conversation_id: conversationId, left_at: null },
      select: { user_id: true },
    });
    for (const member of members) {
      this.realtime?.emitUser(member.user_id, 'message:created', payload);
      if (member.user_id !== userId) {
        await this.notifications?.dispatch({
          recipientUserId: member.user_id,
          notificationType: 'chat_message',
          title: message.sender?.full_name || 'New message',
          body: clean.length > 140 ? `${clean.slice(0, 137)}...` : clean,
          deepLink: `/messages/${conversationId}`,
          payload: { conversationId, messageId: message.id },
          channels: ['in_app', 'push'],
        });
      }
    }

    return message;
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
