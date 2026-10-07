import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiQuery, ApiBody } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CustomersService } from './customers.service';
import { PatchCustomerProfileDto, UpdateCustomerPreferencesDto } from './dto/customer-profile.dto';

@ApiTags('Customers')
@Controller('customer')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get('profile')
  getProfile(@CurrentUser() user: any) {
    return this.customersService.getProfile(user?.id);
  }

  @Patch('profile')
  @ApiBody({ schema: { type: 'object' } })
  patchProfile(
    @CurrentUser() user: any,
    @Body() dto: PatchCustomerProfileDto,
  ) {
    return this.customersService.patchProfile(user?.id, dto);
  }

  @Get('privacy/export')
  exportPrivacyData(@CurrentUser() user: any) {
    return this.customersService.exportAccountData(user?.id);
  }

  @Post('privacy/delete')
  deleteAccount(
    @CurrentUser() user: any,
    @Body() body: { confirmation?: string },
  ) {
    return this.customersService.deleteAccount(user?.id, String(body.confirmation || ''));
  }

  @Get('favorites')
  @ApiQuery({ name: 'tab', required: false, enum: ['business', 'professional', 'service', 'post'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  getFavorites(
    @CurrentUser() user: any,
    @Query('tab') tab?: 'business' | 'professional' | 'service' | 'post',
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.customersService.getFavorites(
      user?.id,
      (tab as any) || 'business',
      Number(limit) || 20,
      Number(offset) || 0,
    );
  }

  @Post('favorites')
  @ApiBody({ schema: { type: 'object' } })
  addFavorite(
    @CurrentUser() user: any,
    @Body() body: any,
  ) {
    return this.customersService.addFavorite(
      user?.id,
      body.favoriteType,
      body.entityId,
      {
        companyId: body.companyId,
        branchId: body.branchId,
        serviceId: body.serviceId,
        professionalId: body.professionalId,
        postId: body.postId,
      },
    );
  }

  @Delete('favorites/:id')
  removeFavorite(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.customersService.removeFavorite(user?.id, id);
  }

  @Get('following')
  @ApiQuery({ name: 'targetType', required: false, enum: ['business', 'professional'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  getFollowing(
    @CurrentUser() user: any,
    @Query('targetType') targetType?: 'business' | 'professional',
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.customersService.getFollowing(
      user?.id,
      (targetType as any) || 'business',
      Number(limit) || 20,
      Number(offset) || 0,
    );
  }

  @Post('following')
  @ApiBody({ schema: { type: 'object' } })
  follow(
    @CurrentUser() user: any,
    @Body() body: any,
  ) {
    return this.customersService.follow(
      user?.id,
      body.targetType,
      body.targetId,
      {
        companyId: body.companyId,
        professionalId: body.professionalId,
      },
    );
  }

  @Delete('following/:id')
  unfollow(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.customersService.unfollow(user?.id, id);
  }


  @Post('favorites/toggle')
  toggleFavorite(@CurrentUser() user: any, @Body() body: any) {
    const favoriteType = body.favoriteType || (body.companyId ? 'business' : body.professionalId ? 'professional' : body.serviceId ? 'service' : body.postId ? 'post' : undefined);
    const entityId = body.entityId || body.companyId || body.professionalId || body.serviceId || body.postId;
    return this.customersService.toggleFavorite(user?.id, favoriteType, entityId, {
      companyId: body.companyId, branchId: body.branchId, serviceId: body.serviceId, professionalId: body.professionalId, postId: body.postId,
    });
  }

  @Delete('following/target/:targetType/:targetId')
  unfollowTarget(@CurrentUser() user: any, @Param('targetType') targetType: 'business' | 'professional', @Param('targetId') targetId: string) {
    return this.customersService.unfollowTarget(user?.id, targetType, targetId);
  }

  @Get('preferences')
  getPreferences(@CurrentUser() user: any) {
    return this.customersService.getPreferences(user?.id);
  }

  @Put('preferences')
  @ApiBody({ schema: { type: 'object' } })
  upsertPreferences(
    @CurrentUser() user: any,
    @Body() patch: UpdateCustomerPreferencesDto,
  ) {
    return this.customersService.upsertPreferences(user?.id, patch);
  }
}
