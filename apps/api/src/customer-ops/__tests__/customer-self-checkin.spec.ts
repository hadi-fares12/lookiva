import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { CustomerOpsService } from '../customer-ops.service';

function createPrisma(now = new Date()) {
  const tx = {
    appointments: {
      update: vi.fn(async ({ data }: any) => ({
        id: 'apt_1',
        status: data.status,
        checked_in_at: data.checked_in_at,
      })),
    },
    appointment_status_history: {
      create: vi.fn(async ({ data }: any) => data),
    },
  };
  const prisma = {
    customers: {
      findFirst: vi.fn(async () => ({ id: 'cust_1', user_id: 'user_1' })),
    },
    appointments: {
      findFirst: vi.fn(async () => ({
        id: 'apt_1',
        customer_id: 'cust_1',
        status: 'confirmed',
        starts_at: new Date(now.getTime() - 5 * 60 * 1000),
        ends_at: new Date(now.getTime() + 25 * 60 * 1000),
        branch: {
          id: 'branch_1',
          name: 'Test Branch',
          latitude: 33.8938,
          longitude: 35.5018,
        },
      })),
    },
    $transaction: vi.fn(async (callback: any) => callback(tx)),
  };
  return { prisma, tx };
}

describe('CustomerOpsService selfCheckIn', () => {
  it('checks in the booking owner when they are close to the branch', async () => {
    const { prisma, tx } = createPrisma();
    const service = new CustomerOpsService(prisma as any);

    const result = await service.selfCheckIn(
      'user_1',
      'apt_1',
      33.8940,
      35.5020,
    );

    expect(result.status).toBe('checked_in');
    expect(tx.appointments.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'apt_1' },
        data: expect.objectContaining({
          status: 'checked_in',
          arrival_latitude: 33.8940,
          arrival_longitude: 35.5020,
        }),
      }),
    );
    expect(tx.appointment_status_history.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        appointment_id: 'apt_1',
        old_status: 'confirmed',
        new_status: 'checked_in',
        changed_by_id: 'user_1',
        reason: 'customer_self_check_in',
      }),
    });
  });

  it('rejects self check-in when the customer is too far from the branch', async () => {
    const { prisma } = createPrisma();
    const service = new CustomerOpsService(prisma as any);

    await expect(
      service.selfCheckIn('user_1', 'apt_1', 34.4335, 35.8441),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
