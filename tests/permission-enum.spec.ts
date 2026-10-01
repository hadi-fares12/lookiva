import { describe, it, expect } from 'vitest';
import { PermissionKey, ALL_PERMISSION_KEYS, PERMISSION_DEFINITIONS } from '@lookiva/shared-types';

describe('PermissionKey enum integrity', () => {
  const enumEntries = Object.keys(PermissionKey);
  const enumValues = Object.values(PermissionKey) as string[];

  it('should have at least 112 PermissionKey enum entries', () => {
    expect(enumEntries.length).toBeGreaterThanOrEqual(112);
  });

  it('should have unique string values', () => {
    const seen = new Set<string>();
    const duplicates: string[] = [];
    for (const value of enumValues) {
      if (seen.has(value)) duplicates.push(value);
      seen.add(value);
    }
    expect(duplicates).toEqual([]);
  });

  it('ALL_PERMISSION_KEYS array length should match PermissionKey enum', () => {
    expect(ALL_PERMISSION_KEYS.length).toBe(enumEntries.length);
  });

  it('PERMISSION_DEFINITIONS should have an entry for every PermissionKey', () => {
    const definedKeys = new Set(PERMISSION_DEFINITIONS.map((d) => d.key));
    const missing: string[] = [];
    for (const key of enumValues as PermissionKey[]) {
      if (!definedKeys.has(key)) missing.push(key);
    }
    expect(missing, `Missing definitions: ${missing.join(', ')}`).toEqual([]);
  });

  it('every PERMISSION_DEFINITIONS entry should reference a real PermissionKey', () => {
    const enumSet = new Set(enumValues);
    for (const def of PERMISSION_DEFINITIONS) {
      expect(enumSet.has(def.key)).toBe(true);
    }
  });

  it('should have exactly 112 entries (current snapshot)', () => {
    expect(enumEntries.length).toBe(112);
  });
});
