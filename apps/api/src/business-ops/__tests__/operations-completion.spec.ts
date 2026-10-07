import { describe, expect, it, vi } from 'vitest';
import { BusinessOpsService } from '../business-ops.service';

const owner = { id: 'owner', permissions: [], roleScopes: [{ roleKey: 'business_owner', scopeType: 'company', companyId: 'company', scopeId: 'company' }] } as any;
const staff = { id: 'staff', permissions: [], roleScopes: [{ roleKey: 'staff', scopeType: 'branch', companyId: 'company', branchId: 'branch', scopeId: 'branch' }] } as any;

function fixture() {
  const prisma = {
    resources: { findMany: vi.fn().mockResolvedValue([{ id: 'chair' }]) },
    appointment_resources: { findMany: vi.fn().mockResolvedValue([]) },
    branches: { count: vi.fn().mockResolvedValue(1) },
    users: { findFirst: vi.fn().mockResolvedValue({ id: 'person', role_scopes: [] }) },
    roles: { findUnique: vi.fn().mockResolvedValue({ id: 'role' }) },
    user_role_scopes: { upsert: vi.fn().mockResolvedValue({ id: 'scope' }), findFirst: vi.fn(), delete: vi.fn() },
    audit_logs: { create: vi.fn() },
  } as any;
  return { prisma, service: new BusinessOpsService(prisma) };
}

describe('operational completion invariants', () => {
  it('keeps unfinished floor workflows and scopes every appointment to the selected branch', async () => {
    const { service, prisma } = fixture();
    await service.resources(staff, 'company', 'branch');
    const query = prisma.appointment_resources.findMany.mock.calls[0][0];
    expect(query.where.appointment.branch_id).toBe('branch');
    expect(query.where.appointment.OR).toContainEqual({ status: { in: ['checked_in', 'in_progress'] } });
    expect(query.where.appointment.OR).toContainEqual({ status: 'completed', status_history: { none: { reason: 'floor_checked_out' } } });
  });
  it('rejects floor access to a different branch', async () => {
    const { service, prisma } = fixture();
    await expect(service.resources(staff, 'company', 'other')).rejects.toThrow('not authorized');
    expect(prisma.resources.findMany).not.toHaveBeenCalled();
  });
  it('does not let branch staff grant roles', async () => {
    const { service, prisma } = fixture();
    await expect(service.grantStaff(staff, 'company', { identifier: 'a@b.com', roleKey: 'staff', branchId: 'branch' })).rejects.toThrow('owner');
    expect(prisma.user_role_scopes.upsert).not.toHaveBeenCalled();
  });
  it('rejects privilege escalation even by a business owner', async () => {
    const { service } = fixture();
    await expect(service.grantStaff(owner, 'company', { identifier: 'a@b.com', roleKey: 'super_admin' })).rejects.toThrow('cannot be assigned');
  });
  it('binds staff to a branch belonging to the company', async () => {
    const { service, prisma } = fixture();
    await service.grantStaff(owner, 'company', { identifier: 'a@b.com', roleKey: 'staff', branchId: 'branch' });
    expect(prisma.branches.count).toHaveBeenCalled();
    expect(prisma.user_role_scopes.upsert.mock.calls[0][0].create).toMatchObject({ role_key: 'staff', company_id: 'company', branch_id: 'branch', scope_type: 'branch' });
  });
  it('rejects fractional stock movements before writing inventory', async () => {
    const { service } = fixture();
    await expect(service.stockMovement(owner, 'company', 'product', { quantityChange: 1.5 })).rejects.toThrow('integer');
  });
});
