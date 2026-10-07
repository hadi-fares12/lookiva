export enum UserRole {
  SuperAdmin = 'super_admin',
  PlatformAdmin = 'platform_admin',
  PlatformModerator = 'platform_moderator',
  PlatformSupport = 'platform_support',
  CountryManager = 'country_manager',
  BusinessOwner = 'business_owner',
  BusinessManager = 'business_manager',
  BusinessAccountant = 'business_accountant',
  BranchManager = 'branch_manager',
  Professional = 'professional',
  Staff = 'staff',
  PremiumCustomer = 'premium_customer',
  Customer = 'customer',
  Guest = 'guest',
}

export enum PermissionKey {
  AuthRegister = 'auth.register',
  AuthLogin = 'auth.login',
  AuthRefresh = 'auth.refresh',
  AuthLogout = 'auth.logout',
  AuthPasswordView = 'auth.password.view',
  AuthPasswordChange = 'auth.password.change',
  AuthPasswordReset = 'auth.password.reset',
  DashboardViewBasic = 'dashboard.view_basic',
  DashboardViewFinancial = 'dashboard.view_financial',
  BusinessProfileView = 'business.profile.view',
  BusinessProfileEdit = 'business.profile.edit',
  BusinessBranchView = 'business.branch.view',
  BusinessBranchCreate = 'business.branch.create',
  BusinessBranchEdit = 'business.branch.edit',
  BusinessBranchDelete = 'business.branch.delete',
  BusinessProfessionalView = 'business.professional.view',
  BusinessProfessionalCreate = 'business.professional.create',
  BusinessProfessionalEdit = 'business.professional.edit',
  BusinessProfessionalDelete = 'business.professional.delete',
  BusinessServiceView = 'business.service.view',
  BusinessServiceCreate = 'business.service.create',
  BusinessServiceEdit = 'business.service.edit',
  BusinessServiceDelete = 'business.service.delete',
  BusinessResourceView = 'business.resource.view',
  BusinessResourceCreate = 'business.resource.create',
  BusinessResourceEdit = 'business.resource.edit',
  BusinessResourceDelete = 'business.resource.delete',
  BookingCreate = 'booking.create',
  BookingView = 'booking.view',
  BookingEdit = 'booking.edit',
  BookingCancel = 'booking.cancel',
  BookingManage = 'booking.manage',
  BookingCheckIn = 'booking.check_in',
  BookingQueueManage = 'booking.queue.manage',
  BookingGroupManage = 'booking.group.manage',
  CustomerProfileView = 'customer.profile.view',
  CustomerProfileEdit = 'customer.profile.edit',
  CustomerFavoritesView = 'customer.favorites.view',
  CustomerFavoritesAdd = 'customer.favorites.add',
  CustomerFavoritesRemove = 'customer.favorites.remove',
  CustomerFollowingView = 'customer.following.view',
  CustomerFollowingAdd = 'customer.following.add',
  CustomerFollowingRemove = 'customer.following.remove',
  DiscoverySearch = 'discovery.search',
  DiscoveryView = 'discovery.view',
  ReviewsCreate = 'reviews.create',
  ReviewsView = 'reviews.view',
  ReviewsManage = 'reviews.manage',
  SocialPostCreate = 'social.post.create',
  SocialPostLike = 'social.post.like',
  SocialCommentCreate = 'social.comment.create',
  SocialCommentDelete = 'social.comment.delete',
  ModerationView = 'moderation.view',
  ModerationManage = 'moderation.manage',
  ModerationAppealCreate = 'moderation.appeal.create',
  PaymentsView = 'payments.view',
  PaymentsManage = 'payments.manage',
  FinanceLedgerView = 'finance.ledger.view',
  FinanceTaxManage = 'finance.tax.manage',
  FinanceCommissionManage = 'finance.commission.manage',
  FinancePayoutView = 'finance.payout.view',
  FinancePayoutManage = 'finance.payout.manage',
  WalletView = 'wallet.view',
  WalletManage = 'wallet.manage',
  LoyaltyView = 'loyalty.view',
  LoyaltyManage = 'loyalty.manage',
  PackagesView = 'packages.view',
  PackagesManage = 'packages.manage',
  MembershipsView = 'memberships.view',
  MembershipsManage = 'memberships.manage',
  GiftCardsView = 'gift_cards.view',
  GiftCardsManage = 'gift_cards.manage',
  ReferralsView = 'referrals.view',
  ReferralsManage = 'referrals.manage',
  PromotionsView = 'promotions.view',
  PromotionsManage = 'promotions.manage',
  MediaUpload = 'media.upload',
  MediaView = 'media.view',
  MediaManage = 'media.manage',
  AnalyticsView = 'analytics.view',
  AnalyticsManage = 'analytics.manage',
  RealtimeView = 'realtime.view',
  RealtimeManage = 'realtime.manage',
  WorkersView = 'workers.view',
  WorkersManage = 'workers.manage',
  GeofenceView = 'geofence.view',
  GeofenceManage = 'geofence.manage',
  SettingsView = 'settings.view',
  SettingsManage = 'settings.manage',
  AdminUsersView = 'admin.users.view',
  AdminUsersManage = 'admin.users.manage',
  AdminBusinessesView = 'admin.businesses.view',
  AdminBusinessesManage = 'admin.businesses.manage',
  AdminCountriesView = 'admin.countries.view',
  AdminCountriesManage = 'admin.countries.manage',
  AdminCategoriesView = 'admin.categories.view',
  AdminCategoriesManage = 'admin.categories.manage',
  AdminThemesView = 'admin.themes.view',
  AdminThemesManage = 'admin.themes.manage',
  FeatureFlagsView = 'feature_flags.view',
  FeatureFlagsManage = 'feature_flags.manage',
  RemoteConfigView = 'remote_config.view',
  RemoteConfigManage = 'remote_config.manage',
  AdminPlatformView = 'admin.platform.view',
  AdminPlatformManage = 'admin.platform.manage',
  AdminImpersonate = 'admin.impersonate',
  NotificationsView = 'notifications.view',
  NotificationsEdit = 'notifications.edit',
  ComplianceView = 'compliance.view',
  ComplianceManage = 'compliance.manage',
  AiUse = 'ai.use',
  AiManage = 'ai.manage',
  AuditView = 'audit.view',
}

export enum ScopeType {
  Platform = 'platform',
  Company = 'company',
  Branch = 'branch',
}

export interface PermissionDefinition {
  key: PermissionKey;
  scopeType: ScopeType;
  name: string;
  group: string;
  description: string;
}

export interface RoleDefinition {
  key: UserRole;
  scopeType: ScopeType;
  name: string;
  description: string;
  isSystem: boolean;
}

export const PERMISSION_DEFINITIONS: readonly PermissionDefinition[] = [
  { key: PermissionKey.AuthRegister, scopeType: ScopeType.Platform, name: 'Register Account', group: 'auth', description: 'Register a new account on the platform.' },
  { key: PermissionKey.AuthLogin, scopeType: ScopeType.Platform, name: 'Login', group: 'auth', description: 'Authenticate and sign in to the platform.' },
  { key: PermissionKey.AuthRefresh, scopeType: ScopeType.Platform, name: 'Refresh Token', group: 'auth', description: 'Refresh access tokens for an active session.' },
  { key: PermissionKey.AuthLogout, scopeType: ScopeType.Platform, name: 'Logout', group: 'auth', description: 'Invalidate the current session.' },
  { key: PermissionKey.AuthPasswordView, scopeType: ScopeType.Platform, name: 'View Password Settings', group: 'auth', description: 'View password and security settings.' },
  { key: PermissionKey.AuthPasswordChange, scopeType: ScopeType.Platform, name: 'Change Password', group: 'auth', description: 'Change the password for the current account.' },
  { key: PermissionKey.AuthPasswordReset, scopeType: ScopeType.Platform, name: 'Reset Password', group: 'auth', description: 'Reset a forgotten password.' },
  { key: PermissionKey.DashboardViewBasic, scopeType: ScopeType.Company, name: 'View Dashboard', group: 'dashboard', description: 'View operational dashboard metrics.' },
  { key: PermissionKey.DashboardViewFinancial, scopeType: ScopeType.Company, name: 'View Financial Dashboard', group: 'dashboard', description: 'View financial dashboard metrics and reports.' },
  { key: PermissionKey.BusinessProfileView, scopeType: ScopeType.Company, name: 'View Business Profile', group: 'business', description: 'View business profile information.' },
  { key: PermissionKey.BusinessProfileEdit, scopeType: ScopeType.Company, name: 'Edit Business Profile', group: 'business', description: 'Edit business profile information.' },
  { key: PermissionKey.BusinessBranchView, scopeType: ScopeType.Company, name: 'View Branches', group: 'business', description: 'View branch details.' },
  { key: PermissionKey.BusinessBranchCreate, scopeType: ScopeType.Company, name: 'Create Branch', group: 'business', description: 'Create new business branches.' },
  { key: PermissionKey.BusinessBranchEdit, scopeType: ScopeType.Company, name: 'Edit Branch', group: 'business', description: 'Edit existing branch details.' },
  { key: PermissionKey.BusinessBranchDelete, scopeType: ScopeType.Company, name: 'Delete Branch', group: 'business', description: 'Remove business branches.' },
  { key: PermissionKey.BusinessProfessionalView, scopeType: ScopeType.Company, name: 'View Professionals', group: 'business', description: 'View the professional roster.' },
  { key: PermissionKey.BusinessProfessionalCreate, scopeType: ScopeType.Company, name: 'Create Professional', group: 'business', description: 'Add new professionals.' },
  { key: PermissionKey.BusinessProfessionalEdit, scopeType: ScopeType.Company, name: 'Edit Professional', group: 'business', description: 'Edit professional profiles.' },
  { key: PermissionKey.BusinessProfessionalDelete, scopeType: ScopeType.Company, name: 'Delete Professional', group: 'business', description: 'Remove professionals.' },
  { key: PermissionKey.BusinessServiceView, scopeType: ScopeType.Company, name: 'View Services', group: 'business', description: 'View the service catalog.' },
  { key: PermissionKey.BusinessServiceCreate, scopeType: ScopeType.Company, name: 'Create Service', group: 'business', description: 'Create business services.' },
  { key: PermissionKey.BusinessServiceEdit, scopeType: ScopeType.Company, name: 'Edit Service', group: 'business', description: 'Edit existing services.' },
  { key: PermissionKey.BusinessServiceDelete, scopeType: ScopeType.Company, name: 'Delete Service', group: 'business', description: 'Remove services.' },
  { key: PermissionKey.BusinessResourceView, scopeType: ScopeType.Company, name: 'View Resources', group: 'business', description: 'View business resources and chairs.' },
  { key: PermissionKey.BusinessResourceCreate, scopeType: ScopeType.Company, name: 'Create Resource', group: 'business', description: 'Add new resources.' },
  { key: PermissionKey.BusinessResourceEdit, scopeType: ScopeType.Company, name: 'Edit Resource', group: 'business', description: 'Edit resource details.' },
  { key: PermissionKey.BusinessResourceDelete, scopeType: ScopeType.Company, name: 'Delete Resource', group: 'business', description: 'Remove resources.' },
  { key: PermissionKey.BookingCreate, scopeType: ScopeType.Platform, name: 'Create Booking', group: 'booking', description: 'Create appointments and bookings.' },
  { key: PermissionKey.BookingView, scopeType: ScopeType.Platform, name: 'View Bookings', group: 'booking', description: 'View booking details and history.' },
  { key: PermissionKey.BookingEdit, scopeType: ScopeType.Platform, name: 'Edit Booking', group: 'booking', description: 'Modify existing bookings.' },
  { key: PermissionKey.BookingCancel, scopeType: ScopeType.Platform, name: 'Cancel Booking', group: 'booking', description: 'Cancel scheduled bookings.' },
  { key: PermissionKey.BookingManage, scopeType: ScopeType.Company, name: 'Manage Booking Operations', group: 'booking', description: 'Manage booking lifecycle operations across staff and resources.' },
  { key: PermissionKey.BookingCheckIn, scopeType: ScopeType.Branch, name: 'Check In Booking', group: 'booking', description: 'Check customers in for appointments and walk-ins.' },
  { key: PermissionKey.BookingQueueManage, scopeType: ScopeType.Branch, name: 'Manage Queue', group: 'booking', description: 'Manage walk-in queues and floor boards.' },
  { key: PermissionKey.BookingGroupManage, scopeType: ScopeType.Branch, name: 'Manage Group Bookings', group: 'booking', description: 'Create and manage group or bridal bookings.' },
  { key: PermissionKey.CustomerProfileView, scopeType: ScopeType.Platform, name: 'View Customer Profile', group: 'customer', description: 'View a customer profile.' },
  { key: PermissionKey.CustomerProfileEdit, scopeType: ScopeType.Platform, name: 'Edit Customer Profile', group: 'customer', description: 'Edit a customer profile.' },
  { key: PermissionKey.CustomerFavoritesView, scopeType: ScopeType.Platform, name: 'View Favorites', group: 'customer', description: 'View favorites lists.' },
  { key: PermissionKey.CustomerFavoritesAdd, scopeType: ScopeType.Platform, name: 'Add Favorite', group: 'customer', description: 'Add businesses or services to favorites.' },
  { key: PermissionKey.CustomerFavoritesRemove, scopeType: ScopeType.Platform, name: 'Remove Favorite', group: 'customer', description: 'Remove businesses or services from favorites.' },
  { key: PermissionKey.CustomerFollowingView, scopeType: ScopeType.Platform, name: 'View Following', group: 'customer', description: 'View followed businesses and professionals.' },
  { key: PermissionKey.CustomerFollowingAdd, scopeType: ScopeType.Platform, name: 'Follow', group: 'customer', description: 'Follow businesses and professionals.' },
  { key: PermissionKey.CustomerFollowingRemove, scopeType: ScopeType.Platform, name: 'Unfollow', group: 'customer', description: 'Unfollow businesses and professionals.' },
  { key: PermissionKey.DiscoverySearch, scopeType: ScopeType.Platform, name: 'Search Discovery', group: 'discovery', description: 'Search for businesses, services, and professionals.' },
  { key: PermissionKey.DiscoveryView, scopeType: ScopeType.Platform, name: 'View Discovery', group: 'discovery', description: 'Browse discovery feeds and listings.' },
  { key: PermissionKey.ReviewsCreate, scopeType: ScopeType.Platform, name: 'Create Review', group: 'reviews', description: 'Create and submit reviews.' },
  { key: PermissionKey.ReviewsView, scopeType: ScopeType.Platform, name: 'View Reviews', group: 'reviews', description: 'Read reviews and rating summaries.' },
  { key: PermissionKey.ReviewsManage, scopeType: ScopeType.Company, name: 'Manage Reviews', group: 'reviews', description: 'Moderate or respond to reviews within the allowed scope.' },
  { key: PermissionKey.SocialPostCreate, scopeType: ScopeType.Platform, name: 'Create Social Post', group: 'social', description: 'Create or publish a social post.' },
  { key: PermissionKey.SocialPostLike, scopeType: ScopeType.Platform, name: 'Like Social Post', group: 'social', description: 'Like or unlike a social post.' },
  { key: PermissionKey.SocialCommentCreate, scopeType: ScopeType.Platform, name: 'Create Comment', group: 'social', description: 'Create comments on social posts.' },
  { key: PermissionKey.SocialCommentDelete, scopeType: ScopeType.Platform, name: 'Delete Comment', group: 'social', description: 'Delete comments owned or managed by the user.' },
  { key: PermissionKey.ModerationView, scopeType: ScopeType.Platform, name: 'View Moderation', group: 'moderation', description: 'Review moderation queues and reports.' },
  { key: PermissionKey.ModerationManage, scopeType: ScopeType.Platform, name: 'Manage Moderation', group: 'moderation', description: 'Take moderation actions on content and reports.' },
  { key: PermissionKey.ModerationAppealCreate, scopeType: ScopeType.Platform, name: 'Appeal Moderation', group: 'moderation', description: 'Submit and view appeals for moderation actions affecting your content or account.' },
  { key: PermissionKey.PaymentsView, scopeType: ScopeType.Company, name: 'View Payments', group: 'payments', description: 'View payment activity and breakdowns.' },
  { key: PermissionKey.PaymentsManage, scopeType: ScopeType.Company, name: 'Manage Payments', group: 'payments', description: 'Manage captures, refunds, and payment operations.' },
  { key: PermissionKey.FinanceLedgerView, scopeType: ScopeType.Company, name: 'View Ledger', group: 'finance', description: 'View ledger entries and financial snapshots.' },
  { key: PermissionKey.FinanceTaxManage, scopeType: ScopeType.Company, name: 'Manage Taxes', group: 'finance', description: 'Manage tax rules and tax breakdowns within the allowed scope.' },
  { key: PermissionKey.FinanceCommissionManage, scopeType: ScopeType.Company, name: 'Manage Commissions', group: 'finance', description: 'Manage commission rules and calculated commission records.' },
  { key: PermissionKey.FinancePayoutView, scopeType: ScopeType.Company, name: 'View Payouts', group: 'finance', description: 'View professional payout batches and payout items.' },
  { key: PermissionKey.FinancePayoutManage, scopeType: ScopeType.Company, name: 'Manage Payouts', group: 'finance', description: 'Manage payouts, commissions, and settlements.' },
  { key: PermissionKey.WalletView, scopeType: ScopeType.Platform, name: 'View Wallet', group: 'wallet', description: 'View wallet balances and wallet ledger entries.' },
  { key: PermissionKey.WalletManage, scopeType: ScopeType.Platform, name: 'Manage Wallet', group: 'wallet', description: 'Issue wallet credits, debits, and adjustments.' },
  { key: PermissionKey.LoyaltyView, scopeType: ScopeType.Platform, name: 'View Loyalty', group: 'loyalty', description: 'View loyalty accounts and points history.' },
  { key: PermissionKey.LoyaltyManage, scopeType: ScopeType.Platform, name: 'Manage Loyalty', group: 'loyalty', description: 'Issue or spend loyalty points.' },
  { key: PermissionKey.PackagesView, scopeType: ScopeType.Company, name: 'View Packages', group: 'retention', description: 'View packages and package purchases.' },
  { key: PermissionKey.PackagesManage, scopeType: ScopeType.Company, name: 'Manage Packages', group: 'retention', description: 'Create packages and record package purchases or usage.' },
  { key: PermissionKey.MembershipsView, scopeType: ScopeType.Company, name: 'View Memberships', group: 'retention', description: 'View memberships and membership subscriptions.' },
  { key: PermissionKey.MembershipsManage, scopeType: ScopeType.Company, name: 'Manage Memberships', group: 'retention', description: 'Create memberships and manage subscriptions.' },
  { key: PermissionKey.GiftCardsView, scopeType: ScopeType.Company, name: 'View Gift Cards', group: 'retention', description: 'View gift cards and gift card ledger activity.' },
  { key: PermissionKey.GiftCardsManage, scopeType: ScopeType.Company, name: 'Manage Gift Cards', group: 'retention', description: 'Issue, redeem, or adjust gift cards.' },
  { key: PermissionKey.ReferralsView, scopeType: ScopeType.Platform, name: 'View Referrals', group: 'retention', description: 'View referral records and reward states.' },
  { key: PermissionKey.ReferralsManage, scopeType: ScopeType.Platform, name: 'Manage Referrals', group: 'retention', description: 'Create, qualify, and reward referrals.' },
  { key: PermissionKey.PromotionsView, scopeType: ScopeType.Company, name: 'View Promotions', group: 'promotions', description: 'View promotions, coupons, and usage.' },
  { key: PermissionKey.PromotionsManage, scopeType: ScopeType.Company, name: 'Manage Promotions', group: 'promotions', description: 'Create promotions and coupons.' },
  { key: PermissionKey.MediaUpload, scopeType: ScopeType.Platform, name: 'Upload Media', group: 'media', description: 'Upload images, videos, or other media.' },
  { key: PermissionKey.MediaView, scopeType: ScopeType.Platform, name: 'View Media', group: 'media', description: 'View media files and metadata.' },
  { key: PermissionKey.MediaManage, scopeType: ScopeType.Company, name: 'Manage Media', group: 'media', description: 'Moderate, process, and attach media to business content.' },
  { key: PermissionKey.AnalyticsView, scopeType: ScopeType.Company, name: 'View Analytics', group: 'analytics', description: 'View analytics dashboards and drilldowns.' },
  { key: PermissionKey.AnalyticsManage, scopeType: ScopeType.Company, name: 'Manage Analytics', group: 'analytics', description: 'Create analytics snapshots and reconciliation records.' },
  { key: PermissionKey.RealtimeView, scopeType: ScopeType.Company, name: 'View Realtime State', group: 'realtime', description: 'View realtime calendar, floor board, and queue state.' },
  { key: PermissionKey.RealtimeManage, scopeType: ScopeType.Company, name: 'Manage Realtime State', group: 'realtime', description: 'Publish realtime updates for bookings, queues, notifications, and floor state.' },
  { key: PermissionKey.WorkersView, scopeType: ScopeType.Platform, name: 'View Workers', group: 'workers', description: 'View queue and worker health.' },
  { key: PermissionKey.WorkersManage, scopeType: ScopeType.Platform, name: 'Manage Workers', group: 'workers', description: 'Retry, cancel, and schedule background jobs.' },
  { key: PermissionKey.GeofenceView, scopeType: ScopeType.Platform, name: 'View Geofences', group: 'nearby', description: 'View nearby/geofence candidates and cooldowns.' },
  { key: PermissionKey.GeofenceManage, scopeType: ScopeType.Platform, name: 'Manage Geofences', group: 'nearby', description: 'Create geofence candidates and nearby campaigns.' },
  { key: PermissionKey.SettingsView, scopeType: ScopeType.Company, name: 'View Settings', group: 'settings', description: 'View settings within the allowed scope.' },
  { key: PermissionKey.SettingsManage, scopeType: ScopeType.Company, name: 'Manage Settings', group: 'settings', description: 'Update settings within the allowed scope.' },
  { key: PermissionKey.AdminUsersView, scopeType: ScopeType.Platform, name: 'View Users', group: 'admin', description: 'View platform users.' },
  { key: PermissionKey.AdminUsersManage, scopeType: ScopeType.Platform, name: 'Manage Users', group: 'admin', description: 'Create, edit, suspend, and recover users.' },
  { key: PermissionKey.AdminBusinessesView, scopeType: ScopeType.Platform, name: 'View Businesses', group: 'admin', description: 'View platform businesses.' },
  { key: PermissionKey.AdminBusinessesManage, scopeType: ScopeType.Platform, name: 'Manage Businesses', group: 'admin', description: 'Verify, suspend, or update platform businesses.' },
  { key: PermissionKey.AdminCountriesView, scopeType: ScopeType.Platform, name: 'View Countries', group: 'admin', description: 'View countries, currencies, tax settings, and regions.' },
  { key: PermissionKey.AdminCountriesManage, scopeType: ScopeType.Platform, name: 'Manage Countries', group: 'admin', description: 'Manage countries, currencies, tax settings, and regions.' },
  { key: PermissionKey.AdminCategoriesView, scopeType: ScopeType.Platform, name: 'View Categories', group: 'admin', description: 'View service category hierarchy and translations.' },
  { key: PermissionKey.AdminCategoriesManage, scopeType: ScopeType.Platform, name: 'Manage Categories', group: 'admin', description: 'Manage service category hierarchy and translations.' },
  { key: PermissionKey.AdminThemesView, scopeType: ScopeType.Platform, name: 'View Themes', group: 'admin', description: 'View platform branding and theme configuration.' },
  { key: PermissionKey.AdminThemesManage, scopeType: ScopeType.Platform, name: 'Manage Themes', group: 'admin', description: 'Manage platform branding and theme configuration.' },
  { key: PermissionKey.FeatureFlagsView, scopeType: ScopeType.Platform, name: 'View Feature Flags', group: 'admin', description: 'View feature flags and rollout configuration.' },
  { key: PermissionKey.FeatureFlagsManage, scopeType: ScopeType.Platform, name: 'Manage Feature Flags', group: 'admin', description: 'Create and update feature flags.' },
  { key: PermissionKey.RemoteConfigView, scopeType: ScopeType.Platform, name: 'View Remote Config', group: 'admin', description: 'View server-driven remote configuration.' },
  { key: PermissionKey.RemoteConfigManage, scopeType: ScopeType.Platform, name: 'Manage Remote Config', group: 'admin', description: 'Update server-driven remote configuration.' },
  { key: PermissionKey.AdminPlatformView, scopeType: ScopeType.Platform, name: 'View Platform Settings', group: 'admin', description: 'View platform configuration and admin dashboards.' },
  { key: PermissionKey.AdminPlatformManage, scopeType: ScopeType.Platform, name: 'Manage Platform Settings', group: 'admin', description: 'Manage platform-wide configuration.' },
  { key: PermissionKey.AdminImpersonate, scopeType: ScopeType.Platform, name: 'Impersonate User', group: 'admin', description: 'Create a short-lived audited impersonation session for a non-platform user.' },
  { key: PermissionKey.NotificationsView, scopeType: ScopeType.Platform, name: 'View Notifications', group: 'notifications', description: 'View notifications and inbox items.' },
  { key: PermissionKey.NotificationsEdit, scopeType: ScopeType.Platform, name: 'Manage Notifications', group: 'notifications', description: 'Update notification preferences and delivery state.' },
  { key: PermissionKey.ComplianceView, scopeType: ScopeType.Platform, name: 'View Compliance', group: 'compliance', description: 'View support, disputes, restrictions, consent, and compliance records.' },
  { key: PermissionKey.ComplianceManage, scopeType: ScopeType.Platform, name: 'Manage Compliance', group: 'compliance', description: 'Manage support, disputes, restrictions, consent, and compliance actions.' },
  { key: PermissionKey.AiUse, scopeType: ScopeType.Platform, name: 'Use AI Features', group: 'ai', description: 'Use optional AI search, recommendations, and insights features.' },
  { key: PermissionKey.AiManage, scopeType: ScopeType.Platform, name: 'Manage AI Features', group: 'ai', description: 'Manage optional AI providers and feature configuration.' },
  { key: PermissionKey.AuditView, scopeType: ScopeType.Platform, name: 'View Audit Logs', group: 'audit', description: 'View audit logs and compliance events.' },
];

export const ALL_PERMISSION_KEYS: readonly PermissionKey[] =
  PERMISSION_DEFINITIONS.map((permission) => permission.key);

export const ROLE_DEFINITIONS: readonly RoleDefinition[] = [
  { key: UserRole.SuperAdmin, scopeType: ScopeType.Platform, name: 'Super Admin', description: 'Full platform access with unrestricted permissions.', isSystem: true },
  { key: UserRole.PlatformAdmin, scopeType: ScopeType.Platform, name: 'Platform Admin', description: 'Platform administration across users, businesses, and operations.', isSystem: true },
  { key: UserRole.PlatformModerator, scopeType: ScopeType.Platform, name: 'Platform Moderator', description: 'Content and trust moderation across the platform.', isSystem: true },
  { key: UserRole.PlatformSupport, scopeType: ScopeType.Platform, name: 'Platform Support', description: 'Support access for customer and business assistance.', isSystem: true },
  { key: UserRole.CountryManager, scopeType: ScopeType.Platform, name: 'Country Manager', description: 'Country-level operational oversight for businesses and discovery.', isSystem: true },
  { key: UserRole.BusinessOwner, scopeType: ScopeType.Company, name: 'Business Owner', description: 'Full ownership over a business account and its branches.', isSystem: true },
  { key: UserRole.BusinessManager, scopeType: ScopeType.Company, name: 'Business Manager', description: 'Day-to-day management across business operations.', isSystem: true },
  { key: UserRole.BusinessAccountant, scopeType: ScopeType.Company, name: 'Business Accountant', description: 'Financial reporting, ledger, payment, commission and payout access without operational ownership.', isSystem: true },
  { key: UserRole.BranchManager, scopeType: ScopeType.Branch, name: 'Branch Manager', description: 'Operational control for an individual branch.', isSystem: true },
  { key: UserRole.Professional, scopeType: ScopeType.Company, name: 'Professional', description: 'Service provider access for schedules, bookings, and media.', isSystem: true },
  { key: UserRole.Staff, scopeType: ScopeType.Branch, name: 'Staff', description: 'Front-desk and operational branch access.', isSystem: true },
  { key: UserRole.PremiumCustomer, scopeType: ScopeType.Platform, name: 'Premium Customer', description: 'Enhanced customer access for loyalty-oriented experiences.', isSystem: true },
  { key: UserRole.Customer, scopeType: ScopeType.Platform, name: 'Customer', description: 'Standard customer access for booking and discovery.', isSystem: true },
  { key: UserRole.Guest, scopeType: ScopeType.Platform, name: 'Guest', description: 'Unauthenticated browsing access.', isSystem: true },
];

export const ROLE_PERMISSION_MAP: Readonly<Record<UserRole, readonly PermissionKey[]>> = {
  [UserRole.SuperAdmin]: ALL_PERMISSION_KEYS,
  [UserRole.PlatformAdmin]: [
    PermissionKey.AuthRegister,
    PermissionKey.AuthLogin,
    PermissionKey.AuthRefresh,
    PermissionKey.AuthLogout,
    PermissionKey.AuthPasswordView,
    PermissionKey.AuthPasswordChange,
    PermissionKey.DashboardViewBasic,
    PermissionKey.DashboardViewFinancial,
    PermissionKey.AdminUsersView,
    PermissionKey.AdminUsersManage,
    PermissionKey.AdminBusinessesView,
    PermissionKey.AdminBusinessesManage,
    PermissionKey.AdminCountriesView,
    PermissionKey.AdminCountriesManage,
    PermissionKey.AdminCategoriesView,
    PermissionKey.AdminCategoriesManage,
    PermissionKey.AdminThemesView,
    PermissionKey.AdminThemesManage,
    PermissionKey.FeatureFlagsView,
    PermissionKey.FeatureFlagsManage,
    PermissionKey.RemoteConfigView,
    PermissionKey.RemoteConfigManage,
    PermissionKey.AdminPlatformView,
    PermissionKey.AdminPlatformManage,
    PermissionKey.ModerationView,
    PermissionKey.ModerationManage,
    PermissionKey.PaymentsView,
    PermissionKey.PaymentsManage,
    PermissionKey.FinanceLedgerView,
    PermissionKey.FinanceTaxManage,
    PermissionKey.FinanceCommissionManage,
    PermissionKey.FinancePayoutView,
    PermissionKey.FinancePayoutManage,
    PermissionKey.WalletView,
    PermissionKey.WalletManage,
    PermissionKey.LoyaltyView,
    PermissionKey.LoyaltyManage,
    PermissionKey.PackagesView,
    PermissionKey.PackagesManage,
    PermissionKey.MembershipsView,
    PermissionKey.MembershipsManage,
    PermissionKey.GiftCardsView,
    PermissionKey.GiftCardsManage,
    PermissionKey.ReferralsView,
    PermissionKey.ReferralsManage,
    PermissionKey.PromotionsView,
    PermissionKey.PromotionsManage,
    PermissionKey.AnalyticsView,
    PermissionKey.AnalyticsManage,
    PermissionKey.RealtimeView,
    PermissionKey.RealtimeManage,
    PermissionKey.WorkersView,
    PermissionKey.WorkersManage,
    PermissionKey.GeofenceView,
    PermissionKey.GeofenceManage,
    PermissionKey.ComplianceView,
    PermissionKey.ComplianceManage,
    PermissionKey.AiUse,
    PermissionKey.AiManage,
    PermissionKey.AuditView,
    PermissionKey.NotificationsView,
    PermissionKey.NotificationsEdit,
    PermissionKey.BusinessProfileView,
    PermissionKey.BusinessBranchView,
    PermissionKey.BookingView,
    PermissionKey.DiscoveryView,
    PermissionKey.MediaView,
    PermissionKey.MediaManage,
    PermissionKey.ReviewsView,
  ],
  [UserRole.PlatformModerator]: [
    PermissionKey.AuthLogin,
    PermissionKey.AuthRefresh,
    PermissionKey.AuthLogout,
    PermissionKey.ModerationView,
    PermissionKey.ModerationManage,
    PermissionKey.MediaView,
    PermissionKey.MediaManage,
    PermissionKey.ReviewsView,
    PermissionKey.ReviewsManage,
    PermissionKey.SocialCommentDelete,
    PermissionKey.AdminBusinessesView,
    PermissionKey.ComplianceView,
    PermissionKey.ComplianceManage,
    PermissionKey.NotificationsView,
    PermissionKey.AuditView,
  ],
  [UserRole.PlatformSupport]: [
    PermissionKey.AuthLogin,
    PermissionKey.AuthRefresh,
    PermissionKey.AuthLogout,
    PermissionKey.BookingView,
    PermissionKey.BookingEdit,
    PermissionKey.BookingCancel,
    PermissionKey.BookingCheckIn,
    PermissionKey.CustomerProfileView,
    PermissionKey.BusinessProfileView,
    PermissionKey.AdminUsersView,
    PermissionKey.AdminBusinessesView,
    PermissionKey.WalletView,
    PermissionKey.LoyaltyView,
    PermissionKey.PackagesView,
    PermissionKey.MembershipsView,
    PermissionKey.GiftCardsView,
    PermissionKey.ReferralsView,
    PermissionKey.PromotionsView,
    PermissionKey.ComplianceView,
    PermissionKey.ReviewsView,
    PermissionKey.MediaView,
    PermissionKey.NotificationsView,
    PermissionKey.NotificationsEdit,
  ],
  [UserRole.CountryManager]: [
    PermissionKey.AuthLogin,
    PermissionKey.AuthRefresh,
    PermissionKey.AuthLogout,
    PermissionKey.DashboardViewBasic,
    PermissionKey.DashboardViewFinancial,
    PermissionKey.AdminBusinessesView,
    PermissionKey.AdminBusinessesManage,
    PermissionKey.AdminCountriesView,
    PermissionKey.AdminCountriesManage,
    PermissionKey.AdminCategoriesView,
    PermissionKey.AdminCategoriesManage,
    PermissionKey.AdminThemesView,
    PermissionKey.FeatureFlagsView,
    PermissionKey.RemoteConfigView,
    PermissionKey.BusinessProfileView,
    PermissionKey.BusinessProfileEdit,
    PermissionKey.BusinessBranchView,
    PermissionKey.BusinessBranchEdit,
    PermissionKey.BookingView,
    PermissionKey.PaymentsView,
    PermissionKey.FinanceLedgerView,
    PermissionKey.FinanceTaxManage,
    PermissionKey.FinanceCommissionManage,
    PermissionKey.FinancePayoutView,
    PermissionKey.PackagesView,
    PermissionKey.PackagesManage,
    PermissionKey.MembershipsView,
    PermissionKey.MembershipsManage,
    PermissionKey.GiftCardsView,
    PermissionKey.GiftCardsManage,
    PermissionKey.PromotionsView,
    PermissionKey.PromotionsManage,
    PermissionKey.AnalyticsView,
    PermissionKey.AnalyticsManage,
    PermissionKey.GeofenceView,
    PermissionKey.GeofenceManage,
    PermissionKey.DiscoveryView,
    PermissionKey.DiscoverySearch,
    PermissionKey.MediaView,
    PermissionKey.ReviewsView,
    PermissionKey.NotificationsView,
  ],
  [UserRole.BusinessOwner]: [
    PermissionKey.AuthLogin,
    PermissionKey.AuthRefresh,
    PermissionKey.AuthLogout,
    PermissionKey.AuthPasswordView,
    PermissionKey.AuthPasswordChange,
    PermissionKey.DashboardViewBasic,
    PermissionKey.DashboardViewFinancial,
    PermissionKey.BusinessProfileView,
    PermissionKey.BusinessProfileEdit,
    PermissionKey.BusinessBranchView,
    PermissionKey.BusinessBranchCreate,
    PermissionKey.BusinessBranchEdit,
    PermissionKey.BusinessBranchDelete,
    PermissionKey.BusinessProfessionalView,
    PermissionKey.BusinessProfessionalCreate,
    PermissionKey.BusinessProfessionalEdit,
    PermissionKey.BusinessProfessionalDelete,
    PermissionKey.BusinessServiceView,
    PermissionKey.BusinessServiceCreate,
    PermissionKey.BusinessServiceEdit,
    PermissionKey.BusinessServiceDelete,
    PermissionKey.BusinessResourceView,
    PermissionKey.BusinessResourceCreate,
    PermissionKey.BusinessResourceEdit,
    PermissionKey.BusinessResourceDelete,
    PermissionKey.BookingCreate,
    PermissionKey.BookingView,
    PermissionKey.BookingEdit,
    PermissionKey.BookingCancel,
    PermissionKey.BookingManage,
    PermissionKey.BookingCheckIn,
    PermissionKey.BookingQueueManage,
    PermissionKey.BookingGroupManage,
    PermissionKey.PaymentsView,
    PermissionKey.PaymentsManage,
    PermissionKey.FinanceLedgerView,
    PermissionKey.FinanceTaxManage,
    PermissionKey.FinanceCommissionManage,
    PermissionKey.FinancePayoutView,
    PermissionKey.FinancePayoutManage,
    PermissionKey.PackagesView,
    PermissionKey.PackagesManage,
    PermissionKey.MembershipsView,
    PermissionKey.MembershipsManage,
    PermissionKey.GiftCardsView,
    PermissionKey.GiftCardsManage,
    PermissionKey.ReferralsView,
    PermissionKey.PromotionsView,
    PermissionKey.PromotionsManage,
    PermissionKey.AnalyticsView,
    PermissionKey.AnalyticsManage,
    PermissionKey.RealtimeView,
    PermissionKey.RealtimeManage,
    PermissionKey.GeofenceView,
    PermissionKey.AiUse,
    PermissionKey.MediaUpload,
    PermissionKey.MediaView,
    PermissionKey.MediaManage,
    PermissionKey.ReviewsView,
    PermissionKey.ReviewsManage,
    PermissionKey.SocialPostCreate,
    PermissionKey.ModerationAppealCreate,
    PermissionKey.NotificationsView,
    PermissionKey.NotificationsEdit,
    PermissionKey.SettingsView,
    PermissionKey.SettingsManage,
  ],
  [UserRole.BusinessManager]: [
    PermissionKey.AuthLogin,
    PermissionKey.AuthRefresh,
    PermissionKey.AuthLogout,
    PermissionKey.AuthPasswordView,
    PermissionKey.AuthPasswordChange,
    PermissionKey.DashboardViewBasic,
    PermissionKey.BusinessProfileView,
    PermissionKey.BusinessProfileEdit,
    PermissionKey.BusinessBranchView,
    PermissionKey.BusinessBranchEdit,
    PermissionKey.BusinessProfessionalView,
    PermissionKey.BusinessProfessionalCreate,
    PermissionKey.BusinessProfessionalEdit,
    PermissionKey.BusinessServiceView,
    PermissionKey.BusinessServiceCreate,
    PermissionKey.BusinessServiceEdit,
    PermissionKey.BusinessResourceView,
    PermissionKey.BusinessResourceCreate,
    PermissionKey.BusinessResourceEdit,
    PermissionKey.BookingCreate,
    PermissionKey.BookingView,
    PermissionKey.BookingEdit,
    PermissionKey.BookingCancel,
    PermissionKey.BookingManage,
    PermissionKey.BookingCheckIn,
    PermissionKey.BookingQueueManage,
    PermissionKey.BookingGroupManage,
    PermissionKey.PaymentsView,
    PermissionKey.FinanceLedgerView,
    PermissionKey.FinancePayoutView,
    PermissionKey.PackagesView,
    PermissionKey.PackagesManage,
    PermissionKey.MembershipsView,
    PermissionKey.MembershipsManage,
    PermissionKey.GiftCardsView,
    PermissionKey.GiftCardsManage,
    PermissionKey.PromotionsView,
    PermissionKey.PromotionsManage,
    PermissionKey.AnalyticsView,
    PermissionKey.RealtimeView,
    PermissionKey.RealtimeManage,
    PermissionKey.AiUse,
    PermissionKey.MediaUpload,
    PermissionKey.MediaView,
    PermissionKey.MediaManage,
    PermissionKey.ReviewsView,
    PermissionKey.ReviewsManage,
    PermissionKey.SocialPostCreate,
    PermissionKey.ModerationAppealCreate,
    PermissionKey.NotificationsView,
    PermissionKey.NotificationsEdit,
    PermissionKey.SettingsView,
    PermissionKey.SettingsManage,
  ],
  [UserRole.BusinessAccountant]: [
    PermissionKey.AuthLogin,
    PermissionKey.AuthRefresh,
    PermissionKey.AuthLogout,
    PermissionKey.AuthPasswordView,
    PermissionKey.AuthPasswordChange,
    PermissionKey.DashboardViewBasic,
    PermissionKey.DashboardViewFinancial,
    PermissionKey.BusinessProfileView,
    PermissionKey.BusinessBranchView,
    PermissionKey.BookingView,
    PermissionKey.CustomerProfileView,
    PermissionKey.PaymentsView,
    PermissionKey.PaymentsManage,
    PermissionKey.FinanceLedgerView,
    PermissionKey.FinanceTaxManage,
    PermissionKey.FinanceCommissionManage,
    PermissionKey.FinancePayoutView,
    PermissionKey.FinancePayoutManage,
    PermissionKey.AnalyticsView,
    PermissionKey.NotificationsView,
    PermissionKey.SettingsView,
  ],
  [UserRole.BranchManager]: [
    PermissionKey.AuthLogin,
    PermissionKey.AuthRefresh,
    PermissionKey.AuthLogout,
    PermissionKey.DashboardViewBasic,
    PermissionKey.BusinessProfileView,
    PermissionKey.BusinessBranchView,
    PermissionKey.BusinessProfessionalView,
    PermissionKey.BusinessProfessionalEdit,
    PermissionKey.BusinessServiceView,
    PermissionKey.BusinessServiceEdit,
    PermissionKey.BusinessResourceView,
    PermissionKey.BusinessResourceEdit,
    PermissionKey.BookingCreate,
    PermissionKey.BookingView,
    PermissionKey.BookingEdit,
    PermissionKey.BookingCancel,
    PermissionKey.BookingManage,
    PermissionKey.BookingCheckIn,
    PermissionKey.BookingQueueManage,
    PermissionKey.BookingGroupManage,
    PermissionKey.PaymentsView,
    PermissionKey.PackagesView,
    PermissionKey.MembershipsView,
    PermissionKey.GiftCardsView,
    PermissionKey.PromotionsView,
    PermissionKey.AnalyticsView,
    PermissionKey.RealtimeView,
    PermissionKey.RealtimeManage,
    PermissionKey.MediaView,
    PermissionKey.ReviewsView,
    PermissionKey.NotificationsView,
    PermissionKey.NotificationsEdit,
  ],
  [UserRole.Professional]: [
    PermissionKey.AuthLogin,
    PermissionKey.AuthRefresh,
    PermissionKey.AuthLogout,
    PermissionKey.BookingView,
    PermissionKey.BookingEdit,
    PermissionKey.BookingCheckIn,
    PermissionKey.BookingManage,
    PermissionKey.BusinessServiceView,
    PermissionKey.CustomerProfileView,
    PermissionKey.AnalyticsView,
    PermissionKey.RealtimeView,
    PermissionKey.MediaUpload,
    PermissionKey.MediaView,
    PermissionKey.ReviewsView,
    PermissionKey.SocialPostCreate,
    PermissionKey.SocialPostLike,
    PermissionKey.SocialCommentCreate,
    PermissionKey.SocialCommentDelete,
    PermissionKey.ModerationAppealCreate,
    PermissionKey.NotificationsView,
    PermissionKey.NotificationsEdit,
  ],
  [UserRole.Staff]: [
    PermissionKey.AuthLogin,
    PermissionKey.AuthRefresh,
    PermissionKey.AuthLogout,
    PermissionKey.BookingCreate,
    PermissionKey.BookingView,
    PermissionKey.BookingEdit,
    PermissionKey.BookingCancel,
    PermissionKey.BookingCheckIn,
    PermissionKey.BookingManage,
    PermissionKey.BookingQueueManage,
    PermissionKey.CustomerProfileView,
    PermissionKey.BusinessServiceView,
    PermissionKey.BusinessResourceView,
    PermissionKey.PaymentsView,
    PermissionKey.PackagesView,
    PermissionKey.PromotionsView,
    PermissionKey.RealtimeView,
    PermissionKey.MediaView,
    PermissionKey.ReviewsView,
    PermissionKey.NotificationsView,
  ],
  [UserRole.PremiumCustomer]: [
    PermissionKey.AuthRegister,
    PermissionKey.AuthLogin,
    PermissionKey.AuthRefresh,
    PermissionKey.AuthLogout,
    PermissionKey.AuthPasswordView,
    PermissionKey.AuthPasswordChange,
    PermissionKey.AuthPasswordReset,
    PermissionKey.CustomerProfileView,
    PermissionKey.CustomerProfileEdit,
    PermissionKey.CustomerFavoritesView,
    PermissionKey.CustomerFavoritesAdd,
    PermissionKey.CustomerFavoritesRemove,
    PermissionKey.CustomerFollowingView,
    PermissionKey.CustomerFollowingAdd,
    PermissionKey.CustomerFollowingRemove,
    PermissionKey.BookingCreate,
    PermissionKey.BookingView,
    PermissionKey.BookingEdit,
    PermissionKey.BookingCancel,
    PermissionKey.DiscoverySearch,
    PermissionKey.DiscoveryView,
    PermissionKey.WalletView,
    PermissionKey.LoyaltyView,
    PermissionKey.PackagesView,
    PermissionKey.MembershipsView,
    PermissionKey.GiftCardsView,
    PermissionKey.ReferralsView,
    PermissionKey.ReferralsManage,
    PermissionKey.PromotionsView,
    PermissionKey.AiUse,
    PermissionKey.MediaUpload,
    PermissionKey.MediaView,
    PermissionKey.ReviewsCreate,
    PermissionKey.ReviewsView,
    PermissionKey.SocialPostLike,
    PermissionKey.SocialCommentCreate,
    PermissionKey.SocialCommentDelete,
    PermissionKey.ModerationAppealCreate,
    PermissionKey.NotificationsView,
    PermissionKey.NotificationsEdit,
  ],
  [UserRole.Customer]: [
    PermissionKey.AuthRegister,
    PermissionKey.AuthLogin,
    PermissionKey.AuthRefresh,
    PermissionKey.AuthLogout,
    PermissionKey.AuthPasswordView,
    PermissionKey.AuthPasswordChange,
    PermissionKey.AuthPasswordReset,
    PermissionKey.CustomerProfileView,
    PermissionKey.CustomerProfileEdit,
    PermissionKey.CustomerFavoritesView,
    PermissionKey.CustomerFavoritesAdd,
    PermissionKey.CustomerFavoritesRemove,
    PermissionKey.CustomerFollowingView,
    PermissionKey.CustomerFollowingAdd,
    PermissionKey.CustomerFollowingRemove,
    PermissionKey.BookingCreate,
    PermissionKey.BookingView,
    PermissionKey.BookingEdit,
    PermissionKey.BookingCancel,
    PermissionKey.DiscoverySearch,
    PermissionKey.DiscoveryView,
    PermissionKey.WalletView,
    PermissionKey.LoyaltyView,
    PermissionKey.PackagesView,
    PermissionKey.MembershipsView,
    PermissionKey.GiftCardsView,
    PermissionKey.ReferralsView,
    PermissionKey.ReferralsManage,
    PermissionKey.PromotionsView,
    PermissionKey.AiUse,
    PermissionKey.MediaUpload,
    PermissionKey.MediaView,
    PermissionKey.ReviewsCreate,
    PermissionKey.ReviewsView,
    PermissionKey.SocialPostLike,
    PermissionKey.SocialCommentCreate,
    PermissionKey.SocialCommentDelete,
    PermissionKey.ModerationAppealCreate,
    PermissionKey.NotificationsView,
    PermissionKey.NotificationsEdit,
  ],
  [UserRole.Guest]: [
    PermissionKey.AuthRegister,
    PermissionKey.AuthLogin,
    PermissionKey.DiscoverySearch,
    PermissionKey.DiscoveryView,
    PermissionKey.PackagesView,
    PermissionKey.MembershipsView,
    PermissionKey.GiftCardsView,
    PermissionKey.PromotionsView,
    PermissionKey.AiUse,
    PermissionKey.MediaView,
    PermissionKey.ReviewsView,
  ],
};

export enum AppointmentStatus {
  Pending = 'pending',
  Confirmed = 'confirmed',
  CheckedIn = 'checked_in',
  InProgress = 'in_progress',
  Completed = 'completed',
  NoShow = 'no_show',
  CancelledByCustomer = 'cancelled_by_customer',
  CancelledByBusiness = 'cancelled_by_business',
  CancelledBySystem = 'cancelled_by_system',
  Rescheduled = 'rescheduled',
  RefundRequested = 'refund_requested',
  Refunded = 'refunded',
  PartiallyRefunded = 'partially_refunded',
  Expired = 'expired',
}

export enum ResourceStatus {
  Available = 'available',
  Busy = 'busy',
  Offline = 'offline',
  OutOfService = 'out_of_service',
  Maintenance = 'maintenance',
  Booked = 'booked',
  Restricted = 'restricted',
  Assigned = 'assigned',
}

export enum ResourceTypeEnum {
  Room = 'room',
  Chair = 'chair',
  Bed = 'bed',
  Machine = 'machine',
  Tool = 'tool',
  Equipment = 'equipment',
  Table = 'table',
  Vehicle = 'vehicle',
  Staff = 'staff',
  Other = 'other',
}

export enum PaymentMethod {
  Cash = 'cash',
  Card = 'card',
  ApplePay = 'apple_pay',
  GooglePay = 'google_pay',
  Wallet = 'wallet',
  BankTransfer = 'bank_transfer',
  GiftCard = 'gift_card',
  Points = 'points',
  Coupon = 'coupon',
  PayAtBranch = 'pay_at_branch',
  OMT = 'omt',
  WhishMoney = 'whish_money',
}

export enum ReviewDimension {
  Quality = 'quality',
  Service = 'service',
  Cleanliness = 'cleanliness',
  Value = 'value',
  Location = 'location',
  Staff = 'staff',
  Ambiance = 'ambiance',
  Punctuality = 'punctuality',
}

export enum NotificationType {
  BookingConfirmed = 'booking_confirmed',
  BookingReminder = 'booking_reminder',
  BookingCancelled = 'booking_cancelled',
  BookingRescheduled = 'booking_rescheduled',
  BookingCompleted = 'booking_completed',
  NewReview = 'new_review',
  ReviewReply = 'review_reply',
  NewMessage = 'new_message',
  NewFollower = 'new_follower',
  FollowedBusinessNewOffer = 'followed_business_new_offer',
  FollowedBusinessNewService = 'followed_business_new_service',
  PaymentReceived = 'payment_received',
  PaymentFailed = 'payment_failed',
  RefundProcessed = 'refund_processed',
  VerificationRequestApproved = 'verification_request_approved',
  VerificationRequestRejected = 'verification_request_rejected',
  SystemAnnouncement = 'system_announcement',
  PromoOffer = 'promo_offer',
  LoyaltyReward = 'loyalty_reward',
  GiftCardReceived = 'gift_card_received',
  AppointmentStartingSoon = 'appointment_starting_soon',
}

export enum HomeSectionKey {
  ForYou = 'for_you',
  NearYou = 'near_you',
  AvailableNow = 'available_now',
  Trending = 'trending',
  TopRated = 'top_rated',
  BestValue = 'best_value',
  LastMinute = 'last_minute',
  Offers = 'offers',
  NewNearYou = 'new_near_you',
  Following = 'following',
  RecentlyViewed = 'recently_viewed',
  PopularCategories = 'popular_categories',
  RecommendedProfessionals = 'recommended_professionals',
}

export interface BaseTimestamp {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BaseSoftDeletable extends BaseTimestamp {
  deletedAt?: Date | null;
}

export interface UserTiny extends BaseTimestamp {
  fullName: string;
  avatarMediaId?: string | null;
  role: UserRole;
}

export interface User extends BaseSoftDeletable {
  email?: string | null;
  emailVerifiedAt?: Date | null;
  phone?: string | null;
  phoneVerifiedAt?: Date | null;
  passwordHash: string;
  fullName: string;
  avatarMediaId?: string | null;
  locale: string;
  themeMode: string;
  isActive: boolean;
  lastLoginAt?: Date | null;
  roles: UserRole[];
}

export interface UserProfile extends BaseTimestamp {
  userId: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: Date | null;
  gender?: string | null;
  bio?: string | null;
  websiteUrl?: string | null;
  instagramHandle?: string | null;
  tiktokHandle?: string | null;
  facebookUrl?: string | null;
  linkedinUrl?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  postalCode?: string | null;
  cityId?: string | null;
  countryId: string;
  currencyCode?: string | null;
  notificationToken?: string | null;
  completedOnboarding: boolean;
}

export interface UserPreference extends BaseTimestamp {
  userId: string;
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
}

export interface Session extends BaseSoftDeletable {
  userId: string;
  refreshTokenHash: string;
  accessTokenJti: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  countryCode?: string | null;
  city?: string | null;
  deviceType?: string | null;
  deviceName?: string | null;
  expiresAt: Date;
  lastActiveAt?: Date | null;
  isCurrent?: boolean;
}

export interface Role extends BaseTimestamp {
  key: UserRole;
  scopeType: ScopeType;
  name: string;
  description?: string | null;
  isSystem: boolean;
}

export interface Permission extends BaseTimestamp {
  key: PermissionKey;
  scopeType: ScopeType;
  name: string;
  description?: string | null;
  group: string;
}

export interface UserRoleScope extends BaseTimestamp {
  userId: string;
  roleId: string;
  roleKey: UserRole;
  scopeType: ScopeType;
  scopeId?: string | null;
  companyId?: string | null;
  branchId?: string | null;
  grantedByUserId?: string | null;
  expiresAt?: Date | null;
}

export interface Country extends BaseTimestamp {
  isoCode: string;
  name: string;
  nativeName?: string | null;
  dialCode: string;
  currencyCode: string;
  currencySymbol?: string | null;
  flagEmoji?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  timezones?: string[] | null;
  languages?: string[] | null;
  isActive: boolean;
  sortOrder: number;
}

export interface Region extends BaseTimestamp {
  countryId: string;
  code?: string | null;
  name: string;
  nativeName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isActive: boolean;
  sortOrder: number;
}

export interface District extends BaseTimestamp {
  regionId: string;
  countryId: string;
  code?: string | null;
  name: string;
  nativeName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isActive: boolean;
  sortOrder: number;
}

export interface City extends BaseTimestamp {
  districtId?: string | null;
  regionId?: string | null;
  countryId: string;
  code?: string | null;
  name: string;
  nativeName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  timezone?: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface Area extends BaseTimestamp {
  cityId: string;
  countryId: string;
  code?: string | null;
  name: string;
  nativeName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  radiusMeters?: number | null;
  postalCodes?: string[] | null;
  isActive: boolean;
  sortOrder: number;
}

export interface Language extends BaseTimestamp {
  isoCode: string;
  iso3Code?: string | null;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  flagEmoji?: string | null;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
}

export interface Currency extends BaseTimestamp {
  isoCode: string;
  numericCode?: string | null;
  name: string;
  symbol: string;
  nativeSymbol?: string | null;
  decimalDigits: number;
  rounding: number;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
}

export interface Company extends BaseSoftDeletable {
  ownerUserId: string;
  countryId: string;
  cityId?: string | null;
  categoryIds: string[];
  legalName?: string | null;
  displayName: string;
  slug: string;
  descriptionShort?: string | null;
  descriptionLong?: string | null;
  tagline?: string | null;
  taxNumber?: string | null;
  commercialRegisterNumber?: string | null;
  coverMediaId?: string | null;
  logoMediaId?: string | null;
  websiteUrl?: string | null;
  bookingEnabled: boolean;
  walkInsEnabled: boolean;
  onlinePaymentsEnabled: boolean;
  minBookingNoticeMinutes?: number | null;
  maxBookingAdvanceDays?: number | null;
  cancellationPolicyHours?: number | null;
  cancellationFeePercent?: number | null;
  noShowFeePercent?: number | null;
  depositRequired: boolean;
  depositPercent?: number | null;
  autoConfirmBookings: boolean;
  avgRating?: number | null;
  reviewCount: number;
  followerCount: number;
  viewCount: number;
  featuredLevel?: number | null;
  featuredExpiresAt?: Date | null;
  isVerified: boolean;
  isActive: boolean;
  verifiedAt?: Date | null;
  publishedAt?: Date | null;
}

export interface CompanyVerification extends BaseTimestamp {
  companyId: string;
  submittedByUserId: string;
  legalBusinessName?: string | null;
  registrationNumber?: string | null;
  taxIdNumber?: string | null;
  ownerFullName?: string | null;
  ownerIdNumber?: string | null;
  documents: string[];
  notes?: string | null;
  reviewedByUserId?: string | null;
  reviewedAt?: Date | null;
  rejectionReason?: string | null;
  status: 'pending' | 'approved' | 'rejected' | 're_submitted';
}

export interface Branch extends BaseSoftDeletable {
  companyId: string;
  managerUserId?: string | null;
  countryId: string;
  cityId?: string | null;
  areaId?: string | null;
  regionId?: string | null;
  districtId?: string | null;
  referenceCode?: string | null;
  name: string;
  slug: string;
  description?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  geohash?: string | null;
  phone?: string | null;
  phoneSecondary?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  facebookUrl?: string | null;
  instagramHandle?: string | null;
  coverMediaId?: string | null;
  timezone?: string | null;
  bookingEnabled: boolean;
  walkInsEnabled: boolean;
  homeServiceEnabled: boolean;
  homeServiceRadiusMeters?: number | null;
  autoConfirmBookings?: boolean | null;
  sortOrder: number;
  isActive: boolean;
  isMain: boolean;
}

export interface BranchHours extends BaseTimestamp {
  branchId: string;
  dayOfWeek: number;
  isClosed: boolean;
  opensAt?: string | null;
  closesAt?: string | null;
  breakStartsAt?: string | null;
  breakEndsAt?: string | null;
  slotSizeMinutes: number;
}

export interface Professional extends BaseSoftDeletable {
  userId: string;
  companyId: string;
  branchIds: string[];
  memberNumber?: string | null;
  displayName: string;
  bio?: string | null;
  avatarMediaId?: string | null;
  coverMediaId?: string | null;
  specialties?: string[] | null;
  tags?: string[] | null;
  yearsExperience?: number | null;
  genderPreference?: string | null;
  acceptsWalkIns: boolean;
  acceptsHomeService: boolean;
  commissionPercent?: number | null;
  avgRating?: number | null;
  reviewCount: number;
  followerCount: number;
  sortOrder: number;
  isVerified: boolean;
  isActive: boolean;
  verifiedAt?: Date | null;
}

export interface ProfessionalProfile extends BaseTimestamp {
  professionalId: string;
  userId: string;
  education?: string[] | null;
  certifications?: string[] | null;
  awards?: string[] | null;
  languagesSpoken?: string[] | null;
  portfolioMediaIds?: string[] | null;
  reelMediaIds?: string[] | null;
  pricingNotes?: string | null;
  socialLinks?: Record<string, string> | null;
}

export interface ServiceCategory extends BaseTimestamp {
  parentId?: string | null;
  countryId?: string | null;
  code?: string | null;
  slug: string;
  name: string;
  nameTranslations?: Record<string, string> | null;
  description?: string | null;
  descriptionTranslations?: Record<string, string> | null;
  iconKey?: string | null;
  coverMediaId?: string | null;
  color?: string | null;
  homeServiceAllowed: boolean;
  requiresProfessional: boolean;
  defaultDurationMinutes?: number | null;
  defaultBufferBeforeMinutes: number;
  defaultBufferAfterMinutes: number;
  sortOrder: number;
  isActive: boolean;
  isFeatured: boolean;
  depthLevel: number;
}

export interface Service extends BaseSoftDeletable {
  companyId: string;
  branchIds: string[];
  categoryId: string;
  professionalIds: string[];
  resourceIds?: string[] | null;
  sku?: string | null;
  slug: string;
  name: string;
  summary?: string | null;
  description?: string | null;
  coverMediaId?: string | null;
  galleryMediaIds?: string[] | null;
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  basePrice: number;
  currencyCode: string;
  taxInclusive: boolean;
  taxPercent?: number | null;
  discountPercent?: number | null;
  discountFixed?: number | null;
  discountValidFrom?: Date | null;
  discountValidUntil?: Date | null;
  homeServiceAllowed: boolean;
  homeServiceFee?: number | null;
  walkInsAllowed: boolean;
  genderPreference?: string | null;
  maxClientsPerSlot: number;
  onlinePaymentRequired: boolean;
  depositPercent?: number | null;
  cancellationPolicyHours?: number | null;
  cancellationFeePercent?: number | null;
  tags?: string[] | null;
  avgRating?: number | null;
  reviewCount: number;
  bookingCount: number;
  sortOrder: number;
  isActive: boolean;
  isFeatured: boolean;
}

export interface ServiceTranslation extends BaseTimestamp {
  serviceId: string;
  locale: string;
  name: string;
  summary?: string | null;
  description?: string | null;
}

export interface Resource extends BaseSoftDeletable {
  companyId: string;
  branchId?: string | null;
  categoryId?: string | null;
  code?: string | null;
  name: string;
  type: ResourceTypeEnum;
  description?: string | null;
  iconKey?: string | null;
  mediaIds?: string[] | null;
  quantity: number;
  locationNote?: string | null;
  capacityPerSlot?: number | null;
  setupMinutes: number;
  cleanupMinutes: number;
  hourlyCost?: number | null;
  currencyCode?: string | null;
  attributes?: ResourceAttribute[] | null;
  tags?: string[] | null;
  sortOrder: number;
  isActive: boolean;
}

export interface ResourceAttribute {
  key: string;
  value: string;
  labelTranslations?: Record<string, string> | null;
  searchable: boolean;
}

export interface Customer extends BaseTimestamp {
  userId: string;
  customerNumber?: string | null;
  loyaltyLevel?: string | null;
  loyaltyPoints: number;
  totalSpentAmount: number;
  totalBookings: number;
  referralCode?: string | null;
  referredByUserId?: string | null;
  lastBookingAt?: Date | null;
  preferredBranchId?: string | null;
  preferredProfessionalIds?: string[] | null;
  blockedByCompanyIds?: string[] | null;
}

export interface CustomerProfile extends BaseTimestamp {
  customerId: string;
  skinType?: string | null;
  hairType?: string | null;
  allergies?: string[] | null;
  preferredProducts?: string[] | null;
  colorPreferences?: string[] | null;
  styleNotes?: string | null;
  medicalNotes?: string | null;
  privateNotes?: string | null;
}

export interface AppointmentSkeleton extends BaseTimestamp {
  companyId: string;
  branchId: string;
  serviceIds: string[];
  professionalId?: string | null;
  resourceIds?: string[] | null;
  customerId?: string | null;
  customerUserId?: string | null;
  startAt: Date;
  endAt: Date;
  durationMinutes: number;
  status: AppointmentStatus;
  guestCount: number;
  notesCustomer?: string | null;
  notesStaff?: string | null;
  isWalkIn: boolean;
  isHomeService: boolean;
  homeServiceAddress?: string | null;
  homeServiceLatitude?: number | null;
  homeServiceLongitude?: number | null;
}

export interface Review extends BaseSoftDeletable {
  authorUserId: string;
  companyId: string;
  branchId?: string | null;
  serviceId?: string | null;
  professionalId?: string | null;
  appointmentId?: string | null;
  orderId?: string | null;
  title?: string | null;
  body?: string | null;
  overallRating: number;
  dimensionRatings?: ReviewRating[] | null;
  mediaIds?: string[] | null;
  responseBody?: string | null;
  responseByUserId?: string | null;
  responseAt?: Date | null;
  helpfulCount: number;
  reportedCount: number;
  isVerified: boolean;
  isFeatured: boolean;
  isAnonymous: boolean;
  status: 'draft' | 'published' | 'hidden' | 'flagged' | 'removed';
  publishedAt?: Date | null;
}

export interface ReviewRating extends BaseTimestamp {
  reviewId: string;
  dimension: ReviewDimension;
  rating: number;
}

export interface Post extends BaseSoftDeletable {
  authorUserId: string;
  authorRole: UserRole;
  companyId?: string | null;
  branchId?: string | null;
  professionalId?: string | null;
  title?: string | null;
  slug?: string | null;
  bodyPlain?: string | null;
  bodyHtml?: string | null;
  coverMediaId?: string | null;
  mediaIds?: string[] | null;
  tags?: string[] | null;
  serviceIds?: string[] | null;
  categoryIds?: string[] | null;
  isPromotion: boolean;
  promotionStartAt?: Date | null;
  promotionEndAt?: Date | null;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  bookmarkCount: number;
  status: 'draft' | 'published' | 'scheduled' | 'archived';
  scheduledAt?: Date | null;
  publishedAt?: Date | null;
}

export interface Media extends BaseTimestamp {
  uploaderUserId: string;
  companyId?: string | null;
  branchId?: string | null;
  originalFileName: string;
  storedFileName: string;
  storageKey: string;
  storageBucket: string;
  storageProvider: string;
  mimeCategory: 'image' | 'video' | 'audio' | 'document' | 'other';
  mimeType: string;
  sizeBytes: number;
  widthPixels?: number | null;
  heightPixels?: number | null;
  durationSeconds?: number | null;
  blurhash?: string | null;
  dominantColorHex?: string | null;
  variants?: Record<string, string> | null;
  altText?: string | null;
  caption?: string | null;
  tags?: string[] | null;
  checksumSha256?: string | null;
  isPublic: boolean;
  licenseType?: string | null;
  copyrightHolder?: string | null;
  status: 'uploaded' | 'processed' | 'failed' | 'deleted';
  processedAt?: Date | null;
}

export interface Notification extends BaseTimestamp {
  recipientUserId: string;
  type: NotificationType;
  scopeType?: ScopeType | null;
  scopeId?: string | null;
  companyId?: string | null;
  branchId?: string | null;
  title: string;
  titleTranslations?: Record<string, string> | null;
  body: string;
  bodyTranslations?: Record<string, string> | null;
  imageMediaId?: string | null;
  deepLink?: string | null;
  payload?: Record<string, unknown> | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  channels: string[];
  sentAt?: Date | null;
  readAt?: Date | null;
  clickedAt?: Date | null;
  dismissedAt?: Date | null;
  expiresAt?: Date | null;
  relatedNotificationId?: string | null;
}

export interface BusinessProfileResponse {
  id: string;
  company: Company;
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
}

export interface ProfessionalProfileResponse {
  id: string;
  professional: Professional;
  profile: ProfessionalProfile;
  companyName: string;
  companyId: string;
  branches: Branch[];
  services: Service[];
  mediaCount: number;
  portfolioMediaIds: string[];
  reelMediaIds: string[];
  avgRating: number;
  reviewCount: number;
  followerCount: number;
  isFollowing: boolean;
  isVerified: boolean;
  specialties: string[];
  yearsExperience?: number | null;
  nextAvailableAt?: Date | null;
  languagesSpoken: string[];
}

export interface ServiceDetailResponse {
  id: string;
  service: Service;
  translations: ServiceTranslation[];
  companyName: string;
  companyId: string;
  branchName?: string | null;
  categoryName: string;
  categoryId: string;
  professionals: Professional[];
  resources: Resource[];
  galleryMediaIds: string[];
  avgRating: number;
  reviewCount: number;
  bookingCount: number;
  isFavorite: boolean;
  earliestAvailableAt?: Date | null;
  relatedServiceIds: string[];
  tags: string[];
}

export interface DiscoveryBusinessResult {
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
  priceLevel?: 1 | 2 | 3 | 4;
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

export interface PagedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  code?: string | null;
  correlationId?: string | null;
  details?: Record<string, unknown> | unknown[] | null;
  timestamp: string;
  path?: string | null;
}




