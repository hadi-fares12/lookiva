import { Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/types/request-with-user';
import { PrismaService } from '../prisma/prisma.service';
import {
  AiParseSearchDto,
  CreateGeofenceCandidateDto,
  ModerateReportDto,
} from './dto/platform-ops-v2.dto';

@Injectable()
export class PlatformOpsV2Service {
  constructor(private readonly prisma: PrismaService) {}

  workersStatus() {
    return {
      queues: ['email', 'notifications', 'media', 'analytics'],
      provider: 'BullMQ',
      localStatus: 'configured',
      note: 'Runtime queue depth is exposed by workers when Redis is running.',
    };
  }

  realtimeStatus() {
    return {
      channels: ['bookings', 'queue', 'floor_board', 'notifications', 'chat'],
      provider: 'socket.io-compatible',
      localStatus: 'api-contract-ready',
    };
  }

  createGeofenceCandidate(dto: CreateGeofenceCandidateDto) {
    return this.prisma.geofence_candidates.create({
      data: {
        user_id: dto.userId,
        company_id: dto.companyId ?? null,
        professional_id: dto.professionalId ?? null,
        latitude: dto.latitude,
        longitude: dto.longitude,
        radius_meters: dto.radiusMeters ?? 200,
        priority_score: dto.priorityScore,
        expiration_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
  }

  listGeofenceCandidates(userId: string) {
    return this.prisma.geofence_candidates.findMany({
      where: {
        user_id: userId,
        OR: [{ expiration_at: null }, { expiration_at: { gt: new Date() } }],
      },
      orderBy: { priority_score: 'desc' },
      take: 50,
    });
  }

  listModerationReports(status?: string) {
    return this.prisma.moderation_reports.findMany({
      where: status ? { status } : {},
      orderBy: { created_at: 'desc' },
      take: 100,
    });
  }

  moderateReport(
    user: AuthenticatedUser,
    reportId: string,
    dto: ModerateReportDto,
  ) {
    return this.prisma.moderation_reports.update({
      where: { id: reportId },
      data: {
        status: 'reviewed',
        reviewed_by_id: user.id,
        reviewed_at: new Date(),
        action_taken: dto.actionTaken,
        action_details: dto.actionDetails ?? null,
      },
    });
  }

  aiStatus() {
    return {
      optional: true,
      enabled: false,
      providers: [],
      fallback: 'deterministic-rule-parser',
    };
  }

  parseSearch(dto: AiParseSearchDto) {
    const query = dto.query.toLowerCase();
    const maxPriceMatch = query.match(/under\s+\$?(\d+)|below\s+\$?(\d+)/);
    const afterTimeMatch = query.match(/after\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
    const availableNow = /\b(now|today|tonight|available)\b/.test(query);
    const homeService = /\bhome service|at home|come to me\b/.test(query);
    const category =
      query.includes('beard') ? 'beard' :
      query.includes('nail') ? 'nails' :
      query.includes('makeup') ? 'makeup' :
      query.includes('spa') ? 'spa' :
      query.includes('fade') || query.includes('hair') ? 'hair' :
      undefined;

    return {
      aiEnabled: false,
      query: dto.query,
      structured: {
        q: dto.query,
        maxPrice: maxPriceMatch ? Number(maxPriceMatch[1] ?? maxPriceMatch[2]) : undefined,
        availableNow,
        availableToday: availableNow,
        homeService,
        category,
        earliestTime: afterTimeMatch
          ? {
              hour: Number(afterTimeMatch[1]),
              minute: Number(afterTimeMatch[2] ?? 0),
              meridiem: afterTimeMatch[3] ?? null,
            }
          : undefined,
      },
    };
  }
}
