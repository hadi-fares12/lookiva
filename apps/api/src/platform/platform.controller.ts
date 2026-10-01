import {
  Controller,
  Get,
  Param,
  Query,
  Logger,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { PlatformService } from './platform.service';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Platform')
@Controller('platform')
export class PlatformController {
  private readonly logger = new Logger(PlatformController.name);

  constructor(
    private readonly platformService: PlatformService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Get('settings')
  getSettings() {
    return this.platformService.getSettings();
  }

  @Public()
  @Get('countries')
  async getCountries() {
    try {
      return await this.prisma.countries.findMany({
        where: { is_active: true },
        orderBy: { sort_order: 'asc' },
      });
    } catch (e: any) {
      if (!this.isTableMissingError(e)) {
        this.logger.warn('Failed to fetch countries', e.message);
      }
      return [];
    }
  }

  @Public()
  @Get('countries/:iso')
  async getCountryByIso(@Param('iso') iso: string) {
    try {
      return await this.prisma.countries.findUnique({
        where: { iso_code: iso },
        include: { regions: true },
      });
    } catch (e: any) {
      if (!this.isTableMissingError(e)) {
        this.logger.warn(`Failed to fetch country ${iso}`, e.message);
      }
      return null;
    }
  }

  @Public()
  @Get('countries/:iso/regions')
  async getCountryRegions(@Param('iso') iso: string) {
    try {
      const country = await this.prisma.countries.findUnique({
        where: { iso_code: iso },
        include: { regions: true },
      });
      return country?.regions ?? [];
    } catch (e: any) {
      if (!this.isTableMissingError(e)) {
        this.logger.warn(`Failed to fetch regions for country ${iso}`, e.message);
      }
      return [];
    }
  }

  @Public()
  @Get('regions/:regionId/districts')
  async getRegionDistricts(@Param('regionId') regionId: string) {
    try {
      const region = await this.prisma.regions.findUnique({
        where: { id: regionId },
        include: { districts: true },
      });
      return region?.districts ?? [];
    } catch (e: any) {
      if (!this.isTableMissingError(e)) {
        this.logger.warn(`Failed to fetch districts for region ${regionId}`, e.message);
      }
      return [];
    }
  }

  @Public()
  @Get('districts/:districtId/cities')
  async getDistrictCities(@Param('districtId') districtId: string) {
    try {
      const district = await this.prisma.districts.findUnique({
        where: { id: districtId },
        include: { cities: true },
      });
      return district?.cities ?? [];
    } catch (e: any) {
      if (!this.isTableMissingError(e)) {
        this.logger.warn(`Failed to fetch cities for district ${districtId}`, e.message);
      }
      return [];
    }
  }

  @Public()
  @Get('cities/:cityId/areas')
  async getCityAreas(@Param('cityId') cityId: string) {
    try {
      const city = await this.prisma.cities.findUnique({
        where: { id: cityId },
        include: { areas: true },
      });
      return city?.areas ?? [];
    } catch (e: any) {
      if (!this.isTableMissingError(e)) {
        this.logger.warn(`Failed to fetch areas for city ${cityId}`, e.message);
      }
      return [];
    }
  }

  @Public()
  @Get('geo')
  getGeoHierarchy(
    @Query('country') country?: string,
    @Query('region') region?: string,
    @Query('district') district?: string,
    @Query('city') city?: string,
  ) {
    return this.platformService.getGeoHierarchy(country, region, district, city);
  }

  private isTableMissingError(e: any): boolean {
    const msg = (e?.message || '').toLowerCase();
    return (
      msg.includes('does not exist') ||
      (msg.includes('relation') && msg.includes('not found'))
    );
  }
}
