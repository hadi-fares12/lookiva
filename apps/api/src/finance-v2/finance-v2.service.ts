import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ScopeType, UserRole } from '@lookiva/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/types/request-with-user';
import { PaymentProviderService } from './payment-provider.service';
import { calculateFinancialMetrics } from '../common/finance/financial-metrics';
import {
  CreatePaymentDto,
  CreatePayoutDto,
  RefundPaymentDto,
  TaxPreviewDto,
  PaymentWebhookDto,
} from './dto/finance-v2.dto';

type CurrencyTotals = {
  currencyCode: string;
  booked: number;
  completed: number;
  collected: number;
  cash: number;
  refunded: number;
  outstanding: number;
  ledgerCredits: number;
  ledgerDebits: number;
};

function parseDate(value: string, label: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`${label} must be a valid ISO date`);
  }
  return date;
}

function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

@Injectable()
export class FinanceV2Service {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentProvider: PaymentProviderService,
  ) {}

  private hasPlatformRole(user: AuthenticatedUser) {
    return user.roleScopes.some((scope) =>
      [UserRole.SuperAdmin, UserRole.PlatformAdmin, UserRole.CountryManager].includes(scope.roleKey),
    );
  }

  private hasBusinessScope(user: AuthenticatedUser, companyId: string, branchId?: string | null) {
    if (this.hasPlatformRole(user)) return true;
    return user.roleScopes.some((scope) => {
      if (scope.scopeType === ScopeType.Company) {
        return scope.companyId === companyId || scope.scopeId === companyId;
      }
      if (scope.scopeType === ScopeType.Branch) {
        if (!branchId) return false;
        return scope.branchId === branchId || scope.scopeId === branchId;
      }
      return false;
    });
  }

  private assertBusinessScope(user: AuthenticatedUser, companyId: string, branchId?: string | null) {
    if (!this.hasBusinessScope(user, companyId, branchId)) {
      throw new ForbiddenException('This account is not authorized for the requested business scope');
    }
  }

  async createPayment(user: AuthenticatedUser, dto: CreatePaymentDto) {
    return this.prisma.$transaction(async (tx) => {
      const company = await tx.companies.findUnique({ where: { id: dto.companyId } });
      if (!company) throw new NotFoundException('Company not found');

      const customerId = dto.customerId ?? (await this.findCustomerId(user.id));
      const customer = await tx.customers.findUnique({ where: { id: customerId } });
      if (!customer) throw new NotFoundException('Customer not found');

      const appointment = dto.appointmentId
        ? await tx.appointments.findUnique({
            where: { id: dto.appointmentId },
            include: {
              financial_snapshot: true,
              participants: { include: { professional: true } },
              services: true,
            },
          })
        : null;
      if (dto.appointmentId && !appointment) {
        throw new NotFoundException('Appointment not found');
      }
      if (appointment && appointment.company_id !== dto.companyId) {
        throw new BadRequestException('Appointment does not belong to company');
      }

      const businessScoped = this.hasBusinessScope(user, dto.companyId, appointment?.branch_id ?? null);
      if (appointment) {
        const ownsAppointment = appointment.customer_user_id === user.id;
        if (!ownsAppointment && !businessScoped) {
          throw new ForbiddenException('Customers may only pay their own appointments');
        }
        if (appointment.customer_id && customerId !== appointment.customer_id && !businessScoped) {
          throw new ForbiddenException('Payment customer does not match the appointment customer');
        }
      } else if (!businessScoped) {
        throw new ForbiddenException('Standalone business payments require business authorization');
      }

      if (dto.customerId && customer.user_id !== user.id && !businessScoped) {
        throw new ForbiddenException('Customers may only create payments for their own profile');
      }
      if (dto.paymentMethod === 'cash' && !businessScoped) {
        throw new ForbiddenException('Cash collection must be recorded by authorized business staff');
      }
      if (dto.status && !businessScoped) {
        throw new ForbiddenException('Customers cannot override payment status');
      }
      if (dto.paymentMethod === 'test_card' && process.env.NODE_ENV === 'production') {
        throw new BadRequestException('test_card is disabled in production');
      }
      if (dto.paymentMethod === 'card_terminal') {
        if (!businessScoped) throw new ForbiddenException('Card terminal payments must be recorded by authorized business staff');
        if (!dto.externalTransactionId && !dto.referenceCode) {
          throw new BadRequestException('Card terminal payments require a terminal/reference transaction id');
        }
      }
      const locallyCapturedMethods = new Set(['cash', 'wallet', 'gift_card', 'card_terminal']);
      const isExternalOnlineMethod = !locallyCapturedMethods.has(dto.paymentMethod) && dto.paymentMethod !== 'test_card';
      if (isExternalOnlineMethod && !dto.idempotencyKey) {
        throw new BadRequestException('Online payments require an idempotencyKey');
      }
      if (process.env.NODE_ENV === 'production' && isExternalOnlineMethod && !this.paymentProvider.isOnlineEnabled()) {
        throw new BadRequestException('Online payments are disabled for this deployment');
      }

      if (appointment?.financial_snapshot) {
        if (appointment.financial_snapshot.currency_code !== dto.currencyCode) {
          throw new BadRequestException('Payment currency does not match the booking currency');
        }
        const priorPayments = await tx.payments.findMany({
          where: {
            appointment_id: appointment.id,
            status: { in: ['succeeded', 'partially_refunded', 'refunded'] },
          },
          select: {
            amount: true,
            refunds: { where: { status: 'succeeded' }, select: { amount: true } },
          },
        });
        const alreadyCollected = priorPayments.reduce(
          (sum, item) => sum + Math.max(0, item.amount - item.refunds.reduce((refundSum, refund) => refundSum + refund.amount, 0)),
          0,
        );
        const remainingServiceAmount = Math.max(0, appointment.financial_snapshot.grand_total - alreadyCollected);
        if (dto.amount > remainingServiceAmount + 0.009) {
          throw new ConflictException(`Payment exceeds remaining booking amount (${money(remainingServiceAmount)} ${dto.currencyCode})`);
        }
      }

      const storedValueAmount = money(dto.amount + (dto.tipAmount ?? 0));
      let walletForDebit: { id: string; balance_cents: number; currency_code: string } | null = null;
      let giftCardForDebit: { id: string; currency_code: string; balance: number } | null = null;

      if (dto.paymentMethod === 'wallet') {
        const wallet = await tx.wallets.findUnique({ where: { customer_id: customerId } });
        if (!wallet || !wallet.is_active) throw new ConflictException('Wallet is not active');
        if (wallet.currency_code !== dto.currencyCode) throw new ConflictException('Wallet currency does not match payment currency');
        const requiredCents = Math.round(storedValueAmount * 100);
        if (wallet.balance_cents < requiredCents) throw new ConflictException('Insufficient wallet balance');
        walletForDebit = { id: wallet.id, balance_cents: wallet.balance_cents, currency_code: wallet.currency_code };
      }

      if (dto.paymentMethod === 'gift_card') {
        if (!dto.referenceCode) throw new BadRequestException('Gift card code is required as referenceCode');
        const giftCard = await tx.gift_cards.findUnique({ where: { code: dto.referenceCode.trim().toUpperCase() } });
        if (!giftCard || !giftCard.is_active) throw new NotFoundException('Gift card not found');
        if (giftCard.company_id && giftCard.company_id !== dto.companyId) throw new ForbiddenException('Gift card is not valid for this business');
        if (giftCard.expires_at && giftCard.expires_at < new Date()) throw new ConflictException('Gift card has expired');
        if (giftCard.currency_code !== dto.currencyCode) throw new ConflictException('Gift card currency does not match payment currency');
        const ledger = await tx.gift_card_ledger.findMany({ where: { gift_card_id: giftCard.id }, select: { amount: true } });
        const balance = money(ledger.reduce((sum, entry) => sum + entry.amount, 0));
        if (balance + 0.009 < storedValueAmount) throw new ConflictException('Insufficient gift card balance');
        giftCardForDebit = { id: giftCard.id, currency_code: giftCard.currency_code, balance };
      }

      const providerCapture = isExternalOnlineMethod
        ? await this.paymentProvider.capture({
            idempotencyKey: dto.idempotencyKey!,
            amount: dto.amount,
            currencyCode: dto.currencyCode,
            companyId: dto.companyId,
            customerId,
            appointmentId: dto.appointmentId ?? null,
            paymentMethod: dto.paymentMethod,
          })
        : null;

      const instantMethods = ['cash', 'wallet', 'gift_card', 'card_terminal', 'test_card'];
      const derivedStatus = providerCapture?.status ?? (instantMethods.includes(dto.paymentMethod) ? 'succeeded' : 'pending');
      const status = process.env.NODE_ENV === 'production' || providerCapture ? derivedStatus : (dto.status ?? derivedStatus);
      const now = new Date();

      const payment = await tx.payments.create({
        data: {
          company_id: dto.companyId,
          appointment_id: dto.appointmentId ?? null,
          customer_id: customerId,
          payment_method: dto.paymentMethod,
          currency_code: dto.currencyCode,
          amount: dto.amount,
          tip_amount: dto.tipAmount ?? 0,
          deposit_amount: dto.depositAmount ?? 0,
          reference_code: dto.referenceCode ?? dto.idempotencyKey ?? null,
          external_transaction_id: providerCapture?.externalTransactionId ?? dto.externalTransactionId ?? null,
          status,
          paid_at: status === 'succeeded' ? now : null,
          captured_at: status === 'succeeded' ? now : null,
          gateway_response: {
            provider: this.providerFor(dto.paymentMethod),
            mode: dto.paymentMethod === 'test_card' ? 'local_test' : (['cash', 'wallet', 'gift_card', 'card_terminal'].includes(dto.paymentMethod) ? 'local' : 'external'),
            status,
            checkoutUrl: providerCapture?.checkoutUrl ?? null,
            providerResponse: providerCapture?.raw ?? null,
          } as Prisma.InputJsonValue,
          processed_by_user_id: user.id,
          notes: dto.notes ?? null,
        },
      });

      await tx.payment_transactions.create({
        data: {
          payment_id: payment.id,
          transaction_type: 'capture',
          gateway: this.providerFor(dto.paymentMethod),
          amount: dto.amount,
          currency_code: dto.currencyCode,
          external_reference: providerCapture?.externalTransactionId ?? dto.externalTransactionId ?? dto.referenceCode ?? dto.idempotencyKey ?? payment.id,
          status,
          processed_at: status === 'succeeded' ? now : null,
          raw_response: payment.gateway_response ?? undefined,
        },
      });

      if (status === 'succeeded' && walletForDebit) {
        const debitCents = Math.round(storedValueAmount * 100);
        const nextBalance = walletForDebit.balance_cents - debitCents;
        await tx.wallets.update({
          where: { id: walletForDebit.id },
          data: { balance_cents: nextBalance, last_transaction_at: now },
        });
        await tx.wallet_ledger.create({
          data: {
            wallet_id: walletForDebit.id,
            payment_id: payment.id,
            transaction_type: 'payment',
            amount_cents: -debitCents,
            balance_after_cents: nextBalance,
            currency_code: walletForDebit.currency_code,
            description: `Payment ${payment.reference_code ?? payment.id}`,
            reference_id: payment.id,
            reference_type: 'payment',
          },
        });
      }

      if (status === 'succeeded' && giftCardForDebit) {
        const nextBalance = money(giftCardForDebit.balance - storedValueAmount);
        await tx.gift_card_ledger.create({
          data: {
            gift_card_id: giftCardForDebit.id,
            transaction_type: 'payment',
            amount: -storedValueAmount,
            balance_after: nextBalance,
            currency_code: giftCardForDebit.currency_code,
            description: `Payment ${payment.reference_code ?? payment.id}`,
            reference_id: payment.id,
            reference_type: 'payment',
          },
        });
      }

      if (status === 'succeeded') {
        await this.writePaymentLedger(tx, user.id, payment, appointment);
        await this.calculateCommissions(tx, payment, appointment);
        // Payment capture must never advance the service lifecycle. A checked-in
        // customer is not completed until staff explicitly completes the appointment.
      }

      return tx.payments.findUnique({
        where: { id: payment.id },
        include: {
          transactions: true,
          ledger_entries: true,
          commissions: true,
        },
      });
    });
  }

  async refundPayment(
    user: AuthenticatedUser,
    paymentId: string,
    dto: RefundPaymentDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payments.findUnique({
        where: { id: paymentId },
        include: { refunds: true, appointment: { select: { branch_id: true } } },
      });
      if (!payment) throw new NotFoundException('Payment not found');
      this.assertBusinessScope(user, payment.company_id, payment.appointment?.branch_id ?? null);
      if (!['succeeded', 'partially_refunded'].includes(payment.status)) {
        throw new ConflictException('Only succeeded payments can be refunded');
      }
      const isExternalProviderPayment = !['cash', 'wallet', 'gift_card', 'card_terminal', 'test_card'].includes(payment.payment_method);

      const alreadyRefunded = payment.refunds
        .filter((refund) => refund.status === 'succeeded')
        .reduce((sum, refund) => sum + refund.amount, 0);
      if (alreadyRefunded + dto.amount > payment.amount) {
        throw new BadRequestException('Refund exceeds captured payment amount');
      }

      const providerRefund = isExternalProviderPayment
        ? await this.paymentProvider.refund({
            externalTransactionId: payment.external_transaction_id ?? '',
            amount: dto.amount,
            currencyCode: payment.currency_code,
            reason: dto.reason,
            idempotencyKey: `${payment.id}:refund:${money(alreadyRefunded + dto.amount)}`,
          })
        : null;
      if (providerRefund && providerRefund.status !== 'succeeded') {
        throw new ConflictException(`Payment provider refund is ${providerRefund.status}; financial ledger was not changed`);
      }

      const now = new Date();
      const refund = await tx.refunds.create({
        data: {
          payment_id: payment.id,
          company_id: payment.company_id,
          customer_id: payment.customer_id,
          amount: dto.amount,
          currency_code: payment.currency_code,
          reason: dto.reason,
          refund_method: dto.refundMethod ?? payment.payment_method,
          status: 'succeeded',
          external_reference: providerRefund?.externalTransactionId ?? `refund_${payment.id}_${Date.now()}`,
          processed_at: now,
          processed_by_user_id: user.id,
          notes: dto.notes ?? null,
        },
      });

      await tx.payment_transactions.create({
        data: {
          payment_id: payment.id,
          transaction_type: 'refund',
          gateway: this.providerFor(payment.payment_method),
          amount: dto.amount,
          currency_code: payment.currency_code,
          external_reference: refund.external_reference,
          status: 'succeeded',
          processed_at: now,
        },
      });

      await tx.financial_ledger.create({
        data: {
          company_id: payment.company_id,
          payment_id: payment.id,
          appointment_id: payment.appointment_id ?? null,
          entry_type: 'refund',
          debit_amount: dto.amount,
          credit_amount: 0,
          currency_code: payment.currency_code,
          category: 'refunds',
          subcategory: dto.refundMethod ?? payment.payment_method,
          description: dto.reason,
          reference_id: refund.id,
          reference_type: 'refund',
          transaction_date: now,
          created_by_id: user.id,
        },
      });

      const refundMethod = dto.refundMethod ?? payment.payment_method;
      if (refundMethod === 'wallet') {
        const wallet = await tx.wallets.findUnique({ where: { customer_id: payment.customer_id } });
        if (!wallet || !wallet.is_active || wallet.currency_code !== payment.currency_code) {
          throw new ConflictException('Customer wallet cannot receive this refund');
        }
        const creditCents = Math.round(dto.amount * 100);
        const nextBalance = wallet.balance_cents + creditCents;
        await tx.wallets.update({ where: { id: wallet.id }, data: { balance_cents: nextBalance, last_transaction_at: now } });
        await tx.wallet_ledger.create({
          data: {
            wallet_id: wallet.id,
            payment_id: payment.id,
            transaction_type: 'refund',
            amount_cents: creditCents,
            balance_after_cents: nextBalance,
            currency_code: wallet.currency_code,
            description: dto.reason,
            reference_id: refund.id,
            reference_type: 'refund',
          },
        });
      }

      if (refundMethod === 'gift_card') {
        if (!payment.reference_code) throw new ConflictException('Original gift card reference is missing');
        const giftCard = await tx.gift_cards.findUnique({ where: { code: payment.reference_code } });
        if (!giftCard || !giftCard.is_active || giftCard.currency_code !== payment.currency_code) {
          throw new ConflictException('Original gift card cannot receive this refund');
        }
        const giftLedger = await tx.gift_card_ledger.findMany({ where: { gift_card_id: giftCard.id }, select: { amount: true } });
        const balance = money(giftLedger.reduce((sum, entry) => sum + entry.amount, 0));
        await tx.gift_card_ledger.create({
          data: {
            gift_card_id: giftCard.id,
            transaction_type: 'refund',
            amount: dto.amount,
            balance_after: money(balance + dto.amount),
            currency_code: giftCard.currency_code,
            description: dto.reason,
            reference_id: refund.id,
            reference_type: 'refund',
          },
        });
      }

      const fullyRefunded = alreadyRefunded + dto.amount >= payment.amount;
      await tx.payments.update({
        where: { id: payment.id },
        data: {
          status: fullyRefunded ? 'refunded' : 'partially_refunded',
          refunded_at: fullyRefunded ? now : payment.refunded_at,
        },
      });

      return refund;
    });
  }

  async processPaymentWebhook(
    rawBody: Buffer | undefined,
    signature: string | undefined,
    dto: PaymentWebhookDto,
  ) {
    this.paymentProvider.verifyWebhook(rawBody, signature);

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payments.findFirst({
        where: { external_transaction_id: dto.externalTransactionId },
        include: {
          appointment: {
            include: {
              financial_snapshot: true,
              participants: { include: { professional: true } },
              services: true,
            },
          },
          ledger_entries: true,
          commissions: true,
        },
      });

      // Return a successful acknowledgement for a validly signed but unknown
      // transaction. This avoids a provider retry storm while revealing no
      // customer/payment information to the caller.
      if (!payment) {
        return { received: true, ignored: true, reason: 'unknown_transaction' };
      }

      if (payment.external_transaction_id !== dto.externalTransactionId) {
        throw new ConflictException('Payment provider transaction mismatch');
      }

      if (payment.status === dto.status) {
        return { received: true, duplicate: true, paymentId: payment.id, status: payment.status };
      }

      // A successfully captured payment is final for capture purposes. Refunds
      // are represented by separate refund records and must never be simulated
      // by a later "failed" capture webhook.
      if (['succeeded', 'partially_refunded', 'refunded'].includes(payment.status)) {
        return { received: true, ignored: true, paymentId: payment.id, status: payment.status };
      }

      const now = new Date();
      const nextStatus = dto.status;
      const updateData: Prisma.paymentsUpdateInput = {
        status: nextStatus,
        ...(nextStatus === 'succeeded'
          ? { paid_at: payment.paid_at ?? now, captured_at: payment.captured_at ?? now, failure_reason: null }
          : {}),
        ...(nextStatus === 'failed'
          ? { failure_reason: 'Payment provider reported failure' }
          : {}),
      };

      const updated = await tx.payments.update({
        where: { id: payment.id },
        data: updateData,
      });

      const captureTransaction = await tx.payment_transactions.findFirst({
        where: { payment_id: payment.id, transaction_type: 'capture' },
        orderBy: { created_at: 'asc' },
      });
      if (captureTransaction) {
        await tx.payment_transactions.update({
          where: { id: captureTransaction.id },
          data: {
            status: nextStatus,
            processed_at: nextStatus === 'succeeded' || nextStatus === 'failed' ? now : null,
          },
        });
      }

      if (nextStatus === 'succeeded') {
        const existingPaymentLedger = await tx.financial_ledger.findFirst({
          where: {
            payment_id: payment.id,
            entry_type: 'payment',
            reference_type: 'payment',
            reference_id: payment.id,
          },
        });
        if (!existingPaymentLedger) {
          await this.writePaymentLedger(tx, null, updated, payment.appointment);
        }

        const existingCommissionCount = await tx.commissions.count({
          where: { payment_id: payment.id },
        });
        if (existingCommissionCount === 0) {
          await this.calculateCommissions(tx, updated, payment.appointment);
        }
      }

      return {
        received: true,
        paymentId: payment.id,
        status: nextStatus,
      };
    });
  }

  async getLedger(user: AuthenticatedUser, companyId: string, currencyCode?: string) {
    this.assertBusinessScope(user, companyId);
    return this.prisma.financial_ledger.findMany({
      where: {
        company_id: companyId,
        ...(currencyCode ? { currency_code: currencyCode } : {}),
      },
      orderBy: { transaction_date: 'desc' },
      take: 250,
    });
  }

  async getReconciliation(user: AuthenticatedUser, companyId: string) {
    this.assertBusinessScope(user, companyId);
    const [appointments, payments, ledger] = await Promise.all([
      this.prisma.appointments.findMany({
        where: { company_id: companyId },
        include: { financial_snapshot: true },
      }),
      this.prisma.payments.findMany({
        where: { company_id: companyId },
        include: { refunds: true },
      }),
      this.prisma.financial_ledger.findMany({
        where: { company_id: companyId },
      }),
    ]);

    const metrics = calculateFinancialMetrics(
      appointments
        .filter((appointment) => appointment.financial_snapshot)
        .map((appointment) => ({
          status: appointment.status,
          total: Number(appointment.financial_snapshot!.grand_total),
          currency: appointment.financial_snapshot!.currency_code,
        })),
      payments.map((payment) => ({
        status: payment.status,
        amount: Number(payment.amount),
        currency: payment.currency_code,
        method: payment.payment_method,
      })),
    );

    const totals = new Map<string, CurrencyTotals>();
    for (const metric of metrics) {
      totals.set(metric.currency, {
        currencyCode: metric.currency,
        booked: metric.bookedRevenue,
        completed: metric.completedRevenue,
        collected: metric.collectedRevenue,
        cash: metric.cash,
        refunded: 0,
        outstanding: metric.outstanding,
        ledgerCredits: 0,
        ledgerDebits: 0,
      });
    }
    const get = (currencyCode: string) => {
      if (!totals.has(currencyCode)) {
        totals.set(currencyCode, {
          currencyCode,
          booked: 0,
          completed: 0,
          collected: 0,
          cash: 0,
          refunded: 0,
          outstanding: 0,
          ledgerCredits: 0,
          ledgerDebits: 0,
        });
      }
      return totals.get(currencyCode)!;
    };

    for (const payment of payments) {
      const total = get(payment.currency_code);
      total.refunded += payment.refunds
        .filter((refund) => refund.status === 'succeeded')
        .reduce((sum, refund) => sum + refund.amount, 0);
    }

    for (const entry of ledger) {
      const total = get(entry.currency_code);
      total.ledgerCredits += entry.credit_amount;
      total.ledgerDebits += entry.debit_amount;
    }

    return {
      companyId,
      byCurrency: Array.from(totals.values())
        .map((total) => ({
          ...total,
          refunded: money(total.refunded),
          netCollected: money(total.collected - total.refunded),
          ledgerCredits: money(total.ledgerCredits),
          ledgerDebits: money(total.ledgerDebits),
        }))
        .sort((a, b) => a.currencyCode.localeCompare(b.currencyCode)),
      invariant:
        'Currencies are reconciled separately; booked value, gross collected value, refunds, and outstanding are never conflated.',
    };
  }

  async createPayout(user: AuthenticatedUser, dto: CreatePayoutDto) {
    const start = parseDate(dto.payoutPeriodStart, 'payoutPeriodStart');
    const end = parseDate(dto.payoutPeriodEnd, 'payoutPeriodEnd');
    if (end <= start) throw new BadRequestException('Payout end must be after start');
    this.assertBusinessScope(user, dto.companyId);

    return this.prisma.$transaction(async (tx) => {
      const commissions = await tx.commissions.findMany({
        where: {
          company_id: dto.companyId,
          professional_id: dto.professionalId,
          status: 'pending',
          calculated_at: { gte: start, lt: end },
        },
      });
      if (commissions.length === 0) {
        throw new NotFoundException('No pending commissions found for payout window');
      }

      const currencyCode = commissions[0].currency_code;
      const mismatched = commissions.some((item) => item.currency_code !== currencyCode);
      if (mismatched) {
        throw new ConflictException('Create separate payout batches per currency');
      }

      const totalCommission = money(
        commissions.reduce((sum, item) => sum + item.commission_amount, 0),
      );
      const payout = await tx.professional_payouts.create({
        data: {
          company_id: dto.companyId,
          professional_id: dto.professionalId,
          payout_period_start: start,
          payout_period_end: end,
          total_commission: totalCommission,
          total_tips: 0,
          total_adjustments: 0,
          currency_code: currencyCode,
          gross_amount: totalCommission,
          net_amount: totalCommission,
          status: dto.markPaid ? 'paid' : 'pending',
          paid_at: dto.markPaid ? new Date() : null,
          payment_method: dto.paymentMethod ?? null,
          reference_code: dto.referenceCode ?? null,
          processed_by_user_id: user.id,
        },
      });

      for (const commission of commissions) {
        await tx.professional_payout_items.create({
          data: {
            payout_id: payout.id,
            commission_id: commission.id,
            item_type: 'commission',
            description: `Commission ${commission.id}`,
            amount: commission.commission_amount,
            currency_code: commission.currency_code,
            reference_id: commission.payment_id ?? commission.appointment_id ?? commission.id,
          },
        });
        await tx.commissions.update({
          where: { id: commission.id },
          data: {
            payout_id: payout.id,
            status: dto.markPaid ? 'paid' : 'in_payout',
            paid_at: dto.markPaid ? new Date() : null,
          },
        });
      }

      return tx.professional_payouts.findUnique({
        where: { id: payout.id },
        include: { items: true, commissions: true },
      });
    });
  }

  taxPreview(dto: TaxPreviewDto) {
    if (dto.taxInclusive) {
      const tax = dto.subtotal - dto.subtotal / (1 + dto.taxPercent / 100);
      return {
        subtotal: money(dto.subtotal - tax),
        tax: money(tax),
        total: money(dto.subtotal),
        taxInclusive: true,
      };
    }
    const tax = dto.subtotal * (dto.taxPercent / 100);
    return {
      subtotal: money(dto.subtotal),
      tax: money(tax),
      total: money(dto.subtotal + tax),
      taxInclusive: false,
    };
  }

  private async writePaymentLedger(
    tx: Prisma.TransactionClient,
    createdById: string | null,
    payment: any,
    appointment: any | null,
  ) {
    const now = new Date();
    await tx.financial_ledger.create({
      data: {
        company_id: payment.company_id,
        payment_id: payment.id,
        appointment_id: payment.appointment_id ?? null,
        entry_type: 'payment',
        debit_amount: 0,
        credit_amount: payment.amount,
        currency_code: payment.currency_code,
        category: 'collected_revenue',
        subcategory: payment.payment_method,
        description: `Payment ${payment.reference_code ?? payment.id}`,
        reference_id: payment.id,
        reference_type: 'payment',
        transaction_date: payment.paid_at ?? now,
        created_by_id: createdById,
      },
    });

    if ((payment.tip_amount ?? 0) > 0) {
      await tx.financial_ledger.create({
        data: {
          company_id: payment.company_id,
          payment_id: payment.id,
          appointment_id: payment.appointment_id ?? null,
          entry_type: 'tip',
          debit_amount: 0,
          credit_amount: payment.tip_amount,
          currency_code: payment.currency_code,
          category: 'tips',
          subcategory: payment.payment_method,
          reference_id: payment.id,
          reference_type: 'payment',
          transaction_date: payment.paid_at ?? now,
          created_by_id: createdById,
        },
      });
    }

    const snapshotTaxTotal = Number(appointment?.financial_snapshot?.tax_total ?? 0);
    const snapshotGrandTotal = Number(appointment?.financial_snapshot?.grand_total ?? 0);
    const taxTotal = snapshotTaxTotal > 0 && snapshotGrandTotal > 0
      ? money(snapshotTaxTotal * Math.min(1, Number(payment.amount ?? 0) / snapshotGrandTotal))
      : 0;
    if (taxTotal > 0) {
      await tx.financial_ledger.create({
        data: {
          company_id: payment.company_id,
          payment_id: payment.id,
          appointment_id: payment.appointment_id ?? null,
          entry_type: 'tax',
          debit_amount: 0,
          credit_amount: taxTotal,
          currency_code: payment.currency_code,
          category: 'tax_payable',
          reference_id: appointment.id,
          reference_type: 'appointment',
          transaction_date: payment.paid_at ?? now,
          created_by_id: createdById,
        },
      });
    }
  }

  private async calculateCommissions(
    tx: Prisma.TransactionClient,
    payment: any,
    appointment: any | null,
  ) {
    if (!appointment || !appointment.participants?.length) return;

    const baseAmount = Math.max(
      0,
      payment.amount -
        (payment.tip_amount ?? 0) -
        (appointment.financial_snapshot?.tax_total ?? 0),
    );
    const uniquePros = new Map<string, any>();
    for (const participant of appointment.participants) {
      if (participant.professional) {
        uniquePros.set(participant.professional.id, participant.professional);
      }
    }
    if (uniquePros.size === 0) return;

    const perProfessionalBase = baseAmount / uniquePros.size;
    for (const professional of uniquePros.values()) {
      const rule = await tx.commission_rules.findFirst({
        where: {
          company_id: payment.company_id,
          professional_id: professional.id,
          is_active: true,
          OR: [{ effective_to: null }, { effective_to: { gt: new Date() } }],
        },
        orderBy: { sort_order: 'asc' },
      });
      const percent = rule?.percent_rate ?? professional.commission_percent ?? 0;
      const fixed = rule?.fixed_amount ?? 0;
      const commissionAmount = money(perProfessionalBase * (percent / 100) + fixed);
      await tx.commissions.create({
        data: {
          company_id: payment.company_id,
          professional_id: professional.id,
          appointment_id: appointment.id,
          payment_id: payment.id,
          rule_id: rule?.id ?? null,
          commission_type: rule?.calculation_type ?? 'percent',
          base_amount: perProfessionalBase,
          commission_percent: percent,
          commission_fixed: fixed,
          commission_amount: commissionAmount,
          currency_code: payment.currency_code,
          status: 'pending',
        },
      });
    }
  }

  private providerFor(paymentMethod: string) {
    if (paymentMethod === 'cash') return 'cash';
    if (paymentMethod === 'wallet') return 'lookiva_wallet';
    if (paymentMethod === 'gift_card') return 'lookiva_gift_card';
    if (paymentMethod === 'card_terminal') return 'external_terminal';
    if (paymentMethod === 'test_card') return 'local_test_provider';
    return this.paymentProvider.providerName();
  }

  private async findCustomerId(userId: string): Promise<string> {
    const customer = await this.prisma.customers.findFirst({
      where: { user_id: userId },
    });
    if (!customer) {
      throw new BadRequestException('Current user does not have a customer profile');
    }
    return customer.id;
  }
}
