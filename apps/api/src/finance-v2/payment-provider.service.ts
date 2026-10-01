import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

export type ProviderPaymentStatus = 'pending' | 'succeeded' | 'failed';

export interface ProviderCaptureResult {
  status: ProviderPaymentStatus;
  externalTransactionId: string;
  checkoutUrl?: string | null;
  raw: Record<string, unknown>;
}

@Injectable()
export class PaymentProviderService {
  constructor(private readonly config: ConfigService) {}

  isOnlineEnabled() {
    return this.config.get<boolean>('ONLINE_PAYMENTS_ENABLED', false) === true;
  }

  providerName() {
    return this.config.get<string>('PAYMENT_PROVIDER', 'disabled');
  }

  async capture(input: {
    idempotencyKey: string;
    amount: number;
    currencyCode: string;
    companyId: string;
    customerId: string;
    appointmentId?: string | null;
    paymentMethod: string;
  }): Promise<ProviderCaptureResult> {
    if (!this.isOnlineEnabled()) {
      throw new BadRequestException('Online payments are disabled for this deployment');
    }
    const provider = this.providerName();
    if (provider !== 'generic_http') {
      throw new BadRequestException(`Payment provider ${provider} does not support online capture in this build`);
    }

    const baseUrl = this.required('PAYMENT_PROVIDER_BASE_URL').replace(/\/$/, '');
    const apiKey = this.required('PAYMENT_API_KEY');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(`${baseUrl}/payments/capture`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${apiKey}`,
          'idempotency-key': input.idempotencyKey,
        },
        body: JSON.stringify({
          idempotencyKey: input.idempotencyKey,
          amount: input.amount,
          currencyCode: input.currencyCode,
          companyId: input.companyId,
          customerId: input.customerId,
          appointmentId: input.appointmentId ?? null,
          paymentMethod: input.paymentMethod,
        }),
        signal: controller.signal,
      });
      const body = await this.readJson(response);
      if (!response.ok) {
        throw new BadGatewayException(`Payment provider capture failed (${response.status})`);
      }
      const status = this.normalizeStatus(body.status);
      const externalTransactionId = String(body.externalTransactionId ?? body.transactionId ?? '').trim();
      if (!externalTransactionId) {
        throw new BadGatewayException('Payment provider did not return an external transaction id');
      }
      return {
        status,
        externalTransactionId,
        checkoutUrl: typeof body.checkoutUrl === 'string' ? body.checkoutUrl : null,
        raw: body,
      };
    } catch (error) {
      if (error instanceof BadGatewayException || error instanceof BadRequestException) throw error;
      throw new BadGatewayException(`Payment provider is unavailable: ${String(error)}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  async refund(input: {
    externalTransactionId: string;
    amount: number;
    currencyCode: string;
    reason: string;
    idempotencyKey: string;
  }): Promise<ProviderCaptureResult> {
    if (!input.externalTransactionId.trim()) throw new BadRequestException('Original external transaction id is missing');
    if (!this.isOnlineEnabled()) throw new BadRequestException('Online payments are disabled for this deployment');
    if (this.providerName() !== 'generic_http') throw new BadRequestException('Configured payment provider cannot process refunds in this build');
    const baseUrl = this.required('PAYMENT_PROVIDER_BASE_URL').replace(/\/$/, '');
    const apiKey = this.required('PAYMENT_API_KEY');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(`${baseUrl}/payments/refund`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${apiKey}`,
          'idempotency-key': input.idempotencyKey,
        },
        body: JSON.stringify(input),
        signal: controller.signal,
      });
      const body = await this.readJson(response);
      if (!response.ok) throw new BadGatewayException(`Payment provider refund failed (${response.status})`);
      return {
        status: this.normalizeStatus(body.status),
        externalTransactionId: String(body.externalTransactionId ?? body.transactionId ?? input.externalTransactionId),
        raw: body,
      };
    } catch (error) {
      if (error instanceof BadGatewayException || error instanceof BadRequestException) throw error;
      throw new BadGatewayException(`Payment provider is unavailable: ${String(error)}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  verifyWebhook(rawBody: Buffer | undefined, signatureHeader: string | undefined) {
    if (!rawBody?.length) throw new UnauthorizedException('Payment webhook raw body is unavailable');
    const secret = this.required('PAYMENT_WEBHOOK_SECRET');
    const supplied = (signatureHeader ?? '').replace(/^sha256=/i, '').trim().toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(supplied)) throw new UnauthorizedException('Invalid payment webhook signature');
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    const ok = timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(supplied, 'hex'));
    if (!ok) throw new UnauthorizedException('Invalid payment webhook signature');
  }

  private required(name: string) {
    const value = this.config.get<string>(name)?.trim();
    if (!value) throw new BadRequestException(`${name} is not configured`);
    return value;
  }

  private normalizeStatus(value: unknown): ProviderPaymentStatus {
    const status = String(value ?? '').toLowerCase();
    if (status === 'succeeded' || status === 'success' || status === 'paid' || status === 'captured') return 'succeeded';
    if (status === 'failed' || status === 'declined' || status === 'cancelled') return 'failed';
    if (status === 'pending' || status === 'processing' || status === 'requires_action') return 'pending';
    throw new BadGatewayException(`Unsupported payment provider status: ${status || 'empty'}`);
  }

  private async readJson(response: Response): Promise<Record<string, any>> {
    try {
      const parsed = await response.json();
      return parsed && typeof parsed === 'object' ? parsed as Record<string, any> : {};
    } catch {
      return {};
    }
  }
}
