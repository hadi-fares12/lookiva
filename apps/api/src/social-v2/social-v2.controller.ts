import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionKey } from '@lookiva/shared-types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { AuthenticatedUser } from '../auth/types/request-with-user';
import {
  AddCollectionItemDto,
  BookThisLookDto,
  CreateCollectionDto,
  CreatePostV2Dto,
  FollowTargetDto,
  ReportContentDto,
  VerifyWorkDto,
} from './dto/social-v2.dto';
import { SocialV2Service } from './social-v2.service';

@ApiTags('Social V2')
@ApiBearerAuth()
@Controller('social-v2')
export class SocialV2Controller {
  constructor(private readonly social: SocialV2Service) {}

  @Get('feed')
  @RequirePermissions(PermissionKey.DiscoveryView)
  @ApiOperation({ summary: 'Personalized reels/social feed with cursor pagination' })
  feed(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.social.feed(user, Number(limit) || 20, cursor);
  }

  @Post('posts')
  @RequirePermissions(PermissionKey.SocialPostCreate)
  @ApiOperation({ summary: 'Create a portfolio/reels/social post' })
  createPost(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePostV2Dto,
  ) {
    return this.social.createPost(user, dto);
  }

  @Post('posts/:id/verify-work')
  @RequirePermissions(PermissionKey.SocialPostCreate)
  @ApiOperation({ summary: 'Verify portfolio work against a verified review and completed booking' })
  verifyWork(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: VerifyWorkDto,
  ) {
    return this.social.verifyWork(user, id, dto);
  }

  @Post('posts/:id/save')
  @RequirePermissions(PermissionKey.CustomerFavoritesAdd)
  @ApiOperation({ summary: 'Save a post as a favorite' })
  savePost(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.social.savePost(user, id);
  }

  @Delete('posts/:id/save')
  @RequirePermissions(PermissionKey.CustomerFavoritesRemove)
  @ApiOperation({ summary: 'Remove a saved post' })
  unsavePost(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.social.unsavePost(user, id);
  }

  @Post('posts/:id/book-this-look')
  @RequirePermissions(PermissionKey.BookingCreate)
  @ApiOperation({ summary: 'Create a booking hold from the primary service linked to a look' })
  bookThisLook(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: BookThisLookDto,
  ) {
    return this.social.bookThisLook(user, id, dto);
  }

  @Post('posts/:id/report')
  @RequirePermissions(PermissionKey.ModerationView)
  @ApiOperation({ summary: 'Report a post for moderation' })
  reportPost(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReportContentDto,
  ) {
    return this.social.report(user, 'post', id, dto);
  }

  @Get('collections')
  @RequirePermissions(PermissionKey.CustomerFavoritesView)
  @ApiOperation({ summary: 'List the current customer saved collections' })
  collections(@CurrentUser() user: AuthenticatedUser) {
    return this.social.listCollections(user);
  }

  @Post('collections')
  @RequirePermissions(PermissionKey.CustomerFavoritesAdd)
  @ApiOperation({ summary: 'Create a saved collection' })
  createCollection(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCollectionDto,
  ) {
    return this.social.createCollection(user, dto);
  }

  @Post('collections/:id/items')
  @RequirePermissions(PermissionKey.CustomerFavoritesAdd)
  @ApiOperation({ summary: 'Add a post to a collection' })
  addCollectionItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AddCollectionItemDto,
  ) {
    return this.social.addCollectionItem(user, id, dto.postId);
  }

  @Delete('collections/:id/items/:postId')
  @RequirePermissions(PermissionKey.CustomerFavoritesRemove)
  @ApiOperation({ summary: 'Remove a post from an owned collection' })
  removeCollectionItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('postId') postId: string,
  ) {
    return this.social.removeCollectionItem(user, id, postId);
  }

  @Delete('collections/:id')
  @RequirePermissions(PermissionKey.CustomerFavoritesRemove)
  @ApiOperation({ summary: 'Delete an owned collection' })
  deleteCollection(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.social.deleteCollection(user, id);
  }

  @Post('follow')
  @RequirePermissions(PermissionKey.CustomerFollowingAdd)
  @ApiOperation({ summary: 'Follow a company or professional' })
  follow(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: FollowTargetDto,
  ) {
    return this.social.follow(user, dto);
  }

  @Delete('follow/:targetType/:targetId')
  @RequirePermissions(PermissionKey.CustomerFollowingRemove)
  @ApiOperation({ summary: 'Unfollow a company or professional' })
  unfollow(
    @CurrentUser() user: AuthenticatedUser,
    @Param('targetType') targetType: string,
    @Param('targetId') targetId: string,
  ) {
    return this.social.unfollow(user, targetType, targetId);
  }
}
