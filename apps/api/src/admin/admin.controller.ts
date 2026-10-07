import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags, ApiQuery } from '@nestjs/swagger';
import { PermissionKey } from '@lookiva/shared-types';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/request-with-user';
import { AdminService } from './admin.service';
import {
  ResolveDisputeDto,
  ReviewBusinessVerificationDto,
  SetActiveDto,
  UpdateCategoryDto,
  UpdateCountryDto,
  UpdateFeatureFlagDto,
  UpdateRemoteConfigDto,
  UpdateSupportTicketDto,
  UpdateThemeDto,
} from './dto/admin-actions.dto';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @RequirePermissions(PermissionKey.AdminPlatformView)
  @Get('stats')
  getStats() { return this.adminService.getStats(); }

  @RequirePermissions(PermissionKey.AdminBusinessesView)
  @Get('businesses')
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  listBusinesses(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.adminService.listBusinesses(Number(page) || 1, Number(limit) || 20);
  }

  @RequirePermissions(PermissionKey.AdminBusinessesManage)
  @Patch('businesses/:id/status')
  setBusinessStatus(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() dto: SetActiveDto) {
    return this.adminService.setBusinessActive(actor.id, id, dto.isActive, dto.reason);
  }

  @RequirePermissions(PermissionKey.AdminBusinessesManage)
  @Post('businesses/:id/verification')
  reviewBusiness(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() dto: ReviewBusinessVerificationDto) {
    return this.adminService.reviewBusinessVerification(actor.id, id, dto.status, dto.reason);
  }

  @RequirePermissions(PermissionKey.AdminUsersView)
  @Get('users')
  listUsers(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.adminService.listUsers(Number(page) || 1, Number(limit) || 20);
  }

  @RequirePermissions(PermissionKey.AdminUsersManage)
  @Post('users/:id/revoke-sessions')
  revokeUserSessions(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
    return this.adminService.revokeUserSessions(actor.id, id, body.reason);
  }

  @RequirePermissions(PermissionKey.AdminUsersManage)
  @Patch('users/:id/status')
  setUserStatus(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() dto: SetActiveDto) {
    return this.adminService.setUserActive(actor.id, id, dto.isActive, dto.reason);
  }

  @RequirePermissions(PermissionKey.BookingView)
  @Get('bookings')
  bookings(@Query('page') page?: number, @Query('limit') limit?: number, @Query('status') status?: string) {
    return this.adminService.bookings(Number(page) || 1, Number(limit) || 50, status);
  }

  @RequirePermissions(PermissionKey.PaymentsView)
  @Get('payments')
  payments(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.adminService.payments(Number(page) || 1, Number(limit) || 50);
  }

  @RequirePermissions(PermissionKey.PaymentsView)
  @Get('refunds')
  refunds(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.adminService.refunds(Number(page) || 1, Number(limit) || 50);
  }

  @RequirePermissions(PermissionKey.AdminCategoriesView)
  @Get('categories') categories() { return this.adminService.categories(); }

  @RequirePermissions(PermissionKey.AdminCategoriesManage)
  @Post('categories')
  createCategory(@CurrentUser() actor: AuthenticatedUser, @Body() body: Record<string, any>) {
    return this.adminService.createCategory(actor.id, body);
  }

  @RequirePermissions(PermissionKey.AdminCategoriesManage)
  @Delete('categories/:id')
  archiveCategory(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) {
    return this.adminService.archiveCategory(actor.id, id);
  }

  @RequirePermissions(PermissionKey.AdminCategoriesManage)
  @Patch('categories/:id')
  updateCategory(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.adminService.updateCategory(actor.id, id, dto);
  }

  @RequirePermissions(PermissionKey.AdminCountriesView)
  @Get('countries') countries() { return this.adminService.countries(); }

  @RequirePermissions(PermissionKey.AdminCountriesManage)
  @Post('countries')
  createCountry(@CurrentUser() actor: AuthenticatedUser, @Body() body: Record<string, any>) {
    return this.adminService.createCountry(actor.id, body);
  }

  @RequirePermissions(PermissionKey.AdminCountriesManage)
  @Patch('countries/:id')
  updateCountry(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateCountryDto) {
    return this.adminService.updateCountry(actor.id, id, dto);
  }

  @RequirePermissions(PermissionKey.AdminThemesView)
  @Get('themes') themes() { return this.adminService.themes(); }

  @RequirePermissions(PermissionKey.AdminThemesManage)
  @Patch('themes/:id')
  updateTheme(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateThemeDto) {
    return this.adminService.updateTheme(actor.id, id, dto);
  }

  @RequirePermissions(PermissionKey.AdminPlatformView)
  @Get('subscriptions')
  subscriptions(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.adminService.subscriptions(Number(page) || 1, Number(limit) || 50);
  }

  @RequirePermissions(PermissionKey.PromotionsView)
  @Get('promotions')
  promotions(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.adminService.promotions(Number(page) || 1, Number(limit) || 50);
  }

  @RequirePermissions(PermissionKey.ComplianceView)
  @Get('support')
  support(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.adminService.support(Number(page) || 1, Number(limit) || 50);
  }

  @RequirePermissions(PermissionKey.ComplianceView)
  @Get('support/:id')
  supportDetails(@Param('id') id: string) {
    return this.adminService.supportDetails(id);
  }

  @RequirePermissions(PermissionKey.ComplianceManage)
  @Post('support/:id/replies')
  replySupport(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
    return this.adminService.replySupportTicket(actor.id, id, body);
  }

  @RequirePermissions(PermissionKey.ComplianceManage)
  @Patch('support/:id')
  updateSupport(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateSupportTicketDto) {
    return this.adminService.updateSupportTicket(actor.id, id, dto);
  }

  @RequirePermissions(PermissionKey.ComplianceView)
  @Get('disputes')
  disputes(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.adminService.disputes(Number(page) || 1, Number(limit) || 50);
  }

  @RequirePermissions(PermissionKey.ComplianceManage)
  @Patch('disputes/:id')
  resolveDispute(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() dto: ResolveDisputeDto) {
    return this.adminService.resolveDispute(actor.id, id, dto);
  }

  @RequirePermissions(PermissionKey.ModerationView)
  @Get('moderation/reports')
  moderationReports(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    return this.adminService.moderationReports(Number(page) || 1, Number(limit) || 50, status);
  }

  @RequirePermissions(PermissionKey.ModerationManage)
  @Patch('moderation/reports/:id')
  resolveModerationReport(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
    return this.adminService.resolveModerationReport(actor.id, id, body);
  }

  @RequirePermissions(PermissionKey.ModerationView)
  @Get('strikes')
  userStrikes(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('userId') userId?: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.adminService.userStrikes(
      Number(page) || 1,
      Number(limit) || 50,
      userId,
      activeOnly === 'true',
    );
  }

  @RequirePermissions(PermissionKey.ModerationManage)
  @Post('users/:id/strikes')
  createUserStrike(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
    return this.adminService.createUserStrike(actor.id, id, body);
  }

  @RequirePermissions(PermissionKey.ModerationManage)
  @Delete('strikes/:id')
  deactivateUserStrike(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
    return this.adminService.deactivateUserStrike(actor.id, id, body.reason);
  }

  @RequirePermissions(PermissionKey.AuditView)
  @Get('audit')
  audit(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('actorUserId') actorUserId?: string,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('companyId') companyId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.adminService.audit(Number(page) || 1, Number(limit) || 100, {
      actorUserId,
      action,
      entityType,
      companyId,
      from,
      to,
    });
  }

  @RequirePermissions(PermissionKey.FeatureFlagsView)
  @Get('feature-flags') featureFlags() { return this.adminService.featureFlags(); }

  @RequirePermissions(PermissionKey.FeatureFlagsManage)
  @Patch('feature-flags/:key')
  updateFeatureFlag(@CurrentUser() actor: AuthenticatedUser, @Param('key') key: string, @Body() dto: UpdateFeatureFlagDto) {
    return this.adminService.updateFeatureFlag(actor.id, key, dto);
  }

  @RequirePermissions(PermissionKey.RemoteConfigView)
  @Get('remote-config') remoteConfig() { return this.adminService.remoteConfig(); }

  @RequirePermissions(PermissionKey.RemoteConfigManage)
  @Patch('remote-config/:key')
  updateRemoteConfig(@CurrentUser() actor: AuthenticatedUser, @Param('key') key: string, @Body() dto: UpdateRemoteConfigDto) {
    return this.adminService.updateRemoteConfig(actor.id, key, dto);
  }
}
