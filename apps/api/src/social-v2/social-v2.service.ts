import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@lookiva/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/types/request-with-user';
import {
  CreateCollectionDto,
  CreatePostV2Dto,
  FollowTargetDto,
  ReportContentDto,
} from './dto/social-v2.dto';

@Injectable()
export class SocialV2Service {
  constructor(private readonly prisma: PrismaService) {}

  async createPost(user: AuthenticatedUser, dto: CreatePostV2Dto) {
    if (dto.companyId) {
      const company = await this.prisma.companies.findUnique({
        where: { id: dto.companyId },
        select: { owner_user_id: true },
      });
      if (!company) throw new NotFoundException('Company not found');
      const platformRoles = new Set([UserRole.SuperAdmin, UserRole.PlatformAdmin, UserRole.CountryManager]);
      const allowed = company.owner_user_id === user.id || user.roleScopes.some((scope) =>
        platformRoles.has(scope.roleKey) ||
        scope.companyId === dto.companyId ||
        scope.scopeId === dto.companyId
      );
      if (!allowed) throw new ForbiddenException('You cannot publish content for this company');
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
        const media = await tx.media.findFirst({
          where: {
            id: mediaId,
            uploader_user_id: user.id,
            ...(dto.companyId ? { OR: [{ company_id: dto.companyId }, { company_id: null }] } : {}),
          },
          select: { id: true, mime_category: true },
        });
        if (!media) throw new ForbiddenException('One or more media items do not belong to this account/company');
        await tx.post_media.create({
          data: {
            post_id: post.id,
            media_id: mediaId,
            media_type: media.mime_category === 'video' ? 'video' : 'image',
            sort_order: index,
          },
        });
      }

      for (const serviceId of dto.serviceIds ?? []) {
        await tx.post_services.create({
          data: {
            post_id: post.id,
            service_id: serviceId,
            is_primary: serviceId === dto.serviceIds?.[0],
          },
        });
      }

      return tx.posts.findUnique({
        where: { id: post.id },
        include: { media_list: true, services: true },
      });
    });
  }

  async savePost(user: AuthenticatedUser, postId: string) {
    const post = await this.prisma.posts.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    return this.prisma.favorites.upsert({
      where: {
        user_id_favorite_type_entity_id: {
          user_id: user.id,
          favorite_type: 'post',
          entity_id: post.id,
        },
      },
      create: {
        user_id: user.id,
        favorite_type: 'post',
        entity_id: post.id,
        post_id: post.id,
        company_id: post.company_id,
        professional_id: post.professional_id,
      },
      update: {},
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

  async addCollectionItem(collectionId: string, postId: string) {
    const collection = await this.prisma.collections.findUnique({
      where: { id: collectionId },
    });
    if (!collection) throw new NotFoundException('Collection not found');
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.collection_items.upsert({
        where: {
          collection_id_post_id: {
            collection_id: collectionId,
            post_id: postId,
          },
        },
        create: {
          collection_id: collectionId,
          post_id: postId,
        },
        update: {},
      });
      await tx.collections.update({
        where: { id: collectionId },
        data: { item_count: { increment: 1 } },
      });
      return item;
    });
  }

  follow(user: AuthenticatedUser, dto: FollowTargetDto) {
    return this.prisma.follows.upsert({
      where: {
        follower_user_id_target_type_target_id: {
          follower_user_id: user.id,
          target_type: dto.targetType,
          target_id: dto.targetId,
        },
      },
      create: {
        follower_user_id: user.id,
        target_type: dto.targetType,
        target_id: dto.targetId,
        company_id: dto.companyId ?? (dto.targetType === 'company' ? dto.targetId : null),
        professional_id:
          dto.professionalId ?? (dto.targetType === 'professional' ? dto.targetId : null),
      },
      update: {},
    });
  }
}
