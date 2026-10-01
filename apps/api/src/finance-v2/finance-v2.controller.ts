import { Body, Controller, Get, Headers, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionKey } from '@lookiva/shared-types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthenticatedUser } from '../auth/types/request-with-user';
import { FinanceV2Service } from './finance-v2.service';
import {
  CreatePaymentDto,
  CreatePayoutDto,
  RefundPaymentDto,
  TaxPreviewDto,
  PaymentWebhookDto,
} from './dto/finance-v2.dto';

@ApiTags('Finance V2')
@ApiBearerAuth()
@Controller('finance-v2')
export class FinanceV2Controller {
  constructor(private readonly finance: FinanceV2Service) {}

  @Post('payments')
  @RequirePermissions(PermissionKey.BookingCreate)
  @ApiOperation({ summary: 'Create a provider-backed/test payment and ledger entries' })
  createPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.finance.createPayment(user, dto);
  }

  @Post('webhooks/payment')
  @Public()
  @ApiOperation({ summary: 'Receive a signed payment-provider status webhook' })
  paymentWebhook(
    @Req() req: any,
    @Headers('x-lookiva-signature') signature: string | undefined,
    @Body() dto: PaymentWebhookDto,
  ) {
    return this.finance.processPaymentWebhook(req.rawBody, signature, dto);
  }

  @Post('payments/:id/refund')
  @RequirePermissions(PermissionKey.PaymentsManage)
  @ApiOperation({ summary: 'Refund a payment and write reverse ledger entries' })
  refund(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RefundPaymentDto,
  ) {
    return this.finance.refundPayment(user, id, dto);
  }

  @Get('companies/:companyId/ledger')
  @RequirePermissions(PermissionKey.FinanceLedgerView)
  @ApiOperation({ summary: 'Read ledger entries for a company' })
  getLedger(
    @CurrentUser() user: AuthenticatedUser,
    @Param('companyId') companyId: string,
    @Query('currencyCode') currencyCode?: string,
  ) {
    return this.finance.getLedger(user, companyId, currencyCode);
  }

  @Get('companies/:companyId/reconciliation')
  @RequirePermissions(PermissionKey.FinanceLedgerView)
  @ApiOperation({ summary: 'Reconcile booked, collected, cash, outstanding, and ledger totals by currency' })
  reconciliation(@CurrentUser() user: AuthenticatedUser, @Param('companyId') companyId: string) {
    return this.finance.getReconciliation(user, companyId);
  }

  @Post('payouts')
  @RequirePermissions(PermissionKey.FinancePayoutManage)
  @ApiOperation({ summary: 'Create a professional payout batch from pending commissions' })
  createPayout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePayoutDto,
  ) {
    return this.finance.createPayout(user, dto);
  }

  @Post('tax/preview')
  @RequirePermissions(PermissionKey.FinanceTaxManage)
  @ApiOperation({ summary: 'Preview tax-inclusive or tax-exclusive calculation' })
  taxPreview(@Body() dto: TaxPreviewDto) {
    return this.finance.taxPreview(dto);
  }
}
