import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiQuery } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { ServicesService } from './services.service';

@ApiTags('Services')
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Public()
  @Get(':id')
  getById(@Param('id') id: string) {
    return this.servicesService.getById(id);
  }

  @Public()
  @Get('category/:categoryId')
  @ApiQuery({ name: 'minPrice', required: false, type: Number })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number })
  byCategory(
    @Param('categoryId') categoryId: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
  ) {
    const filters: any = {};
    if (minPrice != null) filters.minPrice = Number(minPrice);
    if (maxPrice != null) filters.maxPrice = Number(maxPrice);
    return this.servicesService.byCategory(categoryId, filters);
  }

  @Public()
  @Get('search')
  @ApiQuery({ name: 'q', required: true, type: String })
  search(@Query('q') q?: string) {
    return this.servicesService.search(q);
  }
}
