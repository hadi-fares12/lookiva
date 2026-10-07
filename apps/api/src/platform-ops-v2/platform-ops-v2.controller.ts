import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionKey } from '@lookiva/shared-types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { AuthenticatedUser } from '../auth/types/request-with-user';
import {
  AiParseSearchDto,
  CreateGeofenceCandidateDto,
  CreateModerationAppealDto,
  ModerateReportDto,
  ResolveModerationAppealDto,
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

  @Post('moderation/appeals')
  @RequirePermissions(PermissionKey.ModerationAppealCreate)
  @ApiOperation({ summary: 'Submit an appeal for your own moderated content or strike' })
  createAppeal(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateModerationAppealDto,
  ) {
    return this.ops.createModerationAppeal(user, dto);
  }

  @Get('moderation/strikes/mine')
  @RequirePermissions(PermissionKey.ModerationAppealCreate)
  @ApiOperation({ summary: 'List current user moderation strikes' })
  myStrikes(@CurrentUser() user: AuthenticatedUser) {
    return this.ops.myModerationStrikes(user);
  }

  @Get('moderation/appeals/mine')
  @RequirePermissions(PermissionKey.ModerationAppealCreate)
  @ApiOperation({ summary: 'List the current user moderation appeals' })
  myAppeals(@CurrentUser() user: AuthenticatedUser) {
    return this.ops.myModerationAppeals(user);
  }

  @Get('moderation/appeals')
  @RequirePermissions(PermissionKey.ModerationView)
  @ApiOperation({ summary: 'List moderation appeals for platform review' })
  appeals(@Query('status') status?: string) {
    return this.ops.listModerationAppeals(status);
  }

  @Patch('moderation/appeals/:id')
  @RequirePermissions(PermissionKey.ModerationManage)
  @ApiOperation({ summary: 'Resolve a moderation appeal and optionally restore content/clear strike' })
  resolveAppeal(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ResolveModerationAppealDto,
  ) {
    return this.ops.resolveModerationAppeal(user, id, dto);
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
