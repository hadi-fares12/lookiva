import {
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Body,
  Type,
} from '@nestjs/common';
import { ApiTags, ApiQuery, ApiBody } from '@nestjs/swagger';
import { PermissionKey } from '@lookiva/shared-types';
import { Public } from '../common/decorators/public.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BusinessesService } from './businesses.service';
import { CreateBusinessApplicationDto, PaginationQueryDto, PatchBusinessDto } from './dto/businesses.dto';

@ApiTags('Businesses')
@Controller('businesses')
export class BusinessesController {
  constructor(private readonly businessesService: BusinessesService) {}

  @Public()
  @Post('applications')
  createApplication(@Body() dto: CreateBusinessApplicationDto) {
    return this.businessesService.createApplication(dto);
  }

  @Public()
  @Get(':id')
  @ApiQuery({ name: 'lat', required: false, type: Number })
  @ApiQuery({ name: 'lon', required: false, type: Number })
  getById(
    @Param('id') id: string,
    @Query('lat') lat?: number,
    @Query('lon') lon?: number,
  ) {
    return this.businessesService.getById(id, Number(lat), Number(lon));
  }

  @Public()
  @Get(':id/branches')
  listBranches(@Param('id') id: string) {
    return this.businessesService.listBranches(id);
  }

  @Public()
  @Get(':id/services')
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  listServices(
    @Param('id') id: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.businessesService.listServices(id, categoryId);
  }

  @Public()
  @Get(':id/professionals')
  listProfessionals(@Param('id') id: string) {
    return this.businessesService.listProfessionals(id);
  }

  @Public()
  @Get(':id/media')
  listMedia(@Param('id') id: string) {
    return this.businessesService.listMedia(id);
  }

  @Public()
  @Get(':id/reviews')
  listReviews(
    @Param('id') id: string,
    @Query() query: PaginationQueryDto,
  ) {
    const limit = query.limit || 20;
    const page = query.page || 1;
    const offset = (page - 1) * limit;
    return this.businessesService.listReviews(id, limit, offset);
  }

  @RequirePermissions(PermissionKey.BusinessProfileEdit)
  @Patch(':id')
  @ApiBody({ type: PatchBusinessDto })
  patchBusiness(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: PatchBusinessDto,
  ) {
    return this.businessesService.patchBusiness(id, user?.id, dto);
  }
}
