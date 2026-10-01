import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma.service';

@Processor('notification-queue')
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) { super(); }

  async process(job: Job) {
    const { notificationId, userId, type, title, body, payload } = job.data as {
      notificationId: string;
      userId: string;
      type: string;
      title: string;
      body: string;
      payload?: Record<string, unknown>;
    };
    const devices = await this.prisma.push_devices.findMany({
      where: { user_id: userId, is_enabled: true },
      select: { token: true, platform: true, app_type: true },
    });
    if (!devices.length) {
      this.logger.log(`No active push devices for user ${userId}; notification ${notificationId} remains available in-app.`);
      return { delivered: false, reason: 'no_devices' };
    }

    const provider = this.config.get<string>('PUSH_PROVIDER', 'console').toLowerCase();
    const production = this.config.get<string>('NODE_ENV') === 'production';
    if (provider === 'console') {
      if (production) throw new Error('PUSH_PROVIDER=console is forbidden in production');
      this.logger.log(`[DEV-PUSH] ${userId} ${type}: ${title} — ${body}`);
      return { delivered: false, provider: 'console' };
    }
    if (provider !== 'generic_http') throw new Error(`Unsupported PUSH_PROVIDER=${provider}`);

    const endpoint = this.config.get<string>('PUSH_PROVIDER_BASE_URL');
    const apiKey = this.config.get<string>('PUSH_API_KEY');
    if (!endpoint || !apiKey) throw new Error('Push provider configuration is incomplete');

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        notificationId,
        userId,
        type,
        devices,
        notification: { title, body },
        data: payload ?? {},
      }),
    });
    if (!response.ok) throw new Error(`Push provider returned HTTP ${response.status}`);
    const result = await response.json().catch(() => ({})) as { invalidTokens?: string[] };
    if (Array.isArray(result.invalidTokens) && result.invalidTokens.length) {
      await this.prisma.push_devices.updateMany({
        where: { token: { in: result.invalidTokens } },
        data: { is_enabled: false },
      });
    }
    await this.prisma.notifications.updateMany({
      where: { id: notificationId, recipient_user_id: userId },
      data: { sent_at: new Date() },
    });
    return { delivered: true, deviceCount: devices.length, provider };
  }
}
