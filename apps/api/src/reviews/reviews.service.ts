import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { evaluateAutomaticViolation } from '../common/moderation/auto-violation';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list(params: {
    businessId?: string;
    professionalId?: string;
    serviceId?: string;
    limit?: number;
    offset?: number;
    minRating?: number;
    verifiedOnly?: boolean;
  }) {
    try {
      const {
        businessId,
        professionalId,
        serviceId,
        limit = 20,
        offset = 0,
        minRating,
        verifiedOnly,
      } = params;

      const where: any = { status: 'published', deleted_at: null };
      if (businessId) where.company_id = businessId;
      if (professionalId) where.professional_id = professionalId;
      if (serviceId) where.service_id = serviceId;
      if (minRating != null) where.overall_rating = { gte: Number(minRating) };
      if (verifiedOnly) where.is_verified = true;

      return await this.prisma.reviews.findMany({
        where,
        include: {
          author_user: {
            select: { id: true, full_name: true, avatar_media_id: true },
          },
          ratings: true,
          media_list: true,
        },
        orderBy: { created_at: 'desc' },
        take: Math.min(Math.max(Number(limit) || 20, 1), 100),
        skip: Math.max(Number(offset) || 0, 0),
      });
    } catch (err) {
      this.logger.warn(
        `Failed to list reviews: ${err instanceof Error ? err.message : String(err)}`,
      );
      return [];
    }
  }

  async getById(id: string) {
    try {
      return await this.prisma.reviews.findFirst({
        where: { id, status: 'published', deleted_at: null },
        include: {
          author_user: {
            select: { id: true, full_name: true, avatar_media_id: true },
          },
          ratings: true,
          media_list: true,
          company: { select: { id: true, display_name: true } },
          professional: {
            include: { user: { select: { id: true, full_name: true } } },
          },
          appointment: true,
        },
      });
    } catch (err) {
      this.logger.warn(
        `Failed to get review ${id}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }

  async createReview(
    userId: string,
    dto: {
      companyId: string;
      professionalId?: string;
      appointmentId?: string;
      branchId?: string;
      serviceId?: string;
      title?: string;
      body?: string;
      overallRating: number;
      dimensionRatings?: Array<{ dimension: string; rating: number }>;
      mediaIds?: string[];
    },
  ) {
    if (!userId) throw new ForbiddenException('Authentication is required');
    if (!dto.companyId) throw new BadRequestException('companyId is required');
    const overallRating = Number(dto.overallRating);
    if (!Number.isFinite(overallRating) || overallRating < 1 || overallRating > 5) {
      throw new BadRequestException('overallRating must be between 1 and 5');
    }

    const dimensions = dto.dimensionRatings ?? [];
    for (const item of dimensions) {
      const dimension = String(item.dimension || '').trim();
      const rating = Number(item.rating);
      if (!dimension || !Number.isFinite(rating) || rating < 1 || rating > 5) {
        throw new BadRequestException(
          'Every dimension rating requires a name and rating between 1 and 5',
        );
      }
    }

    const mediaIds = Array.from(
      new Set((dto.mediaIds ?? []).map((id) => String(id).trim()).filter(Boolean)),
    );

    return this.prisma.$transaction(async (tx) => {
      const company = await tx.companies.findFirst({
        where: { id: dto.companyId, is_active: true, deleted_at: null },
        select: { id: true },
      });
      if (!company) throw new NotFoundException('Business not found');

      let verified = false;
      let branchId = dto.branchId ?? null;
      let professionalId = dto.professionalId ?? null;
      let serviceId = dto.serviceId ?? null;

      if (dto.appointmentId) {
        const appointment = await tx.appointments.findUnique({
          where: { id: dto.appointmentId },
          include: {
            services: {
              include: {
                service: { select: { id: true, company_id: true } },
              },
            },
            participants: {
              include: {
                professional: { select: { id: true, company_id: true } },
              },
            },
          },
        });
        if (!appointment) throw new NotFoundException('Appointment not found');
        if (appointment.customer_user_id !== userId) {
          throw new ForbiddenException('You can only review your own appointment');
        }
        if (appointment.company_id !== dto.companyId) {
          throw new BadRequestException('Appointment does not belong to the selected business');
        }
        if (appointment.status !== 'completed') {
          throw new ConflictException('Only completed appointments can produce a verified review');
        }

        const existing = await tx.reviews.findFirst({
          where: {
            appointment_id: appointment.id,
            author_user_id: userId,
            status: { not: 'removed' },
            deleted_at: null,
          },
          select: { id: true },
        });
        if (existing) {
          throw new ConflictException('You already reviewed this appointment');
        }

        branchId = appointment.branch_id;

        const appointmentProfessionalIds = new Set(
          appointment.participants.map((item) => item.professional_id),
        );
        if (professionalId && !appointmentProfessionalIds.has(professionalId)) {
          throw new BadRequestException(
            'Selected professional was not part of this appointment',
          );
        }
        if (!professionalId && appointmentProfessionalIds.size === 1) {
          professionalId = Array.from(appointmentProfessionalIds)[0] ?? null;
        }

        const appointmentServiceIds = new Set(
          appointment.services.map((item) => item.service_id),
        );
        if (serviceId && !appointmentServiceIds.has(serviceId)) {
          throw new BadRequestException(
            'Selected service was not part of this appointment',
          );
        }
        if (!serviceId && appointmentServiceIds.size === 1) {
          serviceId = Array.from(appointmentServiceIds)[0] ?? null;
        }
        verified = true;
      } else {
        if (branchId) {
          const branch = await tx.branches.findFirst({
            where: { id: branchId, company_id: dto.companyId, deleted_at: null },
            select: { id: true },
          });
          if (!branch) throw new BadRequestException('Invalid branch');
        }
        if (professionalId) {
          const professional = await tx.professionals.findFirst({
            where: {
              id: professionalId,
              company_id: dto.companyId,
              deleted_at: null,
            },
            select: { id: true },
          });
          if (!professional) throw new BadRequestException('Invalid professional');
        }
        if (serviceId) {
          const service = await tx.services.findFirst({
            where: {
              id: serviceId,
              company_id: dto.companyId,
              deleted_at: null,
            },
            select: { id: true },
          });
          if (!service) throw new BadRequestException('Invalid service');
        }
      }

      let mediaTypeById = new Map<string, string>();
      if (mediaIds.length) {
        const media = await tx.media.findMany({
          where: {
            id: { in: mediaIds },
            status: 'processed',
          },
          select: { id: true, mime_type: true },
        });
        if (media.length !== mediaIds.length) {
          throw new BadRequestException(
            'One or more review media items are invalid or not processed',
          );
        }
        mediaTypeById = new Map(
          media.map((item) => [
            item.id,
            item.mime_type.startsWith('video/') ? 'video' : 'image',
          ]),
        );
      }

      const review = await tx.reviews.create({
        data: {
          company_id: dto.companyId,
          professional_id: professionalId,
          appointment_id: dto.appointmentId ?? null,
          branch_id: branchId,
          service_id: serviceId,
          author_user_id: userId,
          title: dto.title?.trim() || null,
          body: dto.body?.trim() || null,
          overall_rating: overallRating,
          is_verified: verified,
          status: 'published',
          published_at: new Date(),
        },
      });

      const autoViolation = evaluateAutomaticViolation([dto.title, dto.body]);
      if (autoViolation) {
        await tx.moderation_auto_flags.create({
          data: {
            target_type: 'review',
            target_id: review.id,
            author_user_id: userId,
            reason_type: autoViolation.reasonType,
            confidence: autoViolation.confidence,
            details: autoViolation.details as Prisma.InputJsonValue,
          },
        });
      }

      if (dimensions.length) {
        await tx.review_ratings.createMany({
          data: dimensions.map((item) => ({
            review_id: review.id,
            dimension: String(item.dimension).trim(),
            rating: Number(item.rating),
          })),
        });
      }

      if (mediaIds.length) {
        await tx.review_media.createMany({
          data: mediaIds.map((mediaId, index) => ({
            review_id: review.id,
            media_id: mediaId,
            media_type: mediaTypeById.get(mediaId) ?? 'image',
            sort_order: index,
          })),
        });
      }

      const companyAgg = await tx.reviews.aggregate({
        where: {
          company_id: dto.companyId,
          status: 'published',
          deleted_at: null,
        },
        _avg: { overall_rating: true },
        _count: { id: true },
      });

      await tx.companies.update({
        where: { id: dto.companyId },
        data: {
          avg_rating: companyAgg._avg.overall_rating
            ? Number(companyAgg._avg.overall_rating.toFixed(2))
            : 0,
          review_count: companyAgg._count.id || 0,
        },
      });

      if (professionalId) {
        const professionalAgg = await tx.reviews.aggregate({
          where: {
            professional_id: professionalId,
            status: 'published',
            deleted_at: null,
          },
          _avg: { overall_rating: true },
          _count: { id: true },
        });
        await tx.professionals.update({
          where: { id: professionalId },
          data: {
            avg_rating: professionalAgg._avg.overall_rating
              ? Number(professionalAgg._avg.overall_rating.toFixed(2))
              : 0,
            review_count: professionalAgg._count.id || 0,
          },
        });
      }

      return tx.reviews.findUnique({
        where: { id: review.id },
        include: {
          ratings: true,
          media_list: true,
          appointment: {
            select: { id: true, status: true, completed_at: true },
          },
        },
      });
    });
  }
}
