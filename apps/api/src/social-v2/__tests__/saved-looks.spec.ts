import { describe, expect, it, vi } from 'vitest';
import { SocialV2Service } from '../social-v2.service';
const user = { id: 'customer', roleScopes: [] } as any;
describe('saved look navigation', () => {
  it('restricts a requested look to published, undeleted content', async () => {
    const prisma = { follows: { findMany: vi.fn().mockResolvedValue([]) }, posts: { findMany: vi.fn().mockResolvedValue([]) } } as any;
    const result = await new SocialV2Service(prisma, {} as any).feed(user, 30, undefined, 'look');
    expect(prisma.posts.findMany.mock.calls[0][0].where).toMatchObject({ id: 'look', status: 'published', deleted_at: null });
    expect(result.items).toEqual([]);
  });
  it('does not expose removed posts through a customer collection', async () => {
    const prisma = { collections: { findMany: vi.fn().mockResolvedValue([]) } } as any;
    await new SocialV2Service(prisma, {} as any).listCollections(user);
    const query = prisma.collections.findMany.mock.calls[0][0];
    expect(query.where).toEqual({ user_id: 'customer' });
    expect(query.include.items.where).toEqual({ post: { status: 'published', deleted_at: null } });
  });
});
