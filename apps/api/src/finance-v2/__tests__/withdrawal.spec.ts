import { ConflictException } from '@nestjs/common';
import { ScopeType, UserRole } from '@lookiva/shared-types';
import { describe, expect, it, vi } from 'vitest';
import { FinanceV2Service } from '../finance-v2.service';

const platformAdmin = {
  id: 'admin-1',
  roleScopes: [
    {
      roleKey: UserRole.SuperAdmin,
      scopeType: ScopeType.Platform,
      scopeId: null,
      companyId: null,
      branchId: null,
    },
  ],
} as any;

const businessOwner = {
  id: 'owner-1',
  roleScopes: [
    {
      roleKey: UserRole.BusinessOwner,
      scopeType: ScopeType.Company,
      scopeId: 'company-1',
      companyId: 'company-1',
      branchId: null,
    },
  ],
} as any;

function makeService(existingWithdrawal?: any) {
  const tx = {
    withdrawal_requests: {
      update: vi.fn().mockImplementation(async ({ data }: any) => ({
        ...existingWithdrawal,
        ...data,
      })),
    },
    financial_ledger: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'ledger-1' }),
    },
    audit_logs: {
      create: vi.fn().mockResolvedValue({ id: 'audit-1' }),
    },
  } as any;

  const prisma = {
    withdrawal_requests: {
      findUnique: vi.fn().mockResolvedValue(existingWithdrawal ?? null),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    bank_accounts: {
      findUnique: vi.fn(),
    },
    companies: {
      findFirst: vi.fn(),
    },
    professionals: {
      findFirst: vi.fn(),
    },
    audit_logs: {
      create: vi.fn().mockResolvedValue({ id: 'audit-root' }),
    },
    $transaction: vi.fn(async (callback: (client: any) => unknown) => {
      return callback(tx);
    }),
  } as any;

  const paymentProvider = {
    providerName: vi.fn().mockReturnValue('test'),
  } as any;

  return {
    service: new FinanceV2Service(prisma, paymentProvider),
    prisma,
    tx,
  };
}

describe('withdrawal lifecycle safety', () => {
  it('rejects business withdrawal requests to an unverified bank account', async () => {
    const { service, prisma } = makeService();
    prisma.bank_accounts.findUnique.mockResolvedValue({
      id: 'bank-1',
      owner_type: 'company',
      owner_id: 'company-1',
      currency_code: 'USD',
      is_verified: false,
      payout_enabled: true,
    });
    prisma.companies.findFirst.mockResolvedValue({ id: 'company-1' });

    await expect(
      service.createWithdrawal(businessOwner, {
        companyId: 'company-1',
        bankAccountId: 'bank-1',
        amount: 100,
        currencyCode: 'USD',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(prisma.withdrawal_requests.create).not.toHaveBeenCalled();
  });

  it('does not post a ledger debit when merely approving a withdrawal', async () => {
    const existing = {
      id: 'withdrawal-1',
      company_id: 'company-1',
      bank_account_id: 'bank-1',
      requested_by_user_id: 'owner-1',
      amount: 100,
      currency_code: 'USD',
      status: 'pending',
      reviewed_at: null,
      rejection_reason: null,
      reference_code: null,
      metadata: null,
      bank_account: {
        id: 'bank-1',
        bank_name: 'Test Bank',
      },
    };
    const { service, tx } = makeService(existing);

    const result = await service.reviewWithdrawal(
      platformAdmin,
      existing.id,
      { status: 'approved' },
    );

    expect(result.status).toBe('approved');
    expect(tx.financial_ledger.create).not.toHaveBeenCalled();
    expect(tx.audit_logs.create).toHaveBeenCalledTimes(1);
  });

  it('posts exactly one debit ledger entry when processing completes', async () => {
    const existing = {
      id: 'withdrawal-1',
      company_id: 'company-1',
      bank_account_id: 'bank-1',
      requested_by_user_id: 'owner-1',
      amount: 100,
      currency_code: 'USD',
      status: 'processing',
      reviewed_at: new Date(),
      rejection_reason: null,
      reference_code: 'provider-123',
      metadata: null,
      bank_account: {
        id: 'bank-1',
        bank_name: 'Test Bank',
      },
    };
    const { service, tx } = makeService(existing);

    const result = await service.reviewWithdrawal(
      platformAdmin,
      existing.id,
      { status: 'completed', referenceCode: 'provider-123' },
    );

    expect(result.status).toBe('completed');
    expect(tx.financial_ledger.findFirst).toHaveBeenCalledWith({
      where: {
        company_id: 'company-1',
        reference_type: 'withdrawal',
        reference_id: 'withdrawal-1',
        entry_type: 'withdrawal',
      },
      select: { id: true },
    });
    expect(tx.financial_ledger.create).toHaveBeenCalledTimes(1);
    expect(tx.financial_ledger.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        company_id: 'company-1',
        entry_type: 'withdrawal',
        debit_amount: 100,
        credit_amount: 0,
        currency_code: 'USD',
        reference_id: 'withdrawal-1',
        reference_type: 'withdrawal',
      }),
    });
  });
});
