import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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

      const where: any = {};
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
        take: limit,
        skip: offset,
      });
    } catch (err) {
      this.logger.warn(`Failed to list reviews: ${err.message}`);
      return [];
    }
  }

  async getById(id: string) {
    try {
      return await this.prisma.reviews.findUnique({
        where: { id },
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
      this.logger.warn(`Failed to get review ${id}: ${err.message}`);
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
    try {
      const result = await this.prisma.$transaction(async (tx: any) => {
        const review = await tx.reviews.create({
          data: {
            company_id: dto.companyId,
            professional_id: dto.professionalId || null,
            appointment_id: dto.appointmentId || null,
            branch_id: dto.branchId || null,
            service_id: dto.serviceId || null,
            author_user_id: userId,
            title: dto.title || null,
            body: dto.body || null,
            overall_rating: dto.overallRating,
            is_verified: false,
          },
        });

        if (dto.dimensionRatings && dto.dimensionRatings.length > 0) {
          await tx.review_ratings.createMany({
            data: dto.dimensionRatings.map((dr: any) => ({
              review_id: review.id,
              dimension_key: dr.dimension,
              rating: dr.rating,
            })),
          });
        }

        if (dto.mediaIds && dto.mediaIds.length > 0) {
          await tx.review_media.createMany({
            data: dto.mediaIds.map((mid: string) => ({
              review_id: review.id,
              media_id: mid,
            })),
          });
        }

        const agg = await tx.reviews.aggregate({
          where: { company_id: dto.companyId },
          _avg: { overall_rating: true },
          _count: { id: true },
        });

        await tx.companies.update({
          where: { id: dto.companyId },
          data: {
            avg_rating: agg._avg.overall_rating ? Number(agg._avg.overall_rating.toFixed(2)) : 0,
            review_count: agg._count.id || 0,
          },
        });

        return review;
      });

      return result;
    } catch (err) {
      this.logger.warn(`Failed to create review: ${err.message}`);
      return null;
    }
  }
}
