import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ServicesService {
  private readonly logger = new Logger(ServicesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getById(id: string) {
    try {
      const service = await this.prisma.services.findUnique({
        where: { id },
        include: {
          translations: true,
          category: true,
          company: {
            select: { id: true, display_name: true, slug: true, logo_media_id: true },
          },
        },
      });

      if (!service) return null;

      let professionals: any[] = [];
      try {
        const sp = await this.prisma.service_professionals.findMany({
          where: { service_id: id },
          include: {
            professional: {
              include: {
                user: { select: { id: true, full_name: true, avatar_media_id: true } },
              },
            },
          },
        });
        professionals = sp.map((x: any) => x.professional).filter(Boolean);
      } catch (err) {
        this.logger.warn(`Failed pros for service ${id}: ${err.message}`);
      }

      let relatedLooks: any[] = [];
      try {
        relatedLooks = await this.prisma.posts.findMany({
          where: { service_ids: { has: id } as any },
          take: 10,
          orderBy: { created_at: 'desc' },
        });
      } catch (err) {
        this.logger.warn(`Failed related looks for service ${id}: ${err.message}`);
      }

      const cancellationPolicyHours = (service.company as any)?.cancellation_policy_hours ?? null;
      const depositAmount = (service as any).deposit_amount ?? null;
      const depositPercent = (service as any).deposit_percent ?? null;

      return {
        ...service,
        professionals,
        cancellation_policy_hours: cancellationPolicyHours,
        deposit: {
          amount: depositAmount,
          percent: depositPercent,
        },
        related_looks: relatedLooks,
      };
    } catch (err) {
      this.logger.warn(`Failed to get service ${id}: ${err.message}`);
      return null;
    }
  }

  async byCategory(categoryId: string, filters?: any) {
    try {
      const where: any = { category_id: categoryId };
      if (filters?.minPrice != null) where.base_price = { gte: filters.minPrice };
      if (filters?.maxPrice != null) {
        where.base_price = { ...(where.base_price || {}), lte: filters.maxPrice };
      }
      return await this.prisma.services.findMany({
        where,
        include: {
          translations: true,
          company: { select: { id: true, logo_media_id: true, display_name: true } },
        },
      });
    } catch (err) {
      this.logger.warn(`Failed services by category ${categoryId}: ${err.message}`);
      return [];
    }
  }

  async search(query?: string) {
    try {
      if (!query) return [];
      const likeQuery = `%${query}%`;
      const translations = await this.prisma.service_translations.findMany({
        where: {
          name: { contains: query, mode: 'insensitive' } as any,
        },
        select: { service_id: true },
        take: 50,
      });
      const ids = Array.from(new Set(translations.map((t: any) => t.service_id)));
      if (ids.length === 0) return [];
      return await this.prisma.services.findMany({
        where: { id: { in: ids } },
        include: {
          translations: true,
          company: { select: { id: true, logo_media_id: true, display_name: true } },
        },
      });
    } catch (err) {
      this.logger.warn(`Failed services search for "${query}": ${err.message}`);
      return [];
    }
  }
}
