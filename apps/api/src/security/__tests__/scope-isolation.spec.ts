import { describe, expect, it, vi } from 'vitest';
import { ScopeType, UserRole } from '@lookiva/shared-types';
import { BookingV2Service } from '../../booking-v2/booking-v2.service';
import { FinanceV2Service } from '../../finance-v2/finance-v2.service';
import { BusinessOpsService } from '../../business-ops/business-ops.service';
import type { AuthenticatedUser } from '../../auth/types/request-with-user';

function userWithScope(input: {
  roleKey: UserRole;
  scopeType: ScopeType;
  companyId?: string;
  branchId?: string;
  scopeId?: string;
}): AuthenticatedUser {
  return {
    id: 'user-1',
    permissions: [],
    roleScopes: [{
      id: 'scope-1',
      roleId: 'role-1',
      roleKey: input.roleKey,
      scopeType: input.scopeType,
      scopeId: input.scopeId ?? input.branchId ?? input.companyId ?? null,
      companyId: input.companyId ?? null,
      branchId: input.branchId ?? null,
    }],
  };
}

describe('business scope isolation', () => {
  it('does not treat a branch scope as company-wide in booking', () => {
    const service = new BookingV2Service({} as never) as any;
    const user = userWithScope({
      roleKey: UserRole.BranchManager,
      scopeType: ScopeType.Branch,
      companyId: 'company-a',
      branchId: 'branch-a',
    });

    expect(service.hasBusinessScope(user, 'company-a')).toBe(false);
    expect(service.hasBusinessScope(user, 'company-a', 'branch-a')).toBe(true);
    expect(service.hasBusinessScope(user, 'company-a', 'branch-b')).toBe(false);
  });

  it('does not treat a branch scope as company-wide in finance', () => {
    const service = new FinanceV2Service({} as never) as any;
    const user = userWithScope({
      roleKey: UserRole.BranchManager,
      scopeType: ScopeType.Branch,
      companyId: 'company-a',
      branchId: 'branch-a',
    });

    expect(service.hasBusinessScope(user, 'company-a')).toBe(false);
    expect(service.hasBusinessScope(user, 'company-a', 'branch-a')).toBe(true);
    expect(service.hasBusinessScope(user, 'company-a', 'branch-b')).toBe(false);
  });

  it('limits business operations to the branch list for a branch-scoped account', () => {
    const service = new BusinessOpsService({} as never) as any;
    const user = userWithScope({
      roleKey: UserRole.BranchManager,
      scopeType: ScopeType.Branch,
      companyId: 'company-a',
      branchId: 'branch-a',
    });

    expect(service.companyAccess(user, 'company-a')).toEqual({
      allBranches: false,
      branchIds: ['branch-a'],
    });
    expect(() => service.assertRequestedBranch(service.companyAccess(user, 'company-a'), 'branch-b')).toThrow();
  });

  it('keeps a true company scope company-wide', () => {
    const service = new BusinessOpsService({} as never) as any;
    const user = userWithScope({
      roleKey: UserRole.BusinessOwner,
      scopeType: ScopeType.Company,
      companyId: 'company-a',
    });

    expect(service.companyAccess(user, 'company-a')).toEqual({
      allBranches: true,
      branchIds: [],
    });
  });
});

describe('appointment operational access', () => {
  it('allows a professional only when they participate in the appointment', async () => {
    const count = vi.fn().mockResolvedValue(1);
    const tx = { appointment_participants: { count } } as any;
    const service = new BookingV2Service({} as never) as any;
    const user = userWithScope({
      roleKey: UserRole.Professional,
      scopeType: ScopeType.Company,
      companyId: 'company-a',
    });

    await expect(service.assertAppointmentAccess(tx, user, {
      id: 'appointment-a',
      company_id: 'company-a',
      branch_id: 'branch-a',
      customer_user_id: 'customer-user',
    }, { customerAllowed: false, professionalAllowed: true })).resolves.toBeUndefined();

    expect(count).toHaveBeenCalledWith({
      where: {
        appointment_id: 'appointment-a',
        professional: { user_id: 'user-1' },
      },
    });
  });

  it('rejects a non-participating professional', async () => {
    const tx = { appointment_participants: { count: vi.fn().mockResolvedValue(0) } } as any;
    const service = new BookingV2Service({} as never) as any;
    const user = userWithScope({
      roleKey: UserRole.Professional,
      scopeType: ScopeType.Company,
      companyId: 'company-a',
    });

    await expect(service.assertAppointmentAccess(tx, user, {
      id: 'appointment-a',
      company_id: 'company-a',
      branch_id: 'branch-a',
      customer_user_id: 'customer-user',
    }, { customerAllowed: false, professionalAllowed: true })).rejects.toThrow('not authorized');
  });
});
