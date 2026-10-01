import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';

@Processor('analytics-queue')
@Injectable()
export class AnalyticsProcessor extends WorkerHost {
  private readonly logger = new Logger(AnalyticsProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job) {
    const payload = job.data as Record<string, unknown>;
    const eventName = String(payload.eventName ?? payload.eventType ?? '').trim();
    if (!eventName) {
      throw new Error('Analytics job requires eventName/eventType');
    }

    const properties = (payload.properties && typeof payload.properties === 'object')
      ? payload.properties as Record<string, unknown>
      : {};
    const eventCategory = String(payload.eventCategory ?? properties.eventCategory ?? 'background');
    const optionalString = (key: string) => {
      const value = payload[key] ?? properties[key];
      return typeof value === 'string' && value.trim() ? value.trim() : null;
    };
    const optionalNumber = (key: string) => {
      const value = payload[key] ?? properties[key];
      return typeof value === 'number' && Number.isFinite(value) ? value : null;
    };

    const event = await this.prisma.analytics_events.create({
      data: {
        event_name: eventName,
        event_category: eventCategory,
        user_id: optionalString('userId'),
        anonymous_id: optionalString('anonymousId'),
        company_id: optionalString('companyId'),
        branch_id: optionalString('branchId'),
        professional_id: optionalString('professionalId'),
        service_id: optionalString('serviceId'),
        appointment_id: optionalString('appointmentId'),
        screen_name: optionalString('screenName'),
        referrer: optionalString('referrer'),
        utm_source: optionalString('utmSource'),
        utm_medium: optionalString('utmMedium'),
        utm_campaign: optionalString('utmCampaign'),
        utm_content: optionalString('utmContent'),
        session_id: optionalString('sessionId'),
        device_type: optionalString('deviceType'),
        os_name: optionalString('osName'),
        app_version: optionalString('appVersion'),
        latitude: optionalNumber('latitude'),
        longitude: optionalNumber('longitude'),
        properties: properties as Prisma.InputJsonValue,
      },
      select: { id: true, event_name: true, created_at: true },
    });

    this.logger.log(`Analytics job ${job.id} persisted as ${event.id}: ${event.event_name}`);
    return { persisted: true, eventId: event.id };
  }
}
