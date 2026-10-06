import { describe, expect, it, vi } from 'vitest';
import { ScopeType, UserRole } from '@lookiva/shared-types';
import { BusinessOpsService } from '../business-ops.service';
import type { AuthenticatedUser } from '../../auth/types/request-with-user';

function ownerUser(): AuthenticatedUser {
  return {
    id: 'owner-1',
    permissions: [],
    roleScopes: [{
      id: 'scope-1',
      roleId: 'role-1',
      roleKey: UserRole.BusinessOwner,
      scopeType: ScopeType.Company,
      scopeId: 'company-1',
      companyId: 'company-1',
      branchId: null,
    }],
  };
}

describe('business professional operations', () => {
  it('updates professional photo and default chair atomically', async () => {
    const tx = {
      professionals: {
        update: vi.fn().mockResolvedValue({
          id: 'pro-1',
          user_id: 'user-1',
          company_id: 'company-1',
          avatar_media_id: 'media-1',
        }),
      },
      users: { update: vi.fn().mockResolvedValue({ id: 'user-1' }) },
      professional_resources: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        create: vi.fn().mockResolvedValue({ id: 'link-1' }),
      },
    };

    const prisma = {
      professionals: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'pro-1',
          user_id: 'user-1',
          company_id: 'company-1',
          branch_ids: ['branch-1'],
          avatar_media_id: null,
        }),
        findMany: vi.fn().mockResolvedValue([{
          id: 'pro-1',
          user_id: 'user-1',
          display_name: 'Hadi',
          resources_links: [{ is_default: true, resource: { id: 'chair-1', name: 'Chair 1' } }],
        }]),
      },
      media: { findFirst: vi.fn().mockResolvedValue({ id: 'media-1' }) },
      resources: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'chair-1',
          company_id: 'company-1',
          branch_id: 'branch-1',
          is_active: true,
        }),
      },
      audit_logs: { create: vi.fn().mockResolvedValue({ id: 'audit-1' }) },
      $transaction: vi.fn(async (callback: any) => callback(tx)),
    } as any;

    const service = new BusinessOpsService(prisma, {} as never);

    const result = await service.updateProfessionalProfile(
      ownerUser(),
      'company-1',
      'pro-1',
      { avatarMediaId: 'media-1', defaultResourceId: 'chair-1' },
    );

    expect(tx.professionals.update).toHaveBeenCalledWith({
      where: { id: 'pro-1' },
      data: { avatar_media_id: 'media-1' },
    });
    expect(tx.users.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { avatar_media_id: 'media-1' },
    });
    expect(tx.professional_resources.deleteMany).toHaveBeenCalledWith({
      where: { professional_id: 'pro-1' },
    });
    expect(tx.professional_resources.create).toHaveBeenCalledWith({
      data: {
        professional_id: 'pro-1',
        resource_id: 'chair-1',
        is_default: true,
        priority: 0,
      },
    });
    expect(result).toMatchObject({ id: 'pro-1', display_name: 'Hadi' });
  });

  it('calculates a professional day with busy booking and free windows', async () => {
    const date = '2026-10-06';
    const start = new Date(`${date}T10:00:00`);
    const end = new Date(`${date}T11:00:00`);

    const prisma = {
      professionals: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'pro-1',
          user_id: 'user-1',
          company_id: 'company-1',
          display_name: 'Hadi',
          avatar_media_id: null,
          specialties: ['Fade'],
          is_active: true,
          branches: [{ branch_id: 'branch-1', is_primary: true, branch: { id: 'branch-1', name: 'Main' } }],
          resources_links: [{
            is_default: true,
            priority: 0,
            resource: { id: 'chair-1', name: 'Hadi Chair', type: 'barber_chair', is_active: true },
          }],
        }),
      },
      professional_schedules: {
        findFirst: vi.fn().mockResolvedValue({
          is_off: false,
          starts_at: '09:00',
          ends_at: '18:00',
        }),
      },
      professional_schedule_exceptions: { findFirst: vi.fn().mockResolvedValue(null) },
      branch_hours: { findFirst: vi.fn().mockResolvedValue(null) },
      appointments: {
        findMany: vi.fn().mockResolvedValue([{
          id: 'appointment-1',
          status: 'confirmed',
          starts_at: start,
          ends_at: end,
          customer: { user: { id: 'customer-user-1', full_name: 'Client One', phone: '+96170000000' } },
          services: [{ quantity: 1, service: { id: 'service-1', name: 'Haircut' } }],
          resources: [{ resource: { id: 'chair-1', name: 'Hadi Chair', type: 'barber_chair' } }],
        }]),
      },
    } as any;

    const service = new BusinessOpsService(prisma, {} as never);
    const result = await service.professionalDay(ownerUser(), 'company-1', 'pro-1', date, 'branch-1');

    expect(result.defaultResource).toMatchObject({ id: 'chair-1', name: 'Hadi Chair' });
    expect(result.schedule).toMatchObject({ isOff: false, startsAt: '09:00', endsAt: '18:00', source: 'professional' });
    expect(result.freeWindows).toEqual([
      { startsAt: '09:00', endsAt: '10:00' },
      { startsAt: '11:00', endsAt: '18:00' },
    ]);
    expect(result.appointments).toEqual([
      expect.objectContaining({
        id: 'appointment-1',
        customer: expect.objectContaining({ name: 'Client One' }),
        services: [{ id: 'service-1', name: 'Haircut', quantity: 1 }],
        resources: [{ id: 'chair-1', name: 'Hadi Chair', type: 'barber_chair' }],
      }),
    ]);
  });
});
