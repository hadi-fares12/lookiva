import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
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
import { PrismaService } from '../prisma/prisma.service';

function parseDate(value: string, label: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`${label} must be a valid ISO date`);
  }
  return date;
}

@Injectable()
export class RetentionV2Service {
  constructor(private readonly prisma: PrismaService) {}

  async getWallet(customerId: string) {
    return this.prisma.wallets.findUnique({
      where: { customer_id: customerId },
      include: { ledger: { orderBy: { created_at: 'desc' }, take: 100 } },
    });
  }

  async adjustWallet(dto: WalletAdjustDto) {
    return this.prisma.$transaction(async (tx) => {
      const wallet =
        (await tx.wallets.findUnique({ where: { customer_id: dto.customerId } })) ??
        (await tx.wallets.create({
          data: {
            customer_id: dto.customerId,
            currency_code: dto.currencyCode,
          },
        }));
      if (wallet.currency_code !== dto.currencyCode) {
        throw new ConflictException('Wallet currency does not match adjustment currency');
      }
      const nextBalance = wallet.balance_cents + dto.amountCents;
      if (nextBalance < 0) throw new ConflictException('Wallet balance cannot go negative');

      const updated = await tx.wallets.update({
        where: { id: wallet.id },
        data: {
          balance_cents: nextBalance,
          last_transaction_at: new Date(),
        },
      });
      await tx.wallet_ledger.create({
        data: {
          wallet_id: wallet.id,
          transaction_type: dto.transactionType,
          amount_cents: dto.amountCents,
          balance_after_cents: nextBalance,
          currency_code: dto.currencyCode,
          description: dto.description ?? null,
        },
      });
      return updated;
    });
  }

  async getLoyalty(customerId: string) {
    return this.prisma.loyalty_accounts.findUnique({
      where: { customer_id: customerId },
      include: { ledger: { orderBy: { created_at: 'desc' }, take: 100 } },
    });
  }

  async adjustLoyalty(dto: LoyaltyAdjustDto) {
    return this.prisma.$transaction(async (tx) => {
      const account =
        (await tx.loyalty_accounts.findUnique({ where: { customer_id: dto.customerId } })) ??
        (await tx.loyalty_accounts.create({ data: { customer_id: dto.customerId } }));
      const nextBalance = account.points_balance + dto.points;
      if (nextBalance < 0) throw new ConflictException('Loyalty balance cannot go negative');
      const updated = await tx.loyalty_accounts.update({
        where: { id: account.id },
        data: {
          points_balance: nextBalance,
          total_points: dto.points > 0 ? { increment: dto.points } : undefined,
          points_spent: dto.points < 0 ? { increment: Math.abs(dto.points) } : undefined,
          last_activity_at: new Date(),
        },
      });
      await tx.loyalty_ledger.create({
        data: {
          loyalty_account_id: account.id,
          transaction_type: dto.transactionType,
          points_change: dto.points,
          balance_after: nextBalance,
          description: dto.description ?? null,
        },
      });
      return updated;
    });
  }

  listPromotions(companyId?: string) {
    return this.prisma.promotions.findMany({
      where: { ...(companyId ? { company_id: companyId } : {}), is_active: true },
      include: { rules: true },
      orderBy: { starts_at: 'desc' },
    });
  }

  createPromotion(dto: CreatePromotionDto) {
    return this.prisma.promotions.create({
      data: {
        company_id: dto.companyId,
        branch_id: dto.branchId ?? null,
        code: dto.code ?? null,
        name: dto.name,
        promotion_type: dto.promotionType,
        value_percent: dto.valuePercent ?? null,
        value_fixed: dto.valueFixed ?? null,
        starts_at: parseDate(dto.startsAt, 'startsAt'),
        ends_at: dto.endsAt ? parseDate(dto.endsAt, 'endsAt') : null,
      },
    });
  }

  createCoupon(dto: CreateCouponDto) {
    return this.prisma.coupons.create({
      data: {
        company_id: dto.companyId,
        promotion_id: dto.promotionId ?? null,
        code: dto.code.trim().toUpperCase(),
        name: dto.name,
        discount_type: dto.discountType,
        discount_percent: dto.discountPercent ?? null,
        discount_fixed: dto.discountFixed ?? null,
        minimum_order_amount: 0,
        valid_from: parseDate(dto.validFrom, 'validFrom'),
        valid_until: dto.validUntil ? parseDate(dto.validUntil, 'validUntil') : null,
      },
    });
  }

  async useCoupon(code: string, dto: UseCouponDto) {
    return this.prisma.$transaction(async (tx) => {
      const coupon = await tx.coupons.findUnique({
        where: { code: code.trim().toUpperCase() },
      });
      if (!coupon || !coupon.is_active) throw new NotFoundException('Coupon not found');
      const now = new Date();
      if (coupon.valid_from > now || (coupon.valid_until && coupon.valid_until < now)) {
        throw new ConflictException('Coupon is not currently valid');
      }
      if (coupon.max_uses_total) {
        const useCount = await tx.coupon_usage.count({ where: { coupon_id: coupon.id } });
        if (useCount >= coupon.max_uses_total) {
          throw new ConflictException('Coupon usage limit reached');
        }
      }
      return tx.coupon_usage.create({
        data: {
          coupon_id: coupon.id,
          user_id: dto.userId,
          company_id: dto.companyId,
          promotion_id: coupon.promotion_id,
          amount_saved: dto.amountSaved,
        },
      });
    });
  }

  listPackages(companyId?: string) {
    return this.prisma.packages.findMany({
      where: { ...(companyId ? { company_id: companyId } : {}), is_active: true },
      orderBy: { created_at: 'desc' },
    });
  }

  createPackage(dto: CreatePackageDto) {
    return this.prisma.packages.create({
      data: {
        company_id: dto.companyId,
        name: dto.name,
        service_ids: dto.serviceIds,
        total_sessions_count: dto.totalSessionsCount,
        price: dto.price,
        currency_code: dto.currencyCode,
      },
    });
  }

  async purchasePackage(dto: PurchasePackageDto) {
    return this.prisma.$transaction(async (tx) => {
      const pack = await tx.packages.findUnique({ where: { id: dto.packageId } });
      if (!pack || !pack.is_active) throw new NotFoundException('Package not found');
      return tx.package_purchases.create({
        data: {
          package_id: pack.id,
          customer_id: dto.customerId,
          payment_id: dto.paymentId ?? null,
          sessions_purchased: pack.total_sessions_count,
          sessions_remaining: pack.total_sessions_count,
          price_paid: pack.price,
          currency_code: pack.currency_code,
          expires_at: pack.validity_days
            ? new Date(Date.now() + pack.validity_days * 86_400_000)
            : null,
        },
      });
    });
  }

  async usePackage(dto: UsePackageDto) {
    return this.prisma.$transaction(async (tx) => {
      const purchase = await tx.package_purchases.findUnique({
        where: { id: dto.packagePurchaseId },
      });
      if (!purchase || purchase.status !== 'active') {
        throw new NotFoundException('Active package purchase not found');
      }
      if (purchase.sessions_remaining < 1) {
        throw new ConflictException('No sessions remaining');
      }
      await tx.package_purchases.update({
        where: { id: purchase.id },
        data: {
          sessions_remaining: { decrement: 1 },
          status: purchase.sessions_remaining - 1 <= 0 ? 'used' : 'active',
        },
      });
      return tx.package_usage.create({
        data: {
          package_purchase_id: purchase.id,
          appointment_id: dto.appointmentId ?? null,
          service_id: dto.serviceId,
          sessions_used: 1,
        },
      });
    });
  }

  listMemberships(companyId?: string) {
    return this.prisma.memberships.findMany({
      where: { ...(companyId ? { company_id: companyId } : {}), is_active: true },
      orderBy: { created_at: 'desc' },
    });
  }

  createMembership(dto: CreateMembershipDto) {
    return this.prisma.memberships.create({
      data: {
        company_id: dto.companyId,
        name: dto.name,
        price_monthly: dto.priceMonthly,
        price_yearly: dto.priceYearly,
        currency_code: dto.currencyCode,
      },
    });
  }

  async subscribeMembership(dto: SubscribeMembershipDto) {
    const membership = await this.prisma.memberships.findUnique({
      where: { id: dto.membershipId },
    });
    if (!membership || !membership.is_active) {
      throw new NotFoundException('Membership not found');
    }
    const price =
      dto.billingCycle === 'yearly' ? membership.price_yearly : membership.price_monthly;
    return this.prisma.membership_subscriptions.create({
      data: {
        membership_id: membership.id,
        customer_id: dto.customerId,
        billing_cycle: dto.billingCycle,
        price_per_cycle: price,
        currency_code: membership.currency_code,
        current_period_end: new Date(
          Date.now() + (dto.billingCycle === 'yearly' ? 365 : 30) * 86_400_000,
        ),
      },
    });
  }

  async createGiftCard(dto: CreateGiftCardDto) {
    return this.prisma.$transaction(async (tx) => {
      const giftCard = await tx.gift_cards.create({
        data: {
          company_id: dto.companyId ?? null,
          code: `GC-${randomUUID().slice(0, 8).toUpperCase()}`,
          recipient_email: dto.recipientEmail ?? null,
          message: dto.message ?? null,
          initial_amount: dto.initialAmount,
          currency_code: dto.currencyCode,
        },
      });
      await tx.gift_card_ledger.create({
        data: {
          gift_card_id: giftCard.id,
          transaction_type: 'issue',
          amount: dto.initialAmount,
          balance_after: dto.initialAmount,
          currency_code: dto.currencyCode,
          description: 'Gift card issued',
        },
      });
      return giftCard;
    });
  }

  async redeemGiftCard(dto: RedeemGiftCardDto) {
    return this.prisma.$transaction(async (tx) => {
      const giftCard = await tx.gift_cards.findUnique({ where: { code: dto.code } });
      if (!giftCard || !giftCard.is_active) throw new NotFoundException('Gift card not found');
      const ledger = await tx.gift_card_ledger.findMany({
        where: { gift_card_id: giftCard.id },
      });
      const balance = ledger.reduce((sum, entry) => sum + entry.amount, 0);
      if (balance < dto.amount) throw new ConflictException('Insufficient gift card balance');
      return tx.gift_card_ledger.create({
        data: {
          gift_card_id: giftCard.id,
          transaction_type: 'redeem',
          amount: -dto.amount,
          balance_after: balance - dto.amount,
          currency_code: giftCard.currency_code,
          wallet_id: dto.walletId ?? null,
          description: 'Gift card redeemed',
        },
      });
    });
  }

  createReferral(dto: CreateReferralDto) {
    return this.prisma.referrals.create({
      data: {
        referrer_user_id: dto.referrerUserId,
        referred_user_id: dto.referredUserId,
        referral_code_used: dto.referralCodeUsed,
      },
    });
  }

  qualifyReferral(id: string, dto: QualifyReferralDto) {
    return this.prisma.referrals.update({
      where: { id },
      data: {
        status: 'qualified',
        qualifying_event_type: dto.qualifyingEventType,
        qualifying_event_id: dto.qualifyingEventId,
        qualified_at: new Date(),
        reward_type: dto.rewardType ?? null,
        reward_amount: dto.rewardAmount ?? null,
        reward_points: dto.rewardPoints ?? null,
        reward_granted_at: dto.grantRewardNow ? new Date() : null,
      },
    });
  }
}
