import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HomeSectionKey } from '@lookiva/shared-types';
import { DiscoverySearchDto, NearbyDto, HomeSectionsDto } from './dto/search.dto';

type EntityType = 'business' | 'professional' | 'service' | 'category';

interface DiscoveryResult {
  entityType: EntityType;
  id: string;
  name: string;
  subtitle?: string;
  coverMediaId?: string | null;
  rating?: number | null;
  reviewCount?: number;
  distanceMeters?: number;
  priceFrom?: number;
  category?: string;
  matchScore?: number;
}

interface DiscoveryBusinessResult {
  id: string;
  companyId: string;
  companyName: string;
  branchId?: string | null;
  branchName?: string | null;
  slug?: string | null;
  coverMediaId?: string | null;
  logoMediaId?: string | null;
  categoryIds?: string[];
  primaryCategoryName?: string | null;
  cityName?: string | null;
  areaName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  distanceMeters?: number | null;
  avgRating?: number | null;
  reviewCount?: number;
  minPrice?: number | null;
  maxPrice?: number | null;
  currencyCode?: string | null;
  isOpen?: boolean | null;
  isVerified?: boolean;
  isFeatured?: boolean;
  homeServiceAvailable?: boolean;
  availableNow?: boolean;
  nextAvailableAt?: Date | null;
  topServiceName?: string | null;
  topServiceId?: string | null;
  tagline?: string | null;
  followerCount?: number;
  matchScore?: number | null;
  promotionLabel?: string | null;
  promotionDiscountPercent?: number | null;
}

interface PagedResults {
  items: DiscoveryBusinessResult[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  appliedFilters?: Record<string, unknown>;
  searchLatencyMs?: number;
}

interface NearbyResults extends PagedResults {
  center: { lat: number; lon: number };
  radiusMeters: number;
  totalInRadius: number;
}

interface HomeSection {
  key: HomeSectionKey;
  title: string;
  items: any[];
  layout?: 'grid' | 'carousel' | 'list' | 'hero';
  order?: number;
  hasMore?: boolean;
}

interface SuggestionItem {
  type: string;
  id: string;
  text: string; subtext?: string;
}

function distanceBetweenMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);

  constructor(private readonly prisma: PrismaService) {}

  private toBusinessResult(company: any, options: { distanceMeters?: number; matchScore?: number; availableNow?: boolean; nextAvailableAt?: Date | null; branchId?: string | null } = {}): DiscoveryBusinessResult {
    const branches = Array.isArray(company?.branches) ? company.branches : [];
    const branch = (options.branchId ? branches.find((b: any) => b?.id === options.branchId) : null) ?? branches.find((b: any) => b?.is_main) ?? branches[0] ?? null;
    const services = Array.isArray(company?.services) ? company.services : [];
    const prices = services
      .map((service: any) => Number(service?.base_price))
      .filter((value: number) => Number.isFinite(value));
    const cheapest = services
      .filter((service: any) => Number.isFinite(Number(service?.base_price)))
      .sort((a: any, b: any) => Number(a.base_price) - Number(b.base_price))[0] ?? null;
    const promotionService = services.find((service: any) => Number(service?.discount_percent ?? 0) > 0 || Number(service?.discount_fixed ?? 0) > 0) ?? null;
    const isFeatured = company?.featured_level != null && (!company?.featured_expires_at || new Date(company.featured_expires_at) > new Date());

    return {
      id: company.id,
      companyId: company.id,
      companyName: company.display_name ?? company.name ?? 'Business',
      branchId: branch?.id ?? null,
      branchName: branch?.name ?? null,
      slug: company.slug ?? null,
      coverMediaId: company.cover_media_id ?? null,
      logoMediaId: company.logo_media_id ?? null,
      categoryIds: Array.isArray(company.category_ids) ? company.category_ids : [],
      cityName: branch?.city?.name ?? null,
      areaName: branch?.area?.name ?? null,
      latitude: branch?.latitude ?? null,
      longitude: branch?.longitude ?? null,
      distanceMeters: options.distanceMeters ?? null,
      avgRating: company.avg_rating ?? null,
      reviewCount: company.review_count ?? 0,
      minPrice: prices.length ? Math.min(...prices) : null,
      maxPrice: prices.length ? Math.max(...prices) : null,
      currencyCode: cheapest?.currency_code ?? null,
      isOpen: branches.length ? this.isCompanyOpenNow(company) : null,
      isVerified: Boolean(company.is_verified),
      isFeatured,
      homeServiceAvailable: Boolean(company?.settings?.home_service_enabled || branch?.home_service_enabled),
      availableNow: Boolean(options.availableNow),
      nextAvailableAt: options.nextAvailableAt ?? null,
      topServiceName: cheapest?.name ?? null,
      topServiceId: cheapest?.id ?? null,
      tagline: company.tagline ?? company.description_short ?? null,
      followerCount: company.follower_count ?? 0,
      matchScore: options.matchScore ?? null,
      promotionLabel: promotionService ? 'Offer' : null,
      promotionDiscountPercent: promotionService?.discount_percent ?? null,
    };
  }

  private paged(items: DiscoveryBusinessResult[], total: number, limit: number, offset: number, extra: Partial<PagedResults> = {}): PagedResults {
    return {
      items,
      total,
      limit,
      offset,
      hasMore: offset + items.length < total,
      ...extra,
    };
  }

  async search(dto: DiscoverySearchDto): Promise<PagedResults> {
    try {
      return await this.searchAdvanced(dto);
    } catch (err) {
      this.logger.warn(
      `Advanced search failed, falling back to simple search: ${(err as Error).message}`,
      );
      return await this.searchSimple(dto);
    }
  }

  private async searchAdvanced(dto: DiscoverySearchDto): Promise<PagedResults> {
    const {
      q,
      limit = 20,
      offset = 0,
      minRating,
      maxPrice,
      minPrice,
      sort = 'relevance',
      categoryIds,
      professionalIds,
      openNow,
      availableNow,
      homeService,
      verified,
      promotion,
      cityId,
      areaId,
      lat,
      lon,
      radiusMeters = 5000,
    } = dto;

    const scoredCompanies = new Map<string, { score: number; distance?: number }>();

    if (q) {
      const qLower = q.toLowerCase();
      const likePattern = `%${qLower}%`;

      try {
        const companiesByName = await this.prisma.companies.findMany({
          where: {
            is_active: true,
            deleted_at: null,
            OR: [
              { display_name: { contains: q, mode: 'insensitive' } },
              { description_short: { contains: q, mode: 'insensitive' } },
            ],
          },
          select: {
            id: true,
            display_name: true,
            description_short: true,
          },
        });

        for (const c of companiesByName) {
          const dn = c.display_name.toLowerCase();
          let score = 0;
          if (dn === qLower) score += 100;
          else if (dn.includes(qLower)) score += 50;
          else if (c.description_short?.toLowerCase().includes(qLower)) score += 10;
          const existing = scoredCompanies.get(c.id) || { score: 0 };
          scoredCompanies.set(c.id, { ...existing, score: existing.score + score });
        }
      } catch (err) {
        this.logger.warn(`Company name search failed: ${(err as Error).message}`);
      }

      try {
        const servicesMatch = await this.prisma.services.findMany({
          where: {
            is_active: true,
            deleted_at: null,
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
            ],
          },
          select: { id: true, company_id: true, name: true },
        });
        for (const s of servicesMatch) {
          const existing = scoredCompanies.get(s.company_id) || { score: 0 };
          scoredCompanies.set(s.company_id, { ...existing, score: existing.score + 30 });
        }
      } catch (err) {
        this.logger.warn(`Service search failed: ${(err as Error).message}`);
      }

      try {
        const serviceTranslationsMatch = await this.prisma.service_translations.findMany({
          where: { name: { contains: q, mode: 'insensitive' } },
          select: { service_id: true },
        });
        const svcIds = serviceTranslationsMatch.map((st) => st.service_id);
        if (svcIds.length > 0) {
          const svcCompanies = await this.prisma.services.findMany({
            where: { id: { in: svcIds } },
            select: { company_id: true },
          });
          for (const s of svcCompanies) {
            const existing = scoredCompanies.get(s.company_id) || { score: 0 };
            scoredCompanies.set(s.company_id, { ...existing, score: existing.score + 30 });
          }
        }
      } catch (err) {
        this.logger.warn(`Service translation search failed: ${(err as Error).message}`);
      }

      try {
        const prosMatch = await this.prisma.professionals.findMany({
          where: {
            is_active: true,
            deleted_at: null,
            OR: [
              { display_name: { contains: q, mode: 'insensitive' } },
              { specialties: { hasSome: [q] } },
              { bio: { contains: q, mode: 'insensitive' } },
            ],
          },
          select: { id: true, company_id: true, display_name: true },
        });
        for (const p of prosMatch) {
          const existing = scoredCompanies.get(p.company_id) || { score: 0 };
          scoredCompanies.set(p.company_id, { ...existing, score: existing.score + 40 });
        }
      } catch (err) {
        this.logger.warn(`Professional search failed: ${(err as Error).message}`);
      }

      try {
        const catsMatch = await this.prisma.service_categories.findMany({
          where: { name: { contains: q, mode: 'insensitive' }, is_active: true },
          select: { id: true },
        });
        const catIds = catsMatch.map((c) => c.id);
        if (catIds.length > 0) {
          const catCompanies = await this.prisma.companies.findMany({
            where: { category_ids: { hasSome: catIds }, is_active: true, deleted_at: null },
            select: { id: true },
          });
          for (const c of catCompanies) {
            const existing = scoredCompanies.get(c.id) || { score: 0 };
            scoredCompanies.set(c.id, { ...existing, score: existing.score + 20 });
          }
        }
      } catch (err) {
        this.logger.warn(`Category search failed: ${(err as Error).message}`);
      }

      if (cityId || areaId) {
        try {
          const locCompanies = await this.prisma.companies.findMany({
          where: {
            is_active: true,
            deleted_at: null,
            ...(cityId ? { city_id: cityId } : {}),
          },
          select: { id: true, city_id: true },
        });
        for (const c of locCompanies) {
          const existing = scoredCompanies.get(c.id) || { score: 0 };
          scoredCompanies.set(c.id, { ...existing, score: existing.score + 20 });
        }
      } catch (err) {
        this.logger.warn(`Location scoring failed: ${(err as Error).message}`);
      }
    }
    }

    const whereBase: any = {
      is_active: true,
      deleted_at: null,
      ...(verified ? { is_verified: true } : {}),
      ...(categoryIds && categoryIds.length > 0 ? { category_ids: { hasSome: categoryIds } } : {}),
      ...(minRating != null ? { avg_rating: { gte: minRating } } : {}),
    };

    if (minPrice != null || maxPrice != null) {
      try {
        const priceWhere: any = { is_active: true, deleted_at: null };
        if (minPrice != null) priceWhere.base_price = { ...(priceWhere.base_price || {}), gte: minPrice };
        if (maxPrice != null) priceWhere.base_price = { ...(priceWhere.base_price || {}), lte: maxPrice };
        const svcs = await this.prisma.services.findMany({
          where: priceWhere,
          select: { company_id: true },
        });
        const cids = Array.from(new Set(svcs.map((s) => s.company_id)));
        if (cids.length > 0) whereBase.id = { in: cids, ...(whereBase.id || {}) };
      } catch (err) {
        this.logger.warn(`Price filter failed: ${(err as Error).message}`);
      }
    }

    if (promotion) {
      try {
        const promoPosts = await this.prisma.posts.findMany({
          where: { is_promotion: true, status: 'published' },
          select: { company_id: true },
        });
        const promoServices = await this.prisma.services.findMany({
          where: {
            is_active: true,
            deleted_at: null,
            OR: [
              { discount_percent: { gt: 0 } },
              { discount_fixed: { gt: 0 } },
            ],
          },
          select: { company_id: true },
        });
        const promoCids = Array.from(
          new Set([
            ...promoPosts.map((p) => p.company_id).filter(Boolean),
            ...promoServices.map((s) => s.company_id),
          ]),
        ) as string[];
        if (promoCids.length > 0) {
          whereBase.id = { in: promoCids, ...(whereBase.id || {}) };
        }
      } catch (err) {
        this.logger.warn(`Promotion filter failed: ${(err as Error).message}`);
      }
    }

    if (cityId || areaId) {
      try {
        const branches = await this.prisma.branches.findMany({
          where: {
            is_active: true,
            deleted_at: null,
            ...(cityId ? { city_id: cityId } : {}),
            ...(areaId ? { area_id: areaId } : {}),
          },
          select: { company_id: true },
        });
        const bcids = Array.from(new Set(branches.map((b) => b.company_id)));
        if (bcids.length > 0) {
          whereBase.id = { in: bcids, ...(whereBase.id || {}) };
        }
      } catch (err) {
        this.logger.warn(`City/area branch filter failed: ${(err as Error).message}`);
      }
    }

    let companyIdsToSearch: string[] | undefined;
    if (scoredCompanies.size > 0 && q) {
      companyIdsToSearch = Array.from(scoredCompanies.keys());
      whereBase.id = { in: companyIdsToSearch, ...(whereBase.id || {}) };
    }

    let companies: any[] = [];
    try {
      companies = await this.prisma.companies.findMany({
        where: whereBase,
        include: {
          settings: true,
          branches: {
            where: { is_active: true, deleted_at: null },
            include: { hours: true, city: { select: { name: true } }, area: { select: { name: true } } },
          },
          services: {
            where: { is_active: true, deleted_at: null },
            take: 20,
            orderBy: { base_price: 'asc' as const },
            select: { id: true, name: true, base_price: true, currency_code: true, discount_percent: true, discount_fixed: true },
          },
        },
      });
    } catch (err) {
      this.logger.error(`Company fetch failed: ${(err as Error).message}`);
      return this.paged([], 0, limit, offset);
    }

    if (lat != null && lon != null) {
      const withGeo: any[] = [];
      try {
        const geoResults = await this.prisma.$queryRawUnsafe<any[]>(
          `SELECT b.company_id, b.id as branch_id, bl.point,
            ST_Distance(bl.point::geometry, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geometry) as dist_meters
           FROM branches b
           JOIN branch_locations bl ON bl.branch_id = b.id
           WHERE b.is_active = true AND b.deleted_at IS NULL
             AND ST_DWithin(bl.point::geometry, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geometry, $3)`,
          lon,
          lat,
          radiusMeters,
        );
        const distMap = new Map<string, number>();
        for (const gr of geoResults) {
          const existing = distMap.get(gr.company_id);
          if (existing == null || gr.dist_meters < existing) {
            distMap.set(gr.company_id, Number(gr.dist_meters));
          }
        }
        companies = companies.filter((c) => distMap.has(c.id));
        for (const c of companies) {
          const d = distMap.get(c.id);
          if (d != null) {
            const sc = scoredCompanies.get(c.id) || { score: 0 };
            scoredCompanies.set(c.id, { ...sc, distance: d });
          }
        }
      } catch (err) {
        this.logger.warn(`PostGIS query failed, using Haversine fallback: ${(err as Error).message}`);
        for (const c of companies) {
          let minDist: number | undefined;
          for (const b of c.branches || []) {
            if (b.latitude != null && b.longitude != null) {
              const d = distanceBetweenMeters(lat, lon, b.latitude, b.longitude);
              if (d <= radiusMeters && (minDist == null || d < minDist)) minDist = d;
            }
          }
          if (minDist != null) {
            const sc = scoredCompanies.get(c.id) || { score: 0 };
            scoredCompanies.set(c.id, { ...sc, distance: minDist });
            withGeo.push(c);
          }
        }
        companies = withGeo;
      }
    }

    if (openNow) {
      companies = companies.filter((c) => this.isCompanyOpenNow(c));
    }

    const total = companies.length;

    const results: DiscoveryBusinessResult[] = companies.map((c) => {
      const sc = scoredCompanies.get(c.id) || { score: 0 };
      return this.toBusinessResult(c, { distanceMeters: sc.distance, matchScore: sc.score });
    });

    switch (sort) {
      case 'nearest':
        results.sort((a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity));
        break;
      case 'lowPrice':
        results.sort((a, b) => (a.minPrice ?? Infinity) - (b.minPrice ?? Infinity));
        break;
      case 'highPrice':
        results.sort((a, b) => (b.minPrice ?? 0) - (a.minPrice ?? 0));
        break;
      case 'topRated':
        results.sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0));
        break;
      case 'newest':
      case 'mostBooked':
        break;
      case 'relevance':
      default:
        results.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
    }

    const items = results.slice(offset, offset + limit);
    return this.paged(items, total, limit, offset, {
      appliedFilters: { categoryIds, minRating, minPrice, maxPrice, openNow, homeService, verified, availableNow },
      searchLatencyMs: 0,
    });
  }

  private isCompanyOpenNow(company: any): boolean {
    try {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      for (const branch of company.branches || []) {
        for (const h of branch.hours || []) {
          if (h.day_of_week === dayOfWeek && !h.is_closed) {
            if (h.opens_at && h.closes_at) {
              if (timeStr >= h.opens_at && timeStr <= h.closes_at) {
                if (h.break_starts_at && h.break_ends_at && timeStr >= h.break_starts_at && timeStr <= h.break_ends_at) {
                  continue;
                }
                return true;
              }
            }
          }
        }
      }
      return false;
    } catch {
      return true;
    }
  }

  private async searchSimple(dto: DiscoverySearchDto): Promise<PagedResults> {
    const { q, limit = 20, offset = 0 } = dto;
    try {
      const where: any = { is_active: true, deleted_at: null };
      if (q) {
        where.display_name = { contains: q, mode: 'insensitive' };
      }
      const [companies, total] = await Promise.all([
        this.prisma.companies.findMany({
          where,
          skip: offset,
          take: limit,
          include: {
            settings: true,
            branches: {
              where: { is_active: true, deleted_at: null },
              include: { hours: true, city: { select: { name: true } }, area: { select: { name: true } } },
            },
            services: {
              where: { is_active: true, deleted_at: null },
              take: 20,
              orderBy: { base_price: 'asc' },
              select: { id: true, name: true, base_price: true, currency_code: true, discount_percent: true, discount_fixed: true },
            },
          },
        }),
        this.prisma.companies.count({ where }),
      ]);
      const items = companies.map((c: any) => this.toBusinessResult(c));
      return this.paged(items, total, limit, offset, { searchLatencyMs: 0 });
    } catch (err) {
      this.logger.error(`Simple search failed: ${(err as Error).message}`);
      return this.paged([], 0, limit, offset);
    }
  }

  async getNearby(dto: NearbyDto): Promise<NearbyResults> {
    const { lat, lon, radiusMeters = 1000, limit = 20, offset = 0, categoryIds, openNow, verified, minRating } = dto;
    try {
      let branchesWithDistance: Array<{ company_id: string; branch_id?: string; dist: number }> = [];
      try {
        const geoRows = await this.prisma.$queryRawUnsafe<any[]>(
          `SELECT b.company_id, b.id as branch_id,
            ST_Distance(bl.point::geometry, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geometry) as dist
           FROM branches b
           JOIN branch_locations bl ON bl.branch_id = b.id
           WHERE b.is_active = true AND b.deleted_at IS NULL
             AND ST_DWithin(bl.point::geometry, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geometry, $3)
           ORDER BY dist ASC`,
          lon,
          lat,
          radiusMeters,
        );
        branchesWithDistance = geoRows.map((r) => ({
          company_id: r.company_id,
          branch_id: r.branch_id,
          dist: Number(r.dist),
        }));
      } catch (err) {
        this.logger.warn(`PostGIS nearby failed, Haversine fallback: ${(err as Error).message}`);
        const allBranches = await this.prisma.branches.findMany({
          where: { is_active: true, deleted_at: null, latitude: { not: null }, longitude: { not: null } },
          select: { id: true, company_id: true, latitude: true, longitude: true },
        });
        for (const b of allBranches) {
          if (b.latitude != null && b.longitude != null) {
            const d = distanceBetweenMeters(lat, lon, b.latitude, b.longitude);
            if (d <= radiusMeters) {
              branchesWithDistance.push({ company_id: b.company_id, branch_id: b.id, dist: d });
            }
          }
        }
        branchesWithDistance.sort((a, b) => a.dist - b.dist);
      }

      const cidDist = new Map<string, number>();
      const cidBranch = new Map<string, string>();
      for (const bd of branchesWithDistance) {
        const existing = cidDist.get(bd.company_id);
        if (existing == null || bd.dist < existing) {
          cidDist.set(bd.company_id, bd.dist);
          if (bd.branch_id) cidBranch.set(bd.company_id, bd.branch_id);
        }
      }
      const cidsOrdered = Array.from(cidDist.keys());
      if (cidsOrdered.length === 0) {
        return { ...this.paged([], 0, limit, offset), center: { lat, lon }, radiusMeters, totalInRadius: 0 };
      }

      const where: any = {
        id: { in: cidsOrdered },
        is_active: true,
        deleted_at: null,
        ...(verified ? { is_verified: true } : {}),
        ...(categoryIds?.length ? { category_ids: { hasSome: categoryIds } } : {}),
        ...(minRating != null ? { avg_rating: { gte: minRating } } : {}),
      };
      const companies = await this.prisma.companies.findMany({
        where,
        include: {
          settings: true,
          branches: {
            where: { is_active: true, deleted_at: null },
            include: { hours: true, city: { select: { name: true } }, area: { select: { name: true } } },
          },
          services: {
            where: { is_active: true, deleted_at: null },
            take: 20,
            orderBy: { base_price: 'asc' as const },
            select: { id: true, name: true, base_price: true, currency_code: true, discount_percent: true, discount_fixed: true },
          },
        },
      });

      let filtered = companies;
      if (openNow) filtered = filtered.filter((c) => this.isCompanyOpenNow(c));
      filtered.sort(
        (a, b) =>
          (cidDist.get(a.id) ?? Infinity) - (cidDist.get(b.id) ?? Infinity),
      );

      const total = filtered.length;
      const items = filtered
        .slice(offset, offset + limit)
        .map((c: any) => this.toBusinessResult(c, { distanceMeters: cidDist.get(c.id), branchId: cidBranch.get(c.id) }));
      return {
        ...this.paged(items, total, limit, offset),
        center: { lat, lon },
        radiusMeters,
        totalInRadius: total,
      };
    } catch (err) {
      this.logger.error(`getNearby failed: ${(err as Error).message}`);
      return { ...this.paged([], 0, limit, offset), center: { lat, lon }, radiusMeters, totalInRadius: 0 };
    }
  }

  async getAvailableNow(dto: NearbyDto): Promise<PagedResults & { windowStartAt: Date; windowEndAt: Date }> {
    const windowStartAt = new Date();
    const windowMinutes = Math.min(Math.max(dto.windowMinutes ?? 120, 15), 1440);
    const windowEndAt = new Date(windowStartAt.getTime() + windowMinutes * 60 * 1000);
    try {
      const nearby = await this.getNearby({ ...dto, openNow: true });
      const availableItems: DiscoveryBusinessResult[] = [];
      const currentTime = `${String(windowStartAt.getHours()).padStart(2, '0')}:${String(windowStartAt.getMinutes()).padStart(2, '0')}`;
      const dayStart = new Date(windowStartAt);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      for (const item of nearby.items) {
        const branchId = item.branchId;
        if (!branchId) continue;
        const schedules = await this.prisma.professional_schedules.findMany({
          where: {
            branch_id: branchId,
            is_off: false,
            day_of_week: windowStartAt.getDay(),
            OR: [{ effective_from: null }, { effective_from: { lte: windowStartAt } }],
            AND: [{ OR: [{ effective_to: null }, { effective_to: { gte: windowStartAt } }] }],
          },
          select: { professional_id: true, starts_at: true, ends_at: true, break_starts_at: true, break_ends_at: true },
        });
        let availableProfessionalIds = schedules
          .filter((schedule) => {
            if (schedule.starts_at && currentTime < schedule.starts_at) return false;
            if (schedule.ends_at && currentTime >= schedule.ends_at) return false;
            if (schedule.break_starts_at && schedule.break_ends_at && currentTime >= schedule.break_starts_at && currentTime < schedule.break_ends_at) return false;
            return true;
          })
          .map((schedule) => schedule.professional_id);
        if (!availableProfessionalIds.length) continue;

        const exceptions = await this.prisma.professional_schedule_exceptions.findMany({
          where: {
            professional_id: { in: availableProfessionalIds },
            OR: [{ branch_id: branchId }, { branch_id: null }],
            exception_date: { gte: dayStart, lt: dayEnd },
            is_off: true,
          },
          select: { professional_id: true },
        });
        const offIds = new Set(exceptions.map((exception) => exception.professional_id));
        availableProfessionalIds = availableProfessionalIds.filter((id) => !offIds.has(id));
        if (!availableProfessionalIds.length) continue;

        const conflicts = await this.prisma.appointment_participants.findMany({
          where: {
            professional_id: { in: availableProfessionalIds },
            appointment: {
              branch_id: branchId,
              status: { in: ['confirmed', 'checked_in', 'in_service'] },
              starts_at: { lt: windowEndAt },
              ends_at: { gt: windowStartAt },
            },
          },
          select: { professional_id: true },
        });
        const busyIds = new Set(conflicts.map((conflict) => conflict.professional_id));
        if (!availableProfessionalIds.some((id) => !busyIds.has(id))) continue;
        availableItems.push({ ...item, availableNow: true, nextAvailableAt: windowStartAt });
      }
      return {
        ...this.paged(availableItems, availableItems.length, nearby.limit, nearby.offset),
        windowStartAt,
        windowEndAt,
      };
    } catch (err) {
      this.logger.error(`getAvailableNow failed: ${(err as Error).message}`);
      return {
        ...this.paged([], 0, dto.limit ?? 20, dto.offset ?? 0),
        windowStartAt,
        windowEndAt,
      };
    }
  }

  async getHomeSections(dto: HomeSectionsDto & { userId?: string }): Promise<{ sections: HomeSection[]; personalizedAt: Date | null; refreshInSeconds: number }> {
    const { lat, lon, limit = 8, userId } = dto;
    const sections: HomeSection[] = [];

    try {
      const featuredCompanies = await this.prisma.companies.findMany({
        where: {
          is_active: true,
          deleted_at: null,
          OR: [{ is_verified: true }, { featured_level: { not: null } }],
        },
        take: limit,
        select: { id: true, display_name: true, cover_media_id: true, avg_rating: true, review_count: true },
      });
      sections.push({
        key: HomeSectionKey.ForYou,
        title: 'For You',
        items: featuredCompanies.map((c: any) => ({
          entityType: 'business', id: c.id, name: c.display_name, coverMediaId: c.cover_media_id, rating: c.avg_rating, reviewCount: c.review_count,
        })),
      });
    } catch (err) {
      this.logger.warn(`for_you section failed: ${(err as Error).message}`);
      sections.push({ key: HomeSectionKey.ForYou, title: 'For You', items: [] });
    }

    let nearYouItems: any[] = [];
    if (lat != null && lon != null) {
      try {
        const nr = await this.getNearby({ lat, lon, radiusMeters: 5000, limit, offset: 0 });
        nearYouItems = nr.items.slice(0, limit);
      } catch {
        nearYouItems = [];
      }
    }
    if (nearYouItems.length === 0) {
      try {
        const pop = await this.prisma.companies.findMany({
          where: { is_active: true, deleted_at: null },
          orderBy: { view_count: 'desc' as const },
          take: limit,
          select: { id: true, display_name: true, cover_media_id: true, avg_rating: true, review_count: true },
        });
        nearYouItems = pop.map((c: any) => ({ entityType: 'business', id: c.id, name: c.display_name, coverMediaId: c.cover_media_id, rating: c.avg_rating, reviewCount: c.review_count }));
      } catch {
        nearYouItems = [];
      }
    }
    sections.push({ key: HomeSectionKey.NearYou, title: 'Near You', items: nearYouItems });

    let availableNowItems: any[] = [];
    try {
      if (lat != null && lon != null) {
        const an = await this.getAvailableNow({ lat, lon, radiusMeters: 5000, limit, offset: 0 });
        availableNowItems = an.items.slice(0, limit);
      }
    } catch {
      availableNowItems = [];
    }
    sections.push({ key: HomeSectionKey.AvailableNow, title: 'Available Now', items: availableNowItems });

    try {
      const trending = await this.prisma.companies.findMany({
        where: { is_active: true, deleted_at: null },
        orderBy: { view_count: 'desc' as const },
        take: limit,
        select: { id: true, display_name: true, cover_media_id: true, avg_rating: true, review_count: true },
      });
      sections.push({
        key: HomeSectionKey.Trending,
        title: 'Trending',
        items: trending.map((c: any) => ({
          entityType: 'business', id: c.id, name: c.display_name, coverMediaId: c.cover_media_id, rating: c.avg_rating, reviewCount: c.review_count,
        })),
      });
    } catch (err) {
      this.logger.warn(`trending section failed: ${(err as Error).message}`);
      sections.push({ key: HomeSectionKey.Trending, title: 'Trending', items: [] });
    }

    try {
      const topRated = await this.prisma.companies.findMany({
        where: { is_active: true, deleted_at: null, review_count: { gt: 0 } },
        orderBy: [{ avg_rating: 'desc' as const }, { review_count: 'desc' as const }],
        take: limit,
        select: { id: true, display_name: true, cover_media_id: true, avg_rating: true, review_count: true },
      });
      sections.push({
        key: HomeSectionKey.TopRated,
        title: 'Top Rated',
        items: topRated.map((c: any) => ({
          entityType: 'business', id: c.id, name: c.display_name, coverMediaId: c.cover_media_id, rating: c.avg_rating, reviewCount: c.review_count,
        })),
      });
    } catch (err) {
      this.logger.warn(`top_rated section failed: ${(err as Error).message}`);
      sections.push({ key: HomeSectionKey.TopRated, title: 'Top Rated', items: [] });
    }

    try {
      const bestValue = await this.prisma.companies.findMany({
        where: { is_active: true, deleted_at: null, avg_rating: { not: null } },
        orderBy: { avg_rating: 'desc' as const },
        take: limit,
        select: { id: true, display_name: true, cover_media_id: true, avg_rating: true, review_count: true },
      });
      sections.push({
        key: HomeSectionKey.BestValue,
        title: 'Best Value',
        items: bestValue.map((c: any) => ({
          entityType: 'business', id: c.id, name: c.display_name, coverMediaId: c.cover_media_id, rating: c.avg_rating, reviewCount: c.review_count,
        })),
      });
    } catch (err) {
      this.logger.warn(`best_value section failed: ${(err as Error).message}`);
      sections.push({ key: HomeSectionKey.BestValue, title: 'Best Value', items: [] });
    }

    try {
      const lastMinute = await this.prisma.companies.findMany({
        where: { is_active: true, deleted_at: null, booking_enabled: true },
        take: limit,
        select: { id: true, display_name: true, cover_media_id: true, avg_rating: true, review_count: true },
      });
      sections.push({
        key: HomeSectionKey.LastMinute,
        title: 'Last Minute',
        items: lastMinute.map((c: any) => ({
          entityType: 'business', id: c.id, name: c.display_name, coverMediaId: c.cover_media_id, rating: c.avg_rating, reviewCount: c.review_count,
        })),
      });
    } catch (err) {
      this.logger.warn(`last_minute section failed: ${(err as Error).message}`);
      sections.push({ key: HomeSectionKey.LastMinute, title: 'Last Minute', items: [] });
    }

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const newNearYou = await this.prisma.companies.findMany({
        where: { is_active: true, deleted_at: null, created_at: { gte: thirtyDaysAgo } },
        orderBy: { created_at: 'desc' as const },
        take: limit,
        select: { id: true, display_name: true, cover_media_id: true, avg_rating: true, review_count: true },
      });
      sections.push({
        key: HomeSectionKey.NewNearYou,
        title: 'New Near You',
        items: newNearYou.map((c: any) => ({
          entityType: 'business', id: c.id, name: c.display_name, coverMediaId: c.cover_media_id, rating: c.avg_rating, reviewCount: c.review_count,
        })),
      });
    } catch (err) {
      this.logger.warn(`new_near_you section failed: ${(err as Error).message}`);
      sections.push({ key: HomeSectionKey.NewNearYou, title: 'New Near You', items: [] });
    }

    try {
      const offersCompaniesIds = new Set<string>();
      try {
        const promoPosts = await this.prisma.posts.findMany({
          where: { is_promotion: true, status: 'published' },
          select: { company_id: true },
        });
        for (const p of promoPosts) if (p.company_id) offersCompaniesIds.add(p.company_id);
      } catch {
        // Offers remain available from discounted services when promotional posts cannot be read.
      }
      try {
        const promoServices = await this.prisma.services.findMany({
          where: {
            is_active: true, deleted_at: null,
            OR: [{ discount_percent: { gt: 0 } }, { discount_fixed: { gt: 0 } }],
          },
          select: { company_id: true },
        });
        for (const s of promoServices) offersCompaniesIds.add(s.company_id);
      } catch {
        // Promotional posts can still populate the section if discounted services cannot be read.
      }
      let offerItems: any[] = [];
      if (offersCompaniesIds.size > 0) {
        const offers = await this.prisma.companies.findMany({
          where: { id: { in: Array.from(offersCompaniesIds) }, is_active: true, deleted_at: null },
          take: limit,
          select: { id: true, display_name: true, cover_media_id: true, avg_rating: true, review_count: true },
        });
        offerItems = offers.map((c: any) => ({
          entityType: 'business', id: c.id, name: c.display_name, coverMediaId: c.cover_media_id, rating: c.avg_rating, reviewCount: c.review_count,
        }));
      }
      sections.push({ key: HomeSectionKey.Offers, title: 'Offers', items: offerItems });
    } catch (err) {
      this.logger.warn(`offers section failed: ${(err as Error).message}`);
      sections.push({ key: HomeSectionKey.Offers, title: 'Offers', items: [] });
    }

    if (userId) {
      try {
        const follows = await this.prisma.follows.findMany({
          where: { follower_user_id: userId, target_type: { in: ['business', 'company'] } },
          select: { company_id: true, target_id: true },
        });
        const fcid = follows.map((f) => f.company_id ?? f.target_id).filter(Boolean) as string[];
        if (fcid.length > 0) {
          const following = await this.prisma.companies.findMany({
            where: { id: { in: fcid }, is_active: true, deleted_at: null },
            take: limit,
            select: { id: true, display_name: true, cover_media_id: true, avg_rating: true, review_count: true },
          });
          sections.push({
            key: HomeSectionKey.Following,
            title: 'Following',
            items: following.map((c: any) => ({
              entityType: 'business', id: c.id, name: c.display_name, coverMediaId: c.cover_media_id, rating: c.avg_rating, reviewCount: c.review_count,
            })),
          });
        }
      } catch (err) {
        this.logger.warn(`following section failed: ${(err as Error).message}`);
      }
    }

    sections.push({ key: HomeSectionKey.RecentlyViewed, title: 'Recently Viewed', items: [] });

    try {
      const popCats = await this.prisma.service_categories.findMany({
        where: { is_active: true },
        orderBy: { sort_order: 'asc' as const },
        take: 12,
        select: { id: true, name: true, icon_key: true, cover_media_id: true },
      });
      sections.push({
        key: HomeSectionKey.PopularCategories,
        title: 'Popular Categories',
        items: popCats.map((c: any) => ({
          entityType: 'category', id: c.id, name: c.name, subtitle: c.icon_key, coverMediaId: c.cover_media_id,
        })),
      });
    } catch (err) {
      this.logger.warn(`popular_categories section failed: ${(err as Error).message}`);
      sections.push({ key: HomeSectionKey.PopularCategories, title: 'Popular Categories', items: [] });
    }

    try {
      const recPros = await this.prisma.professionals.findMany({
        where: { is_active: true, deleted_at: null, OR: [{ is_verified: true }, { review_count: { gt: 0 } }] },
        orderBy: [{ review_count: 'desc' as const }, { avg_rating: 'desc' as const }],
        take: limit,
        select: { id: true, display_name: true, avatar_media_id: true, specialties: true, avg_rating: true, review_count: true },
      });
      sections.push({
        key: HomeSectionKey.RecommendedProfessionals,
        title: 'Recommended Professionals',
        items: recPros.map((p: any) => ({
          entityType: 'professional', id: p.id, name: p.display_name, subtitle: p.specialties?.join?.(', ') || '', coverMediaId: p.avatar_media_id, rating: p.avg_rating, reviewCount: p.review_count,
        })),
      });
    } catch (err) {
      this.logger.warn(`recommended_professionals section failed: ${(err as Error).message}`);
      sections.push({ key: HomeSectionKey.RecommendedProfessionals, title: 'Recommended Professionals', items: [] });
    }

    const normalizedSections = sections.map((section, index) => ({
      ...section,
      layout: section.layout ?? 'carousel',
      order: section.order ?? index + 1,
      hasMore: section.hasMore ?? false,
      items: section.items.map((item: any) => {
        if (item?.entityType === 'business' && !item?.companyName) {
          return {
            id: item.id,
            companyId: item.id,
            companyName: item.name,
            coverMediaId: item.coverMediaId ?? null,
            avgRating: item.rating ?? null,
            reviewCount: item.reviewCount ?? 0,
            distanceMeters: item.distanceMeters ?? null,
            minPrice: item.priceFrom ?? null,
            tagline: item.subtitle ?? null,
            matchScore: item.matchScore ?? null,
          };
        }
        return item;
      }),
    }));

    return {
      sections: normalizedSections,
      personalizedAt: userId ? new Date() : null,
      refreshInSeconds: 60,
    };
  }

  async getSuggestions(q: string, limitArg = 10): Promise<any[]> {
    const suggestions: any[] = [];
    const perLimit = Math.min(3, limitArg);

    try {
      const companies = await this.prisma.companies.findMany({
        where: { display_name: { contains: q, mode: 'insensitive' }, is_active: true, deleted_at: null },
        take: perLimit,
        select: { id: true, display_name: true, description_short: true },
      });
      for (const c of companies) {
        suggestions.push({ type: 'business', id: c.id, text: c.display_name, subtext: c.description_short || undefined });
      }
    } catch (err) {
      this.logger.warn(`Company suggestions failed: ${(err as Error).message}`);
    }

    try {
      const services = await this.prisma.services.findMany({
        where: { name: { contains: q, mode: 'insensitive' }, is_active: true, deleted_at: null },
        take: perLimit,
        select: { id: true, name: true },
      });
      for (const s of services) {
        suggestions.push({ type: 'service', id: s.id, text: s.name, subtext: 'Service' });
      }
    } catch (err) {
      this.logger.warn(`Service suggestions failed: ${(err as Error).message}`);
    }

    try {
      const pros = await this.prisma.professionals.findMany({
        where: { display_name: { contains: q, mode: 'insensitive' }, is_active: true, deleted_at: null },
        take: perLimit,
        select: { id: true, display_name: true, specialties: true },
      });
      for (const p of pros) {
        suggestions.push({ type: 'professional', id: p.id, text: p.display_name, subtext: p.specialties?.[0] || 'Professional' });
      }
    } catch (err) {
      this.logger.warn(`Professional suggestions failed: ${(err as Error).message}`);
    }

    try {
      const areas = await this.prisma.areas.findMany({
        where: { name: { contains: q, mode: 'insensitive' }, is_active: true },
        take: perLimit,
        select: { id: true, name: true },
      });
      for (const a of areas) {
        suggestions.push({ type: 'area', id: a.id, text: a.name, subtext: 'Area' });
      }
    } catch (err) {
      this.logger.warn(`Area suggestions failed: ${(err as Error).message}`);
    }

    try {
      const cities = await this.prisma.cities.findMany({
        where: { name: { contains: q, mode: 'insensitive' }, is_active: true },
        take: perLimit,
        select: { id: true, name: true },
      });
      for (const city of cities) {
        suggestions.push({ type: 'city', id: city.id, text: city.name, subtext: 'City' });
      }
    } catch (err) {
      this.logger.warn(`City suggestions failed: ${(err as Error).message}`);
    }

    return suggestions.slice(0, limitArg);
  }

  async getSearchHistory(userId: string): Promise<any[]> {
    const prisma = this.prisma as any;
    const history = await prisma.search_history.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 20,
    });
    return history.map((h) => ({ id: h.id, query: h.query_text, entityType: h.entity_type, createdAt: h.created_at }));
  }

  async addToSearchHistory(userId: string, queryText: string, entityType?: string): Promise<any> {
    const clean = queryText.trim();
    if (!clean) return null;
    const prisma = this.prisma as any;
    await prisma.search_history.deleteMany({
      where: { user_id: userId, query_text: clean, entity_type: entityType || null },
    });
    const entry = await prisma.search_history.create({
      data: { user_id: userId, query_text: clean, entity_type: entityType || null },
    });
    const overflow = await prisma.search_history.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      skip: 20,
      select: { id: true },
    });
    if (overflow.length) {
      await prisma.search_history.deleteMany({ where: { id: { in: overflow.map((x) => x.id) } } });
    }
    return { id: entry.id, query: entry.query_text, entityType: entry.entity_type, createdAt: entry.created_at };
  }

  async clearSearchHistory(userId: string): Promise<void> {
    const prisma = this.prisma as any;
    await prisma.search_history.deleteMany({ where: { user_id: userId } });
  }

  async removeFromSearchHistory(userId: string, id: string): Promise<void> {
    const prisma = this.prisma as any;
    await prisma.search_history.deleteMany({ where: { id, user_id: userId } });
  }
}
