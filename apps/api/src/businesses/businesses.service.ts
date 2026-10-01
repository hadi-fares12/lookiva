import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PatchBusinessDto } from './dto/businesses.dto';

@Injectable()
export class BusinessesService {
  private readonly logger = new Logger(BusinessesService.name);

  constructor(private readonly prisma: PrismaService) {}

  private haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371000;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private isBranchOpenNow(hours: any[]): boolean {
    if (!hours || hours.length === 0) return false;
    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const todayHours = hours.find((h) => h.day_of_week === dayOfWeek);
    if (!todayHours || todayHours.is_closed) return false;

    const openParts = (todayHours.open_time || '00:00').split(':');
    const closeParts = (todayHours.close_time || '23:59').split(':');
    const openMinutes = parseInt(openParts[0]) * 60 + parseInt(openParts[1]);
    const closeMinutes = parseInt(closeParts[0]) * 60 + parseInt(closeParts[1]);

    return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  }

  async getById(id: string, viewerLat?: number, viewerLon?: number) {
    let company = null;
    try {
      company = await this.prisma.companies.findUnique({
        where: { id },
        include: {
          owner_user: {
            select: { id: true, full_name: true, avatar_media_id: true },
          },
          branches: {
            include: {
              location: true,
              hours: true,
              resources: true,
            },
          },
          services: {
            include: {
              translations: true,
              category: true,
            },
          },
          professionals: {
            include: {
              user: {
                select: { id: true, full_name: true, avatar_media_id: true },
              },
              schedules: true,
            },
          },
          posts: {
            take: 5,
            orderBy: { created_at: 'desc' },
          },
        },
      });
    } catch (err) {
      this.logger.warn(`Failed to fetch business ${id}: ${err.message}`);
      return null;
    }

    if (!company) return null;

    const branches = company.branches || [];
    const services = company.services || [];
    const professionals = company.professionals || [];
    const posts = company.posts || [];

    const isOpen = branches.some((b: any) => this.isBranchOpenNow(b.hours || []));

    let distanceMeters: number | null = null;
    if (viewerLat != null && viewerLon != null) {
      let minDist = Infinity;
      for (const b of branches) {
        if (b.latitude != null && b.longitude != null) {
          const d = this.haversineDistance(
            viewerLat,
            viewerLon,
            b.latitude,
            b.longitude,
          );
          if (d < minDist) minDist = d;
        }
      }
      if (minDist !== Infinity) distanceMeters = Math.round(minDist);
    }

    let aggregateReviews = { avg_rating: 0, count: 0 };
    try {
      const reviewsAgg = await this.prisma.reviews.aggregate({
        where: { company_id: id },
        _avg: { overall_rating: true },
        _count: { id: true },
      });
      aggregateReviews = {
        avg_rating: reviewsAgg._avg.overall_rating ? Number(reviewsAgg._avg.overall_rating.toFixed(2)) : 0,
        count: reviewsAgg._count.id || 0,
      };
    } catch (err) {
      this.logger.warn(`Failed to aggregate reviews for ${id}: ${err.message}`);
    }

    const categoryCoverage = Array.from(
      new Set(
        services
          .filter((s: any) => s.category)
          .map((s: any) => s.category.name || s.category.id)
          .filter(Boolean),
      ),
    );

    return {
      ...company,
      is_open: isOpen,
      distance_meters: distanceMeters,
      aggregate_reviews: aggregateReviews,
      services_count: services.length,
      professionals_count: professionals.length,
      branches_count: branches.length,
      posts_count: posts.length,
      followers_count: company.follower_count || 0,
      review_count: company.review_count || aggregateReviews.count,
      category_coverage: categoryCoverage,
      owner: company.owner_user,
      branches,
      services,
      professionals,
      recent_posts: posts,
    };
  }

  async listBranches(businessId: string, filters?: any) {
    try {
      return await this.prisma.branches.findMany({
        where: { company_id: businessId, ...filters },
        include: {
          location: true,
          hours: true,
          resources: true,
        },
      });
    } catch (err) {
      this.logger.warn(`Failed to list branches for ${businessId}: ${err.message}`);
      return [];
    }
  }

  async listServices(businessId: string, categoryId?: string) {
    try {
      const where: any = { company_id: businessId };
      if (categoryId) where.category_id = categoryId;
      return await this.prisma.services.findMany({
        where,
        include: {
          translations: true,
        },
      });
    } catch (err) {
      this.logger.warn(`Failed to list services for ${businessId}: ${err.message}`);
      return [];
    }
  }

  async listProfessionals(businessId: string) {
    try {
      return await this.prisma.professionals.findMany({
        where: { company_id: businessId },
        include: {
          user: {
            select: { id: true, full_name: true, avatar_media_id: true },
          },
          schedules: true,
        },
      });
    } catch (err) {
      this.logger.warn(`Failed to list professionals for ${businessId}: ${err.message}`);
      return [];
    }
  }

  async listMedia(businessId: string) {
    const mediaIds: string[] = [];
    try {
      const company = await this.prisma.companies.findUnique({
        where: { id: businessId },
        select: { logo_media_id: true, cover_media_id: true },
      });
      if (company?.logo_media_id) mediaIds.push(company.logo_media_id);
      if (company?.cover_media_id) mediaIds.push(company.cover_media_id);

      const posts = await this.prisma.posts.findMany({
        where: { company_id: businessId },
        select: { media_ids: true },
      });
      for (const p of posts) {
        if (p.media_ids && Array.isArray(p.media_ids)) {
          mediaIds.push(...(p.media_ids as string[]));
        }
      }

      const uniqueIds = Array.from(new Set(mediaIds.filter(Boolean)));
      if (uniqueIds.length === 0) return [];

      return await this.prisma.media.findMany({
        where: { id: { in: uniqueIds } },
      });
    } catch (err) {
      this.logger.warn(`Failed to list media for ${businessId}: ${err.message}`);
      return [];
    }
  }

  async listReviews(businessId: string, limit = 20, offset = 0) {
    try {
      return await this.prisma.reviews.findMany({
        where: { company_id: businessId },
        include: {
          author_user: {
            select: { id: true, full_name: true, avatar_media_id: true },
          },
        },
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
      });
    } catch (err) {
      this.logger.warn(`Failed to list reviews for ${businessId}: ${err.message}`);
      return [];
    }
  }

  async patchBusiness(businessId: string, userId: string, dto: PatchBusinessDto) {
    const business = await this.prisma.companies.findUnique({
      where: { id: businessId },
      select: { id: true, owner_user_id: true, display_name: true, is_active: true, deposit_required: true, deposit_percent: true },
    });
    if (!business) throw new NotFoundException('Business not found');

    const scopes = await this.prisma.user_role_scopes.findMany({
      where: { user_id: userId, company_id: businessId },
      select: { role_key: true, scope_type: true, scope_id: true, branch_id: true },
    });
    const allowedRoles = new Set(['business_owner', 'business_manager']);
    const hasCompanyAccess = business.owner_user_id === userId || scopes.some((scope) =>
      allowedRoles.has(scope.role_key) && scope.scope_type === 'company' && (scope.scope_id === businessId || scope.scope_id == null),
    );
    if (!hasCompanyAccess) {
      throw new ForbiddenException('This account cannot edit the company profile');
    }

    const effectiveDepositRequired = dto.deposit_required ?? business.deposit_required ?? false;
    const currentDepositPercent = business.deposit_percent ?? null;
    const effectiveDepositPercent = dto.deposit_percent ?? currentDepositPercent;
    if (effectiveDepositRequired && (!effectiveDepositPercent || effectiveDepositPercent <= 0 || effectiveDepositPercent > 100)) {
      throw new BadRequestException('A deposit percentage between 0 and 100 is required when deposits are enabled');
    }
    if (dto.deposit_required === false && dto.deposit_percent !== undefined && dto.deposit_percent < 0) {
      throw new BadRequestException('Deposit percentage cannot be negative');
    }
    if (dto.max_booking_advance_days !== undefined && dto.max_booking_advance_days < 1) {
      throw new BadRequestException('Maximum booking advance must be at least one day');
    }
    if (dto.min_booking_notice_minutes !== undefined && dto.min_booking_notice_minutes > 60 * 24 * 30) {
      throw new BadRequestException('Minimum booking notice cannot exceed 30 days');
    }

    const updateData: any = {};
    const allowedFields = [
      'display_name', 'tagline', 'description_short', 'description_long', 'website_url',
      'booking_enabled', 'walk_ins_enabled', 'online_payments_enabled',
      'min_booking_notice_minutes', 'max_booking_advance_days', 'cancellation_policy_hours',
      'cancellation_fee_percent', 'no_show_fee_percent', 'deposit_required', 'deposit_percent',
      'auto_confirm_bookings',
    ];
    for (const field of allowedFields) {
      if (dto[field] !== undefined) updateData[field] = dto[field];
    }
    if (!Object.keys(updateData).length) return this.prisma.companies.findUnique({ where: { id: businessId } });

    const updated = await this.prisma.companies.update({
      where: { id: businessId },
      data: updateData,
    });
    await this.prisma.audit_logs.create({
      data: {
        actor_user_id: userId,
        action: 'business.profile.update',
        entity_type: 'company',
        entity_id: businessId,
        company_id: businessId,
        old_value: { display_name: business.display_name } as any,
        new_value: updateData as any,
      },
    });
    return updated;
  }
}
