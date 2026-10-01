import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionKey } from '@lookiva/shared-types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { AuthenticatedUser } from '../auth/types/request-with-user';
import {
  AiParseSearchDto,
  CreateGeofenceCandidateDto,
  ModerateReportDto,
} from './dto/platform-ops-v2.dto';
import { PlatformOpsV2Service } from './platform-ops-v2.service';

@ApiTags('Platform Ops V2')
@ApiBearerAuth()
@Controller('platform-ops-v2')
export class PlatformOpsV2Controller {
  constructor(private readonly ops: PlatformOpsV2Service) {}

  @Get('workers/status')
  @RequirePermissions(PermissionKey.WorkersView)
  @ApiOperation({ summary: 'Read local worker/queue capability status' })
  workersStatus() {
    return this.ops.workersStatus();
  }

  @Get('realtime/status')
  @RequirePermissions(PermissionKey.RealtimeView)
  @ApiOperation({ summary: 'Read realtime channel capability status' })
  realtimeStatus() {
    return this.ops.realtimeStatus();
  }

  @Post('nearby/geofence-candidates')
  @RequirePermissions(PermissionKey.GeofenceManage)
  @ApiOperation({ summary: 'Create a nearby/geofence candidate' })
  createGeofenceCandidate(@Body() dto: CreateGeofenceCandidateDto) {
    return this.ops.createGeofenceCandidate(dto);
  }

  @Get('nearby/users/:userId/geofence-candidates')
  @RequirePermissions(PermissionKey.GeofenceView)
  @ApiOperation({ summary: 'List non-expired geofence candidates for a user' })
  listGeofenceCandidates(@Param('userId') userId: string) {
    return this.ops.listGeofenceCandidates(userId);
  }

  @Get('moderation/reports')
  @RequirePermissions(PermissionKey.ModerationView)
  @ApiOperation({ summary: 'List moderation reports' })
  listModerationReports(@Query('status') status?: string) {
    return this.ops.listModerationReports(status);
  }

  @Patch('moderation/reports/:id')
  @RequirePermissions(PermissionKey.ModerationManage)
  @ApiOperation({ summary: 'Apply a moderation action' })
  moderateReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ModerateReportDto,
  ) {
    return this.ops.moderateReport(user, id, dto);
  }

  @Get('ai/status')
  @RequirePermissions(PermissionKey.AiUse)
  @ApiOperation({ summary: 'Read optional AI provider status' })
  aiStatus() {
    return this.ops.aiStatus();
  }

  @Post('ai/search/parse')
  @RequirePermissions(PermissionKey.AiUse)
  @ApiOperation({ summary: 'Parse natural-language search with deterministic fallback while AI is optional' })
  parseSearch(@Body() dto: AiParseSearchDto) {
    return this.ops.parseSearch(dto);
  }
}
