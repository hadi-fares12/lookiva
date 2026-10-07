import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthenticatedUser } from '../auth/types/request-with-user';
import { PrismaService } from '../prisma/prisma.service';
import {
  AiParseSearchDto,
  CreateGeofenceCandidateDto,
  CreateModerationAppealDto,
  ModerateReportDto,
  ResolveModerationAppealDto,
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
      provider: 'socket.io',
      localStatus: 'ready',
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

  async moderateReport(
    user: AuthenticatedUser,
    reportId: string,
    dto: ModerateReportDto,
  ) {
    const report = await this.prisma.moderation_reports.findUnique({
      where: { id: reportId },
    });
    if (!report) throw new NotFoundException('Moderation report not found');

    const action = String(dto.actionTaken || '').trim().toLowerCase();
    if (!['dismiss', 'warn', 'hide', 'takedown', 'strike', 'suspend'].includes(action)) {
      throw new BadRequestException(
        'actionTaken must be dismiss, warn, hide, takedown, strike, or suspend',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      let targetOwnerId: string | null = null;
      let companyId: string | null = null;
      let oldTarget: Record<string, unknown> | null = null;
      let newTarget: Record<string, unknown> | null = null;

      if (report.target_type === 'post') {
        const target = await tx.posts.findUnique({
          where: { id: report.target_id },
          select: {
            id: true,
            author_user_id: true,
            company_id: true,
            status: true,
            deleted_at: true,
          },
        });
        if (!target) throw new NotFoundException('Reported post not found');
        targetOwnerId = target.author_user_id;
        companyId = target.company_id;
        oldTarget = target;
        if (action === 'hide' || action === 'takedown') {
          const updated = await tx.posts.update({
            where: { id: target.id },
            data: {
              status: action === 'hide' ? 'hidden' : 'removed',
              ...(action === 'takedown' ? { deleted_at: new Date() } : {}),
            },
            select: { id: true, status: true, deleted_at: true },
          });
          newTarget = updated;
        }
      } else if (report.target_type === 'comment') {
        const target = await tx.comments.findUnique({
          where: { id: report.target_id },
          select: {
            id: true,
            user_id: true,
            status: true,
            deleted_at: true,
            post: { select: { company_id: true } },
          },
        });
        if (!target) throw new NotFoundException('Reported comment not found');
        targetOwnerId = target.user_id;
        companyId = target.post.company_id;
        oldTarget = {
          id: target.id,
          status: target.status,
          deleted_at: target.deleted_at,
        };
        if (action === 'hide' || action === 'takedown') {
          const updated = await tx.comments.update({
            where: { id: target.id },
            data: {
              status: action === 'hide' ? 'hidden' : 'removed',
              ...(action === 'takedown' ? { deleted_at: new Date() } : {}),
            },
            select: { id: true, status: true, deleted_at: true },
          });
          newTarget = updated;
        }
      } else if (report.target_type === 'review') {
        const target = await tx.reviews.findUnique({
          where: { id: report.target_id },
          select: {
            id: true,
            author_user_id: true,
            company_id: true,
            status: true,
            deleted_at: true,
          },
        });
        if (!target) throw new NotFoundException('Reported review not found');
        targetOwnerId = target.author_user_id;
        companyId = target.company_id;
        oldTarget = target;
        if (action === 'hide' || action === 'takedown') {
          const updated = await tx.reviews.update({
            where: { id: target.id },
            data: {
              status: action === 'hide' ? 'hidden' : 'removed',
              ...(action === 'takedown' ? { deleted_at: new Date() } : {}),
            },
            select: { id: true, status: true, deleted_at: true },
          });
          newTarget = updated;
        }
      }

      let strikeId: string | null = null;
      if (['warn', 'strike', 'suspend'].includes(action)) {
        if (!targetOwnerId) {
          throw new BadRequestException(
            'This moderation target does not resolve to an account that can receive a strike',
          );
        }
        const existingStrike = await tx.user_strikes.findFirst({
          where: { report_id: report.id, user_id: targetOwnerId, is_active: true },
          orderBy: { created_at: 'desc' },
        });
        const severity =
          action === 'suspend' ? 'critical' : action === 'strike' ? 'major' : 'warning';
        const strike =
          existingStrike ??
          (await tx.user_strikes.create({
            data: {
              user_id: targetOwnerId,
              severity,
              reason_type: report.reason_type,
              reason_text: dto.actionDetails ?? report.details ?? null,
              report_id: report.id,
              created_by_id: user.id,
            },
          }));
        strikeId = strike.id;

        if (action === 'suspend') {
          await tx.users.update({
            where: { id: targetOwnerId },
            data: { is_active: false },
          });
          await tx.sessions.updateMany({
            where: { user_id: targetOwnerId, revoked_at: null },
            data: { revoked_at: new Date() },
          });
          await tx.push_devices.updateMany({
            where: { user_id: targetOwnerId },
            data: { is_enabled: false },
          });
        }
      }

      const updatedReport = await tx.moderation_reports.update({
        where: { id: report.id },
        data: {
          status: action === 'dismiss' ? 'dismissed' : 'resolved',
          reviewed_by_id: user.id,
          reviewed_at: new Date(),
          action_taken: action,
          action_details: dto.actionDetails ?? null,
        },
      });

      await tx.audit_logs.create({
        data: {
          actor_user_id: user.id,
          actor_role: user.roleScopes[0]?.roleKey ?? null,
          action: 'moderation.report.' + action,
          entity_type: report.target_type,
          entity_id: report.target_id,
          company_id: companyId,
          old_value: oldTarget as any,
          new_value: {
            report: updatedReport,
            target: newTarget,
            strikeId,
            suspendedUserId: action === 'suspend' ? targetOwnerId : null,
          } as any,
        },
      });

      return {
        report: updatedReport,
        target: newTarget,
        strikeId,
        suspendedUserId: action === 'suspend' ? targetOwnerId : null,
      };
    });
  }

  async createModerationAppeal(
    user: AuthenticatedUser,
    dto: CreateModerationAppealDto,
  ) {
    const targetType = String(dto.targetType || '').trim().toLowerCase();
    if (!['post', 'comment', 'review', 'strike'].includes(targetType)) {
      throw new BadRequestException('Appeals support post, comment, review, or strike targets');
    }

    let ownsTarget = false;
    let strikeId = dto.strikeId ?? null;
    if (targetType === 'post') {
      ownsTarget = Boolean(
        await this.prisma.posts.findFirst({
          where: { id: dto.targetId, author_user_id: user.id },
          select: { id: true },
        }),
      );
    } else if (targetType === 'comment') {
      ownsTarget = Boolean(
        await this.prisma.comments.findFirst({
          where: { id: dto.targetId, user_id: user.id },
          select: { id: true },
        }),
      );
    } else if (targetType === 'review') {
      ownsTarget = Boolean(
        await this.prisma.reviews.findFirst({
          where: { id: dto.targetId, author_user_id: user.id },
          select: { id: true },
        }),
      );
    } else {
      strikeId = dto.strikeId ?? dto.targetId;
      ownsTarget = Boolean(
        await this.prisma.user_strikes.findFirst({
          where: { id: strikeId, user_id: user.id },
          select: { id: true },
        }),
      );
    }
    if (!ownsTarget) {
      throw new ForbiddenException('You can only appeal moderation actions affecting your own content or account');
    }

    const reason = String(dto.reasonReversal || '').trim();
    if (reason.length < 10) {
      throw new BadRequestException('Appeal reason must be at least 10 characters');
    }
    const existing = await this.prisma.moderation_appeals.findFirst({
      where: {
        reporter_user_id: user.id,
        target_type: targetType,
        target_id: dto.targetId,
        status: { in: ['pending', 'reviewing'] },
        ...(strikeId ? { strike_id: strikeId } : {}),
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('An active appeal already exists for this moderation action');
    }

    return this.prisma.moderation_appeals.create({
      data: {
        reporter_user_id: user.id,
        target_type: targetType,
        target_id: dto.targetId,
        strike_id: strikeId,
        reason_reversal: reason,
        evidence_media_ids: dto.evidenceMediaIds ?? [],
      },
    });
  }

  myModerationStrikes(user: AuthenticatedUser) {
    return this.prisma.user_strikes.findMany({
      where: { user_id: user.id },
      orderBy: [{ is_active: 'desc' }, { created_at: 'desc' }],
      take: 100,
    });
  }

  myModerationAppeals(user: AuthenticatedUser) {
    return this.prisma.moderation_appeals.findMany({
      where: { reporter_user_id: user.id },
      orderBy: { created_at: 'desc' },
      take: 100,
    });
  }

  listModerationAppeals(status?: string) {
    return this.prisma.moderation_appeals.findMany({
      where: status ? { status } : {},
      orderBy: { created_at: 'desc' },
      take: 100,
    });
  }

  async resolveModerationAppeal(
    user: AuthenticatedUser,
    appealId: string,
    dto: ResolveModerationAppealDto,
  ) {
    const appeal = await this.prisma.moderation_appeals.findUnique({
      where: { id: appealId },
    });
    if (!appeal) throw new NotFoundException('Moderation appeal not found');

    const status = String(dto.status || '').trim().toLowerCase();
    if (!['upheld', 'reversed', 'partially_reversed', 'dismissed'].includes(status)) {
      throw new BadRequestException(
        'Appeal status must be upheld, reversed, partially_reversed, or dismissed',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      let restored: Record<string, unknown> | null = null;
      const restore = dto.restoreContent === true && ['reversed', 'partially_reversed'].includes(status);
      if (restore && appeal.target_type === 'post') {
        restored = await tx.posts.update({
          where: { id: appeal.target_id },
          data: { status: 'published', deleted_at: null },
          select: { id: true, status: true, deleted_at: true },
        });
      } else if (restore && appeal.target_type === 'comment') {
        restored = await tx.comments.update({
          where: { id: appeal.target_id },
          data: { status: 'published', deleted_at: null },
          select: { id: true, status: true, deleted_at: true },
        });
      } else if (restore && appeal.target_type === 'review') {
        restored = await tx.reviews.update({
          where: { id: appeal.target_id },
          data: { status: 'published', deleted_at: null },
          select: { id: true, status: true, deleted_at: true },
        });
      }

      let clearedStrike = false;
      if (
        dto.clearStrike === true &&
        appeal.strike_id &&
        ['reversed', 'partially_reversed'].includes(status)
      ) {
        const result = await tx.user_strikes.updateMany({
          where: { id: appeal.strike_id, user_id: appeal.reporter_user_id },
          data: { is_active: false },
        });
        clearedStrike = result.count > 0;
      }

      const updated = await tx.moderation_appeals.update({
        where: { id: appeal.id },
        data: {
          status,
          reviewed_by_id: user.id,
          reviewed_at: new Date(),
          resolution: String(dto.resolution || '').trim(),
          resolution_notes: dto.resolutionNotes ?? null,
        },
      });
      await tx.audit_logs.create({
        data: {
          actor_user_id: user.id,
          actor_role: user.roleScopes[0]?.roleKey ?? null,
          action: 'moderation.appeal.' + status,
          entity_type: 'moderation_appeal',
          entity_id: appeal.id,
          old_value: appeal as any,
          new_value: {
            appeal: updated,
            restored,
            clearedStrike,
          } as any,
        },
      });
      return { appeal: updated, restored, clearedStrike };
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
