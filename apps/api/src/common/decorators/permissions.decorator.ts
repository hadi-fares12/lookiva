import { SetMetadata } from '@nestjs/common';
import { PermissionKey } from '@lookiva/shared-types';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...keys: PermissionKey[]) =>
  SetMetadata(PERMISSIONS_KEY, keys);
