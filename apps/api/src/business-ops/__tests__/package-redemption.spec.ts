import { ConflictException } from '@nestjs/common';
import { ScopeType, UserRole } from '@lookiva/shared-types';
import { describe, expect, it, vi } from 'vitest';
import { BusinessOpsService } from '../business-ops.service';

const owner = {
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

function fixture(consumedCount: number, remainingAfter = 1) {
  const purchase = {
    id: 'purchase-1',
    customer_id: 'customer-1',
    sessions_remaining: 2,
    status: 'active',
    expires_at: new Date(Date.now() + 86_400_000),
    package: {
      id: 'package-1',
      company_id: 'company-1',
      name: 'Hair package',
      service_ids: ['service-1'],
      total_sessions_count: 5,
      currency_code: 'USD',
    },
    customer: {
      id: 'customer-1',
      user: {
        id: 'user-1',
        full_name: 'Customer',
        phone: null,
        email: 'customer@example.com',
      },
    },
  };

  const tx = {
    package_purchases: {
      updateMany: vi.fn().mockResolvedValue({ count: consumedCount }),
      findUnique: vi.fn().mockResolvedValue({
        id: 'purchase-1',
        sessions_remaining: remainingAfter,
        status: 'active',
      }),
      update: vi.fn().mockResolvedValue(undefined),
    },
    package_usage: {
      create: vi.fn().mockResolvedValue({
        id: 'usage-1',
        package_purchase_id: 'purchase-1',
        service_id: 'service-1',
        sessions_used: 1,
        service: { id: 'service-1', name: 'Haircut' },
        appointment: null,
      }),
    },
  } as any;

  const prisma = {
    package_purchases: {
      findUnique: vi.fn().mockResolvedValue(purchase),
    },
    services: {
      findFirst: vi.fn().mockResolvedValue({
        id: 'service-1',
        name: 'Haircut',
      }),
    },
    professionals: {
      findFirst: vi.fn(),
    },
    audit_logs: {
      create: vi.fn().mockResolvedValue({ id: 'audit-1' }),
    },
    $transaction: vi.fn(async (callback: (client: any) => unknown) => {
      return callback(tx);
    }),
  } as any;

  return {
    service: new BusinessOpsService(prisma),
    prisma,
    tx,
  };
}

describe('package redemption safety', () => {
  it('fails atomically when another redemption consumed the remaining session first', async () => {
    const { service, tx } = fixture(0);

    await expect(
      service.redeemPackage(owner, 'company-1', {
        packagePurchaseId: 'purchase-1',
        serviceId: 'service-1',
        sessionsUsed: 1,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(tx.package_usage.create).not.toHaveBeenCalled();
  });

  it('decrements sessions before creating usage and exhausts the package at zero', async () => {
    const { service, prisma, tx } = fixture(1, 0);

    const result = await service.redeemPackage(owner, 'company-1', {
      packagePurchaseId: 'purchase-1',
      serviceId: 'service-1',
      sessionsUsed: 1,
    });

    expect(tx.package_purchases.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'purchase-1',
          sessions_remaining: { gte: 1 },
        }),
        data: { sessions_remaining: { decrement: 1 } },
      }),
    );
    expect(tx.package_usage.create).toHaveBeenCalledTimes(1);
    expect(tx.package_purchases.update).toHaveBeenCalledWith({
      where: { id: 'purchase-1' },
      data: { status: 'exhausted' },
    });
    expect(result.packagePurchase?.status).toBe('exhausted');
    expect(prisma.audit_logs.create).toHaveBeenCalledTimes(1);
  });
});
