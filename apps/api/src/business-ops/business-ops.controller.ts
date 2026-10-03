import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionKey } from '@lookiva/shared-types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { AuthenticatedUser } from '../auth/types/request-with-user';
import { BusinessOpsService } from './business-ops.service';
import { CreateBusinessUserDto, CreatePromotionDto, CreateQueueDto, CreateResourceDto, CreateServiceDto, UpdateBusinessUserDto, UpdatePromotionDto, UpdateQueueDto, UpdateResourceDto, UpdateServiceDto } from './dto/business-management.dto';

@ApiTags('Business Operations')
@ApiBearerAuth()
@Controller('business-ops/:companyId')
export class BusinessOpsController {
  constructor(private readonly ops: BusinessOpsService) {}

  @Get('overview')
  @RequirePermissions(PermissionKey.DashboardViewBasic)
  @ApiOperation({ summary: 'Operational overview for the authenticated business scope' })
  overview(@CurrentUser() user: AuthenticatedUser, @Param('companyId') companyId: string) {
    return this.ops.overview(user, companyId);
  }

  @Get('appointments')
  @RequirePermissions(PermissionKey.BookingView)
  appointments(
    @CurrentUser() user: AuthenticatedUser,
    @Param('companyId') companyId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: string,
    @Query('branchId') branchId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ops.appointments(user, companyId, { from, to, status, branchId, limit: Number(limit) || 100 });
  }

  @Get('branches')
  @RequirePermissions(PermissionKey.BusinessBranchView)
  branches(@CurrentUser() user: AuthenticatedUser, @Param('companyId') companyId: string) {
    return this.ops.branches(user, companyId);
  }

  @Get('customers')
  @RequirePermissions(PermissionKey.CustomerProfileView)
  customers(@CurrentUser() user: AuthenticatedUser, @Param('companyId') companyId: string, @Query('limit') limit?: string) {
    return this.ops.customers(user, companyId, Number(limit) || 100);
  }

  @Get('professionals')
  @RequirePermissions(PermissionKey.BusinessProfessionalView)
  professionals(@CurrentUser() user: AuthenticatedUser, @Param('companyId') companyId: string) {
    return this.ops.professionals(user, companyId);
  }

  @Get('services')
  @RequirePermissions(PermissionKey.BusinessServiceView)
  services(@CurrentUser() user: AuthenticatedUser, @Param('companyId') companyId: string) {
    return this.ops.services(user, companyId);
  }

  @Get('categories')
  @RequirePermissions(PermissionKey.BusinessServiceView)
  categories(@CurrentUser() user: AuthenticatedUser, @Param('companyId') companyId: string) {
    return this.ops.categories(user, companyId);
  }

  @Get('resources')
  @RequirePermissions(PermissionKey.BusinessResourceView)
  resources(@CurrentUser() user: AuthenticatedUser, @Param('companyId') companyId: string, @Query('branchId') branchId?: string) {
    return this.ops.resources(user, companyId, branchId);
  }

  @Get('reviews')
  @RequirePermissions(PermissionKey.ReviewsView)
  reviews(@CurrentUser() user: AuthenticatedUser, @Param('companyId') companyId: string, @Query('limit') limit?: string) {
    return this.ops.reviews(user, companyId, Number(limit) || 100);
  }

  @Get('payments')
  @RequirePermissions(PermissionKey.PaymentsView)
  payments(@CurrentUser() user: AuthenticatedUser, @Param('companyId') companyId: string, @Query('limit') limit?: string) {
    return this.ops.payments(user, companyId, Number(limit) || 100);
  }

  @Get('promotions')
  @RequirePermissions(PermissionKey.PromotionsView)
  promotions(@CurrentUser() user: AuthenticatedUser, @Param('companyId') companyId: string) {
    return this.ops.promotions(user, companyId);
  }

  @Get('staff')
  @RequirePermissions(PermissionKey.SettingsView)
  staff(@CurrentUser() user: AuthenticatedUser, @Param('companyId') companyId: string) {
    return this.ops.staff(user, companyId);
  }


  @Post('staff')
  @RequirePermissions(PermissionKey.SettingsManage)
  createStaff(
    @CurrentUser() user: AuthenticatedUser,
    @Param('companyId') companyId: string,
    @Body() dto: CreateBusinessUserDto,
  ) {
    return this.ops.createBusinessUser(user, companyId, dto);
  }

  @Patch('staff/:userId')
  @RequirePermissions(PermissionKey.SettingsManage)
  updateStaff(
    @CurrentUser() user: AuthenticatedUser,
    @Param('companyId') companyId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateBusinessUserDto,
  ) {
    return this.ops.updateBusinessUser(user, companyId, userId, dto);
  }

  @Delete('staff/:userId')
  @RequirePermissions(PermissionKey.SettingsManage)
  removeStaff(
    @CurrentUser() user: AuthenticatedUser,
    @Param('companyId') companyId: string,
    @Param('userId') userId: string,
  ) {
    return this.ops.removeBusinessUser(user, companyId, userId);
  }

  @Get('audit')
  @RequirePermissions(PermissionKey.SettingsView)
  audit(@CurrentUser() user: AuthenticatedUser, @Param('companyId') companyId: string, @Query('limit') limit?: string) {
    return this.ops.audit(user, companyId, Number(limit) || 100);
  }

  @Get('subscriptions')
  @RequirePermissions(PermissionKey.SettingsView)
  subscriptions(@CurrentUser() user: AuthenticatedUser, @Param('companyId') companyId: string) {
    return this.ops.subscriptions(user, companyId);
  }



  @Get('conversations')
  @RequirePermissions(PermissionKey.CustomerProfileView)
  conversations(
    @CurrentUser() user: AuthenticatedUser,
    @Param('companyId') companyId: string,
    @Query('limit') limit?: string,
  ) {
    return this.ops.conversations(user, companyId, Number(limit) || 100);
  }

  @Get('conversations/:conversationId/messages')
  @RequirePermissions(PermissionKey.CustomerProfileView)
  conversationMessages(
    @CurrentUser() user: AuthenticatedUser,
    @Param('companyId') companyId: string,
    @Param('conversationId') conversationId: string,
    @Query('limit') limit?: string,
  ) {
    return this.ops.conversationMessages(user, companyId, conversationId, Number(limit) || 100);
  }

  @Post('conversations/:conversationId/messages')
  @RequirePermissions(PermissionKey.CustomerProfileView)
  sendConversationMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('companyId') companyId: string,
    @Param('conversationId') conversationId: string,
    @Body() body: { body: string; messageType?: string },
  ) {
    return this.ops.sendConversationMessage(user, companyId, conversationId, body.body, body.messageType || 'text');
  }

  @Post('customers/:customerId/block')
  @RequirePermissions(PermissionKey.SettingsManage)
  blockCustomer(
    @CurrentUser() user: AuthenticatedUser,
    @Param('companyId') companyId: string,
    @Param('customerId') customerId: string,
  ) {
    return this.ops.setCustomerBlocked(user, companyId, customerId, true);
  }

  @Delete('customers/:customerId/block')
  @RequirePermissions(PermissionKey.SettingsManage)
  unblockCustomer(
    @CurrentUser() user: AuthenticatedUser,
    @Param('companyId') companyId: string,
    @Param('customerId') customerId: string,
  ) {
    return this.ops.setCustomerBlocked(user, companyId, customerId, false);
  }

  @Get('queues')
  @RequirePermissions(PermissionKey.BookingQueueManage)
  queues(
    @CurrentUser() user: AuthenticatedUser,
    @Param('companyId') companyId: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.ops.queues(user, companyId, branchId);
  }

  @Post('queues')
  @RequirePermissions(PermissionKey.BookingQueueManage)
  createQueue(@CurrentUser() user: AuthenticatedUser, @Param('companyId') companyId: string, @Body() dto: CreateQueueDto) {
    return this.ops.createQueue(user, companyId, dto);
  }

  @Patch('queues/:queueId')
  @RequirePermissions(PermissionKey.BookingQueueManage)
  updateQueue(
    @CurrentUser() user: AuthenticatedUser,
    @Param('companyId') companyId: string,
    @Param('queueId') queueId: string,
    @Body() dto: UpdateQueueDto,
  ) {
    return this.ops.updateQueue(user, companyId, queueId, dto);
  }
  @Post('services')
  @RequirePermissions(PermissionKey.BusinessServiceCreate)
  createService(@CurrentUser() user: AuthenticatedUser, @Param('companyId') companyId: string, @Body() dto: CreateServiceDto) {
    return this.ops.createService(user, companyId, dto);
  }

  @Patch('services/:serviceId')
  @RequirePermissions(PermissionKey.BusinessServiceEdit)
  updateService(@CurrentUser() user: AuthenticatedUser, @Param('companyId') companyId: string, @Param('serviceId') serviceId: string, @Body() dto: UpdateServiceDto) {
    return this.ops.updateService(user, companyId, serviceId, dto);
  }

  @Delete('services/:serviceId')
  @RequirePermissions(PermissionKey.BusinessServiceDelete)
  deleteService(@CurrentUser() user: AuthenticatedUser, @Param('companyId') companyId: string, @Param('serviceId') serviceId: string) {
    return this.ops.deleteService(user, companyId, serviceId);
  }

  @Post('resources')
  @RequirePermissions(PermissionKey.BusinessResourceCreate)
  createResource(@CurrentUser() user: AuthenticatedUser, @Param('companyId') companyId: string, @Body() dto: CreateResourceDto) {
    return this.ops.createResource(user, companyId, dto);
  }

  @Patch('resources/:resourceId')
  @RequirePermissions(PermissionKey.BusinessResourceEdit)
  updateResource(@CurrentUser() user: AuthenticatedUser, @Param('companyId') companyId: string, @Param('resourceId') resourceId: string, @Body() dto: UpdateResourceDto) {
    return this.ops.updateResource(user, companyId, resourceId, dto);
  }

  @Delete('resources/:resourceId')
  @RequirePermissions(PermissionKey.BusinessResourceDelete)
  deleteResource(@CurrentUser() user: AuthenticatedUser, @Param('companyId') companyId: string, @Param('resourceId') resourceId: string) {
    return this.ops.deleteResource(user, companyId, resourceId);
  }

  @Post('promotions')
  @RequirePermissions(PermissionKey.PromotionsManage)
  createPromotion(@CurrentUser() user: AuthenticatedUser, @Param('companyId') companyId: string, @Body() dto: CreatePromotionDto) {
    return this.ops.createPromotion(user, companyId, dto);
  }

  @Patch('promotions/:promotionId')
  @RequirePermissions(PermissionKey.PromotionsManage)
  updatePromotion(@CurrentUser() user: AuthenticatedUser, @Param('companyId') companyId: string, @Param('promotionId') promotionId: string, @Body() dto: UpdatePromotionDto) {
    return this.ops.updatePromotion(user, companyId, promotionId, dto);
  }

}
