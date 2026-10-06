import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBusinessApplicationDto, PatchBusinessDto } from './dto/businesses.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class BusinessesService {
  private readonly logger = new Logger(BusinessesService.name);

  constructor(private readonly prisma: PrismaService) {}


  async createApplication(dto: CreateBusinessApplicationDto) {
    const email = dto.ownerEmail.trim().toLowerCase();
    const phone = dto.ownerPhone?.trim() || null;
    const existing = await this.prisma.users.findFirst({
      where: { OR: [{ email }, ...(phone ? [{ phone }] : [])] },
      select: { id: true },
    });
    if (existing) throw new ConflictException('An account already exists for this email or phone');

    const country = await this.prisma.countries.findFirst({
      where: { id: dto.countryId, is_active: true },
      select: { id: true },
    });
    if (!country) throw new BadRequestException('Country is invalid or inactive');

    const categoryCount = await this.prisma.service_categories.count({
      where: { id: { in: dto.categoryIds }, is_active: true },
    });
    if (categoryCount !== new Set(dto.categoryIds).size) {
      throw new BadRequestException('One or more business categories are invalid');
    }

    const slugBase = dto.businessName.toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'business';
    let slug = slugBase;
    let suffix = 1;
    while (await this.prisma.companies.findUnique({ where: { slug } })) {
      slug = `${slugBase}-${++suffix}`;
    }

    const placeholderPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);

    return this.prisma.$transaction(async (tx) => {
      const owner = await tx.users.create({
        data: {
          email,
          phone,
          password_hash: placeholderPassword,
          full_name: dto.ownerFullName.trim(),
          is_active: false,
        },
      });

      const company = await tx.companies.create({
        data: {
          owner_user_id: owner.id,
          country_id: dto.countryId,
          category_ids: Array.from(new Set(dto.categoryIds)),
          display_name: dto.businessName.trim(),
          slug,
          description_short: dto.description?.trim() || null,
          website_url: dto.websiteUrl || null,
          is_verified: false,
          is_active: false,
          booking_enabled: false,
        },
      });

      const branch = await tx.branches.create({
        data: {
          company_id: company.id,
          country_id: dto.countryId,
          name: dto.businessName.trim(),
          slug: 'main',
          address_line_1: dto.addressLine1?.trim() || null,
          latitude: dto.latitude ?? null,
          longitude: dto.longitude ?? null,
          phone,
          email,
          whatsapp: dto.whatsapp?.trim() || phone,
          instagram_handle: dto.instagramHandle?.trim() || null,
          is_main: true,
          is_active: false,
          booking_enabled: false,
        },
      });

      const verification = await tx.company_verification.create({
        data: {
          company_id: company.id,
          submitted_by_user_id: owner.id,
          legal_business_name: dto.businessName.trim(),
          registration_number: dto.registrationNumber?.trim() || null,
          tax_id_number: dto.taxIdNumber?.trim() || null,
          owner_full_name: dto.ownerFullName.trim(),
          documents: dto.documentMediaIds ?? [],
          notes: dto.notes?.trim() || null,
          status: 'pending',
        },
      });

      return {
        applicationId: verification.id,
        companyId: company.id,
        status: verification.status,
        message: 'Business application submitted for administrator review',
        branchId: branch.id,
      };
    });
  }

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

    const professionalAvatarIds = Array.from(new Set(
      professionals
        .map((professional: any) => professional.avatar_media_id || professional.user?.avatar_media_id)
        .filter(Boolean),
    )) as string[];
    let professionalAvatarById = new Map<string, any>();
    if (professionalAvatarIds.length) {
      try {
        const avatarMedia = await this.prisma.media.findMany({
          where: { id: { in: professionalAvatarIds }, is_public: true },
        });
        professionalAvatarById = new Map(avatarMedia.map((item) => [item.id, item]));
      } catch (err) {
        this.logger.warn(`Failed to resolve professional avatars for business ${id}: ${err.message}`);
      }
    }
    const professionalsWithMedia = professionals.map((professional: any) => {
      const avatarId = professional.avatar_media_id || professional.user?.avatar_media_id;
      return {
        ...professional,
        avatar_media: avatarId ? professionalAvatarById.get(avatarId) ?? null : null,
      };
    });

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
      professionals: professionalsWithMedia,
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

    for (const mediaId of [dto.logo_media_id, dto.cover_media_id].filter(Boolean) as string[]) {
      const media = await this.prisma.media.findFirst({
        where: { id: mediaId, uploader_user_id: userId, is_public: true },
        select: { id: true, company_id: true },
      });
      if (!media || (media.company_id && media.company_id !== businessId)) {
        throw new BadRequestException('Logo/cover media is invalid for this business');
      }
    }

    const updateData: any = {};
    const allowedFields = [
      'display_name', 'tagline', 'description_short', 'description_long', 'website_url',
      'logo_media_id', 'cover_media_id',
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
