import { describe, expect, it, vi } from 'vitest';
import { FinanceV2Service } from '../finance-v2.service';

function fixture() {
  const prisma = {
    appointments: { findMany: vi.fn() },
    payments: { findMany: vi.fn() },
    financial_ledger: { findMany: vi.fn() },
  } as any;
  const paymentProvider = {} as any;
  const service = new FinanceV2Service(prisma, paymentProvider);
  const user = {
    id: 'owner-1',
    roleScopes: [
      {
        roleKey: 'business_owner',
        scopeType: 'company',
        scopeId: 'company-1',
        companyId: 'company-1',
      },
    ],
  } as any;
  return { prisma, service, user };
}

describe('Finance V2 reconciliation invariants', () => {
  it('reconciles booked, gross collected, refunds and ledger per currency', async () => {
    const { prisma, service, user } = fixture();

    prisma.appointments.findMany.mockResolvedValue([
      {
        id: 'apt-usd',
        status: 'completed',
        financial_snapshot: {
          grand_total: 100,
          currency_code: 'USD',
        },
      },
      {
        id: 'apt-lbp',
        status: 'confirmed',
        financial_snapshot: {
          grand_total: 2_000_000,
          currency_code: 'LBP',
        },
      },
    ]);
    prisma.payments.findMany.mockResolvedValue([
      {
        id: 'pay-usd',
        status: 'succeeded',
        amount: 100,
        currency_code: 'USD',
        payment_method: 'cash',
        refunds: [{ status: 'succeeded', amount: 25 }],
      },
      {
        id: 'pay-lbp',
        status: 'succeeded',
        amount: 1_000_000,
        currency_code: 'LBP',
        payment_method: 'card',
        refunds: [],
      },
    ]);
    prisma.financial_ledger.findMany.mockResolvedValue([
      {
        currency_code: 'USD',
        credit_amount: 100,
        debit_amount: 0,
      },
      {
        currency_code: 'USD',
        credit_amount: 0,
        debit_amount: 25,
      },
      {
        currency_code: 'LBP',
        credit_amount: 1_000_000,
        debit_amount: 0,
      },
    ]);

    const result = await service.getReconciliation(user, 'company-1');
    const usd = result.byCurrency.find((row) => row.currencyCode === 'USD');
    const lbp = result.byCurrency.find((row) => row.currencyCode === 'LBP');

    expect(result.byCurrency).toHaveLength(2);
    expect(usd).toMatchObject({
      booked: 100,
      completed: 100,
      collected: 100,
      refunded: 25,
      netCollected: 75,
      outstanding: 0,
      cash: 100,
      ledgerCredits: 100,
      ledgerDebits: 25,
    });
    expect(lbp).toMatchObject({
      booked: 2_000_000,
      completed: 0,
      collected: 1_000_000,
      refunded: 0,
      netCollected: 1_000_000,
      outstanding: 1_000_000,
      cash: 0,
      ledgerCredits: 1_000_000,
      ledgerDebits: 0,
    });
    expect(result.invariant).toContain('Currencies are reconciled separately');
  });

  it('does not authorize a company-scoped user to reconcile another company', async () => {
    const { prisma, service, user } = fixture();

    await expect(
      service.getReconciliation(user, 'company-2'),
    ).rejects.toThrow('not authorized');

    expect(prisma.appointments.findMany).not.toHaveBeenCalled();
    expect(prisma.payments.findMany).not.toHaveBeenCalled();
    expect(prisma.financial_ledger.findMany).not.toHaveBeenCalled();
  });
});
