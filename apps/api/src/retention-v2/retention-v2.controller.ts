import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionKey } from '@lookiva/shared-types';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { RetentionV2Service } from './retention-v2.service';
import {
  CreateCouponDto,
  CreateGiftCardDto,
  CreateMembershipDto,
  CreatePackageDto,
  CreatePromotionDto,
  CreateReferralDto,
  LoyaltyAdjustDto,
  PurchasePackageDto,
  QualifyReferralDto,
  RedeemGiftCardDto,
  SubscribeMembershipDto,
  UseCouponDto,
  UsePackageDto,
  WalletAdjustDto,
} from './dto/retention-v2.dto';

@ApiTags('Retention V2')
@ApiBearerAuth()
@Controller('retention-v2')
export class RetentionV2Controller {
  constructor(private readonly retention: RetentionV2Service) {}

  @Get('wallets/:customerId')
  @RequirePermissions(PermissionKey.WalletView)
  wallet(@Param('customerId') customerId: string) {
    return this.retention.getWallet(customerId);
  }

  @Post('wallets/adjust')
  @RequirePermissions(PermissionKey.WalletManage)
  adjustWallet(@Body() dto: WalletAdjustDto) {
    return this.retention.adjustWallet(dto);
  }

  @Get('loyalty/:customerId')
  @RequirePermissions(PermissionKey.LoyaltyView)
  loyalty(@Param('customerId') customerId: string) {
    return this.retention.getLoyalty(customerId);
  }

  @Post('loyalty/adjust')
  @RequirePermissions(PermissionKey.LoyaltyManage)
  adjustLoyalty(@Body() dto: LoyaltyAdjustDto) {
    return this.retention.adjustLoyalty(dto);
  }

  @Get('promotions')
  @RequirePermissions(PermissionKey.PromotionsView)
  promotions(@Query('companyId') companyId?: string) {
    return this.retention.listPromotions(companyId);
  }

  @Post('promotions')
  @RequirePermissions(PermissionKey.PromotionsManage)
  createPromotion(@Body() dto: CreatePromotionDto) {
    return this.retention.createPromotion(dto);
  }

  @Post('coupons')
  @RequirePermissions(PermissionKey.PromotionsManage)
  createCoupon(@Body() dto: CreateCouponDto) {
    return this.retention.createCoupon(dto);
  }

  @Post('coupons/:code/use')
  @RequirePermissions(PermissionKey.PromotionsView)
  useCoupon(@Param('code') code: string, @Body() dto: UseCouponDto) {
    return this.retention.useCoupon(code, dto);
  }

  @Get('packages')
  @RequirePermissions(PermissionKey.PackagesView)
  packages(@Query('companyId') companyId?: string) {
    return this.retention.listPackages(companyId);
  }

  @Post('packages')
  @RequirePermissions(PermissionKey.PackagesManage)
  createPackage(@Body() dto: CreatePackageDto) {
    return this.retention.createPackage(dto);
  }

  @Post('packages/purchase')
  @RequirePermissions(PermissionKey.PackagesManage)
  purchasePackage(@Body() dto: PurchasePackageDto) {
    return this.retention.purchasePackage(dto);
  }

  @Post('packages/use')
  @RequirePermissions(PermissionKey.PackagesManage)
  usePackage(@Body() dto: UsePackageDto) {
    return this.retention.usePackage(dto);
  }

  @Get('memberships')
  @RequirePermissions(PermissionKey.MembershipsView)
  memberships(@Query('companyId') companyId?: string) {
    return this.retention.listMemberships(companyId);
  }

  @Post('memberships')
  @RequirePermissions(PermissionKey.MembershipsManage)
  createMembership(@Body() dto: CreateMembershipDto) {
    return this.retention.createMembership(dto);
  }

  @Post('memberships/subscribe')
  @RequirePermissions(PermissionKey.MembershipsManage)
  subscribeMembership(@Body() dto: SubscribeMembershipDto) {
    return this.retention.subscribeMembership(dto);
  }

  @Post('gift-cards')
  @RequirePermissions(PermissionKey.GiftCardsManage)
  createGiftCard(@Body() dto: CreateGiftCardDto) {
    return this.retention.createGiftCard(dto);
  }

  @Post('gift-cards/redeem')
  @RequirePermissions(PermissionKey.GiftCardsManage)
  redeemGiftCard(@Body() dto: RedeemGiftCardDto) {
    return this.retention.redeemGiftCard(dto);
  }

  @Post('referrals')
  @RequirePermissions(PermissionKey.ReferralsManage)
  createReferral(@Body() dto: CreateReferralDto) {
    return this.retention.createReferral(dto);
  }

  @Post('referrals/:id/qualify')
  @RequirePermissions(PermissionKey.ReferralsManage)
  qualifyReferral(@Param('id') id: string, @Body() dto: QualifyReferralDto) {
    return this.retention.qualifyReferral(id, dto);
  }
}
