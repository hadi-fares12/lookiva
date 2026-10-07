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
    appointment_participants: {
      create: vi.fn(),
    },
    appointments: {
      findUnique: vi.fn(),
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

  it('allows only the non-conflicting contender to write a hold', async () => {
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

    let contender = 0;
    vi.spyOn(service as any, 'assertNoConflicts').mockImplementation(async () => {
      contender += 1;
      if (contender === 1) {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return;
      }
      throw new ConflictException('Professional or resource is no longer available');
    });

    const dto = {
      companyId: 'company-1',
      branchId: 'branch-1',
      serviceIds: ['service-1'],
      professionalId: 'pro-1',
      resourceIds: ['chair-1'],
      startsAt: '2026-10-08T10:00:00.000Z',
      holdMinutes: 10,
    } as any;

    const results = await Promise.allSettled([
      service.createHold(customerUser, dto),
      service.createHold(customerUser, dto),
    ]);

    expect(results.filter((item) => item.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((item) => item.status === 'rejected')).toHaveLength(1);
    expect(tx.appointment_holds.create).toHaveBeenCalledTimes(1);
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    for (const call of prisma.$transaction.mock.calls) {
      expect(call[1]).toEqual({
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    }
  });

  it('creates every group participant in one serializable transaction', async () => {
    const { service, prisma, tx } = serviceFixture();
    vi.spyOn(service as any, 'assertBusinessScope').mockImplementation(() => undefined);
    vi.spyOn(service as any, 'prepareBooking').mockResolvedValue({
      customerId: 'customer-1',
      customerUserId: customerUser.id,
      company: { id: 'company-1', auto_confirm_bookings: true },
      branch: { id: 'branch-1' },
      professional: null,
      resources: [{ id: 'chair-1' }, { id: 'chair-2' }],
      services: [{ id: 'service-1' }, { id: 'service-2' }],
      startsAt: new Date('2026-10-08T10:00:00.000Z'),
      endsAt: new Date('2026-10-08T11:00:00.000Z'),
      depositAmount: 0,
    });
    const assertNoConflicts = vi
      .spyOn(service as any, 'assertNoConflicts')
      .mockResolvedValue(undefined);
    vi.spyOn(service as any, 'persistAppointment').mockResolvedValue({
      id: 'group-1',
    });
    vi.spyOn(service as any, 'notifyCustomer').mockResolvedValue(undefined);
    tx.appointment_participants.create.mockResolvedValue({ id: 'participant' });
    tx.appointments.findUnique.mockResolvedValue({
      id: 'group-1',
      status: 'confirmed',
      starts_at: new Date('2026-10-08T10:00:00.000Z'),
      customer_user_id: customerUser.id,
    });

    const result = await service.createGroupBooking(customerUser, {
      companyId: 'company-1',
      branchId: 'branch-1',
      startsAt: '2026-10-08T10:00:00.000Z',
      participants: [
        {
          customerId: 'customer-1',
          professionalId: 'pro-1',
          resourceIds: ['chair-1'],
          serviceIds: ['service-1'],
        },
        {
          customerId: 'customer-2',
          professionalId: 'pro-2',
          resourceIds: ['chair-2'],
          serviceIds: ['service-2'],
        },
      ],
    } as any);

    expect(result?.id).toBe('group-1');
    expect(assertNoConflicts).toHaveBeenCalledTimes(2);
    expect(tx.appointment_participants.create).toHaveBeenCalledTimes(2);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.$transaction.mock.calls[0][1]).toEqual({
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  });

  it('aborts a group booking before persistence when any participant conflicts', async () => {
    const { service, tx } = serviceFixture();
    vi.spyOn(service as any, 'assertBusinessScope').mockImplementation(() => undefined);
    vi.spyOn(service as any, 'prepareBooking').mockResolvedValue({
      customerId: 'customer-1',
      customerUserId: customerUser.id,
      company: { id: 'company-1', auto_confirm_bookings: true },
      branch: { id: 'branch-1' },
      professional: null,
      resources: [{ id: 'chair-1' }, { id: 'chair-2' }],
      services: [{ id: 'service-1' }, { id: 'service-2' }],
      startsAt: new Date('2026-10-08T10:00:00.000Z'),
      endsAt: new Date('2026-10-08T11:00:00.000Z'),
      depositAmount: 0,
    });
    vi.spyOn(service as any, 'assertNoConflicts')
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new ConflictException('Second professional is busy'));
    const persist = vi.spyOn(service as any, 'persistAppointment');

    await expect(
      service.createGroupBooking(customerUser, {
        companyId: 'company-1',
        branchId: 'branch-1',
        startsAt: '2026-10-08T10:00:00.000Z',
        participants: [
          {
            professionalId: 'pro-1',
            resourceIds: ['chair-1'],
            serviceIds: ['service-1'],
          },
          {
            professionalId: 'pro-2',
            resourceIds: ['chair-2'],
            serviceIds: ['service-2'],
          },
        ],
      } as any),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(persist).not.toHaveBeenCalled();
    expect(tx.appointment_participants.create).not.toHaveBeenCalled();
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
