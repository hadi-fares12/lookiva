export const DISCOVERY_SORT_VALUES = [
  'nearest',
  'rating',
  'reviews',
  'price_asc',
  'price_desc',
  'earliest',
  'trending',
  'newest',
] as const;

export type DiscoverySort = (typeof DISCOVERY_SORT_VALUES)[number];

export const DEFAULT_RADIUS_METERS = 1000;
export const MAX_RADIUS = 20000;
export const MAX_LIMIT = 100;
export const DEFAULT_LIMIT = 20;
export const HOME_SECTION_LIMIT = 8;
export const ALLOWED_RADIUS_PRESETS = [250, 500, 1000, 5000];

export const AVAILABLE_NOW_WINDOWS = ['NOW', '30M', '1H', '2H', 'TODAY'] as const;
export type AvailableNowWindow = (typeof AVAILABLE_NOW_WINDOWS)[number];

export const PROFESSIONAL_GENDER_OPTIONS = ['male', 'female', 'any'] as const;
export type ProfessionalGender = (typeof PROFESSIONAL_GENDER_OPTIONS)[number];

export const ENTITY_TYPES = [
  'business',
  'professional',
  'service',
  'category',
  'area',
  'city',
] as const;
export type DiscoveryEntityType = (typeof ENTITY_TYPES)[number];

export const SCORE_WEIGHTS = {
  BUSINESS_NAME_EXACT: 100,
  BUSINESS_NAME_PARTIAL: 60,
  CATEGORY: 50,
  SERVICE_NAME: 45,
  PROFESSIONAL_NAME: 40,
  AREA_CITY: 30,
} as const;
