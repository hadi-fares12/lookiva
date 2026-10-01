import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  companyId!: string;

  @IsOptional()
  @IsString()
  appointmentId?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsString()
  paymentMethod!: string;

  @IsString()
  currencyCode!: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tipAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  depositAmount?: number;

  @IsOptional()
  @IsString()
  referenceCode?: string;

  @IsOptional()
  @IsString()
  externalTransactionId?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsIn(['pending', 'succeeded', 'failed'])
  status?: string;
}

export class RefundPaymentDto {
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsString()
  reason!: string;

  @IsOptional()
  @IsString()
  refundMethod?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreatePayoutDto {
  @IsString()
  companyId!: string;

  @IsString()
  professionalId!: string;

  @IsDateString()
  payoutPeriodStart!: string;

  @IsDateString()
  payoutPeriodEnd!: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  referenceCode?: string;

  @IsOptional()
  @IsBoolean()
  markPaid?: boolean;
}

export class TaxPreviewDto {
  @IsNumber()
  @Min(0)
  subtotal!: number;

  @IsNumber()
  @Min(0)
  taxPercent!: number;

  @IsOptional()
  @IsBoolean()
  taxInclusive?: boolean;
}

export class PaymentWebhookDto {
  @IsString()
  externalTransactionId!: string;

  @IsIn(['pending', 'succeeded', 'failed'])
  status!: string;
}
