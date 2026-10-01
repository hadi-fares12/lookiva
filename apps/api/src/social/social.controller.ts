import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiQuery,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
} from '@nestjs/swagger';
import { PermissionKey } from '@lookiva/shared-types';
import { Public } from '../common/decorators/public.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SocialService } from './social.service';

@ApiTags('Social')
@Controller('social')
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  @Public()
  @Get('posts')
  @ApiOperation({ summary: 'List social posts with filters' })
  @ApiQuery({ name: 'businessId', required: false, type: String, description: 'Filter by business / company ID' })
  @ApiQuery({ name: 'professionalId', required: false, type: String, description: 'Filter by professional ID' })
  @ApiQuery({ name: 'userId', required: false, type: String, description: 'Filter by author user ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max number of posts (default 20)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Pagination offset' })
  @ApiOkResponse({ description: 'Paginated list of posts with media and author preview' })
  listPosts(
    @Query('businessId') businessId?: string,
    @Query('professionalId') professionalId?: string,
    @Query('userId') userId?: string,
    @Query('limit') limit?: string | number,
    @Query('offset') offset?: string | number,
  ) {
    return this.socialService.listPosts({
      businessId,
      professionalId,
      userId,
      limit: limit != null ? Number(limit) : undefined,
      offset: offset != null ? Number(offset) : undefined,
    });
  }

  @Public()
  @Get('posts/:id')
  @ApiOperation({ summary: 'Get a single post by ID with comments preview' })
  @ApiParam({ name: 'id', description: 'Post ID', type: String })
  @ApiOkResponse({ description: 'Post detail with author, media, likes count, and first-level comments' })
  getById(@Param('id') id: string) {
    return this.socialService.getById(id);
  }

  @Post('posts/:id/like')
  @RequirePermissions(PermissionKey.SocialPostLike)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Like a post' })
  @ApiParam({ name: 'id', description: 'Post ID', type: String })
  @ApiCreatedResponse({ description: 'Like was recorded (or existing like returned idempotently)' })
  likePost(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.socialService.likePost(user?.id, id);
  }

  @Delete('posts/:id/like')
  @RequirePermissions(PermissionKey.SocialPostLike)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a like from a post' })
  @ApiParam({ name: 'id', description: 'Post ID', type: String })
  @ApiNoContentResponse({ description: 'Like removed (or no matching like existed)' })
  unlikePost(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.socialService.unlikePost(user?.id, id);
  }

  @Post('posts/:id/comments')
  @RequirePermissions(PermissionKey.SocialCommentCreate)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Comment on a post (optionally reply to an existing comment)' })
  @ApiParam({ name: 'id', description: 'Post ID', type: String })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['body'],
      properties: {
        body: { type: 'string', minLength: 1, description: 'Comment text' },
        parentId: { type: 'string', description: 'Parent comment ID for replies (optional)' },
      },
    },
  })
  @ApiCreatedResponse({ description: 'Comment created' })
  comment(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: { body: string; parentId?: string },
  ) {
    return this.socialService.comment(user?.id, id, dto?.body ?? '', dto?.parentId);
  }

  @Delete('comments/:id')
  @RequirePermissions(PermissionKey.SocialCommentDelete)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a comment owned by the current user' })
  @ApiParam({ name: 'id', description: 'Comment ID', type: String })
  @ApiNoContentResponse({ description: 'Comment deleted' })
  deleteComment(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.socialService.deleteComment(user?.id, id);
  }
}
