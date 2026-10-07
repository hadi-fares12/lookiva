import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@lookiva/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/types/request-with-user';
import { BookingV2Service } from '../booking-v2/booking-v2.service';
import {
  BookThisLookDto,
  CreateCollectionDto,
  CreatePostV2Dto,
  FollowTargetDto,
  ReportContentDto,
  VerifyWorkDto,
} from './dto/social-v2.dto';

@Injectable()
export class SocialV2Service {
  constructor(
    private readonly prisma: PrismaService,
    private readonly booking: BookingV2Service,
  ) {}

  private canManageCompany(user: AuthenticatedUser, companyId: string) {
    const platformRoles = new Set([
      UserRole.SuperAdmin,
      UserRole.PlatformAdmin,
      UserRole.CountryManager,
    ]);
    if (user.roleScopes.some((scope) => platformRoles.has(scope.roleKey as UserRole))) {
      return true;
    }
    return user.roleScopes.some(
      (scope) =>
        scope.companyId === companyId ||
        (String(scope.scopeType) === 'company' && scope.scopeId === companyId),
    );
  }

  async feed(user: AuthenticatedUser, limit = 20, cursor?: string) {
    const take = Math.min(Math.max(limit, 1), 50);
    const cursorPost = cursor
      ? await this.prisma.posts.findFirst({
          where: { id: cursor, status: 'published', deleted_at: null },
          select: { published_at: true, created_at: true },
        })
      : null;
    const boundary = cursorPost?.published_at ?? cursorPost?.created_at ?? null;
    const follows = await this.prisma.follows.findMany({
      where: { follower_user_id: user.id },
      select: { target_type: true, target_id: true },
    });
    const followedCompanies = new Set(
      follows.filter((item) => item.target_type === 'company').map((item) => item.target_id),
    );
    const followedProfessionals = new Set(
      follows.filter((item) => item.target_type === 'professional').map((item) => item.target_id),
    );

    const posts = await this.prisma.posts.findMany({
      where: {
        status: 'published',
        deleted_at: null,
        ...(boundary
          ? {
              OR: [
                { published_at: { lt: boundary } },
                { published_at: null, created_at: { lt: boundary } },
              ],
            }
          : {}),
      },
      include: {
        author: { select: { id: true, full_name: true, avatar_media_id: true } },
        company: { select: { id: true, display_name: true, slug: true, avg_rating: true } },
        professional: { select: { id: true, display_name: true, avatar_media_id: true, avg_rating: true, is_verified: true } },
        verified_review: {
          select: {
            id: true,
            overall_rating: true,
            is_verified: true,
            status: true,
            deleted_at: true,
            professional_id: true,
            service_id: true,
          },
        },
        verified_appointment: {
          select: {
            id: true,
            status: true,
            completed_at: true,
          },
        },
        media_list: { orderBy: { sort_order: 'asc' } },
        services: {
          orderBy: { is_primary: 'desc' },
          include: {
            service: {
              select: {
                id: true,
                name: true,
                duration_minutes: true,
                base_price: true,
                currency_code: true,
                cover_media_id: true,
                is_active: true,
              },
            },
          },
        },
      },
      orderBy: [{ published_at: 'desc' }, { created_at: 'desc' }],
      take: take * 3,
    });

    const now = Date.now();
    const ranked = posts
      .map((post) => {
        const published = post.published_at ?? post.created_at;
        const ageHours = Math.max(0, (now - published.getTime()) / 3_600_000);
        const followBoost =
          (post.company_id && followedCompanies.has(post.company_id) ? 35 : 0) +
          (post.professional_id && followedProfessionals.has(post.professional_id) ? 45 : 0);
        const engagement = Math.log1p(post.like_count + post.comment_count * 2 + post.view_count * 0.1) * 5;
        const recency = Math.max(0, 30 - ageHours / 4);
        return { ...post, feedScore: Number((followBoost + engagement + recency).toFixed(3)) };
      })
      .sort((a, b) => b.feedScore - a.feedScore || (b.published_at ?? b.created_at).getTime() - (a.published_at ?? a.created_at).getTime())
      .slice(0, take);

    const ids = ranked.map((post) => post.id);
    const [liked, saved] = ids.length
      ? await Promise.all([
          this.prisma.likes.findMany({ where: { user_id: user.id, post_id: { in: ids } }, select: { post_id: true } }),
          this.prisma.favorites.findMany({ where: { user_id: user.id, post_id: { in: ids } }, select: { post_id: true } }),
        ])
      : [[], []];
    const likedIds = new Set(liked.map((item) => item.post_id));
    const savedIds = new Set(saved.map((item) => item.post_id));

    return {
      items: ranked.map((post) => {
        const verifiedWork =
          post.is_verified_work &&
          post.verified_review?.is_verified === true &&
          post.verified_review.status === 'published' &&
          !post.verified_review.deleted_at &&
          post.verified_appointment?.status === 'completed'
            ? {
                reviewId: post.verified_review.id,
                appointmentId: post.verified_appointment.id,
                rating: post.verified_review.overall_rating,
                completedAt: post.verified_appointment.completed_at,
              }
            : null;
        return {
          ...post,
          is_verified_work: Boolean(verifiedWork),
          verifiedWork,
          likedByMe: likedIds.has(post.id),
          savedByMe: savedIds.has(post.id),
          bookableService:
            post.services.find((link) => link.is_primary && link.service.is_active)?.service ??
            post.services.find((link) => link.service.is_active)?.service ??
            null,
        };
      }),
      nextCursor: ranked.length === take ? ranked[ranked.length - 1]?.id ?? null : null,
    };
  }

  async createPost(user: AuthenticatedUser, dto: CreatePostV2Dto) {
    if (dto.companyId && !this.canManageCompany(user, dto.companyId)) {
      const professional = dto.professionalId
        ? await this.prisma.professionals.findFirst({
            where: {
              id: dto.professionalId,
              company_id: dto.companyId,
              user_id: user.id,
              is_active: true,
              deleted_at: null,
            },
            select: { id: true },
          })
        : null;
      if (!professional) {
        throw new ForbiddenException('You are not authorized to publish for this business');
      }
    }
    if (dto.branchId) {
      if (!dto.companyId) {
        throw new BadRequestException('companyId is required when branchId is provided');
      }
      const branch = await this.prisma.branches.findFirst({
        where: {
          id: dto.branchId,
          company_id: dto.companyId,
          is_active: true,
          deleted_at: null,
        },
        select: { id: true },
      });
      if (!branch) throw new BadRequestException('Invalid business branch');
    }
    if (dto.professionalId) {
      const professional = await this.prisma.professionals.findFirst({
        where: {
          id: dto.professionalId,
          ...(dto.companyId ? { company_id: dto.companyId } : {}),
          is_active: true,
          deleted_at: null,
        },
        select: { id: true, company_id: true, user_id: true },
      });
      if (!professional) throw new BadRequestException('Invalid professional');
      if (
        professional.user_id !== user.id &&
        !this.canManageCompany(user, professional.company_id)
      ) {
        throw new ForbiddenException('You are not authorized to publish for this professional');
      }
      if (!dto.companyId) dto.companyId = professional.company_id;
    }

    return this.prisma.$transaction(async (tx) => {
      const authorRole = user.roleScopes[0]?.roleKey ?? UserRole.Customer;
      const post = await tx.posts.create({
        data: {
          author_user_id: user.id,
          author_role: authorRole,
          company_id: dto.companyId ?? null,
          branch_id: dto.branchId ?? null,
          professional_id: dto.professionalId ?? null,
          title: dto.title ?? null,
          body_plain: dto.bodyPlain ?? null,
          media_ids: dto.mediaIds ?? [],
          service_ids: dto.serviceIds ?? [],
          category_ids: dto.categoryIds ?? [],
          tags: dto.tags ?? [],
          is_promotion: dto.isPromotion ?? false,
          status: 'published',
          published_at: new Date(),
        },
      });

      for (const [index, mediaId] of (dto.mediaIds ?? []).entries()) {
        await tx.post_media.create({
          data: {
            post_id: post.id,
            media_id: mediaId,
            media_type: 'image',
            sort_order: index,
          },
        });
      }

      for (const serviceId of dto.serviceIds ?? []) {
        const service = await tx.services.findFirst({
          where: { id: serviceId, is_active: true, deleted_at: null },
          select: { id: true, company_id: true, category_id: true },
        });
        if (!service) throw new BadRequestException('One or more linked services are invalid');
        if (dto.companyId && service.company_id !== dto.companyId) {
          throw new BadRequestException('Linked service does not belong to the post business');
        }
        await tx.post_services.create({
          data: {
            post_id: post.id,
            service_id: serviceId,
            category_id: service.category_id,
            is_primary: serviceId === dto.serviceIds?.[0],
          },
        });
      }

      return tx.posts.findUnique({
        where: { id: post.id },
        include: { media_list: true, services: { include: { service: true } } },
      });
    });
  }

  async verifyWork(
    user: AuthenticatedUser,
    postId: string,
    dto: VerifyWorkDto,
  ) {
    const post = await this.prisma.posts.findFirst({
      where: {
        id: postId,
        author_user_id: user.id,
        status: 'published',
        deleted_at: null,
      },
      include: {
        services: { select: { service_id: true } },
      },
    });
    if (!post) {
      throw new NotFoundException('Published post not found or you are not its author');
    }

    const review = await this.prisma.reviews.findFirst({
      where: {
        id: dto.reviewId,
        is_verified: true,
        status: 'published',
        deleted_at: null,
        appointment_id: { not: null },
      },
      include: {
        appointment: {
          include: {
            participants: { select: { professional_id: true } },
            services: { select: { service_id: true } },
          },
        },
      },
    });
    if (!review?.appointment) {
      throw new BadRequestException(
        'Verified Work requires a verified review linked to a completed appointment',
      );
    }
    const appointment = review.appointment;
    if (appointment.status !== 'completed') {
      throw new ConflictException('Verified Work appointment is not completed');
    }
    if (post.company_id !== review.company_id || post.company_id !== appointment.company_id) {
      throw new BadRequestException('Review and appointment must belong to the post business');
    }
    if (post.branch_id && post.branch_id !== appointment.branch_id) {
      throw new BadRequestException('Review appointment does not belong to the post branch');
    }

    const appointmentProfessionalIds = new Set(
      appointment.participants.map((item) => item.professional_id),
    );
    if (post.professional_id && !appointmentProfessionalIds.has(post.professional_id)) {
      throw new BadRequestException(
        'Post professional did not participate in the reviewed appointment',
      );
    }
    if (
      post.professional_id &&
      review.professional_id &&
      post.professional_id !== review.professional_id
    ) {
      throw new BadRequestException('Verified review professional does not match the post');
    }

    const postServiceIds = new Set(post.services.map((item) => item.service_id));
    const appointmentServiceIds = new Set(
      appointment.services.map((item) => item.service_id),
    );
    if (
      postServiceIds.size > 0 &&
      !Array.from(postServiceIds).some((serviceId) =>
        appointmentServiceIds.has(serviceId),
      )
    ) {
      throw new BadRequestException(
        'The reviewed appointment does not contain a service shown in this post',
      );
    }
    if (
      review.service_id &&
      postServiceIds.size > 0 &&
      !postServiceIds.has(review.service_id)
    ) {
      throw new BadRequestException('Verified review service does not match the post');
    }

    const updated = await this.prisma.posts.update({
      where: { id: post.id },
      data: {
        verified_review_id: review.id,
        verified_appointment_id: appointment.id,
        is_verified_work: true,
        verified_work_at: new Date(),
      },
      include: {
        verified_review: {
          select: { id: true, overall_rating: true, is_verified: true },
        },
        verified_appointment: {
          select: { id: true, status: true, completed_at: true },
        },
      },
    });

    await this.prisma.audit_logs.create({
      data: {
        actor_user_id: user.id,
        actor_role: user.roleScopes[0]?.roleKey ?? null,
        action: 'social.post.verify_work',
        entity_type: 'post',
        entity_id: post.id,
        company_id: post.company_id,
        branch_id: post.branch_id,
        new_value: {
          reviewId: review.id,
          appointmentId: appointment.id,
          professionalId: post.professional_id,
          serviceIds: Array.from(postServiceIds),
        },
      },
    });

    return updated;
  }

  async savePost(user: AuthenticatedUser, postId: string) {
    const post = await this.prisma.posts.findFirst({
      where: { id: postId, status: 'published', deleted_at: null },
    });
    if (!post) throw new NotFoundException('Post not found');
    const existing = await this.prisma.favorites.findUnique({
      where: {
        user_id_favorite_type_entity_id: {
          user_id: user.id,
          favorite_type: 'post',
          entity_id: post.id,
        },
      },
    });
    if (existing) return existing;

    return this.prisma.$transaction(async (tx) => {
      const favorite = await tx.favorites.create({
        data: {
          user_id: user.id,
          favorite_type: 'post',
          entity_id: post.id,
          post_id: post.id,
          company_id: post.company_id,
          professional_id: post.professional_id,
        },
      });
      await tx.posts.update({
        where: { id: post.id },
        data: { bookmark_count: { increment: 1 } },
      });
      return favorite;
    });
  }

  async unsavePost(user: AuthenticatedUser, postId: string) {
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.favorites.deleteMany({
        where: { user_id: user.id, favorite_type: 'post', entity_id: postId },
      });
      if (result.count) {
        await tx.posts.updateMany({
          where: { id: postId, bookmark_count: { gt: 0 } },
          data: { bookmark_count: { decrement: 1 } },
        });
      }
      return { saved: false, removed: result.count > 0 };
    });
  }

  report(
    user: AuthenticatedUser,
    targetType: string,
    targetId: string,
    dto: ReportContentDto,
  ) {
    return this.prisma.moderation_reports.create({
      data: {
        reporter_user_id: user.id,
        target_type: targetType,
        target_id: targetId,
        reason_type: dto.reasonType,
        details: dto.details ?? null,
        evidence_media_ids: dto.evidenceMediaIds ?? [],
      },
    });
  }

  listCollections(user: AuthenticatedUser) {
    return this.prisma.collections.findMany({
      where: { user_id: user.id },
      include: {
        items: {
          orderBy: [{ sort_order: 'asc' }, { added_at: 'desc' }],
          include: {
            post: {
              include: {
                media_list: { orderBy: { sort_order: 'asc' }, take: 1 },
                professional: { select: { id: true, display_name: true } },
                company: { select: { id: true, display_name: true } },
              },
            },
          },
        },
      },
      orderBy: { updated_at: 'desc' },
    });
  }

  createCollection(user: AuthenticatedUser, dto: CreateCollectionDto) {
    return this.prisma.collections.create({
      data: {
        user_id: user.id,
        name: dto.name,
        description: dto.description ?? null,
        is_public: dto.isPublic ?? false,
      },
    });
  }

  async deleteCollection(user: AuthenticatedUser, collectionId: string) {
    const collection = await this.prisma.collections.findFirst({
      where: { id: collectionId, user_id: user.id },
      select: { id: true },
    });
    if (!collection) throw new NotFoundException('Collection not found');
    await this.prisma.collections.delete({ where: { id: collectionId } });
    return { deleted: true, id: collectionId };
  }

  async addCollectionItem(user: AuthenticatedUser, collectionId: string, postId: string) {
    const collection = await this.prisma.collections.findFirst({
      where: { id: collectionId, user_id: user.id },
    });
    if (!collection) throw new NotFoundException('Collection not found');
    const post = await this.prisma.posts.findFirst({
      where: { id: postId, status: 'published', deleted_at: null },
      select: { id: true },
    });
    if (!post) throw new NotFoundException('Post not found');

    const existing = await this.prisma.collection_items.findUnique({
      where: { collection_id_post_id: { collection_id: collectionId, post_id: postId } },
    });
    if (existing) return existing;

    return this.prisma.$transaction(async (tx) => {
      const item = await tx.collection_items.create({
        data: { collection_id: collectionId, post_id: postId },
      });
      await tx.collections.update({
        where: { id: collectionId },
        data: { item_count: { increment: 1 } },
      });
      return item;
    });
  }

  async removeCollectionItem(user: AuthenticatedUser, collectionId: string, postId: string) {
    const collection = await this.prisma.collections.findFirst({
      where: { id: collectionId, user_id: user.id },
      select: { id: true },
    });
    if (!collection) throw new NotFoundException('Collection not found');
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.collection_items.deleteMany({
        where: { collection_id: collectionId, post_id: postId },
      });
      if (result.count) {
        await tx.collections.updateMany({
          where: { id: collectionId, item_count: { gt: 0 } },
          data: { item_count: { decrement: 1 } },
        });
      }
      return { removed: result.count > 0 };
    });
  }

  async follow(user: AuthenticatedUser, dto: FollowTargetDto) {
    if (!['company', 'professional'].includes(dto.targetType)) {
      throw new BadRequestException('targetType must be company or professional');
    }
    const targetId = dto.targetId.trim();
    if (dto.targetType === 'company') {
      const company = await this.prisma.companies.findFirst({
        where: { id: targetId, is_active: true, deleted_at: null },
        select: { id: true },
      });
      if (!company) throw new NotFoundException('Business not found');
    } else {
      const professional = await this.prisma.professionals.findFirst({
        where: { id: targetId, is_active: true, deleted_at: null },
        select: { id: true, user_id: true },
      });
      if (!professional) throw new NotFoundException('Professional not found');
      if (professional.user_id === user.id) throw new BadRequestException('You cannot follow yourself');
    }

    const existing = await this.prisma.follows.findUnique({
      where: {
        follower_user_id_target_type_target_id: {
          follower_user_id: user.id,
          target_type: dto.targetType,
          target_id: targetId,
        },
      },
    });
    if (existing) return existing;

    return this.prisma.$transaction(async (tx) => {
      const follow = await tx.follows.create({
        data: {
          follower_user_id: user.id,
          target_type: dto.targetType,
          target_id: targetId,
          company_id: dto.targetType === 'company' ? targetId : null,
          professional_id: dto.targetType === 'professional' ? targetId : null,
        },
      });
      if (dto.targetType === 'company') {
        await tx.companies.update({ where: { id: targetId }, data: { follower_count: { increment: 1 } } });
      } else {
        await tx.professionals.update({ where: { id: targetId }, data: { follower_count: { increment: 1 } } });
      }
      return follow;
    });
  }

  async unfollow(user: AuthenticatedUser, targetType: string, targetId: string) {
    if (!['company', 'professional'].includes(targetType)) {
      throw new BadRequestException('targetType must be company or professional');
    }
    return this.prisma.$transaction(async (tx) => {
      const deleted = await tx.follows.deleteMany({
        where: { follower_user_id: user.id, target_type: targetType, target_id: targetId },
      });
      if (deleted.count) {
        if (targetType === 'company') {
          await tx.companies.updateMany({
            where: { id: targetId, follower_count: { gt: 0 } },
            data: { follower_count: { decrement: 1 } },
          });
        } else {
          await tx.professionals.updateMany({
            where: { id: targetId, follower_count: { gt: 0 } },
            data: { follower_count: { decrement: 1 } },
          });
        }
      }
      return { following: false, removed: deleted.count > 0 };
    });
  }

  async bookThisLook(user: AuthenticatedUser, postId: string, dto: BookThisLookDto) {
    const post = await this.prisma.posts.findFirst({
      where: { id: postId, status: 'published', deleted_at: null },
      include: {
        services: {
          orderBy: { is_primary: 'desc' },
          include: { service: true },
        },
      },
    });
    if (!post) throw new NotFoundException('Post not found');
    const link = post.services.find((item) => item.service.is_active && !item.service.deleted_at);
    if (!link) throw new BadRequestException('This look does not have an active bookable service');

    let branchId = dto.branchId ?? post.branch_id ?? link.service.branch_ids[0] ?? null;
    if (!branchId) {
      const branch = await this.prisma.branches.findFirst({
        where: { company_id: link.service.company_id, is_active: true, deleted_at: null, booking_enabled: true },
        orderBy: [{ is_main: 'desc' }, { sort_order: 'asc' }],
        select: { id: true },
      });
      branchId = branch?.id ?? null;
    }
    if (!branchId) throw new BadRequestException('No bookable branch is available for this look');

    const professionalId = dto.professionalId ?? post.professional_id ?? undefined;
    const hold = await this.booking.createHold(user, {
      companyId: link.service.company_id,
      branchId,
      professionalId,
      serviceIds: [link.service.id],
      resourceIds: dto.resourceIds ?? [],
      startsAt: dto.startsAt,
    });

    return {
      postId: post.id,
      serviceId: link.service.id,
      companyId: link.service.company_id,
      branchId,
      professionalId: professionalId ?? null,
      hold,
    };
  }
}
