export const FeatureFlags = {
  phase2Enabled: false,
  phase3Enabled: false,
  advancedSearch: false,
  realtimeChat: false,
  videoCalls: false,
  loyaltyProgram: false,
  subscriptionTiers: false,
  multiCurrency: false,
  multiLanguageAdvanced: false,
  businessAnalytics: false,
  advancedModeration: false,
  aiRecommendations: false,
  socialFeed: false,
  walletPayments: false,
  giftCards: false,
  promotionsEngine: false,
} as const;

export type FeatureFlagKey = keyof typeof FeatureFlags;

export const SupportedLocales = ["en", "ar", "fr"] as const;
export type SupportedLocale = (typeof SupportedLocales)[number];
export const DefaultLocale: SupportedLocale = "en";

export const ThemeModes = ["midnight-gold", "silver-light", "system"] as const;
export type ThemeMode = (typeof ThemeModes)[number];
export const DefaultTheme: ThemeMode = "midnight-gold";

export interface SupportedCountry {
  code: string;
  name: string;
  dialCode: string;
  currencyCode: string;
  flagEmoji?: string;
}

export const SupportedCountries: SupportedCountry[] = [
  {
    code: "LB",
    name: "Lebanon",
    dialCode: "+961",
    currencyCode: "LBP",
    flagEmoji: "🇱🇧",
  },
];

export const PaginationDefaults = {
  limit: 20,
  maxLimit: 100,
  offset: 0,
} as const;

export type PaginationDefaultsType = typeof PaginationDefaults;

export const GeoRadiusPresets: number[] = [250, 500, 1000, 5000];

export const GeoRadiusBounds = {
  minMeters: 1,
  maxMeters: 100000,
  defaultMeters: 1000,
} as const;

export const API_VERSION = "v1";
export const APP_NAME = "LOOKIVA";

export * from "./settings-loader";
