import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProfessionalsService {
  private readonly logger = new Logger(ProfessionalsService.name);

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

  async getById(id: string, viewerLat?: number, viewerLon?: number) {
    try {
      const pro = await this.prisma.professionals.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              full_name: true,
              avatar_media_id: true,
              email: true,
              phone: true,
              locale: true,
            },
          },
          company: {
            select: { id: true, display_name: true, logo_media_id: true },
          },
          branches: {
            include: {
              branch: {
                include: { location: true },
              },
            },
          },
          schedules: true,
        },
      });

      if (!pro) return null;

      const proLanguages: string[] = Array.isArray((pro as any).languages)
        ? (pro as any).languages
        : [];

      let portfolio_media: any[] = [];
      try {
        if (pro.user_id) {
          portfolio_media = await this.prisma.posts.findMany({
            where: { author_user_id: pro.user_id },
            orderBy: { created_at: 'desc' },
            take: 20,
          });
        }
      } catch (err) {
        this.logger.warn(`Failed portfolio for pro ${id}: ${err.message}`);
      }

      let services: any[] = [];
      try {
        const ps = await this.prisma.service_professionals.findMany({
          where: { professional_id: id },
          include: {
            service: {
              include: { translations: true },
            },
          },
        });
        services = ps.map((x: any) => x.service).filter(Boolean);
      } catch (err) {
        this.logger.warn(`Failed services for pro ${id}: ${err.message}`);
      }

      let aggregateReviews = { avg_rating: 0, count: 0 };
      try {
        const agg = await this.prisma.reviews.aggregate({
          where: { professional_id: id },
          _avg: { overall_rating: true },
          _count: { id: true },
        });
        aggregateReviews = {
          avg_rating: agg._avg.overall_rating ? Number(agg._avg.overall_rating.toFixed(2)) : 0,
          count: agg._count.id || 0,
        };
      } catch (err) {
        this.logger.warn(`Failed reviews agg for pro ${id}: ${err.message}`);
      }

      let followers_count = 0;
      try {
        followers_count = await this.prisma.follows.count({
          where: { target_type: 'professional', professional_id: id },
        });
      } catch (err) {
        this.logger.warn(`Failed followers count for pro ${id}: ${err.message}`);
      }

      let nearestDist: number | null = null;
      if (viewerLat != null && viewerLon != null) {
        let minDist = Infinity;
        for (const pb of pro.branches || []) {
          const branch = pb.branch;
          if (branch && branch.latitude != null && branch.longitude != null) {
            const d = this.haversineDistance(
              viewerLat,
              viewerLon,
              branch.latitude,
              branch.longitude,
            );
            if (d < minDist) minDist = d;
          }
        }
        if (minDist !== Infinity) nearestDist = Math.round(minDist);
      }

      return {
        ...pro,
        languages: proLanguages,
        portfolio_media,
        services,
        aggregate_reviews: aggregateReviews,
        followers_count,
        distance_meters: nearestDist,
        verified_work: !!(pro as any).verified_work,
        next_availability: null,
      };
    } catch (err) {
      this.logger.warn(`Failed to get professional ${id}: ${err.message}`);
      return null;
    }
  }

  async getServices(id: string) {
    try {
      const ps = await this.prisma.service_professionals.findMany({
        where: { professional_id: id },
        include: {
          service: {
            include: { translations: true },
          },
        },
      });
      return ps.map((x: any) => x.service).filter(Boolean);
    } catch (err) {
      this.logger.warn(`Failed to get services for pro ${id}: ${err.message}`);
      return [];
    }
  }

  async getPortfolio(id: string, limit = 20) {
    try {
      const pro = await this.prisma.professionals.findUnique({
        where: { id },
        select: { user_id: true },
      });
      if (!pro || !pro.user_id) return [];
      return await this.prisma.posts.findMany({
        where: { author_user_id: pro.user_id },
        orderBy: { created_at: 'desc' },
        take: limit,
      });
    } catch (err) {
      this.logger.warn(`Failed portfolio for pro ${id}: ${err.message}`);
      return [];
    }
  }

  async getReviews(id: string, limit = 20, page = 1) {
    try {
      return await this.prisma.reviews.findMany({
        where: { professional_id: id },
        include: {
          author_user: {
            select: { id: true, full_name: true, avatar_media_id: true },
          },
        },
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      });
    } catch (err) {
      this.logger.warn(`Failed reviews for pro ${id}: ${err.message}`);
      return [];
    }
  }
}
