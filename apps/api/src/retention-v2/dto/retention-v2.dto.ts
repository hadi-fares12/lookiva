import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class WalletAdjustDto {
  @IsString()
  customerId!: string;

  @IsString()
  currencyCode!: string;

  @IsInt()
  amountCents!: number;

  @IsString()
  transactionType!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class LoyaltyAdjustDto {
  @IsString()
  customerId!: string;

  @IsInt()
  points!: number;

  @IsString()
  transactionType!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreatePromotionDto {
  @IsString()
  companyId!: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsString()
  name!: string;

  @IsString()
  promotionType!: string;

  @IsOptional()
  @IsNumber()
  valuePercent?: number;

  @IsOptional()
  @IsNumber()
  valueFixed?: number;

  @IsDateString()
  startsAt!: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;
}

export class CreateCouponDto {
  @IsString()
  companyId!: string;

  @IsOptional()
  @IsString()
  promotionId?: string;

  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsString()
  discountType!: string;

  @IsOptional()
  @IsNumber()
  discountPercent?: number;

  @IsOptional()
  @IsNumber()
  discountFixed?: number;

  @IsDateString()
  validFrom!: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;
}

export class UseCouponDto {
  @IsString()
  userId!: string;

  @IsString()
  companyId!: string;

  @IsNumber()
  @Min(0)
  amountSaved!: number;
}

export class CreatePackageDto {
  @IsString()
  companyId!: string;

  @IsString()
  name!: string;

  @IsArray()
  @IsString({ each: true })
  serviceIds!: string[];

  @IsInt()
  @Min(1)
  totalSessionsCount!: number;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsString()
  currencyCode!: string;
}

export class PurchasePackageDto {
  @IsString()
  packageId!: string;

  @IsString()
  customerId!: string;

  @IsOptional()
  @IsString()
  paymentId?: string;
}

export class UsePackageDto {
  @IsString()
  packagePurchaseId!: string;

  @IsString()
  serviceId!: string;

  @IsOptional()
  @IsString()
  appointmentId?: string;
}

export class CreateMembershipDto {
  @IsString()
  companyId!: string;

  @IsString()
  name!: string;

  @IsNumber()
  @Min(0)
  priceMonthly!: number;

  @IsNumber()
  @Min(0)
  priceYearly!: number;

  @IsString()
  currencyCode!: string;
}

export class SubscribeMembershipDto {
  @IsString()
  membershipId!: string;

  @IsString()
  customerId!: string;

  @IsString()
  billingCycle!: string;
}

export class CreateGiftCardDto {
  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsString()
  recipientEmail?: string;

  @IsNumber()
  @Min(0.01)
  initialAmount!: number;

  @IsString()
  currencyCode!: string;

  @IsOptional()
  @IsString()
  message?: string;
}

export class RedeemGiftCardDto {
  @IsString()
  code!: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  walletId?: string;
}

export class CreateReferralDto {
  @IsString()
  referrerUserId!: string;

  @IsString()
  referredUserId!: string;

  @IsString()
  referralCodeUsed!: string;
}

export class QualifyReferralDto {
  @IsString()
  qualifyingEventType!: string;

  @IsString()
  qualifyingEventId!: string;

  @IsOptional()
  @IsString()
  rewardType?: string;

  @IsOptional()
  @IsNumber()
  rewardAmount?: number;

  @IsOptional()
  @IsInt()
  rewardPoints?: number;

  @IsOptional()
  @IsBoolean()
  grantRewardNow?: boolean;
}
