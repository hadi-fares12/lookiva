import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { GeoService } from './geo.service';

@ApiTags('Geo')
@Controller('geo')
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  @Public()
  @Get('distance')
  getDistance(
    @Query('lat1') lat1: string,
    @Query('lon1') lon1: string,
    @Query('lat2') lat2: string,
    @Query('lon2') lon2: string,
  ) {
    const distanceMeters = this.geoService.distanceBetweenMeters(
      parseFloat(lat1),
      parseFloat(lon1),
      parseFloat(lat2),
      parseFloat(lon2),
    );
    return { distanceMeters };
  }
}
