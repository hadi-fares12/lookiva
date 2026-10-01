import { describe, expect, it, vi } from 'vitest';
import { DiscoveryService } from '../discovery.service';

function companyFixture() {
  return {
    id: 'company-1',
    display_name: 'Hadi Barber',
    slug: 'hadi-barber',
    tagline: 'Cuts and beard grooming',
    description_short: 'Barber',
    cover_media_id: null,
    logo_media_id: null,
    category_ids: ['barber'],
    avg_rating: 4.9,
    review_count: 18,
    follower_count: 25,
    featured_level: null,
    featured_expires_at: null,
    is_verified: true,
    settings: { home_service_enabled: false },
    branches: [{
      id: 'branch-1', name: 'Main', is_main: true, latitude: 33.9, longitude: 35.5,
      home_service_enabled: false,
      city: { name: 'Beirut' }, area: { name: 'Hamra' },
      hours: [{ day_of_week: new Date().getDay(), is_closed: false, opens_at: '00:00', closes_at: '23:59', break_starts_at: null, break_ends_at: null }],
    }],
    services: [{ id: 'service-1', name: 'Haircut', base_price: 10, currency_code: 'USD', discount_percent: null, discount_fixed: null }],
  };
}

function prismaMock() {
  return {
    companies: { findMany: vi.fn(), count: vi.fn() },
    branches: { findMany: vi.fn() },
    services: { findMany: vi.fn() },
    service_translations: { findMany: vi.fn() },
    professionals: { findMany: vi.fn() },
    service_categories: { findMany: vi.fn() },
    posts: { findMany: vi.fn() },
    follows: { findMany: vi.fn() },
    professional_schedules: { findMany: vi.fn() },
    professional_schedule_exceptions: { findMany: vi.fn() },
    appointment_participants: { findMany: vi.fn() },
    $queryRawUnsafe: vi.fn(),
  } as any;
}

describe('DiscoveryService production response contract', () => {
  it('returns canonical items pagination instead of legacy results', async () => {
    const prisma = prismaMock();
    prisma.companies.findMany.mockResolvedValue([companyFixture()]);
    prisma.companies.count.mockResolvedValue(1);
    const service = new DiscoveryService(prisma);

    const response = await (service as any).searchSimple({ limit: 20, offset: 0 });

    expect(response.items).toHaveLength(1);
    expect(response).not.toHaveProperty('results');
    expect(response.hasMore).toBe(false);
    expect(response.items[0]).toMatchObject({
      id: 'company-1',
      companyId: 'company-1',
      companyName: 'Hadi Barber',
      branchId: 'branch-1',
      minPrice: 10,
      currencyCode: 'USD',
      isVerified: true,
    });
  });

  it('returns nearby center/radius metadata and the nearest real branch', async () => {
    const prisma = prismaMock();
    prisma.$queryRawUnsafe.mockResolvedValue([{ company_id: 'company-1', branch_id: 'branch-1', dist: 125 }]);
    prisma.companies.findMany.mockResolvedValue([companyFixture()]);
    const service = new DiscoveryService(prisma);

    const response = await service.getNearby({ lat: 33.9, lon: 35.5, radiusMeters: 1000, limit: 20, offset: 0 });

    expect(response.center).toEqual({ lat: 33.9, lon: 35.5 });
    expect(response.radiusMeters).toBe(1000);
    expect(response.totalInRadius).toBe(1);
    expect(response.items[0]).toMatchObject({ branchId: 'branch-1', distanceMeters: 125 });
  });

  it('marks available-now only when a scheduled professional is not conflicting', async () => {
    const prisma = prismaMock();
    const service = new DiscoveryService(prisma);
    vi.spyOn(service, 'getNearby').mockResolvedValue({
      items: [{ id: 'company-1', companyId: 'company-1', companyName: 'Hadi Barber', branchId: 'branch-1' }],
      total: 1, limit: 20, offset: 0, hasMore: false,
      center: { lat: 33.9, lon: 35.5 }, radiusMeters: 1000, totalInRadius: 1,
    });
    prisma.professional_schedules.findMany.mockResolvedValue([{ professional_id: 'pro-1', starts_at: '00:00', ends_at: '23:59', break_starts_at: null, break_ends_at: null }]);
    prisma.professional_schedule_exceptions.findMany.mockResolvedValue([]);
    prisma.appointment_participants.findMany.mockResolvedValue([]);

    const response = await service.getAvailableNow({ lat: 33.9, lon: 35.5, radiusMeters: 1000, windowMinutes: 30 });

    expect(response.items).toHaveLength(1);
    expect(response.items[0].availableNow).toBe(true);
    expect(response.windowEndAt.getTime()).toBeGreaterThan(response.windowStartAt.getTime());
  });
});
