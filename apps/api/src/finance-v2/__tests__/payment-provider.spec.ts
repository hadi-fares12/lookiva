import { createHmac } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { PaymentProviderService } from '../payment-provider.service';

function service(values: Record<string, unknown>) {
  const config = {
    get<T>(key: string, fallback?: T): T {
      return (key in values ? values[key] : fallback) as T;
    },
  } as ConfigService;
  return new PaymentProviderService(config);
}

describe('PaymentProviderService webhook verification', () => {
  it('accepts the exact HMAC SHA-256 signature', () => {
    const raw = Buffer.from('{"externalTransactionId":"txn_1","status":"succeeded"}');
    const secret = '0123456789abcdef0123456789abcdef';
    const signature = createHmac('sha256', secret).update(raw).digest('hex');
    const provider = service({ PAYMENT_WEBHOOK_SECRET: secret });
    expect(() => provider.verifyWebhook(raw, `sha256=${signature}`)).not.toThrow();
  });

  it('rejects a forged signature', () => {
    const raw = Buffer.from('{"externalTransactionId":"txn_1","status":"succeeded"}');
    const provider = service({ PAYMENT_WEBHOOK_SECRET: '0123456789abcdef0123456789abcdef' });
    expect(() => provider.verifyWebhook(raw, 'sha256=' + '0'.repeat(64))).toThrow(UnauthorizedException);
  });

  it('fails closed when raw body is unavailable', () => {
    const provider = service({ PAYMENT_WEBHOOK_SECRET: '0123456789abcdef0123456789abcdef' });
    expect(() => provider.verifyWebhook(undefined, 'sha256=' + '0'.repeat(64))).toThrow(UnauthorizedException);
  });
});
