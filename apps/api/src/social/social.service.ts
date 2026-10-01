import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SocialService {
  private readonly logger = new Logger(SocialService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listPosts(params: {
    businessId?: string;
    professionalId?: string;
    userId?: string;
    limit?: number;
    offset?: number;
  }) {
    try {
      const { businessId, professionalId, userId, limit = 20, offset = 0 } = params;
      const where: any = {};
      if (businessId) where.company_id = businessId;
      if (professionalId) where.professional_id = professionalId;
      if (userId) where.author_user_id = userId;

      const posts = await this.prisma.posts.findMany({
        where,
        include: {
          author: {
            select: { id: true, full_name: true, avatar_media_id: true },
          },
          media_list: {
            orderBy: { sort_order: 'asc' },
          },
        },
        orderBy: { published_at: 'desc' },
        take: limit,
        skip: offset,
      });

      const postIds = posts.map((p: any) => p.id);
      const likesCounts: Record<string, number> = {};
      if (postIds.length > 0) {
        try {
          const groups = await this.prisma.likes.groupBy({
            by: ['post_id'],
            where: { post_id: { in: postIds } },
            _count: { post_id: true },
          });
          for (const g of groups as any[]) {
            likesCounts[g.post_id] = g._count.post_id;
          }
        } catch (_) {
          // ignore
        }
      }

      return posts.map((p: any) => ({
        ...p,
        likes_count: likesCounts[p.id] ?? p.like_count ?? 0,
      }));
    } catch (err) {
      this.logger.warn(`Failed to list posts: ${(err as Error).message}`);
      return [];
    }
  }

  async getById(id: string) {
    try {
      const post = await this.prisma.posts.findUnique({
        where: { id },
        include: {
          author: {
            select: { id: true, full_name: true, avatar_media_id: true },
          },
          media_list: {
            orderBy: { sort_order: 'asc' },
          },
        },
      });
      if (!post) return null;

      let likes_count: number;
      try {
        likes_count = await this.prisma.likes.count({ where: { post_id: id } });
      } catch (_) {
        likes_count = (post as any).like_count ?? 0;
      }

      let comments: any[] = [];
      try {
        comments = await this.prisma.comments.findMany({
          where: { post_id: id, parent_comment_id: null, status: 'published' },
          include: {
            user: { select: { id: true, full_name: true, avatar_media_id: true } },
          },
          orderBy: { created_at: 'desc' },
          take: 5,
        });
      } catch (_) {
        // ignore
      }

      return {
        ...post,
        likes_count,
        comments,
      };
    } catch (err) {
      this.logger.warn(`Failed to get post ${id}: ${(err as Error).message}`);
      return null;
    }
  }

  async likePost(userId: string, postId: string) {
    try {
      return await this.prisma.$transaction(async (tx: any) => {
        const like = await tx.likes.upsert({
          where: {
            user_id_post_id: {
              user_id: userId,
              post_id: postId,
            },
          },
          create: {
            user_id: userId,
            post_id: postId,
          },
          update: {},
        });
        try {
          await tx.posts.update({
            where: { id: postId },
            data: { like_count: { increment: 1 } },
          });
        } catch (_) {
          // ignore denormalization update failure
        }
        return like;
      });
    } catch (err) {
      this.logger.warn(`Failed to like post ${postId}: ${(err as Error).message}`);
      return null;
    }
  }

  async unlikePost(userId: string, postId: string) {
    try {
      return await this.prisma.$transaction(async (tx: any) => {
        const result = await tx.likes.deleteMany({
          where: { user_id: userId, post_id: postId },
        });
        if ((result?.count ?? 0) > 0) {
          try {
            await tx.posts.update({
              where: { id: postId },
              data: { like_count: { decrement: 1 } },
            });
          } catch (_) {
            // ignore
          }
        }
        return result;
      });
    } catch (err) {
      this.logger.warn(`Failed to unlike post ${postId}: ${(err as Error).message}`);
      return null;
    }
  }

  async comment(userId: string, postId: string, body: string, parentId?: string) {
    try {
      return await this.prisma.$transaction(async (tx: any) => {
        const created = await tx.comments.create({
          data: {
            post_id: postId,
            user_id: userId,
            body,
            parent_comment_id: parentId || null,
            status: 'published',
          },
        });
        try {
          await tx.posts.update({
            where: { id: postId },
            data: { comment_count: { increment: 1 } },
          });
        } catch (_) {
          // ignore
        }
        return created;
      });
    } catch (err) {
      this.logger.warn(`Failed to comment on post ${postId}: ${(err as Error).message}`);
      return null;
    }
  }

  async deleteComment(userId: string, commentId: string) {
    try {
      const comment = await this.prisma.comments.findUnique({
        where: { id: commentId },
        select: { user_id: true, post_id: true },
      });
      if (!comment || comment.user_id !== userId) {
        return { deleted: false, reason: 'not_owner' };
      }
      await this.prisma.$transaction(async (tx: any) => {
        await tx.comments.delete({ where: { id: commentId } });
        if (comment.post_id) {
          try {
            await tx.posts.update({
              where: { id: comment.post_id },
              data: { comment_count: { decrement: 1 } },
            });
          } catch (_) {
            // ignore
          }
        }
      });
      return { deleted: true };
    } catch (err) {
      this.logger.warn(`Failed to delete comment ${commentId}: ${(err as Error).message}`);
      return { deleted: false };
    }
  }
}
