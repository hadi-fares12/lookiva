import { Request } from 'express';
import { PermissionKey, ScopeType, UserRole } from '@lookiva/shared-types';

export interface UserRoleScope {
  id: string;
  roleId: string;
  roleKey: UserRole;
  scopeType: ScopeType;
  scopeId?: string | null;
  companyId?: string | null;
  branchId?: string | null;
}

export interface AuthenticatedUser {
  id: string;
  email?: string | null;
  phone?: string | null;
  fullName?: string;
  isActive?: boolean;
  permissions: PermissionKey[];
  roleScopes: UserRoleScope[];
}

export interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}
