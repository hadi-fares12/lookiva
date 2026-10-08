import { describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import { FinanceV2Service } from '../finance-v2.service';

function fixture() {
  const tx = {
    companies: { findUnique: vi.fn().mockResolvedValue({ id: 'company' }) },
    customers: { findUnique: vi.fn().mockResolvedValue({ id: 'customer', user_id: 'customer-user' }) },
    appointments: { findUnique: vi.fn().mockResolvedValue({
      id: 'booking', company_id: 'company', branch_id: 'branch', customer_id: 'customer',
      customer_user_id: 'customer-user', financial_snapshot: { currency_code: 'USD', grand_total: 100 },
    }) },
    payments: { findMany: vi.fn().mockResolvedValue([{ amount: 80, refunds: [] }]), create: vi.fn() },
  };
  const prisma = { $transaction: vi.fn(async (action: any) => action(tx)) };
  const service = new FinanceV2Service(prisma as any, {} as any);
  const user = { id: 'owner', roleScopes: [{ roleKey: 'business_owner', scopeType: 'company', scopeId: 'company', companyId: 'company' }] } as any;
  const dto = { companyId: 'company', appointmentId: 'booking', customerId: 'customer', currencyCode: 'USD', amount: 100, paymentMethod: 'cash' } as any;
  return { tx, prisma, service, user, dto };
}

describe('Floor payment collection', () => {
  it('rejects attributing an appointment payment to another customer, even for an owner', async () => {
    const { service, user, dto, tx } = fixture();
    await expect(service.createPayment(user, { ...dto, customerId: 'other' })).rejects.toThrow('Payment customer does not match');
    expect(tx.payments.create).not.toHaveBeenCalled();
  });

  it('rejects a stale balance after another collection and uses serializable isolation', async () => {
    const { service, user, dto, tx, prisma } = fixture();
    await expect(service.createPayment(user, dto)).rejects.toThrow('Payment exceeds remaining booking amount');
    expect(tx.payments.create).not.toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' });
  });

  it('returns an actionable conflict without retrying a payment on serialization failure', async () => {
    const { service, user, dto, prisma } = fixture();
    prisma.$transaction.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('conflict', { code: 'P2034', clientVersion: '5' }));
    await expect(service.createPayment(user, dto)).rejects.toThrow('Refresh payment history');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
