import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { BookingV2Service } from '../booking-v2.service';

const customerUser = {
  id: 'user-1',
  roleScopes: [],
} as any;

function serviceFixture() {
  const tx = {
    appointment_holds: {
      create: vi.fn().mockResolvedValue({ id: 'hold-1', status: 'active' }),
    },
    queue_entries: {
      update: vi.fn(),
    },
  } as any;

  const prisma = {
    $transaction: vi.fn(async (callback: (client: any) => unknown, options?: any) => {
      return callback(tx);
    }),
    queue_entries: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  } as any;

  const notifications = {
    dispatch: vi.fn().mockResolvedValue(undefined),
  } as any;
  const realtime = {
    emitBranch: vi.fn(),
    emitUser: vi.fn(),
    emitAppointment: vi.fn(),
    emitCompany: vi.fn(),
  } as any;

  const service = new BookingV2Service(
    prisma,
    notifications,
    realtime,
  );

  return { service, prisma, tx, notifications, realtime };
}

describe('Booking V2 safety invariants', () => {
  it('creates booking holds inside a serializable transaction', async () => {
    const { service, prisma, tx } = serviceFixture();
    vi.spyOn(service as any, 'prepareBooking').mockResolvedValue({
      customerId: 'customer-1',
      customerUserId: customerUser.id,
      company: { id: 'company-1' },
      branch: { id: 'branch-1' },
      professional: { id: 'pro-1' },
      resources: [{ id: 'chair-1' }],
      services: [{ id: 'service-1' }],
      startsAt: new Date('2026-10-08T10:00:00.000Z'),
      endsAt: new Date('2026-10-08T10:30:00.000Z'),
    });
    vi.spyOn(service as any, 'assertNoConflicts').mockResolvedValue(undefined);

    await service.createHold(customerUser, {
      companyId: 'company-1',
      branchId: 'branch-1',
      serviceIds: ['service-1'],
      professionalId: 'pro-1',
      resourceIds: ['chair-1'],
      startsAt: '2026-10-08T10:00:00.000Z',
      holdMinutes: 10,
    } as any);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    const options = prisma.$transaction.mock.calls[0][1];
    expect(options).toEqual({
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
    expect(tx.appointment_holds.create).toHaveBeenCalledTimes(1);
  });

  it('rejects calling a queue entry that is no longer waiting', async () => {
    const { service, prisma } = serviceFixture();
    prisma.queue_entries.findUnique.mockResolvedValue({
      id: 'entry-1',
      status: 'served',
      queue_id: 'queue-1',
      queue: {
        branch: {
          id: 'branch-1',
          company_id: 'company-1',
          name: 'Main',
        },
        name: 'Default',
      },
      customer: { user_id: customerUser.id },
    });

    await expect(
      service.updateQueueEntryStatus(
        customerUser,
        'entry-1',
        'called',
        undefined,
        true,
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(prisma.queue_entries.update).not.toHaveBeenCalled();
  });

  it('emits queue updates and notification when a waiting customer is called', async () => {
    const { service, prisma, notifications, realtime } = serviceFixture();
    prisma.queue_entries.findUnique.mockResolvedValue({
      id: 'entry-1',
      status: 'waiting',
      queue_id: 'queue-1',
      queue: {
        branch: {
          id: 'branch-1',
          company_id: 'company-1',
          name: 'Main',
        },
        name: 'Default',
      },
      customer: { user_id: customerUser.id },
    });
    prisma.queue_entries.update.mockResolvedValue({
      id: 'entry-1',
      queue_id: 'queue-1',
      status: 'called',
    });

    const result = await service.updateQueueEntryStatus(
      customerUser,
      'entry-1',
      'called',
      undefined,
      true,
    );

    expect(result.status).toBe('called');
    expect(notifications.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientUserId: customerUser.id,
        notificationType: 'booking_queue_called',
      }),
    );
    expect(realtime.emitBranch).toHaveBeenCalledWith(
      'branch-1',
      'queue:changed',
      expect.objectContaining({ status: 'called' }),
    );
    expect(realtime.emitUser).toHaveBeenCalledWith(
      customerUser.id,
      'queue:changed',
      expect.objectContaining({ status: 'called' }),
    );
  });
});
