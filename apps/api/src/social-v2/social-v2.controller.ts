import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionKey } from '@lookiva/shared-types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { AuthenticatedUser } from '../auth/types/request-with-user';
import {
  AddCollectionItemDto,
  CreateCollectionDto,
  CreatePostV2Dto,
  FollowTargetDto,
  ReportContentDto,
} from './dto/social-v2.dto';
import { SocialV2Service } from './social-v2.service';

@ApiTags('Social V2')
@ApiBearerAuth()
@Controller('social-v2')
export class SocialV2Controller {
  constructor(private readonly social: SocialV2Service) {}

  @Post('posts')
  @RequirePermissions(PermissionKey.SocialPostCreate)
  @ApiOperation({ summary: 'Create a portfolio/reels/social post' })
  createPost(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePostV2Dto,
  ) {
    return this.social.createPost(user, dto);
  }

  @Post('posts/:id/save')
  @RequirePermissions(PermissionKey.CustomerFavoritesAdd)
  @ApiOperation({ summary: 'Save a post as a favorite' })
  savePost(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.social.savePost(user, id);
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
    @Param('id') id: string,
    @Body() dto: AddCollectionItemDto,
  ) {
    return this.social.addCollectionItem(id, dto.postId);
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
}
