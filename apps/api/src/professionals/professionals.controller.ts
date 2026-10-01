import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiQuery } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { ProfessionalsService } from './professionals.service';

@ApiTags('Professionals')
@Controller('professionals')
export class ProfessionalsController {
  constructor(private readonly professionalsService: ProfessionalsService) {}

  @Public()
  @Get(':id')
  @ApiQuery({ name: 'lat', required: false, type: Number })
  @ApiQuery({ name: 'lon', required: false, type: Number })
  getById(
    @Param('id') id: string,
    @Query('lat') lat?: number,
    @Query('lon') lon?: number,
  ) {
    return this.professionalsService.getById(id, Number(lat), Number(lon));
  }

  @Public()
  @Get(':id/services')
  getServices(@Param('id') id: string) {
    return this.professionalsService.getServices(id);
  }

  @Public()
  @Get(':id/portfolio')
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getPortfolio(
    @Param('id') id: string,
    @Query('limit') limit?: number,
  ) {
    return this.professionalsService.getPortfolio(id, Number(limit) || 20);
  }

  @Public()
  @Get(':id/reviews')
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  getReviews(
    @Param('id') id: string,
    @Query('limit') limit?: number,
    @Query('page') page?: number,
  ) {
    return this.professionalsService.getReviews(
      id,
      Number(limit) || 20,
      Number(page) || 1,
    );
  }
}
