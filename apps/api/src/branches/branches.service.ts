import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BranchesService {
  private readonly logger = new Logger(BranchesService.name);

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
      const branch = await this.prisma.branches.findUnique({
        where: { id },
        include: {
          company: {
            select: { id: true, display_name: true, slug: true, logo_media_id: true },
          },
          location: true,
          hours: true,
          resources: {
            include: { resource_type: true },
          },
          professional_branches: {
            include: {
              professional: {
                include: { user: true },
              },
            },
          },
        },
      });

      if (!branch) return null;

      let distance_meters: number | null = null;
      if (
        viewerLat != null &&
        viewerLon != null &&
        branch.latitude != null &&
        branch.longitude != null
      ) {
        distance_meters = Math.round(
          this.haversineDistance(
            viewerLat,
            viewerLon,
            branch.latitude,
            branch.longitude,
          ),
        );
      }

      let services: any[] = [];
      try {
        services = await this.prisma.services.findMany({
          where: { company_id: branch.company_id },
          include: { translations: true },
        });
      } catch (err) {
        this.logger.warn(`Failed to fetch services for branch ${id}: ${err.message}`);
      }

      return {
        ...branch,
        distance_meters,
        services,
      };
    } catch (err) {
      this.logger.warn(`Failed to get branch ${id}: ${err.message}`);
      return null;
    }
  }

  async getHours(id: string) {
    try {
      return await this.prisma.branch_hours.findMany({
        where: { branch_id: id },
        orderBy: { day_of_week: 'asc' },
      });
    } catch (err) {
      this.logger.warn(`Failed to get hours for branch ${id}: ${err.message}`);
      return [];
    }
  }

  async getResources(id: string, status?: string) {
    try {
      const where: any = { branch_id: id };
      if (status !== undefined) where.status = status;
      return await this.prisma.resources.findMany({
        where,
        include: { resource_type: true },
      });
    } catch (err) {
      this.logger.warn(`Failed to get resources for branch ${id}: ${err.message}`);
      return [];
    }
  }

  async getStaff(id: string) {
    try {
      const pbs = await this.prisma.professional_branches.findMany({
        where: { branch_id: id },
        include: {
          professional: {
            include: {
              user: {
                select: { id: true, full_name: true, avatar_media_id: true },
              },
            },
          },
        },
      });
      return pbs.map((pb: any) => pb.professional).filter(Boolean);
    } catch (err) {
      this.logger.warn(`Failed to get staff for branch ${id}: ${err.message}`);
      return [];
    }
  }

  async getMapLocation(id: string) {
    try {
      const branch = await this.prisma.branches.findUnique({
        where: { id },
        include: {
          city: { select: { id: true, name: true } },
          area: { select: { id: true, name: true } },
          location: true,
        },
      });
      if (!branch) return null;
      return {
        lat: branch.latitude,
        lon: branch.longitude,
        address: branch.address_line_1 ?? branch.location?.address,
        cityName: branch.city?.name,
        areaName: branch.area?.name,
      };
    } catch (err) {
      this.logger.warn(`Failed to get map location for branch ${id}: ${err.message}`);
      return null;
    }
  }
}
