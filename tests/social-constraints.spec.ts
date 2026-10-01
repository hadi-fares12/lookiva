import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('social.service.ts literal constraints', () => {
  const servicePath = resolve(__dirname, '../apps/api/src/social/social.service.ts');
  const content = readFileSync(servicePath, 'utf-8');

  const FORBIDDEN_LITERALS: readonly string[] = [
    'media:',
    'author_user',
    'parent_id',
  ];

  const ALLOWED_LITERALS: readonly string[] = [
    'media_list',
    'author_user_id',
    'parent_comment_id',
  ];

  it.each(FORBIDDEN_LITERALS)(
    'should NOT contain forbidden literal "%s"',
    (literal) => {
      const regex = new RegExp(
        `(^|[^A-Za-z0-9_])${literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^A-Za-z0-9_]|$)`,
      );
      expect(content).not.toMatch(regex);
    },
  );

  it.each(ALLOWED_LITERALS)(
    'should contain allowed literal "%s"',
    (literal) => {
      expect(content).toContain(literal);
    },
  );

  it('should use author_user_id (not bare author_user) for post filtering', () => {
    expect(content).toContain('author_user_id');
    expect(content).not.toMatch(/[^_]author_user[^_]/);
  });

  it('should use parent_comment_id (not bare parent_id) for comments', () => {
    expect(content).toContain('parent_comment_id');
    expect(content).not.toMatch(/[^_]parent_id/);
  });

  it('should reference media_list relation for posts', () => {
    expect(content).toContain('media_list');
  });
});
