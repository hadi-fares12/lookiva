import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

export interface DispatchNotificationInput {
  recipientUserId: string;
  notificationType: string;
  title: string;
  body: string;
  channels?: string[];
  deepLink?: string | null;
  payload?: Record<string, unknown> | null;
  companyId?: string | null;
  branchId?: string | null;
  priority?: string;
  expiresAt?: Date | null;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('notification-queue') private readonly notificationQueue: Queue,
    @InjectQueue('email-queue') private readonly emailQueue: Queue,
  ) {}

  async list(userId: string, limit = 50, offset = 0, unreadOnly?: boolean) {
    const where: any = { recipient_user_id: userId };
    if (unreadOnly) where.read_at = null;
    const [items, total] = await Promise.all([
      this.prisma.notifications.findMany({ where, orderBy: { created_at: 'desc' }, take: limit, skip: offset }),
      this.prisma.notifications.count({ where }),
    ]);
    return { items, total, limit, offset, hasMore: offset + items.length < total };
  }

  async markRead(userId: string, id: string) {
    return this.prisma.notifications.updateMany({
      where: { id, recipient_user_id: userId },
      data: { read_at: new Date() },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notifications.updateMany({
      where: { recipient_user_id: userId, read_at: null },
      data: { read_at: new Date() },
    });
  }

  async getPreferences(userId: string) {
    return (await this.prisma.notification_preferences.findUnique({ where: { user_id: userId } })) ?? {
      user_id: userId,
      email_marketing: false,
      email_bookings: true,
      email_reviews: true,
      push_marketing: false,
      push_bookings: true,
      push_reviews: true,
      push_messages: true,
      push_system: true,
      sms_bookings: false,
      sms_reminders: false,
      nearby_enabled: false,
    };
  }

  async updatePreferences(userId: string, patch: any) {
    const allowed = [
      'email_marketing', 'email_bookings', 'email_reviews', 'push_marketing', 'push_bookings',
      'push_reviews', 'push_messages', 'push_system', 'sms_bookings', 'sms_reminders',
      'nearby_enabled', 'nearby_radius_meters', 'auto_translate', 'reduced_motion', 'high_contrast',
      'show_verified_only', 'default_payment_method_id', 'do_not_disturb', 'muted_types',
      'sound_enabled', 'vibration_enabled', 'led_enabled',
    ];
    const safePatch = Object.fromEntries(Object.entries(patch ?? {}).filter(([key]) => allowed.includes(key)));
    return this.prisma.notification_preferences.upsert({
      where: { user_id: userId },
      create: { user_id: userId, ...safePatch },
      update: safePatch,
    });
  }

  async registerPushDevice(userId: string, input: { token: string; platform: string; appType?: string; deviceName?: string; locale?: string }) {
    const prisma = this.prisma as any;
    return prisma.push_devices.upsert({
      where: { token: input.token },
      create: {
        user_id: userId,
        token: input.token,
        platform: input.platform,
        app_type: input.appType ?? 'customer',
        device_name: input.deviceName ?? null,
        locale: input.locale ?? null,
        is_enabled: true,
        last_seen_at: new Date(),
      },
      update: {
        user_id: userId,
        platform: input.platform,
        app_type: input.appType ?? 'customer',
        device_name: input.deviceName ?? null,
        locale: input.locale ?? null,
        is_enabled: true,
        last_seen_at: new Date(),
      },
      select: { id: true, platform: true, app_type: true, device_name: true, locale: true, is_enabled: true, last_seen_at: true },
    });
  }

  async unregisterPushDevice(userId: string, token: string) {
    const prisma = this.prisma as any;
    return prisma.push_devices.updateMany({
      where: { user_id: userId, token },
      data: { is_enabled: false, last_seen_at: new Date() },
    });
  }

  private preferenceFlags(type: string) {
    const normalized = type.toLowerCase();
    if (normalized.includes('message') || normalized.includes('chat')) return { push: 'push_messages', email: null };
    if (normalized.includes('review')) return { push: 'push_reviews', email: 'email_reviews' };
    if (normalized.includes('nearby')) return { push: 'nearby_enabled', email: null };
    if (normalized.includes('marketing') || normalized.includes('promotion') || normalized.includes('offer')) return { push: 'push_marketing', email: 'email_marketing' };
    if (normalized.includes('booking') || normalized.includes('appointment') || normalized.includes('waitlist')) return { push: 'push_bookings', email: 'email_bookings' };
    return { push: 'push_system', email: null };
  }

  async dispatch(input: DispatchNotificationInput) {
    const requestedChannels = input.channels?.length ? input.channels : ['in_app', 'push'];
    const preferences = await this.getPreferences(input.recipientUserId);
    const flags = this.preferenceFlags(input.notificationType);
    const channels = requestedChannels.filter((channel) => {
      if (channel === 'in_app') return true;
      if (channel === 'push') return Boolean((preferences as any)[flags.push] ?? true);
      if (channel === 'email') return flags.email ? Boolean((preferences as any)[flags.email] ?? false) : false;
      return channel === 'sms';
    });

    const notification = await this.prisma.notifications.create({
      data: {
        recipient_user_id: input.recipientUserId,
        notification_type: input.notificationType,
        company_id: input.companyId ?? null,
        branch_id: input.branchId ?? null,
        title: input.title,
        body: input.body,
        deep_link: input.deepLink ?? null,
        payload: (input.payload ?? {}) as any,
        priority: input.priority ?? 'normal',
        channels,
        expires_at: input.expiresAt ?? null,
      },
    });

    if (channels.includes('push')) {
      try {
        await this.notificationQueue.add(
          'push',
          {
            notificationId: notification.id,
            userId: input.recipientUserId,
            type: input.notificationType,
            title: input.title,
            body: input.body,
            payload: { ...(input.payload ?? {}), deepLink: input.deepLink ?? undefined },
          },
          { jobId: `push:${notification.id}`, attempts: 5, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: 500, removeOnFail: 1000 },
        );
      } catch (error) {
        this.logger.error(`Failed to enqueue push notification ${notification.id}: ${(error as Error).message}`);
      }
    }

    if (channels.includes('email')) {
      const recipient = await this.prisma.users.findUnique({
        where: { id: input.recipientUserId },
        select: { email: true, full_name: true, locale: true },
      });
      if (recipient?.email) {
        try {
          await this.emailQueue.add(
            'notification-email',
            {
              to: recipient.email,
              subject: input.title,
              template: 'notification',
              vars: { fullName: recipient.full_name, locale: recipient.locale, title: input.title, body: input.body, deepLink: input.deepLink },
              text: `${input.title}\n\n${input.body}${input.deepLink ? `\n\n${input.deepLink}` : ''}`,
            },
            { jobId: `notification-email:${notification.id}`, attempts: 5, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: 500, removeOnFail: 1000 },
          );
        } catch (error) {
          this.logger.error(`Failed to enqueue email notification ${notification.id}: ${(error as Error).message}`);
        }
      }
    }

    return notification;
  }
}
