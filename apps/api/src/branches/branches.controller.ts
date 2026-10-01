import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiQuery } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { BranchesService } from './branches.service';

@ApiTags('Branches')
@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Public()
  @Get(':id')
  @ApiQuery({ name: 'lat', required: false, type: Number })
  @ApiQuery({ name: 'lon', required: false, type: Number })
  getById(
    @Param('id') id: string,
    @Query('lat') lat?: number,
    @Query('lon') lon?: number,
  ) {
    return this.branchesService.getById(id, Number(lat), Number(lon));
  }

  @Public()
  @Get(':id/hours')
  getHours(@Param('id') id: string) {
    return this.branchesService.getHours(id);
  }

  @Public()
  @Get(':id/resources')
  @ApiQuery({ name: 'status', required: false, type: String })
  getResources(
    @Param('id') id: string,
    @Query('status') status?: string,
  ) {
    return this.branchesService.getResources(id, status);
  }

  @Public()
  @Get(':id/staff')
  getStaff(@Param('id') id: string) {
    return this.branchesService.getStaff(id);
  }

  @Public()
  @Get(':id/map')
  getMapLocation(@Param('id') id: string) {
    return this.branchesService.getMapLocation(id);
  }
}
