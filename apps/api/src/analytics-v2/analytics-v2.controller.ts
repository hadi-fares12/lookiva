import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionKey } from '@lookiva/shared-types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { AuthenticatedUser } from '../auth/types/request-with-user';
import { AnalyticsV2Service } from './analytics-v2.service';
import { TrackAnalyticsEventDto, UpsertDailySnapshotDto } from './dto/analytics-v2.dto';

@ApiTags('Analytics V2')
@ApiBearerAuth()
@Controller('analytics-v2')
export class AnalyticsV2Controller {
  constructor(private readonly analytics: AnalyticsV2Service) {}

  @Post('events')
  @RequirePermissions(PermissionKey.AnalyticsManage)
  @ApiOperation({ summary: 'Track a normalized analytics event' })
  track(@CurrentUser() user: AuthenticatedUser, @Body() dto: TrackAnalyticsEventDto) {
    return this.analytics.track(user, dto);
  }

  @Get('companies/:companyId/dashboard')
  @RequirePermissions(PermissionKey.AnalyticsView)
  @ApiOperation({ summary: 'Scoped business analytics with per-professional financial breakdown' })
  dashboard(
    @CurrentUser() user: AuthenticatedUser,
    @Param('companyId') companyId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('branchId') branchId?: string,
    @Query('professionalId') professionalId?: string,
  ) {
    return this.analytics.dashboard(user, companyId, from, to, branchId, professionalId);
  }

  @Get('companies/:companyId/drilldown/:metric')
  @RequirePermissions(PermissionKey.AnalyticsView)
  @ApiOperation({ summary: 'Drill down into rows behind a scoped KPI' })
  drilldown(
    @CurrentUser() user: AuthenticatedUser,
    @Param('companyId') companyId: string,
    @Param('metric') metric: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.analytics.drilldown(user, companyId, metric, branchId);
  }

  @Post('snapshots')
  @RequirePermissions(PermissionKey.AnalyticsManage)
  @ApiOperation({ summary: 'Upsert a scoped daily analytics snapshot' })
  upsertSnapshot(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpsertDailySnapshotDto) {
    return this.analytics.upsertSnapshot(user, dto);
  }
}
