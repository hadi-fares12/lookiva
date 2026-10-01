import { describe, it, expect } from 'vitest';
import { UserRole, ScopeType, ROLE_DEFINITIONS } from '@lookiva/shared-types';

describe('UserRole enum integrity', () => {
  const userRoleEntries = Object.keys(UserRole);
  const userRoleValues = Object.values(UserRole) as string[];

  it('should have exactly 14 UserRole entries', () => {
    expect(userRoleEntries.length).toBe(14);
  });

  it('should have unique UserRole values', () => {
    const seen = new Set<string>();
    const duplicates: string[] = [];
    for (const value of userRoleValues) {
      if (seen.has(value)) duplicates.push(value);
      seen.add(value);
    }
    expect(duplicates).toEqual([]);
  });

  it('should contain all expected UserRole keys', () => {
    const expected: readonly string[] = [
      'SuperAdmin',
      'PlatformAdmin',
      'PlatformModerator',
      'PlatformSupport',
      'CountryManager',
      'BusinessOwner',
      'BusinessManager',
      'BranchManager',
      'Professional',
      'Staff',
      'PremiumCustomer',
      'Customer',
      'Guest',
    ];
    const missing = expected.filter((k) => !userRoleEntries.includes(k));
    expect(missing, `Missing UserRole keys: ${missing.join(', ')}`).toEqual([]);
  });

  it('ROLE_DEFINITIONS should cover every UserRole', () => {
    const definedRoles = new Set(ROLE_DEFINITIONS.map((d) => d.key));
    const missing: string[] = [];
    for (const role of userRoleValues as UserRole[]) {
      if (!definedRoles.has(role)) missing.push(role);
    }
    expect(missing, `Missing role definitions: ${missing.join(', ')}`).toEqual([]);
  });
});

describe('ScopeType enum integrity', () => {
  const scopeTypeEntries = Object.keys(ScopeType);
  const scopeTypeValues = Object.values(ScopeType) as string[];

  it('should have exactly 3 ScopeType entries', () => {
    expect(scopeTypeEntries.length).toBe(3);
  });

  it('should contain Platform, Company, Branch', () => {
    expect(scopeTypeEntries).toContain('Platform');
    expect(scopeTypeEntries).toContain('Company');
    expect(scopeTypeEntries).toContain('Branch');
  });

  it('every ROLE_DEFINITIONS.scopeType should be a valid ScopeType value', () => {
    const validScopes = new Set(scopeTypeValues);
    for (const def of ROLE_DEFINITIONS) {
      expect(validScopes.has(def.scopeType)).toBe(true);
    }
  });
});
