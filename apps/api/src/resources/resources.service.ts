import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ResourcesService {
  private readonly logger = new Logger(ResourcesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getResourceTypes() {
    try {
      return await this.prisma.resource_types.findMany({
        where: { is_active: true },
      });
    } catch (err) {
      this.logger.warn(`Failed to get resource types: ${err.message}`);
      return [];
    }
  }

  async getById(id: string) {
    try {
      const resource = await this.prisma.resources.findUnique({
        where: { id },
        include: {
          resource_type: true,
          branch: true,
        },
      });

      if (!resource) return null;

      let professionals: any[] = [];
      try {
        const prs = await this.prisma.professional_resources.findMany({
          where: { resource_id: id },
          include: {
            professional: {
              include: {
                user: { select: { id: true, full_name: true, avatar_media_id: true } },
              },
            },
          },
        });
        professionals = prs.map((x: any) => x.professional).filter(Boolean);
      } catch (err) {
        this.logger.warn(`Failed pros for resource ${id}: ${err.message}`);
      }

      return {
        ...resource,
        professionals,
      };
    } catch (err) {
      this.logger.warn(`Failed to get resource ${id}: ${err.message}`);
      return null;
    }
  }

  async listByBranch(branchId: string, status?: string) {
    try {
      const where: any = { branch_id: branchId };
      if (status !== undefined) where.status = status;
      return await this.prisma.resources.findMany({
        where,
        include: { resource_type: true },
      });
    } catch (err) {
      this.logger.warn(`Failed resources by branch ${branchId}: ${err.message}`);
      return [];
    }
  }
}
