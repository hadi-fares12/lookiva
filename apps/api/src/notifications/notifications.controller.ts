import {
  Controller,
  Get,
  Put,
  Patch,
  Post,
  Delete,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiQuery, ApiBody } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';
import { RegisterPushDeviceDto } from './dto/register-push-device.dto';
import { UnregisterPushDeviceDto } from './dto/unregister-push-device.dto';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  list(
    @CurrentUser() user: any,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('unreadOnly') unreadOnly?: boolean,
  ) {
    return this.notificationsService.list(
      user?.id,
      Number(limit) || 50,
      Number(offset) || 0,
      unreadOnly != null ? String(unreadOnly) === 'true' : undefined,
    );
  }

  @Patch(':id/read')
  markRead(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markRead(user?.id, id);
  }

  @Patch('read-all')
  markAllRead(@CurrentUser() user: any) {
    return this.notificationsService.markAllRead(user?.id);
  }

  @Get('preferences')
  getPreferences(@CurrentUser() user: any) {
    return this.notificationsService.getPreferences(user?.id);
  }

  @Put('preferences')
  @ApiBody({ schema: { type: 'object' } })
  updatePreferences(
    @CurrentUser() user: any,
    @Body() patch: any,
  ) {
    return this.notificationsService.updatePreferences(user?.id, patch);
  }
  @Post('devices')
  registerDevice(@CurrentUser() user: any, @Body() dto: RegisterPushDeviceDto) {
    return this.notificationsService.registerPushDevice(user.id, dto);
  }

  @Delete('devices')
  unregisterDevice(@CurrentUser() user: any, @Body() dto: UnregisterPushDeviceDto) {
    return this.notificationsService.unregisterPushDevice(user.id, dto.token);
  }

}
