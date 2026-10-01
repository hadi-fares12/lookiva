import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PatchCustomerProfileDto, UpdateCustomerPreferencesDto } from './dto/customer-profile.dto';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    try {
      return await this.prisma.users.findUnique({
        where: { id: userId },
        include: {
          user_profiles: true,
          preferences: true,
          notifications: true,
          customers: true,
        },
      });
    } catch (err) {
      this.logger.warn(`Failed to get profile for ${userId}: ${err.message}`);
      return null;
    }
  }

  async patchProfile(userId: string, dto: PatchCustomerProfileDto) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.users.findUnique({
        where: { id: userId },
        include: { user_profiles: true },
      });
      if (!user) return null;

      const userData: any = {};
      if (dto.locale !== undefined) userData.locale = dto.locale;
      if (dto.themeMode !== undefined) userData.theme_mode = dto.themeMode;
      if (dto.avatarMediaId !== undefined) userData.avatar_media_id = dto.avatarMediaId;
      if (dto.firstName !== undefined || dto.lastName !== undefined) {
        const existingProfile = user.user_profiles?.[0];
        const firstName = dto.firstName ?? existingProfile?.first_name ?? user.full_name.split(' ')[0] ?? '';
        const lastName = dto.lastName ?? existingProfile?.last_name ?? user.full_name.split(' ').slice(1).join(' ');
        userData.full_name = `${firstName} ${lastName}`.trim();
      }
      if (Object.keys(userData).length) await tx.users.update({ where: { id: userId }, data: userData });

      const profileData: any = {};
      if (dto.firstName !== undefined) profileData.first_name = dto.firstName;
      if (dto.lastName !== undefined) profileData.last_name = dto.lastName;
      if (dto.bio !== undefined) profileData.bio = dto.bio;
      if (dto.websiteUrl !== undefined) profileData.website_url = dto.websiteUrl;
      if (dto.instagramHandle !== undefined) profileData.instagram_handle = dto.instagramHandle;
      if (dto.tiktokHandle !== undefined) profileData.tiktok_handle = dto.tiktokHandle;
      if (dto.countryId !== undefined) profileData.country_id = dto.countryId;
      if (dto.cityId !== undefined) profileData.city_id = dto.cityId;

      if (Object.keys(profileData).length) {
        const existingProfile = user.user_profiles?.[0];
        if (existingProfile) {
          await tx.user_profiles.update({ where: { id: existingProfile.id }, data: profileData });
        } else {
          if (!dto.countryId) throw new Error('countryId is required to create a missing user profile');
          const parts = user.full_name.trim().split(/\s+/);
          await tx.user_profiles.create({
            data: {
              user_id: userId,
              first_name: dto.firstName ?? parts[0] ?? 'Customer',
              last_name: dto.lastName ?? (parts.slice(1).join(' ') || 'User'),
              country_id: dto.countryId,
              city_id: dto.cityId ?? null,
              bio: dto.bio ?? null,
              website_url: dto.websiteUrl ?? null,
              instagram_handle: dto.instagramHandle ?? null,
              tiktok_handle: dto.tiktokHandle ?? null,
            },
          });
        }
      }

      return tx.users.findUnique({
        where: { id: userId },
        select: {
          id: true, email: true, phone: true, full_name: true, avatar_media_id: true,
          locale: true, theme_mode: true, updated_at: true,
          user_profiles: true,
        },
      });
    });
  }

  async getFavorites(
    userId: string,
    tab: 'business' | 'professional' | 'service' | 'post' = 'business',
    limit = 20,
    offset = 0,
  ) {
    try {
      const typeMap: Record<string, string> = {
        business: 'company',
        professional: 'professional',
        service: 'service',
        post: 'post',
      };
      const favorite_type = typeMap[tab] || tab;
      const favs = await this.prisma.favorites.findMany({
        where: { user_id: userId, favorite_type },
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
      });

      const entityIds = favs.map((f: any) => f.entity_id).filter(Boolean);

      const result: any[] = [];
      for (const f of favs) {
        const item: any = { ...f };
        try {
          if (favorite_type === 'company') {
          item.entity = await this.prisma.companies.findUnique({
            where: { id: f.entity_id },
            select: { id: true, display_name: true, logo_media_id: true, slug: true },
          });
          } else if (favorite_type === 'professional') {
            item.entity = await this.prisma.professionals.findUnique({
              where: { id: f.entity_id },
              include: { user: { select: { id: true, full_name: true, avatar_media_id: true } } },
            });
          } else if (favorite_type === 'service') {
            item.entity = await this.prisma.services.findUnique({
              where: { id: f.entity_id },
              include: { translations: true },
            });
          } else if (favorite_type === 'post') {
            item.entity = await this.prisma.posts.findUnique({
              where: { id: f.entity_id },
            });
          }
        } catch (_) {
          item.entity = null;
        }
        result.push(item);
      }
      return result;
    } catch (err) {
      this.logger.warn(`Failed to get favorites for ${userId}: ${err.message}`);
      return [];
    }
  }

  async addFavorite(
    userId: string,
    favoriteType: string,
    entityId: string,
    linkedIds?: {
      companyId?: string;
      branchId?: string;
      serviceId?: string;
      professionalId?: string;
      postId?: string;
    },
  ) {
    try {
      const typeMap: Record<string, string> = {
        business: 'company',
        professional: 'professional',
        service: 'service',
        post: 'post',
      };
      const normalizedType = typeMap[favoriteType] || favoriteType;
      return await this.prisma.favorites.upsert({
        where: {
          user_id_favorite_type_entity_id: {
            user_id: userId,
            favorite_type: normalizedType,
            entity_id: entityId,
          },
        },
        create: {
          user_id: userId,
          favorite_type: normalizedType,
          entity_id: entityId,
          company_id: linkedIds?.companyId || null,
          branch_id: linkedIds?.branchId || null,
          service_id: linkedIds?.serviceId || null,
          professional_id: linkedIds?.professionalId || null,
          post_id: linkedIds?.postId || null,
        },
        update: {
          company_id: linkedIds?.companyId || null,
          branch_id: linkedIds?.branchId || null,
          service_id: linkedIds?.serviceId || null,
          professional_id: linkedIds?.professionalId || null,
          post_id: linkedIds?.postId || null,
        },
      });
    } catch (err) {
      this.logger.warn(`Failed to add favorite for ${userId}: ${err.message}`);
      return null;
    }
  }

  async removeFavorite(userId: string, favoriteId: string) {
    try {
      return await this.prisma.favorites.deleteMany({
        where: { id: favoriteId, user_id: userId },
      });
    } catch (err) {
      this.logger.warn(`Failed to remove favorite ${favoriteId}: ${err.message}`);
      return null;
    }
  }

  async getFollowing(
    userId: string,
    targetType: 'business' | 'professional' = 'business',
    limit = 20,
    offset = 0,
  ) {
    try {
      const follows = await this.prisma.follows.findMany({
        where: {
          follower_user_id: userId,
          target_type: targetType,
        },
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
      });

      const result: any[] = [];
      for (const f of follows) {
        const item: any = { ...f };
        try {
          if (targetType === 'business') {
            item.target = await this.prisma.companies.findUnique({
              where: { id: f.target_id || '' },
              select: { id: true, display_name: true, logo_media_id: true, slug: true },
            });
          } else if (targetType === 'professional') {
            item.target = await this.prisma.professionals.findUnique({
              where: { id: f.target_id || '' },
              include: { user: { select: { id: true, full_name: true, avatar_media_id: true } } },
            });
          }
        } catch (_) {
          item.target = null;
        }
        result.push(item);
      }
      return result;
    } catch (err) {
      this.logger.warn(`Failed to get following for ${userId}: ${err.message}`);
      return [];
    }
  }

  async follow(
    userId: string,
    targetType: 'business' | 'professional',
    targetId: string,
    scopedIds?: { companyId?: string; professionalId?: string },
  ) {
    try {
      const data: any = {
        follower_user_id: userId,
        target_type: targetType,
        target_id: targetId,
        company_id: targetType === 'business' ? targetId : null,
        professional_id: targetType === 'professional' ? targetId : null,
      };
      if (scopedIds?.companyId) data.company_id = scopedIds.companyId;
      if (scopedIds?.professionalId) data.professional_id = scopedIds.professionalId;

      return await this.prisma.follows.upsert({
        where: {
          follower_user_id_target_type_target_id: {
            follower_user_id: userId,
            target_type: targetType,
            target_id: targetId,
          },
        },
        create: data,
        update: data,
      });
    } catch (err) {
      this.logger.warn(`Failed to follow for ${userId}: ${err.message}`);
      return null;
    }
  }

  async unfollow(userId: string, followId: string) {
    try {
      return await this.prisma.follows.deleteMany({
        where: { id: followId, follower_user_id: userId },
      });
    } catch (err) {
      this.logger.warn(`Failed to unfollow ${followId}: ${err.message}`);
      return null;
    }
  }


  async toggleFavorite(userId: string, favoriteType: string, entityId: string, linkedIds?: { companyId?: string; branchId?: string; serviceId?: string; professionalId?: string; postId?: string }) {
    const typeMap: Record<string, string> = { business: 'company', professional: 'professional', service: 'service', post: 'post' };
    const normalizedType = typeMap[favoriteType] || favoriteType;
    const existing = await this.prisma.favorites.findUnique({
      where: { user_id_favorite_type_entity_id: { user_id: userId, favorite_type: normalizedType, entity_id: entityId } },
    });
    if (existing) {
      await this.prisma.favorites.delete({ where: { id: existing.id } });
      return { favorited: false, id: existing.id };
    }
    const created = await this.addFavorite(userId, normalizedType, entityId, linkedIds);
    return { favorited: true, favorite: created };
  }

  async unfollowTarget(userId: string, targetType: 'business' | 'professional', targetId: string) {
    const result = await this.prisma.follows.deleteMany({
      where: { follower_user_id: userId, target_type: targetType, target_id: targetId },
    });
    return { unfollowed: result.count > 0 };
  }

  async getPreferences(userId: string) {
    const [userPreferences, notificationPreferences, locationPreferences, nearbyPreferences] = await Promise.all([
      this.prisma.user_preferences.findUnique({ where: { user_id: userId } }),
      this.prisma.notification_preferences.findUnique({ where: { user_id: userId } }),
      this.prisma.location_preferences.findUnique({ where: { user_id: userId } }),
      this.prisma.nearby_notification_preferences.findUnique({ where: { user_id: userId } }),
    ]);
    return {
      user_preferences: userPreferences ?? {},
      notification_preferences: notificationPreferences ?? {},
      location_preferences: locationPreferences ?? {},
      nearby_notification_preferences: nearbyPreferences ?? {},
    };
  }

  async upsertPreferences(userId: string, patch: UpdateCustomerPreferencesDto) {
    return this.prisma.$transaction(async (tx) => {
      const result: Record<string, unknown> = {};
      if (patch.user_preferences) {
        result.user_preferences = await tx.user_preferences.upsert({
          where: { user_id: userId },
          create: { user_id: userId, ...patch.user_preferences },
          update: patch.user_preferences,
        });
      }
      if (patch.notification_preferences) {
        result.notification_preferences = await tx.notification_preferences.upsert({
          where: { user_id: userId },
          create: { user_id: userId, ...patch.notification_preferences } as any,
          update: patch.notification_preferences as any,
        });
      }
      if (patch.location_preferences) {
        result.location_preferences = await tx.location_preferences.upsert({
          where: { user_id: userId },
          create: { user_id: userId, ...patch.location_preferences },
          update: patch.location_preferences,
        });
      }
      if (patch.nearby_notification_preferences) {
        const nearby = await tx.nearby_notification_preferences.upsert({
          where: { user_id: userId },
          create: { user_id: userId, ...patch.nearby_notification_preferences },
          update: patch.nearby_notification_preferences,
        });
        result.nearby_notification_preferences = nearby;
        // Keep the legacy/simple preference mirror aligned for existing discovery logic.
        await tx.user_preferences.upsert({
          where: { user_id: userId },
          create: {
            user_id: userId,
            nearby_enabled: nearby.enabled,
            nearby_radius_meters: nearby.distance_threshold_meters,
          },
          update: {
            nearby_enabled: nearby.enabled,
            nearby_radius_meters: nearby.distance_threshold_meters,
          },
        });
      }
      return result;
    });
  }

}
