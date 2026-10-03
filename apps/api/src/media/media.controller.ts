import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { PermissionKey } from '@lookiva/shared-types';
import { MediaService } from './media.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

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
    @Query('companyId') companyId?: string,
    @Query('branchId') branchId?: string,
  ) {
    const userId = user?.id ?? 'system';
    const isPublicBool = isPublic === undefined ? true : isPublic === 'true';
    return this.mediaService.upload(file, userId, isPublicBool, companyId, branchId);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.mediaService.getMediaById(id);
  }
}
