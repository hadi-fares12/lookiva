import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { PermissionKey } from '@lookiva/shared-types';
import { MediaService } from './media.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Media')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 100 * 1024 * 1024 } }),
  )
  @RequirePermissions(PermissionKey.MediaUpload)
  upload(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
    @Query('isPublic') isPublic?: string,
  ) {
    const userId = user?.id ?? 'system';
    const isPublicBool = isPublic === undefined ? true : isPublic === 'true';
    return this.mediaService.upload(file, userId, isPublicBool);
  }

  @Public()
  @Get('public/:id')
  async publicMedia(
    @Param('id') id: string,
    @Query('variant') variant: string | undefined,
    @Res() response: Response,
  ) {
    const asset = await this.mediaService.getPublicMediaAsset(id, variant);
    if (!asset) {
      response.status(404).json({ message: 'Public media not found' });
      return;
    }
    response.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
    if (asset.kind === 'redirect') {
      response.redirect(302, asset.url);
      return;
    }
    response.setHeader('Content-Type', asset.mimeType);
    response.send(asset.buffer);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.mediaService.getMediaById(id);
  }
}
