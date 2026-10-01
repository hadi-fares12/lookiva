import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiQuery, ApiBody } from '@nestjs/swagger';
import { PermissionKey } from '@lookiva/shared-types';
import { Public } from '../common/decorators/public.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReviewsService } from './reviews.service';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Public()
  @Get()
  @ApiQuery({ name: 'businessId', required: false, type: String })
  @ApiQuery({ name: 'professionalId', required: false, type: String })
  @ApiQuery({ name: 'serviceId', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'minRating', required: false, type: Number })
  @ApiQuery({ name: 'verifiedOnly', required: false, type: Boolean })
  list(
    @Query('businessId') businessId?: string,
    @Query('professionalId') professionalId?: string,
    @Query('serviceId') serviceId?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('minRating') minRating?: number,
    @Query('verifiedOnly') verifiedOnly?: boolean,
  ) {
    return this.reviewsService.list({
      businessId,
      professionalId,
      serviceId,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      minRating: minRating != null ? Number(minRating) : undefined,
      verifiedOnly: verifiedOnly != null ? String(verifiedOnly) === 'true' : undefined,
    });
  }

  @Public()
  @Get(':id')
  getById(@Param('id') id: string) {
    return this.reviewsService.getById(id);
  }

  @RequirePermissions(PermissionKey.ReviewsCreate)
  @Post()
  @ApiBody({ schema: { type: 'object' } })
  createReview(
    @CurrentUser() user: any,
    @Body() dto: any,
  ) {
    return this.reviewsService.createReview(user?.id, dto);
  }
}
