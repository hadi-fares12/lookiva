import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlatformService {
  private readonly logger = new Logger(PlatformService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async getSettings() {
    let themes: any[] = [];
    let countries: any[] = [];
    let featureFlags: any[] = [];

    try {
      themes = await this.prisma.theme_settings.findMany({
        where: { is_active: true },
      });
    } catch (e: any) {
      if (!this.isTableMissingError(e)) {
        this.logger.warn('Failed to fetch theme_settings', e.message);
      }
    }

    try {
      countries = await this.prisma.countries.findMany({
        where: { is_active: true },
        orderBy: { sort_order: 'asc' },
      });
    } catch (e: any) {
      if (!this.isTableMissingError(e)) {
        this.logger.warn('Failed to fetch countries', e.message);
      }
    }

    try {
      featureFlags = await this.prisma.feature_flags.findMany();
    } catch (e: any) {
      if (!this.isTableMissingError(e)) {
        this.logger.warn('Failed to fetch feature_flags', e.message);
      }
    }

    return {
      themes,
      locales: [
        { code: 'en', name: 'English', dir: 'ltr' },
        { code: 'ar', name: 'العربية', dir: 'rtl' },
        { code: 'fr', name: 'Français', dir: 'ltr' },
      ],
      countries,
      featureFlags,
      defaultCountryCode: 'LB',
      defaultCurrency: 'USD',
      supportEmail: 'support@lookiva.dev',
      version: '1.0.0',
    };
  }

  async getGeoHierarchy(
    countryIso?: string,
    regionCode?: string,
    districtCode?: string,
    cityCode?: string,
  ) {
    try {
      const where: any = {};
      if (countryIso) {
        where.iso_code = countryIso;
      }

      const countries = await this.prisma.countries.findMany({
        where,
        include: {
          regions: {
            where: regionCode ? { code: regionCode } : undefined,
            include: {
              districts: {
                where: districtCode ? { code: districtCode } : undefined,
                include: {
                  cities: {
                    where: cityCode ? { code: cityCode } : undefined,
                    include: {
                      areas: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      return countries;
    } catch (e: any) {
      if (!this.isTableMissingError(e)) {
        this.logger.warn('Failed to fetch geo hierarchy', e.message);
      }
      return [];
    }
  }

  private isTableMissingError(e: any): boolean {
    const msg = (e?.message || '').toLowerCase();
    return (
      msg.includes('does not exist') ||
      msg.includes('relation') && msg.includes('not found')
    );
  }
}
