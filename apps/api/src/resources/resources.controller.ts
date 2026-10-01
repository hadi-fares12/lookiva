import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiQuery } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { ResourcesService } from './resources.service';

@ApiTags('Resources')
@Controller('resources')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Public()
  @Get('types')
  getResourceTypes() {
    return this.resourcesService.getResourceTypes();
  }

  @Public()
  @Get(':id')
  getById(@Param('id') id: string) {
    return this.resourcesService.getById(id);
  }

  @Public()
  @Get('branch/:branchId')
  @ApiQuery({ name: 'status', required: false, type: String })
  listByBranch(
    @Param('branchId') branchId: string,
    @Query('status') status?: string,
  ) {
    return this.resourcesService.listByBranch(branchId, status);
  }
}
