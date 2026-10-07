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

  async bookingConsents(userId: string, appointmentId: string) {
    const customer = await this.customerForUser(userId);
    const appointment = await this.prisma.appointments.findFirst({
      where: { id: appointmentId, customer_id: customer.id },
      select: { id: true, company_id: true, status: true },
    });
    if (!appointment) throw new NotFoundException('Booking not found');

    const [forms, responses] = await Promise.all([
      this.prisma.consent_forms.findMany({
        where: { company_id: appointment.company_id, is_active: true },
        orderBy: [{ form_type: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.consent_form_responses.findMany({
        where: { appointment_id: appointmentId, customer_id: customer.id, revoked_at: null },
        orderBy: { signed_at: 'desc' },
      }),
    ]);

    const now = new Date();
    return forms.map((form) => {
      const response = responses.find((item) => {
        if (item.consent_form_id !== form.id) return false;
        const payload = item.response_json as Record<string, unknown> | null;
        const signedVersion = Number(payload?.formVersion ?? 0);
        return signedVersion === form.version && (!item.expires_at || item.expires_at > now);
      });
      return {
        ...form,
        signed: Boolean(response),
        response: response ?? null,
      };
    });
  }

  async signBookingConsent(
    userId: string,
    appointmentId: string,
    formId: string,
    body: { accepted?: boolean; typedSignature?: string; responses?: Record<string, unknown> },
  ) {
    const customer = await this.customerForUser(userId);
    const appointment = await this.prisma.appointments.findFirst({
      where: { id: appointmentId, customer_id: customer.id },
      select: { id: true, company_id: true, status: true },
    });
    if (!appointment) throw new NotFoundException('Booking not found');
    if (['cancelled', 'no_show'].includes(appointment.status)) {
      throw new BadRequestException('Consent cannot be signed for a cancelled or no-show appointment');
    }
    const form = await this.prisma.consent_forms.findFirst({
      where: { id: formId, company_id: appointment.company_id, is_active: true },
    });
    if (!form) throw new NotFoundException('Consent form not found');
    if (body.accepted !== true) throw new BadRequestException('Consent acceptance is required');
    const typedSignature = String(body.typedSignature ?? '').trim();
    if (form.require_signature && !typedSignature) {
      throw new BadRequestException('Typed signature is required for this consent');
    }

    const existing = await this.prisma.consent_form_responses.findFirst({
      where: {
        consent_form_id: form.id,
        customer_id: customer.id,
        appointment_id: appointmentId,
        revoked_at: null,
      },
      orderBy: { signed_at: 'desc' },
    });
    if (existing) {
      const payload = existing.response_json as Record<string, unknown> | null;
      if (
        Number(payload?.formVersion ?? 0) === form.version &&
        (!existing.expires_at || existing.expires_at > new Date())
      ) {
        return existing;
      }
    }

    const signedAt = new Date();
    const expiresAt = form.expires_days
      ? new Date(signedAt.getTime() + form.expires_days * 86_400_000)
      : null;
    const response = await this.prisma.consent_form_responses.create({
      data: {
        consent_form_id: form.id,
        customer_id: customer.id,
        appointment_id: appointmentId,
        response_json: {
          accepted: true,
          typedSignature: typedSignature || null,
          formVersion: form.version,
          ...(body.responses ?? {}),
        },
        signed_at: signedAt,
        expires_at: expiresAt,
      },
    });

    this.realtime?.emitAppointment(appointmentId, 'booking:consent-changed', {
      appointmentId,
      consentFormId: form.id,
      signed: true,
      formVersion: form.version,
    });
    this.realtime?.emitUser(userId, 'booking:consent-changed', {
      appointmentId,
      consentFormId: form.id,
      signed: true,
      formVersion: form.version,
    });
    return response;
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
    const [messages, members] = await Promise.all([
      this.prisma.messages.findMany({
        where: { conversation_id: conversationId, deleted_at: null },
        include: {
          sender: { select: { id: true, full_name: true } },
          attachments: true,
        },
        orderBy: { created_at: 'asc' },
        take: Math.min(limit, 250),
      }),
      this.prisma.conversation_members.findMany({
        where: { conversation_id: conversationId, left_at: null },
        select: {
          user_id: true,
          last_read_at: true,
          user: { select: { id: true, full_name: true } },
        },
      }),
    ]);

    return messages.map((message) => ({
      ...message,
      readBy: members
        .filter(
          (member) =>
            member.user_id !== message.sender_user_id &&
            member.last_read_at != null &&
            member.last_read_at >= message.created_at,
        )
        .map((member) => member.user),
    }));
  }

  async sendMessage(
    userId: string,
    conversationId: string,
    body: string | undefined,
    messageType: string,
    attachments: Array<{
      mediaId: string;
      mediaType?: string;
      fileName?: string;
      sizeBytes?: number;
    }> = [],
  ) {
    await this.assertConversationMember(userId, conversationId);
    const clean = body?.trim() ?? '';
    const normalizedAttachments = attachments
      .map((item) => ({
        mediaId: String(item.mediaId || '').trim(),
        mediaType: item.mediaType ? String(item.mediaType).trim() : null,
        fileName: item.fileName ? String(item.fileName).trim() : null,
        sizeBytes:
          item.sizeBytes == null ? null : Math.max(0, Math.trunc(Number(item.sizeBytes))),
      }))
      .filter((item) => item.mediaId);

    if (!clean && normalizedAttachments.length === 0) {
      throw new BadRequestException('Message body or attachment is required');
    }
    if (normalizedAttachments.length > 8) {
      throw new BadRequestException('A message can contain at most 8 attachments');
    }

    const allowedTypes = new Set(['text', 'image', 'video', 'media', 'file']);
    const normalizedType = allowedTypes.has(messageType) ? messageType : 'text';

    if (normalizedAttachments.length) {
      const mediaIds = Array.from(
        new Set(normalizedAttachments.map((item) => item.mediaId)),
      );
      const ownedMedia = await this.prisma.media.findMany({
        where: {
          id: { in: mediaIds },
          uploader_user_id: userId,
          status: { in: ['uploaded', 'processing', 'ready'] },
        },
        select: {
          id: true,
          mime_category: true,
          original_file_name: true,
          size_bytes: true,
        },
      });
      if (ownedMedia.length !== mediaIds.length) {
        throw new ForbiddenException(
          'One or more message attachments are not owned by the current user',
        );
      }

      const mediaById = new Map(ownedMedia.map((item) => [item.id, item]));
      for (const attachment of normalizedAttachments) {
        const media = mediaById.get(attachment.mediaId)!;
        attachment.mediaType = attachment.mediaType || media.mime_category;
        attachment.fileName = attachment.fileName || media.original_file_name;
        attachment.sizeBytes = attachment.sizeBytes ?? media.size_bytes;
      }
    }

    const message = await this.prisma.$transaction(async (tx) => {
      const created = await tx.messages.create({
        data: {
          conversation_id: conversationId,
          sender_user_id: userId,
          message_type:
            normalizedAttachments.length && normalizedType === 'text'
              ? 'media'
              : normalizedType,
          body_plain: clean || null,
          attachments: normalizedAttachments.length
            ? {
                create: normalizedAttachments.map((item, index) => ({
                  media_id: item.mediaId,
                  media_type: item.mediaType || 'other',
                  file_name: item.fileName,
                  size_bytes: item.sizeBytes,
                  sort_order: index,
                })),
              }
            : undefined,
        },
        include: {
          sender: { select: { id: true, full_name: true } },
          attachments: true,
        },
      });
      await tx.conversations.update({
        where: { id: conversationId },
        data: {
          last_message_id: created.id,
          last_message_at: created.created_at,
        },
      });
      await tx.conversation_members.updateMany({
        where: { conversation_id: conversationId, user_id: userId },
        data: {
          last_read_message_id: created.id,
          last_read_at: created.created_at,
        },
      });
      return created;
    });

    const payload = { conversationId, message };
    this.realtime?.emitConversation(conversationId, 'message:created', payload);

    const members = await this.prisma.conversation_members.findMany({
      where: { conversation_id: conversationId, left_at: null },
      select: { user_id: true },
    });
    const notificationBody = clean
      ? clean.length > 140
        ? `${clean.slice(0, 137)}...`
        : clean
      : normalizedAttachments.length === 1
        ? 'Sent an attachment'
        : `Sent ${normalizedAttachments.length} attachments`;

    for (const member of members) {
      this.realtime?.emitUser(member.user_id, 'message:created', payload);
      if (member.user_id !== userId) {
        await this.notifications?.dispatch({
          recipientUserId: member.user_id,
          notificationType: 'chat_message',
          title: message.sender?.full_name || 'New message',
          body: notificationBody,
          deepLink: `/messages/${conversationId}`,
          payload: { conversationId, messageId: message.id },
          channels: ['in_app', 'push'],
        });
      }
    }

    return message;
  }

  async markConversationRead(
    userId: string,
    conversationId: string,
    messageId?: string,
  ) {
    await this.assertConversationMember(userId, conversationId);
    const message = messageId
      ? await this.prisma.messages.findFirst({
          where: {
            id: messageId,
            conversation_id: conversationId,
            deleted_at: null,
          },
          select: { id: true, created_at: true },
        })
      : await this.prisma.messages.findFirst({
          where: { conversation_id: conversationId, deleted_at: null },
          orderBy: { created_at: 'desc' },
          select: { id: true, created_at: true },
        });

    if (!message) {
      return { conversationId, lastReadMessageId: null, lastReadAt: null };
    }

    await this.prisma.conversation_members.updateMany({
      where: { conversation_id: conversationId, user_id: userId, left_at: null },
      data: {
        last_read_message_id: message.id,
        last_read_at: message.created_at,
      },
    });

    const reader = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { id: true, full_name: true },
    });
    const payload = {
      conversationId,
      messageId: message.id,
      readAt: message.created_at,
      reader,
    };
    this.realtime?.emitConversation(conversationId, 'message:read', payload);
    const members = await this.prisma.conversation_members.findMany({
      where: { conversation_id: conversationId, left_at: null },
      select: { user_id: true },
    });
    for (const member of members) {
      this.realtime?.emitUser(member.user_id, 'message:read', payload);
    }
    return payload;
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
