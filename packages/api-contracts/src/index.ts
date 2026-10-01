import type {
  User,
  UserRole,
  Company,
  Branch,
  BranchHours,
  Professional,
  ProfessionalProfile,
  Service,
  ServiceTranslation,
  Resource,
  Review,
  Notification,
  Media,
  NotificationType,
  HomeSectionKey,
  PaymentMethod,
  PagedResponse,
  DiscoveryBusinessResult,
  Country,
  UserPreference,
  BusinessProfileResponse as SharedBusinessProfileResponse,
  ProfessionalProfileResponse as SharedProfessionalProfileResponse,
  ServiceDetailResponse as SharedServiceDetailResponse,
} from '@lookiva/shared-types';

export interface RegisterRequest {
  email?: string;
  phone?: string;
  password: string;
  firstName: string;
  lastName: string;
  locale?: string;
  acceptTerms: boolean;
  referralCode?: string;
}

export interface LoginRequest {
  identifier: string;
  password: string;
  rememberMe?: boolean;
  deviceName?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
  deviceName?: string;
}

export interface ForgotPasswordRequest {
  identifier: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface VerifyOtpRequest {
  identifier: string;
  otp: string;
  purpose: 'login' | 'verify';
  deviceName?: string;
}

export interface SendOtpRequest {
  identifier: string;
  purpose: 'login' | 'verify';
  channel: 'sms';
}

export interface DiscoverySearchRequest {
  q?: string;
  limit?: number;
  offset?: number;
  minRating?: number;
  maxPrice?: number;
  minPrice?: number;
  sort?:
    | 'relevance'
    | 'nearest'
    | 'lowPrice'
    | 'highPrice'
    | 'earliest'
    | 'trending'
    | 'newest'
    | 'topRated'
    | 'mostBooked';
  categoryIds?: string[];
  professionalIds?: string[];
  openNow?: boolean;
  availableNow?: boolean;
  availableToday?: boolean;
  homeService?: boolean;
  verified?: boolean;
  promotion?: boolean;
  paymentMethods?: string[];
  facilities?: string[];
  cityId?: string;
  areaId?: string;
  tagKeys?: string[];
  genderPreference?: string;
  dateFrom?: Date;
  dateTo?: Date;
  durationMinMinutes?: number;
  durationMaxMinutes?: number;
  priceLevel?: Array<1 | 2 | 3 | 4>;
  lat?: number;
  lon?: number;
  radiusMeters?: number;
}

export interface NearbyRequest {
  lat: number;
  lon: number;
  radiusMeters?: number;
  limit?: number;
  offset?: number;
  categoryIds?: string[];
  openNow?: boolean;
  availableNow?: boolean;
  windowMinutes?: number;
  verified?: boolean;
  minRating?: number;
  sort?: 'nearest' | 'topRated' | 'trending' | 'recommended';
}

export interface BusinessListRequest {
  companyId?: string;
  branchId?: string;
  categoryIds?: string[];
  limit?: number;
  offset?: number;
  sort?: 'name' | 'rating' | 'newest' | 'nearest';
  cityId?: string;
  countryId?: string;
  isActive?: boolean;
  isVerified?: boolean;
  minRating?: number;
  maxRating?: number;
  lat?: number;
  lon?: number;
}

export interface FavoritesCreateRequest {
  companyId: string;
  branchId?: string;
  serviceId?: string;
  professionalId?: string;
}

export interface FollowingCreateRequest {
  targetType: 'company' | 'professional';
  targetId: string;
}

export interface ProfileUpdateRequest {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  bio?: string;
  dateOfBirth?: Date;
  gender?: string;
  avatarMediaId?: string;
  coverMediaId?: string;
  addressLine1?: string;
  addressLine2?: string;
  cityId?: string;
  countryId?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  websiteUrl?: string;
  instagramHandle?: string;
  tiktokHandle?: string;
  facebookUrl?: string;
  linkedinUrl?: string;
  locale?: string;
  themeMode?: string;
}

export interface NotificationPreferencesUpdateRequest {
  emailMarketing?: boolean;
  emailBookings?: boolean;
  emailReviews?: boolean;
  pushMarketing?: boolean;
  pushBookings?: boolean;
  pushReviews?: boolean;
  pushMessages?: boolean;
  pushSystem?: boolean;
  smsBookings?: boolean;
  smsReminders?: boolean;
  nearbyEnabled?: boolean;
  nearbyRadiusMeters?: number;
  autoTranslate?: boolean;
  reducedMotion?: boolean;
  highContrast?: boolean;
  showVerifiedOnly?: boolean;
  defaultPaymentMethodId?: string;
  doNotDisturb?: {
    enabled: boolean;
    startHour?: number;
    endHour?: number;
    timezone?: string;
  };
  mutedTypes?: NotificationType[];
  soundEnabled?: boolean;
  vibrationEnabled?: boolean;
  ledEnabled?: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
  scope?: string;
  idToken?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
  user: UserMeResponse;
  sessionId?: string;
  isNewUser?: boolean;
  onboardingRequired?: boolean;
}

export interface UserMeResponse {
  id: string;
  email?: string | null;
  phone?: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  fullName: string;
  firstName?: string | null;
  lastName?: string | null;
  avatarMediaId?: string | null;
  coverMediaId?: string | null;
  roles: UserRole[];
  locale: string;
  themeMode: string;
  createdAt: Date;
  lastLoginAt?: Date | null;
  isActive: boolean;
  isProfileComplete: boolean;
  onboardingCompleted: boolean;
  customerId?: string | null;
  loyaltyLevel?: string | null;
  loyaltyPoints: number;
  walletBalanceCents?: number | null;
  preferences?: UserPreference | null;
  hasPassword: boolean;
  connectedAccounts: Array<'google' | 'apple' | 'facebook'>;
}

export interface Paged<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  previousOffset?: number | null;
  nextOffset?: number | null;
  totalPages?: number;
  currentPage?: number;
}

export interface PlatformSettingsResponse {
  siteName: string;
  tagline?: string | null;
  logoMediaId?: string | null;
  faviconMediaId?: string | null;
  defaultLocale: string;
  supportedLocales: string[];
  defaultTheme: string;
  availableThemes: string[];
  defaultCurrencyCode: string;
  supportedCurrencies: string[];
  defaultCountryCode: string;
  supportedCountryCodes: string[];
  minBookingNoticeMinutes?: number | null;
  maxBookingAdvanceDays?: number | null;
  defaultCancellationHours?: number | null;
  defaultDepositPercent?: number | null;
  features: Record<string, boolean>;
  maintenanceMode: boolean;
  maintenanceMessage?: string | null;
  supportEmail: string;
  supportPhone?: string | null;
  whatsappNumber?: string | null;
  socialLinks?: Record<string, string> | null;
  legalUrls?: {
    termsOfService?: string | null;
    privacyPolicy?: string | null;
    cookiePolicy?: string | null;
    refundPolicy?: string | null;
  } | null;
  version: string;
}

export interface CountriesResponse {
  items: Country[];
  total: number;
  defaultCountryCode: string;
}

export interface BusinessProfileResponse {
  id: string;
  company: Omit<Company, 'ownerUserId'> & {
    ownerUserId?: string;
  };
  branches: Branch[];
  services: Service[];
  professionals: Professional[];
  mediaCount: number;
  offersCount: number;
  avgRating: number;
  reviewCount: number;
  distanceMeters?: number | null;
  isOpen: boolean;
  hours: BranchHours[];
  facilities: string[];
  languages: string[];
  parking: string[];
  paymentMethods: PaymentMethod[];
  policies: string[];
  coverMediaUrl?: string | null;
  logoMediaUrl?: string | null;
  galleryMediaUrls?: string[] | null;
  categoryNames: Record<string, string>;
  isVerified: boolean;
  isFollowing?: boolean;
  isFavorite?: boolean;
  followerCount: number;
  viewCount: number;
  tagline?: string | null;
  descriptionShort?: string | null;
  nextAvailableAt?: Date | null;
  homeServiceAvailable: boolean;
  walkInsAvailable: boolean;
  onlinePaymentsAvailable: boolean;
  contactEmail?: string | null;
  contactPhone?: string | null;
  whatsapp?: string | null;
  websiteUrl?: string | null;
  facebookUrl?: string | null;
  instagramHandle?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  addressText?: string | null;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BranchResponse {
  id: string;
  companyId: string;
  companyName: string;
  companySlug: string;
  name: string;
  slug: string;
  description?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  postalCode?: string | null;
  cityName?: string | null;
  areaName?: string | null;
  countryCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  distanceMeters?: number | null;
  phone?: string | null;
  phoneSecondary?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  coverMediaUrl?: string | null;
  hours: BranchHours[];
  isOpen: boolean;
  timezone?: string | null;
  bookingEnabled: boolean;
  walkInsEnabled: boolean;
  homeServiceEnabled: boolean;
  homeServiceRadiusMeters?: number | null;
  facilities: string[];
  paymentMethods: string[];
  servicesCount: number;
  professionalsCount: number;
  sortOrder: number;
  isMain: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProfessionalProfileResponse {
  id: string;
  professional: Professional;
  profile: ProfessionalProfile;
  companyName: string;
  companyId: string;
  companySlug: string;
  branches: Branch[];
  services: Service[];
  mediaCount: number;
  portfolioMediaIds: string[];
  reelMediaIds: string[];
  portfolioMediaUrls?: string[] | null;
  reelMediaUrls?: string[] | null;
  avgRating: number;
  reviewCount: number;
  followerCount: number;
  isFollowing: boolean;
  isVerified: boolean;
  specialties: string[];
  yearsExperience?: number | null;
  nextAvailableAt?: Date | null;
  languagesSpoken: string[];
  certifications?: string[] | null;
  education?: string[] | null;
  awards?: string[] | null;
  pricingNotes?: string | null;
  socialLinks?: Record<string, string> | null;
  avatarMediaUrl?: string | null;
  coverMediaUrl?: string | null;
  userId: string;
  displayName: string;
  bio?: string | null;
  totalBookingsCompleted: number;
  responseTimeLabel?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServiceDetailResponse {
  id: string;
  service: Service;
  translations: ServiceTranslation[];
  companyName: string;
  companyId: string;
  companySlug: string;
  branchName?: string | null;
  branchIds: string[];
  categoryName: string;
  categoryId: string;
  categoryBreadcrumb?: { id: string; name: string }[];
  professionals: Professional[];
  resources: Resource[];
  galleryMediaIds: string[];
  galleryMediaUrls?: string[] | null;
  coverMediaUrl?: string | null;
  avgRating: number;
  reviewCount: number;
  bookingCount: number;
  isFavorite: boolean;
  earliestAvailableAt?: Date | null;
  nextSlot?: {
    startAt: Date;
    endAt: Date;
    professionalId?: string | null;
    branchId?: string | null;
  } | null;
  relatedServiceIds: string[];
  relatedServices?: Array<{
    id: string;
    name: string;
    slug: string;
    coverMediaUrl?: string | null;
    basePrice: number;
    currencyCode: string;
    durationMinutes: number;
  }> | null;
  tags: string[];
  durationMinutes: number;
  basePrice: number;
  currencyCode: string;
  finalPrice: number;
  discountPercent?: number | null;
  discountFixed?: number | null;
  discountValidFrom?: Date | null;
  discountValidUntil?: Date | null;
  homeServiceAllowed: boolean;
  homeServiceFee?: number | null;
  depositPercent?: number | null;
  depositAmount?: number | null;
  cancellationPolicyHours?: number | null;
  cancellationFeePercent?: number | null;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DiscoverySearchResponse extends Paged<DiscoveryBusinessResult> {
  appliedFilters: {
    categories?: string[];
    minRating?: number;
    priceRange?: { min?: number; max?: number };
    openNow?: boolean;
    homeService?: boolean;
    verified?: boolean;
  };
  suggestedFilters?: Array<{
    key: string;
    label: string;
    options: Array<{ value: string; label: string; count?: number }>;
  }>;
  correctedQuery?: string | null;
  alternativeQueries?: string[];
  didYouMean?: string | null;
  categoryFacets?: Array<{ id: string; name: string; count: number }>;
  cityFacets?: Array<{ id: string; name: string; count: number }>;
  ratingDistribution?: Record<number, number>;
  priceDistribution?: Array<{ bucket: string; count: number; min: number; max: number }>;
  searchLatencyMs: number;
}

export interface NearbyResponse extends Paged<DiscoveryBusinessResult> {
  center: {
    lat: number;
    lon: number;
  };
  radiusMeters: number;
  mapBounds?: {
    sw: { lat: number; lon: number };
    ne: { lat: number; lon: number };
  } | null;
  totalInRadius: number;
  clusterCount?: number;
  clusters?: Array<{
    id: string;
    lat: number;
    lon: number;
    count: number;
  }> | null;
}

export interface HomeSectionsResponse {
  sections: Array<{
    key: HomeSectionKey;
    title: string;
    subtitle?: string | null;
    viewAllHref?: string | null;
    items: DiscoveryBusinessResult[];
    layout: 'grid' | 'carousel' | 'list' | 'hero';
    order: number;
    paginationToken?: string | null;
    hasMore: boolean;
  }>;
  personalizedAt?: Date | null;
  refreshInSeconds?: number | null;
}

export interface AvailableNowResponse extends Paged<DiscoveryBusinessResult> {
  windowStartAt: Date;
  windowEndAt: Date;
  slotsPerBusiness?: Record<string, Array<{ startAt: Date; endAt: Date }>> | null;
}

export interface ReviewsListResponse extends Paged<Review> {
  avgRating: number;
  ratingDistribution: Record<number, number>;
  totalWithMedia: number;
  filteredAvgRating?: number;
  responseRate?: number | null;
  responseAvgDays?: number | null;
  dimensions?: Array<{ dimension: string; avgRating: number; count: number }>;
  keywordHighlights?: Array<{ keyword: string; count: number; sentiment: 'positive' | 'negative' | 'neutral' }>;
}

export interface FavoritesListResponse extends Paged<{
  id: string;
  favoriteType: 'company' | 'branch' | 'service' | 'professional';
  companyId?: string;
  branchId?: string;
  serviceId?: string;
  professionalId?: string;
  companyName?: string | null;
  branchName?: string | null;
  serviceName?: string | null;
  professionalName?: string | null;
  coverMediaUrl?: string | null;
  avgRating?: number | null;
  reviewCount?: number;
  meta?: Record<string, unknown>;
  createdAt: Date;
}> {
  totalCount: number;
  byTypeCounts: Record<string, number>;
}

export interface FollowingListResponse extends Paged<{
  id: string;
  targetType: 'company' | 'professional';
  targetId: string;
  companyName?: string | null;
  professionalName?: string | null;
  slug?: string | null;
  avatarMediaUrl?: string | null;
  coverMediaUrl?: string | null;
  avgRating?: number | null;
  followerCount?: number;
  isMutual?: boolean;
  meta?: Record<string, unknown>;
  createdAt: Date;
}> {
  totalFollowing: number;
  totalFollowers?: number;
  mutualFollowCount?: number;
}

export interface NotificationListResponse extends Paged<Notification> {
  unreadCount: number;
  totalCount: number;
  byTypeCounts: Record<NotificationType, number>;
  oldestUnreadAt?: Date | null;
}

export interface NotificationPreferencesResponse {
  preferences: {
    emailMarketing: boolean;
    emailBookings: boolean;
    emailReviews: boolean;
    pushMarketing: boolean;
    pushBookings: boolean;
    pushReviews: boolean;
    pushMessages: boolean;
    pushSystem: boolean;
    smsBookings: boolean;
    smsReminders: boolean;
    nearbyEnabled: boolean;
    nearbyRadiusMeters: number;
    autoTranslate: boolean;
    reducedMotion: boolean;
    highContrast: boolean;
    showVerifiedOnly: boolean;
    defaultPaymentMethodId?: string | null;
    doNotDisturb: {
      enabled: boolean;
      startHour: number;
      endHour: number;
      timezone: string;
    };
    mutedTypes: NotificationType[];
    soundEnabled: boolean;
    vibrationEnabled: boolean;
    ledEnabled: boolean;
  };
  availableTypes: NotificationType[];
}

export interface MediaVariantUrls {
  thumb: string;
  small: string;
  medium: string;
  large: string;
  original?: string;
}

export interface MediaUploadResponse {
  id: string;
  originalFileName: string;
  mimeCategory: 'image' | 'video' | 'audio' | 'document' | 'other';
  mimeType: string;
  sizeBytes: number;
  widthPixels?: number | null;
  heightPixels?: number | null;
  durationSeconds?: number | null;
  variants: MediaVariantUrls;
  blurhash?: string | null;
  dominantColorHex?: string | null;
  storageProvider: string;
  publicUrl: string;
  storageKey: string;
  status: 'uploaded' | 'processing' | 'processed' | 'failed';
  checksumSha256?: string | null;
  createdAt: Date;
}

export interface BookingV2AvailabilityRequest {
  companyId: string;
  branchId: string;
  serviceIds: string[];
  startsAt: Date | string;
  endsAt?: Date | string;
  professionalId?: string;
  resourceIds?: string[];
  partySize?: number;
}

export interface BookingV2HoldRequest extends BookingV2AvailabilityRequest {
  customerUserId?: string;
  expiresInSeconds?: number;
  notes?: string;
}

export interface BookingV2CreateRequest {
  holdId?: string;
  companyId: string;
  branchId: string;
  customerUserId?: string;
  serviceIds: string[];
  startsAt: Date | string;
  professionalId?: string;
  resourceIds?: string[];
  participants?: Array<{ name?: string; customerId?: string; serviceIds?: string[] }>;
  paymentMethod?: PaymentMethod | 'wallet' | 'gift_card' | 'cash';
  couponCode?: string;
  notes?: string;
}

export interface BookingV2MutationResponse {
  id: string;
  status: 'hold' | 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'no_show' | 'queued';
  companyId: string;
  branchId: string;
  customerId?: string | null;
  startsAt: Date | string;
  endsAt?: Date | string | null;
  subtotal?: number;
  taxAmount?: number;
  discountAmount?: number;
  grandTotal?: number;
  currencyCode?: string;
}

export interface FinanceV2PaymentRequest {
  companyId: string;
  branchId?: string;
  appointmentId?: string;
  customerUserId?: string;
  amount: number;
  currencyCode: string;
  paymentMethod: PaymentMethod | 'wallet' | 'gift_card' | 'cash' | 'card';
  providerPaymentId?: string;
  metadata?: Record<string, unknown>;
}

export interface FinanceV2LedgerResponse {
  items: Array<{
    id: string;
    companyId: string;
    branchId?: string | null;
    entryType: string;
    amount: number;
    currencyCode: string;
    sourceType?: string | null;
    sourceId?: string | null;
    createdAt: Date | string;
  }>;
  totalsByCurrency: Record<string, number>;
}

export interface FinanceV2ReconciliationResponse {
  companyId: string;
  branchId?: string | null;
  from: Date | string;
  to: Date | string;
  booked: Record<string, number>;
  completed: Record<string, number>;
  collected: Record<string, number>;
  cash: Record<string, number>;
  refunded: Record<string, number>;
  outstanding: Record<string, number>;
}

export interface RetentionV2WalletAdjustmentRequest {
  userId: string;
  amount: number;
  currencyCode: string;
  reason: string;
  referenceId?: string;
}

export interface RetentionV2PromotionRequest {
  companyId: string;
  branchId?: string;
  name: string;
  code?: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  startsAt?: Date | string;
  endsAt?: Date | string;
  eligibleServiceIds?: string[];
  eligibleCategoryIds?: string[];
}

export interface SocialV2PostRequest {
  authorUserId: string;
  companyId?: string;
  branchId?: string;
  professionalId?: string;
  caption?: string;
  mediaIds: string[];
  serviceIds?: string[];
  categoryIds?: string[];
  tags?: string[];
}

export interface AnalyticsV2EventRequest {
  eventName: string;
  eventCategory: string;
  userId?: string;
  anonymousId?: string;
  companyId?: string;
  branchId?: string;
  properties?: Record<string, unknown>;
  createdAt?: Date | string;
}

export interface AnalyticsV2DashboardResponse {
  range: { from: Date | string; to: Date | string };
  metrics: Array<{ key: string; label: string; value: number; previousValue?: number; trendPercent?: number }>;
  series: Array<{ key: string; points: Array<{ at: Date | string; value: number }> }>;
}

export interface PlatformOpsV2StatusResponse {
  realtime: { enabled: boolean; activeConnections: number; channels: string[] };
  workers: Array<{ queue: string; status: 'healthy' | 'degraded' | 'down'; waiting: number; active: number; failed: number }>;
  ai: { enabled: boolean; provider?: string | null; coreRequiresAi: false };
}

export interface ErrorEnvelope {
  statusCode: number;
  error: string;
  message: string;
  code?: string | null;
  correlationId?: string | null;
  details?: Record<string, unknown> | unknown[] | null;
  timestamp: string;
  path?: string | null;
  errors?: Array<{
    field?: string | null;
    message: string;
    code?: string | null;
    rejectedValue?: unknown;
  }> | null;
  traceId?: string | null;
  requestId?: string | null;
  helpUrl?: string | null;
}

export const APIPaths = {
  V1: '/api/v1',
  AUTH: '/api/v1/auth',
  REGISTER: '/api/v1/auth/register',
  LOGIN: '/api/v1/auth/login',
  LOGOUT: '/api/v1/auth/logout',
  LOGOUT_ALL: '/api/v1/auth/logout-everywhere',
  REFRESH: '/api/v1/auth/refresh',
  FORGOT_PASSWORD: '/api/v1/auth/forgot-password',
  RESET_PASSWORD: '/api/v1/auth/reset-password',
  VERIFY_OTP: '/api/v1/auth/verify-otp',
  SEND_OTP: '/api/v1/auth/send-otp',
  VERIFY_EMAIL: '/api/v1/auth/email/verify',
  VERIFY_PHONE: '/api/v1/auth/phone/otp/verify',
  CHANGE_PASSWORD: '/api/v1/auth/change-password',
  OAUTH_GOOGLE: '/api/v1/auth/oauth/google',
  OAUTH_APPLE: '/api/v1/auth/oauth/apple',
  OAUTH_FACEBOOK: '/api/v1/auth/oauth/facebook',
  SESSIONS: '/api/v1/auth/sessions',

  USERS: '/api/v1/users',
  USERS_ME: '/api/v1/users/me',
  USERS_ME_PREFERENCES: '/api/v1/users/me/preferences',
  USERS_ME_AVATAR: '/api/v1/users/me/avatar',
  USERS_ID: (id: string) => `/api/v1/users/${id}`,

  DISCOVERY: '/api/v1/discovery',
  DISCOVERY_SEARCH: '/api/v1/discovery/search',
  DISCOVERY_NEARBY: '/api/v1/discovery/nearby',
  DISCOVERY_HOME_SECTIONS: '/api/v1/discovery/home',
  DISCOVERY_AVAILABLE_NOW: '/api/v1/discovery/available-now',
  DISCOVERY_SUGGEST: '/api/v1/discovery/search/suggestions',
  DISCOVERY_AUTOCOMPLETE: '/api/v1/discovery/autocomplete',
  DISCOVERY_TRENDING: '/api/v1/discovery/trending',

  BUSINESSES: '/api/v1/businesses',
  BUSINESSES_ID: (id: string) => `/api/v1/businesses/${id}`,
  BUSINESSES_ID_PROFILE: (id: string) => `/api/v1/businesses/${id}`,
  BUSINESSES_ID_SERVICES: (id: string) => `/api/v1/businesses/${id}/services`,
  BUSINESSES_ID_PROFESSIONALS: (id: string) => `/api/v1/businesses/${id}/professionals`,
  BUSINESSES_ID_REVIEWS: (id: string) => `/api/v1/businesses/${id}/reviews`,
  BUSINESSES_ID_MEDIA: (id: string) => `/api/v1/businesses/${id}/media`,
  BUSINESSES_ID_BRANCHES: (id: string) => `/api/v1/businesses/${id}/branches`,
  BUSINESSES_ID_OFFERS: (id: string) => `/api/v1/businesses/${id}/offers`,
  BUSINESSES_ID_FOLLOW: (id: string) => `/api/v1/businesses/${id}/follow`,
  BUSINESSES_ID_UNFOLLOW: (id: string) => `/api/v1/businesses/${id}/unfollow`,
  BUSINESSES_ID_HOURS: (id: string) => `/api/v1/businesses/${id}/hours`,

  BRANCHES: '/api/v1/branches',
  BRANCHES_ID: (id: string) => `/api/v1/branches/${id}`,
  BRANCHES_ID_HOURS: (id: string) => `/api/v1/branches/${id}/hours`,
  BRANCHES_ID_AVAILABILITY: (id: string) => `/api/v1/branches/${id}/availability`,

  PROFESSIONALS: '/api/v1/professionals',
  PROFESSIONALS_ID: (id: string) => `/api/v1/professionals/${id}`,
  PROFESSIONALS_ID_PROFILE: (id: string) => `/api/v1/professionals/${id}`,
  PROFESSIONALS_ID_SERVICES: (id: string) => `/api/v1/professionals/${id}/services`,
  PROFESSIONALS_ID_REVIEWS: (id: string) => `/api/v1/professionals/${id}/reviews`,
  PROFESSIONALS_ID_PORTFOLIO: (id: string) => `/api/v1/professionals/${id}/portfolio`,
  PROFESSIONALS_ID_SCHEDULE: (id: string) => `/api/v1/professionals/${id}/schedule`,
  PROFESSIONALS_ID_AVAILABILITY: (id: string) => `/api/v1/professionals/${id}/availability`,
  PROFESSIONALS_ID_FOLLOW: (id: string) => `/api/v1/professionals/${id}/follow`,
  PROFESSIONALS_ID_UNFOLLOW: (id: string) => `/api/v1/professionals/${id}/unfollow`,

  SERVICES: '/api/v1/services',
  SERVICES_ID: (id: string) => `/api/v1/services/${id}`,
  SERVICES_ID_AVAILABILITY: (id: string) => `/api/v1/services/${id}/availability`,
  SERVICES_ID_SLOTS: (id: string) => `/api/v1/services/${id}/slots`,
  SERVICES_ID_REVIEWS: (id: string) => `/api/v1/services/${id}/reviews`,

  CATEGORIES: '/api/v1/categories',
  CATEGORIES_ID: (id: string) => `/api/v1/categories/${id}`,
  CATEGORIES_ID_SERVICES: (id: string) => `/api/v1/categories/${id}/services`,
  CATEGORIES_TREE: '/api/v1/categories/tree',
  CATEGORIES_POPULAR: '/api/v1/categories/popular',

  BOOKINGS: '/api/v1/bookings',
  BOOKINGS_ID: (id: string) => `/api/v1/bookings/${id}`,
  BOOKINGS_ID_RESCHEDULE: (id: string) => `/api/v1/bookings/${id}/reschedule`,
  BOOKINGS_ID_CANCEL: (id: string) => `/api/v1/bookings/${id}/cancel`,
  BOOKINGS_ID_CHECKIN: (id: string) => `/api/v1/bookings/${id}/check-in`,
  BOOKINGS_ID_CHECKOUT: (id: string) => `/api/v1/bookings/${id}/check-out`,
  BOOKINGS_ID_REVIEW: (id: string) => `/api/v1/bookings/${id}/review`,
  BOOKINGS_UPCOMING: '/api/v1/bookings/upcoming',
  BOOKINGS_PAST: '/api/v1/bookings/past',
  BOOKINGS_CANCELLED: '/api/v1/bookings/cancelled',

  BOOKING_V2: '/api/v1/booking-v2',
  BOOKING_V2_AVAILABILITY: '/api/v1/booking-v2/availability',
  BOOKING_V2_HOLDS: '/api/v1/booking-v2/holds',
  BOOKING_V2_APPOINTMENTS: '/api/v1/booking-v2/appointments',
  BOOKING_V2_GROUP_BOOKINGS: '/api/v1/booking-v2/group-bookings',
  BOOKING_V2_ID_CANCEL: (id: string) => `/api/v1/booking-v2/appointments/${id}/cancel`,
  BOOKING_V2_ID_RESCHEDULE: (id: string) => `/api/v1/booking-v2/appointments/${id}/reschedule`,
  BOOKING_V2_ID_CHECKIN: (id: string) => `/api/v1/booking-v2/appointments/${id}/check-in`,
  BOOKING_V2_QUEUE: '/api/v1/booking-v2/queue',
  BOOKING_V2_QUEUE_JOIN: '/api/v1/booking-v2/queue/join',
  BOOKING_V2_QUEUE_ID_LEAVE: (id: string) => `/api/v1/booking-v2/queue/${id}/leave`,
  BOOKING_V2_QUEUE_ID_CALL: (id: string) => `/api/v1/booking-v2/queue/${id}/call`,
  BOOKING_V2_QUEUE_ID_SERVE: (id: string) => `/api/v1/booking-v2/queue/${id}/serve`,

  REVIEWS: '/api/v1/reviews',
  REVIEWS_ID: (id: string) => `/api/v1/reviews/${id}`,
  REVIEWS_ID_REPORT: (id: string) => `/api/v1/reviews/${id}/report`,
  REVIEWS_ID_HELPFUL: (id: string) => `/api/v1/reviews/${id}/helpful`,
  REVIEWS_ID_REPLY: (id: string) => `/api/v1/reviews/${id}/reply`,

  FAVORITES: '/api/v1/customer/favorites',
  FAVORITES_ID: (id: string) => `/api/v1/customer/favorites/${id}`,
  FAVORITES_TOGGLE: '/api/v1/customer/favorites/toggle',

  FOLLOWING: '/api/v1/customer/following',
  FOLLOWING_FOLLOWERS: '/api/v1/following/followers',

  NOTIFICATIONS: '/api/v1/notifications',
  NOTIFICATIONS_ID: (id: string) => `/api/v1/notifications/${id}`,
  NOTIFICATIONS_READ_ALL: '/api/v1/notifications/read-all',
  NOTIFICATIONS_PREFERENCES: '/api/v1/notifications/preferences',
  NOTIFICATIONS_TEST: '/api/v1/notifications/test',
  NOTIFICATIONS_ID_READ: (id: string) => `/api/v1/notifications/${id}/read`,
  NOTIFICATIONS_ID_DISMISS: (id: string) => `/api/v1/notifications/${id}/dismiss`,

  MESSAGES: '/api/v1/messages',
  MESSAGES_THREADS: '/api/v1/messages/threads',
  MESSAGES_THREAD_ID: (id: string) => `/api/v1/messages/threads/${id}`,
  MESSAGES_THREAD_ID_MESSAGES: (id: string) => `/api/v1/messages/threads/${id}/messages`,
  MESSAGES_THREAD_ID_READ: (id: string) => `/api/v1/messages/threads/${id}/read`,
  MESSAGES_THREAD_ID_MARK_TYPING: (id: string) => `/api/v1/messages/threads/${id}/typing`,

  MEDIA: '/api/v1/media',
  MEDIA_UPLOAD: '/api/v1/media/upload',
  MEDIA_UPLOAD_PRESIGNED: '/api/v1/media/presigned-upload',
  MEDIA_ID: (id: string) => `/api/v1/media/${id}`,
  MEDIA_ID_DELETE: (id: string) => `/api/v1/media/${id}`,

  PAYMENTS: '/api/v1/payments',
  PAYMENTS_ID: (id: string) => `/api/v1/payments/${id}`,
  PAYMENTS_METHODS: '/api/v1/payments/methods',
  PAYMENTS_INTENT: '/api/v1/payments/intent',
  PAYMENTS_CONFIRM: '/api/v1/payments/confirm',
  PAYMENTS_REFUND: (id: string) => `/api/v1/payments/${id}/refund`,
  PAYMENTS_HISTORY: '/api/v1/payments/history',

  FINANCE_V2: '/api/v1/finance-v2',
  FINANCE_V2_PAYMENTS: '/api/v1/finance-v2/payments',
  FINANCE_V2_PAYMENT_REFUND: (id: string) => `/api/v1/finance-v2/payments/${id}/refund`,
  FINANCE_V2_LEDGER: '/api/v1/finance-v2/ledger',
  FINANCE_V2_RECONCILIATION: '/api/v1/finance-v2/reconciliation',
  FINANCE_V2_PAYOUTS: '/api/v1/finance-v2/payouts',
  FINANCE_V2_TAX_PREVIEW: '/api/v1/finance-v2/tax/preview',

  WALLET: '/api/v1/wallet',
  WALLET_BALANCE: '/api/v1/wallet/balance',
  WALLET_TRANSACTIONS: '/api/v1/wallet/transactions',
  WALLET_TOPUP: '/api/v1/wallet/top-up',
  WALLET_WITHDRAW: '/api/v1/wallet/withdraw',

  LOYALTY: '/api/v1/loyalty',
  LOYALTY_PROGRAM: '/api/v1/loyalty/program',
  LOYALTY_LEVELS: '/api/v1/loyalty/levels',
  LOYALTY_TRANSACTIONS: '/api/v1/loyalty/transactions',
  LOYALTY_REDEEM: '/api/v1/loyalty/redeem',

  GIFT_CARDS: '/api/v1/gift-cards',
  GIFT_CARDS_ID: (id: string) => `/api/v1/gift-cards/${id}`,
  GIFT_CARDS_PURCHASE: '/api/v1/gift-cards/purchase',
  GIFT_CARDS_REDEEM: '/api/v1/gift-cards/redeem',
  GIFT_CARDS_BALANCE: '/api/v1/gift-cards/balance',

  RETENTION_V2: '/api/v1/retention-v2',
  RETENTION_V2_WALLET: '/api/v1/retention-v2/wallet',
  RETENTION_V2_WALLET_ADJUST: '/api/v1/retention-v2/wallet/adjust',
  RETENTION_V2_LOYALTY: '/api/v1/retention-v2/loyalty',
  RETENTION_V2_LOYALTY_ADJUST: '/api/v1/retention-v2/loyalty/adjust',
  RETENTION_V2_PROMOTIONS: '/api/v1/retention-v2/promotions',
  RETENTION_V2_COUPONS: '/api/v1/retention-v2/coupons',
  RETENTION_V2_PACKAGES: '/api/v1/retention-v2/packages',
  RETENTION_V2_MEMBERSHIPS: '/api/v1/retention-v2/memberships',
  RETENTION_V2_GIFT_CARDS: '/api/v1/retention-v2/gift-cards',
  RETENTION_V2_REFERRALS: '/api/v1/retention-v2/referrals',

  SOCIAL_V2: '/api/v1/social-v2',
  SOCIAL_V2_POSTS: '/api/v1/social-v2/posts',
  SOCIAL_V2_POSTS_ID_SAVE: (id: string) => `/api/v1/social-v2/posts/${id}/save`,
  SOCIAL_V2_POSTS_ID_REPORT: (id: string) => `/api/v1/social-v2/posts/${id}/report`,
  SOCIAL_V2_COLLECTIONS: '/api/v1/social-v2/collections',
  SOCIAL_V2_FOLLOW: '/api/v1/social-v2/follow',

  ANALYTICS_V2: '/api/v1/analytics-v2',
  ANALYTICS_V2_EVENTS: '/api/v1/analytics-v2/events',
  ANALYTICS_V2_DASHBOARD: '/api/v1/analytics-v2/dashboard',
  ANALYTICS_V2_DRILLDOWN: '/api/v1/analytics-v2/drilldown',
  ANALYTICS_V2_SNAPSHOTS_DAILY: '/api/v1/analytics-v2/snapshots/daily',

  PLATFORM_OPS_V2: '/api/v1/platform-ops-v2',
  PLATFORM_OPS_V2_STATUS: '/api/v1/platform-ops-v2/status',
  PLATFORM_OPS_V2_GEOFENCE: '/api/v1/platform-ops-v2/geofence',
  PLATFORM_OPS_V2_MODERATION_REPORTS: '/api/v1/platform-ops-v2/moderation/reports',
  PLATFORM_OPS_V2_MODERATION_REPORT_ID: (id: string) => `/api/v1/platform-ops-v2/moderation/reports/${id}`,
  PLATFORM_OPS_V2_AI_STATUS: '/api/v1/platform-ops-v2/ai/status',
  PLATFORM_OPS_V2_AI_PARSE_SEARCH: '/api/v1/platform-ops-v2/ai/parse-search',

  GEO: '/api/v1/geo',
  GEO_COUNTRIES: '/api/v1/geo/countries',
  GEO_COUNTRIES_ID_REGIONS: (id: string) => `/api/v1/geo/countries/${id}/regions`,
  GEO_REGIONS_ID_DISTRICTS: (id: string) => `/api/v1/geo/regions/${id}/districts`,
  GEO_DISTRICTS_ID_CITIES: (id: string) => `/api/v1/geo/districts/${id}/cities`,
  GEO_CITIES_ID_AREAS: (id: string) => `/api/v1/geo/cities/${id}/areas`,
  GEO_REVERSE: '/api/v1/geo/reverse',
  GEO_AUTOCOMPLETE: '/api/v1/geo/autocomplete',

  PLATFORM: '/api/v1/platform',
  PLATFORM_SETTINGS: '/api/v1/platform/settings',
  PLATFORM_COUNTRIES: '/api/v1/platform/countries',
  PLATFORM_CURRENCIES: '/api/v1/platform/currencies',
  PLATFORM_LANGUAGES: '/api/v1/platform/languages',
  PLATFORM_TRANSLATIONS: '/api/v1/platform/translations',
  PLATFORM_STATUS: '/api/v1/platform/status',
  PLATFORM_CONFIG: '/api/v1/platform/config',

  ADMIN: '/api/v1/admin',
  ADMIN_USERS: '/api/v1/admin/users',
  ADMIN_USERS_ID: (id: string) => `/api/v1/admin/users/${id}`,
  ADMIN_BUSINESSES: '/api/v1/admin/businesses',
  ADMIN_BUSINESSES_ID: (id: string) => `/api/v1/admin/businesses/${id}`,
  ADMIN_BUSINESSES_ID_VERIFY: (id: string) => `/api/v1/admin/businesses/${id}/verify`,
  ADMIN_COUNTRIES: '/api/v1/admin/countries',
  ADMIN_COUNTRIES_ID: (id: string) => `/api/v1/admin/countries/${id}`,
  ADMIN_CATEGORIES: '/api/v1/admin/categories',
  ADMIN_CATEGORIES_ID: (id: string) => `/api/v1/admin/categories/${id}`,
  ADMIN_THEMES: '/api/v1/admin/themes',
  ADMIN_MODERATION: '/api/v1/admin/moderation',
  ADMIN_MODERATION_REPORTS: '/api/v1/admin/moderation/reports',
  ADMIN_ANALYTICS: '/api/v1/admin/analytics',
  ADMIN_DASHBOARD: '/api/v1/admin/dashboard',
} as const;

export type APIPathKey = keyof typeof APIPaths;

