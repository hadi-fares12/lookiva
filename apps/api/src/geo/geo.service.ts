import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name);

  constructor(private readonly prisma: PrismaService) {}

  degreesToMetersLat(degrees: number): number {
    return degrees * 111320;
  }

  degreesToMetersLon(degrees: number, lat: number): number {
    return degrees * 111320 * Math.cos((lat * Math.PI) / 180);
  }

  distanceBetweenMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  async getBranchesWithinRadius(
    lat: number,
    lon: number,
    radiusMeters: number,
    filters?: { [key: string]: any },
  ) {
    try {
      const result = await this.prisma.$queryRawUnsafe<any[]>(
        `
        SELECT 
          b.*,
          bl.*,
          ST_Distance(
            bl.point::geography,
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
          ) AS distance_meters
        FROM branches b
        INNER JOIN branch_locations bl ON bl.branch_id = b.id
        WHERE ST_DWithin(
          bl.point::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          $3
        )
        ORDER BY distance_meters ASC
        `,
        lon,
        lat,
        radiusMeters,
      );
      return result;
    } catch (e: any) {
      if (!this.isTableMissingError(e)) {
        this.logger.warn('Failed to fetch branches within radius', e.message);
      }
      return [];
    }
  }

  private isTableMissingError(e: any): boolean {
    const msg = (e?.message || '').toLowerCase();
    return (
      msg.includes('does not exist') ||
      (msg.includes('relation') && msg.includes('not found'))
    );
  }
}
