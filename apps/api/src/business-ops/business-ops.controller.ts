import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionKey } from '@lookiva/shared-types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { AuthenticatedUser } from '../auth/types/request-with-user';
import { BusinessOpsService } from './business-ops.service';
import { CreatePromotionDto, CreateQueueDto, CreateResourceDto, CreateServiceDto, UpdatePromotionDto, UpdateQueueDto, UpdateResourceDto, UpdateServiceDto } from './dto/business-management.dto';

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

  @Get('customers/:customerId')
  @RequirePermissions(PermissionKey.CustomerProfileView)
  customerDetails(
    @CurrentUser() user: AuthenticatedUser,
    @Param('companyId') companyId: string,
    @Param('customerId') customerId: string,
  ) {
    return this.ops.customerDetails(user, companyId, customerId);
  }

  @Get('inventory')
  @RequirePermissions(PermissionKey.SettingsView)
  inventory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('companyId') companyId: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.ops.inventory(user, companyId, branchId);
  }

  @Get('inventory/movements')
  @RequirePermissions(PermissionKey.SettingsView)
  inventoryMovements(
    @CurrentUser() user: AuthenticatedUser,
    @Param('companyId') companyId: string,
    @Query('productId') productId?: string,
    @Query('branchId') branchId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ops.inventoryMovements(user, companyId, productId, branchId, Number(limit) || 100);
  }

  @Post('products')
  @RequirePermissions(PermissionKey.SettingsManage)
  createProduct(
    @CurrentUser() user: AuthenticatedUser,
    @Param('companyId') companyId: string,
    @Body() body: Record<string, any>,
  ) {
    return this.ops.createProduct(user, companyId, body);
  }

  @Patch('products/:productId')
  @RequirePermissions(PermissionKey.SettingsManage)
  updateProduct(
    @CurrentUser() user: AuthenticatedUser,
    @Param('companyId') companyId: string,
    @Param('productId') productId: string,
    @Body() body: Record<string, any>,
  ) {
    return this.ops.updateProduct(user, companyId, productId, body);
  }

  @Post('products/:productId/stock-movements')
  @RequirePermissions(PermissionKey.SettingsManage)
  stockMovement(
    @CurrentUser() user: AuthenticatedUser,
    @Param('companyId') companyId: string,
    @Param('productId') productId: string,
    @Body() body: Record<string, any>,
  ) {
    return this.ops.stockMovement(user, companyId, productId, body);
  }

  @Get('professionals/:professionalId/schedules')
  @RequirePermissions(PermissionKey.BusinessProfessionalView)
  professionalSchedules(
    @CurrentUser() user: AuthenticatedUser,
    @Param('companyId') companyId: string,
    @Param('professionalId') professionalId: string,
  ) {
    return this.ops.professionalSchedules(user, companyId, professionalId);
  }

  @Post('professionals/:professionalId/schedules')
  @RequirePermissions(PermissionKey.BusinessProfessionalEdit)
  replaceProfessionalSchedule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('companyId') companyId: string,
    @Param('professionalId') professionalId: string,
    @Body() body: Record<string, any>,
  ) {
    return this.ops.replaceProfessionalSchedule(user, companyId, professionalId, body);
  }

  @Get('commission-rules')
  @RequirePermissions(PermissionKey.FinanceCommissionManage)
  commissionRules(@CurrentUser() user: AuthenticatedUser, @Param('companyId') companyId: string) {
    return this.ops.commissionRules(user, companyId);
  }

  @Post('commission-rules')
  @RequirePermissions(PermissionKey.FinanceCommissionManage)
  createCommissionRule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('companyId') companyId: string,
    @Body() body: Record<string, any>,
  ) {
    return this.ops.createCommissionRule(user, companyId, body);
  }

  @Patch('commission-rules/:ruleId')
  @RequirePermissions(PermissionKey.FinanceCommissionManage)
  updateCommissionRule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('companyId') companyId: string,
    @Param('ruleId') ruleId: string,
    @Body() body: Record<string, any>,
  ) {
    return this.ops.updateCommissionRule(user, companyId, ruleId, body);
  }

  @Get('consent-forms')
  @RequirePermissions(PermissionKey.ComplianceView)
  consentForms(@CurrentUser() user: AuthenticatedUser, @Param('companyId') companyId: string) {
    return this.ops.consentForms(user, companyId);
  }

  @Post('consent-forms')
  @RequirePermissions(PermissionKey.ComplianceManage)
  createConsentForm(
    @CurrentUser() user: AuthenticatedUser,
    @Param('companyId') companyId: string,
    @Body() body: Record<string, any>,
  ) {
    return this.ops.createConsentForm(user, companyId, body);
  }

  @Patch('consent-forms/:formId')
  @RequirePermissions(PermissionKey.ComplianceManage)
  updateConsentForm(
    @CurrentUser() user: AuthenticatedUser,
    @Param('companyId') companyId: string,
    @Param('formId') formId: string,
    @Body() body: Record<string, any>,
  ) {
    return this.ops.updateConsentForm(user, companyId, formId, body);
  }

  @Get('services/:serviceId/structure')
  @RequirePermissions(PermissionKey.BusinessServiceView)
  serviceStructure(
    @CurrentUser() user: AuthenticatedUser,
    @Param('companyId') companyId: string,
    @Param('serviceId') serviceId: string,
  ) {
    return this.ops.serviceStructure(user, companyId, serviceId);
  }

  @Patch('services/:serviceId/dependencies')
  @RequirePermissions(PermissionKey.BusinessServiceEdit)
  replaceServiceDependencies(
    @CurrentUser() user: AuthenticatedUser,
    @Param('companyId') companyId: string,
    @Param('serviceId') serviceId: string,
    @Body() body: Record<string, any>,
  ) {
    return this.ops.replaceServiceDependencies(user, companyId, serviceId, body);
  }

  @Patch('services/:serviceId/stages')
  @RequirePermissions(PermissionKey.BusinessServiceEdit)
  replaceServiceStages(
    @CurrentUser() user: AuthenticatedUser,
    @Param('companyId') companyId: string,
    @Param('serviceId') serviceId: string,
    @Body() body: Record<string, any>,
  ) {
    return this.ops.replaceServiceStages(user, companyId, serviceId, body);
  }

  @Get('consent-form-templates')
  @RequirePermissions(PermissionKey.ComplianceView)
  consentFormTemplates(
    @CurrentUser() user: AuthenticatedUser,
    @Param('companyId') companyId: string,
  ) {
    return this.ops.consentFormTemplates(user, companyId);
  }

  @Post('consent-form-templates/:templateKey/instantiate')
  @RequirePermissions(PermissionKey.ComplianceManage)
  instantiateConsentFormTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('companyId') companyId: string,
    @Param('templateKey') templateKey: string,
    @Body() body: Record<string, any>,
  ) {
    return this.ops.createConsentFormFromTemplate(
      user,
      companyId,
      templateKey,
      body,
    );
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
