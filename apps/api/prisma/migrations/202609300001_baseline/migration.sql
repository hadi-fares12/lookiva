-- LOOKIVA schema-aligned baseline migration
-- Generated from prisma/schema.prisma. Fresh databases only.
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE "users" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "email" TEXT UNIQUE,
  "email_verified_at" TIMESTAMP(3),
  "phone" TEXT UNIQUE,
  "phone_verified_at" TIMESTAMP(3),
  "password_hash" TEXT NOT NULL,
  "full_name" TEXT NOT NULL,
  "avatar_media_id" TEXT,
  "locale" TEXT NOT NULL DEFAULT 'en',
  "theme_mode" TEXT NOT NULL DEFAULT 'midnight-gold',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "last_login_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3)
);

CREATE TABLE "user_profiles" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "user_id" TEXT NOT NULL UNIQUE,
  "first_name" TEXT NOT NULL,
  "last_name" TEXT NOT NULL,
  "date_of_birth" TIMESTAMP(3),
  "gender" TEXT,
  "bio" TEXT,
  "website_url" TEXT,
  "instagram_handle" TEXT,
  "tiktok_handle" TEXT,
  "facebook_url" TEXT,
  "linkedin_url" TEXT,
  "address_line_1" TEXT,
  "address_line_2" TEXT,
  "postal_code" TEXT,
  "city_id" TEXT,
  "country_id" TEXT NOT NULL,
  "currency_code" TEXT,
  "notification_token" TEXT,
  "completed_onboarding" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "user_preferences" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "user_id" TEXT NOT NULL UNIQUE,
  "email_marketing" BOOLEAN NOT NULL DEFAULT false,
  "email_bookings" BOOLEAN NOT NULL DEFAULT true,
  "email_reviews" BOOLEAN NOT NULL DEFAULT true,
  "push_marketing" BOOLEAN NOT NULL DEFAULT false,
  "push_bookings" BOOLEAN NOT NULL DEFAULT true,
  "push_reviews" BOOLEAN NOT NULL DEFAULT true,
  "push_messages" BOOLEAN NOT NULL DEFAULT true,
  "push_system" BOOLEAN NOT NULL DEFAULT true,
  "sms_bookings" BOOLEAN NOT NULL DEFAULT false,
  "sms_reminders" BOOLEAN NOT NULL DEFAULT false,
  "nearby_enabled" BOOLEAN NOT NULL DEFAULT false,
  "nearby_radius_meters" INTEGER NOT NULL DEFAULT 1000,
  "auto_translate" BOOLEAN NOT NULL DEFAULT false,
  "reduced_motion" BOOLEAN NOT NULL DEFAULT false,
  "high_contrast" BOOLEAN NOT NULL DEFAULT false,
  "show_verified_only" BOOLEAN NOT NULL DEFAULT false,
  "default_payment_method_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "search_history" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "user_id" TEXT NOT NULL,
  "query_text" TEXT NOT NULL,
  "entity_type" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "push_devices" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "user_id" TEXT NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "platform" TEXT NOT NULL,
  "app_type" TEXT NOT NULL DEFAULT 'customer',
  "device_name" TEXT,
  "locale" TEXT,
  "is_enabled" BOOLEAN NOT NULL DEFAULT true,
  "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "sessions" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "user_id" TEXT NOT NULL,
  "refresh_token_hash" TEXT NOT NULL UNIQUE,
  "access_token_jti" TEXT NOT NULL UNIQUE,
  "user_agent" TEXT,
  "ip_address" TEXT,
  "country_code" TEXT,
  "city" TEXT,
  "device_type" TEXT,
  "device_name" TEXT,
  "family_id" TEXT,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "last_active_at" TIMESTAMP(3),
  "revoked_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3)
);

CREATE TABLE "roles" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "key" TEXT NOT NULL UNIQUE,
  "scope_type" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "is_system" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "permissions" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "key" TEXT NOT NULL UNIQUE,
  "scope_type" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "group" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "role_permissions" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "role_id" TEXT NOT NULL,
  "permission_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "user_role_scopes" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "user_id" TEXT NOT NULL,
  "role_id" TEXT NOT NULL,
  "role_key" TEXT NOT NULL,
  "scope_type" TEXT NOT NULL,
  "scope_id" TEXT,
  "company_id" TEXT,
  "branch_id" TEXT,
  "granted_by_user_id" TEXT,
  "expires_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "companiesId" TEXT,
  "branchesId" TEXT
);

CREATE TABLE "countries" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "iso_code" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "native_name" TEXT,
  "dial_code" TEXT NOT NULL,
  "currency_code" TEXT NOT NULL,
  "currency_symbol" TEXT,
  "flag_emoji" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "timezones" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "languages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "regions" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "country_id" TEXT NOT NULL,
  "code" TEXT,
  "name" TEXT NOT NULL,
  "native_name" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "districts" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "region_id" TEXT NOT NULL,
  "country_id" TEXT NOT NULL,
  "code" TEXT,
  "name" TEXT NOT NULL,
  "native_name" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "cities" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "district_id" TEXT,
  "region_id" TEXT,
  "country_id" TEXT NOT NULL,
  "code" TEXT,
  "name" TEXT NOT NULL,
  "native_name" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "timezone" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "areas" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "city_id" TEXT NOT NULL,
  "country_id" TEXT NOT NULL,
  "code" TEXT,
  "name" TEXT NOT NULL,
  "native_name" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "radius_meters" INTEGER,
  "postal_codes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "regionsId" TEXT,
  "districtsId" TEXT
);

CREATE TABLE "languages" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "iso_code" TEXT NOT NULL UNIQUE,
  "iso3_code" TEXT,
  "name" TEXT NOT NULL,
  "native_name" TEXT NOT NULL,
  "direction" TEXT NOT NULL DEFAULT 'ltr',
  "flag_emoji" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "currencies" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "iso_code" TEXT NOT NULL UNIQUE,
  "numeric_code" TEXT,
  "name" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "native_symbol" TEXT,
  "decimal_digits" INTEGER NOT NULL DEFAULT 2,
  "rounding" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "platform_settings" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "site_name" TEXT NOT NULL DEFAULT 'LOOKIVA',
  "tagline" TEXT,
  "logo_media_id" TEXT,
  "favicon_media_id" TEXT,
  "default_locale" TEXT NOT NULL DEFAULT 'en',
  "default_theme" TEXT NOT NULL DEFAULT 'midnight-gold',
  "default_currency_code" TEXT NOT NULL DEFAULT 'USD',
  "default_country_code" TEXT NOT NULL DEFAULT 'LB',
  "min_booking_notice_minutes" INTEGER,
  "max_booking_advance_days" INTEGER,
  "default_cancellation_hours" INTEGER,
  "default_deposit_percent" DOUBLE PRECISION,
  "maintenance_mode" BOOLEAN NOT NULL DEFAULT false,
  "maintenance_message" TEXT,
  "support_email" TEXT NOT NULL DEFAULT 'support@lookiva.dev',
  "support_phone" TEXT,
  "whatsapp_number" TEXT,
  "social_links" JSONB,
  "legal_urls" JSONB,
  "version" TEXT NOT NULL DEFAULT '1.0.0',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "theme_settings" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "key" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "palette" JSONB NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "feature_flags" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "key" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "is_enabled" BOOLEAN NOT NULL DEFAULT false,
  "rollout_percent" INTEGER NOT NULL DEFAULT 0,
  "user_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "country_codes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "environment" TEXT,
  "expires_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "remote_config" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "key" TEXT NOT NULL UNIQUE,
  "value_json" JSONB NOT NULL,
  "value_type" TEXT NOT NULL DEFAULT 'string',
  "description" TEXT,
  "is_public" BOOLEAN NOT NULL DEFAULT true,
  "min_app_version" TEXT,
  "platforms" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "companies" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "owner_user_id" TEXT NOT NULL,
  "country_id" TEXT NOT NULL,
  "city_id" TEXT,
  "category_ids" TEXT[] NOT NULL,
  "legal_name" TEXT,
  "display_name" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "description_short" TEXT,
  "description_long" TEXT,
  "tagline" TEXT,
  "tax_number" TEXT,
  "commercial_register_number" TEXT,
  "cover_media_id" TEXT,
  "logo_media_id" TEXT,
  "website_url" TEXT,
  "booking_enabled" BOOLEAN NOT NULL DEFAULT true,
  "walk_ins_enabled" BOOLEAN NOT NULL DEFAULT true,
  "online_payments_enabled" BOOLEAN NOT NULL DEFAULT false,
  "min_booking_notice_minutes" INTEGER,
  "max_booking_advance_days" INTEGER,
  "cancellation_policy_hours" INTEGER,
  "cancellation_fee_percent" DOUBLE PRECISION,
  "no_show_fee_percent" DOUBLE PRECISION,
  "deposit_required" BOOLEAN NOT NULL DEFAULT false,
  "deposit_percent" DOUBLE PRECISION,
  "auto_confirm_bookings" BOOLEAN NOT NULL DEFAULT true,
  "avg_rating" DOUBLE PRECISION,
  "review_count" INTEGER NOT NULL DEFAULT 0,
  "follower_count" INTEGER NOT NULL DEFAULT 0,
  "view_count" INTEGER NOT NULL DEFAULT 0,
  "featured_level" INTEGER,
  "featured_expires_at" TIMESTAMP(3),
  "is_verified" BOOLEAN NOT NULL DEFAULT false,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "verified_at" TIMESTAMP(3),
  "published_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3)
);

CREATE TABLE "company_settings" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "company_id" TEXT NOT NULL UNIQUE,
  "facilities" TEXT[] NOT NULL,
  "languages_spoken" TEXT[] NOT NULL,
  "parking_options" TEXT[] NOT NULL,
  "accepted_payments" TEXT[] NOT NULL,
  "policies" JSONB,
  "cancellation_policy" TEXT,
  "refund_policy" TEXT,
  "privacy_policy" TEXT,
  "home_service_enabled" BOOLEAN NOT NULL DEFAULT false,
  "home_service_radius" INTEGER,
  "default_tax_percent" DOUBLE PRECISION,
  "min_order_amount" DOUBLE PRECISION,
  "max_daily_appointments" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "company_verification" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "company_id" TEXT NOT NULL UNIQUE,
  "submitted_by_user_id" TEXT NOT NULL,
  "legal_business_name" TEXT,
  "registration_number" TEXT,
  "tax_id_number" TEXT,
  "owner_full_name" TEXT,
  "owner_id_number" TEXT,
  "documents" TEXT[] NOT NULL,
  "notes" TEXT,
  "reviewed_by_user_id" TEXT,
  "reviewed_at" TIMESTAMP(3),
  "rejection_reason" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "branches" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "company_id" TEXT NOT NULL,
  "manager_user_id" TEXT,
  "country_id" TEXT NOT NULL,
  "city_id" TEXT,
  "area_id" TEXT,
  "region_id" TEXT,
  "district_id" TEXT,
  "reference_code" TEXT,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "address_line_1" TEXT,
  "address_line_2" TEXT,
  "postal_code" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "geohash" TEXT,
  "phone" TEXT,
  "phone_secondary" TEXT,
  "email" TEXT,
  "whatsapp" TEXT,
  "facebook_url" TEXT,
  "instagram_handle" TEXT,
  "cover_media_id" TEXT,
  "timezone" TEXT,
  "booking_enabled" BOOLEAN NOT NULL DEFAULT true,
  "walk_ins_enabled" BOOLEAN NOT NULL DEFAULT true,
  "home_service_enabled" BOOLEAN NOT NULL DEFAULT false,
  "home_service_radius_meters" INTEGER,
  "auto_confirm_bookings" BOOLEAN,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "is_main" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3)
);

CREATE TABLE "branch_locations" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "branch_id" TEXT NOT NULL UNIQUE,
  "address" TEXT,
  "point" TEXT NOT NULL,
  "floor" TEXT,
  "landmark" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "branch_hours" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "branch_id" TEXT NOT NULL,
  "day_of_week" INTEGER NOT NULL,
  "is_closed" BOOLEAN NOT NULL DEFAULT false,
  "opens_at" TEXT,
  "closes_at" TEXT,
  "break_starts_at" TEXT,
  "break_ends_at" TEXT,
  "slot_size_minutes" INTEGER NOT NULL DEFAULT 15,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "branch_exceptions" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "branch_id" TEXT NOT NULL,
  "exception_date" TIMESTAMP(3) NOT NULL,
  "is_closed" BOOLEAN NOT NULL DEFAULT true,
  "opens_at" TEXT,
  "closes_at" TEXT,
  "reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "professionals" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "user_id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "branch_ids" TEXT[] NOT NULL,
  "member_number" TEXT,
  "display_name" TEXT NOT NULL,
  "bio" TEXT,
  "avatar_media_id" TEXT,
  "cover_media_id" TEXT,
  "specialties" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "years_experience" INTEGER,
  "gender_preference" TEXT,
  "accepts_walk_ins" BOOLEAN NOT NULL DEFAULT true,
  "accepts_home_service" BOOLEAN NOT NULL DEFAULT false,
  "commission_percent" DOUBLE PRECISION,
  "avg_rating" DOUBLE PRECISION,
  "review_count" INTEGER NOT NULL DEFAULT 0,
  "follower_count" INTEGER NOT NULL DEFAULT 0,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_verified" BOOLEAN NOT NULL DEFAULT false,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "verified_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3)
);

CREATE TABLE "professional_profiles" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "professional_id" TEXT NOT NULL UNIQUE,
  "user_id" TEXT NOT NULL,
  "education" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "certifications" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "awards" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "languages_spoken" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "portfolio_media_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "reel_media_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "pricing_notes" TEXT,
  "social_links" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "professional_branches" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "professional_id" TEXT NOT NULL,
  "branch_id" TEXT NOT NULL,
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "commission_percent" DOUBLE PRECISION,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "professional_services" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "professional_id" TEXT NOT NULL,
  "service_id" TEXT NOT NULL,
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "custom_price" DOUBLE PRECISION,
  "custom_duration" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "professional_schedules" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "professional_id" TEXT NOT NULL,
  "branch_id" TEXT NOT NULL,
  "day_of_week" INTEGER NOT NULL,
  "is_off" BOOLEAN NOT NULL DEFAULT false,
  "starts_at" TEXT,
  "ends_at" TEXT,
  "break_starts_at" TEXT,
  "break_ends_at" TEXT,
  "effective_from" TIMESTAMP(3),
  "effective_to" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "professional_schedule_exceptions" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "professional_id" TEXT NOT NULL,
  "branch_id" TEXT,
  "exception_date" TIMESTAMP(3) NOT NULL,
  "is_off" BOOLEAN NOT NULL DEFAULT true,
  "starts_at" TEXT,
  "ends_at" TEXT,
  "reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "service_categories" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "parent_id" TEXT,
  "country_id" TEXT,
  "code" TEXT,
  "slug" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "name_translations" JSONB,
  "description" TEXT,
  "description_translations" JSONB,
  "icon_key" TEXT,
  "cover_media_id" TEXT,
  "color" TEXT,
  "home_service_allowed" BOOLEAN NOT NULL DEFAULT false,
  "requires_professional" BOOLEAN NOT NULL DEFAULT true,
  "default_duration_minutes" INTEGER,
  "default_buffer_before_minutes" INTEGER NOT NULL DEFAULT 0,
  "default_buffer_after_minutes" INTEGER NOT NULL DEFAULT 0,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "is_featured" BOOLEAN NOT NULL DEFAULT false,
  "depth_level" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "services" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "company_id" TEXT NOT NULL,
  "category_id" TEXT NOT NULL,
  "branch_ids" TEXT[] NOT NULL,
  "professional_ids" TEXT[] NOT NULL,
  "resource_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "sku" TEXT,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "summary" TEXT,
  "description" TEXT,
  "cover_media_id" TEXT,
  "gallery_media_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "duration_minutes" INTEGER NOT NULL,
  "buffer_before_minutes" INTEGER NOT NULL DEFAULT 0,
  "buffer_after_minutes" INTEGER NOT NULL DEFAULT 0,
  "base_price" DOUBLE PRECISION NOT NULL,
  "currency_code" TEXT NOT NULL,
  "tax_inclusive" BOOLEAN NOT NULL DEFAULT true,
  "tax_percent" DOUBLE PRECISION,
  "discount_percent" DOUBLE PRECISION,
  "discount_fixed" DOUBLE PRECISION,
  "discount_valid_from" TIMESTAMP(3),
  "discount_valid_until" TIMESTAMP(3),
  "home_service_allowed" BOOLEAN NOT NULL DEFAULT false,
  "home_service_fee" DOUBLE PRECISION,
  "walk_ins_allowed" BOOLEAN NOT NULL DEFAULT true,
  "gender_preference" TEXT,
  "max_clients_per_slot" INTEGER NOT NULL DEFAULT 1,
  "online_payment_required" BOOLEAN NOT NULL DEFAULT false,
  "deposit_percent" DOUBLE PRECISION,
  "cancellation_policy_hours" INTEGER,
  "cancellation_fee_percent" DOUBLE PRECISION,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "avg_rating" DOUBLE PRECISION,
  "review_count" INTEGER NOT NULL DEFAULT 0,
  "booking_count" INTEGER NOT NULL DEFAULT 0,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "is_featured" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3)
);

CREATE TABLE "service_translations" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "service_id" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "summary" TEXT,
  "description" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "service_branch_settings" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "service_id" TEXT NOT NULL,
  "branch_id" TEXT NOT NULL,
  "is_enabled" BOOLEAN NOT NULL DEFAULT true,
  "custom_price" DOUBLE PRECISION,
  "custom_duration" INTEGER,
  "custom_deposit_percent" DOUBLE PRECISION,
  "online_payment_required" BOOLEAN,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "service_dependencies" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "service_id" TEXT NOT NULL,
  "prerequisite_id" TEXT NOT NULL,
  "min_gap_minutes" INTEGER NOT NULL DEFAULT 0,
  "max_gap_minutes" INTEGER,
  "is_optional" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "service_stages" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "service_id" TEXT NOT NULL,
  "stage_order" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "duration_minutes" INTEGER NOT NULL,
  "resource_type_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "resource_types" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "code" TEXT NOT NULL UNIQUE,
  "key" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "icon_key" TEXT,
  "default_capacity" INTEGER NOT NULL DEFAULT 1,
  "requires_booking" BOOLEAN NOT NULL DEFAULT true,
  "allow_parallel" BOOLEAN NOT NULL DEFAULT false,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "resources" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "company_id" TEXT NOT NULL,
  "branch_id" TEXT,
  "resource_type_id" TEXT,
  "code" TEXT,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "description" TEXT,
  "icon_key" TEXT,
  "media_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "location_note" TEXT,
  "capacity_per_slot" INTEGER,
  "setup_minutes" INTEGER NOT NULL DEFAULT 0,
  "cleanup_minutes" INTEGER NOT NULL DEFAULT 0,
  "hourly_cost" DOUBLE PRECISION,
  "currency_code" TEXT,
  "attributes" JSONB,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3)
);

CREATE TABLE "resource_attributes" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "resource_id" TEXT NOT NULL,
  "attribute_key" TEXT NOT NULL,
  "attribute_value" TEXT NOT NULL,
  "label_translations" JSONB,
  "searchable" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "professional_resources" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "professional_id" TEXT NOT NULL,
  "resource_id" TEXT NOT NULL,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "service_resource_requirements" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "service_id" TEXT NOT NULL,
  "resource_type_id" TEXT,
  "resource_id" TEXT,
  "quantity_required" INTEGER NOT NULL DEFAULT 1,
  "min_quantity" INTEGER NOT NULL DEFAULT 1,
  "stage_id" TEXT,
  "allow_substitution" BOOLEAN NOT NULL DEFAULT true,
  "surcharge_amount" DOUBLE PRECISION,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "resource_blocks" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "resource_id" TEXT NOT NULL,
  "block_type" TEXT NOT NULL,
  "starts_at" TIMESTAMP(3) NOT NULL,
  "ends_at" TIMESTAMP(3) NOT NULL,
  "reason" TEXT,
  "created_by_id" TEXT,
  "is_recurring" BOOLEAN NOT NULL DEFAULT false,
  "recurrence_rule" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "resource_maintenance" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "resource_id" TEXT NOT NULL,
  "maintenance_type" TEXT NOT NULL,
  "scheduled_at" TIMESTAMP(3) NOT NULL,
  "completed_at" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'scheduled',
  "cost_amount" DOUBLE PRECISION,
  "currency_code" TEXT,
  "notes" TEXT,
  "performed_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "floor_plans" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "branch_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "width_cm" INTEGER,
  "height_cm" INTEGER,
  "background_media_id" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "floor_plan_items" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "floor_plan_id" TEXT NOT NULL,
  "resource_id" TEXT,
  "item_type" TEXT NOT NULL,
  "label" TEXT,
  "x_position_cm" INTEGER NOT NULL,
  "y_position_cm" INTEGER NOT NULL,
  "width_cm" INTEGER NOT NULL,
  "height_cm" INTEGER NOT NULL,
  "rotation_deg" INTEGER NOT NULL DEFAULT 0,
  "zone" TEXT,
  "color" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "customers" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "user_id" TEXT NOT NULL,
  "customer_number" TEXT,
  "loyalty_level" TEXT,
  "loyalty_points" INTEGER NOT NULL DEFAULT 0,
  "total_spent_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "total_bookings" INTEGER NOT NULL DEFAULT 0,
  "referral_code" TEXT UNIQUE,
  "referred_by_user_id" TEXT,
  "last_booking_at" TIMESTAMP(3),
  "preferred_branch_id" TEXT,
  "preferred_professional_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "blocked_by_company_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "customer_profiles" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "customer_id" TEXT NOT NULL UNIQUE,
  "skin_type" TEXT,
  "hair_type" TEXT,
  "allergies" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "preferred_products" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "color_preferences" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "style_notes" TEXT,
  "medical_notes" TEXT,
  "private_notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "customer_addresses" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "customer_id" TEXT NOT NULL,
  "label" TEXT,
  "address_line_1" TEXT NOT NULL,
  "address_line_2" TEXT,
  "postal_code" TEXT,
  "city_id" TEXT,
  "country_id" TEXT NOT NULL,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "is_home" BOOLEAN NOT NULL DEFAULT false,
  "is_work" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "customer_preferences" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "customer_id" TEXT NOT NULL UNIQUE,
  "preferred_resource_types" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "preferred_chair_attributes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "price_range_min" DOUBLE PRECISION,
  "price_range_max" DOUBLE PRECISION,
  "favorite_service_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "favorite_category_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "style_interests" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "gender_preference" TEXT,
  "accessibility_needs" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "customer_dependents" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "customer_id" TEXT NOT NULL,
  "full_name" TEXT NOT NULL,
  "relationship" TEXT NOT NULL,
  "date_of_birth" TIMESTAMP(3),
  "gender" TEXT,
  "avatar_media_id" TEXT,
  "notes" TEXT,
  "hair_type" TEXT,
  "skin_type" TEXT,
  "allergies" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "preferred_professional_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "appointments" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "company_id" TEXT NOT NULL,
  "branch_id" TEXT NOT NULL,
  "customer_id" TEXT,
  "customer_user_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "starts_at" TIMESTAMP(3) NOT NULL,
  "ends_at" TIMESTAMP(3) NOT NULL,
  "duration_minutes" INTEGER NOT NULL,
  "guest_count" INTEGER NOT NULL DEFAULT 1,
  "notes_customer" TEXT,
  "notes_staff" TEXT,
  "notes_private" TEXT,
  "is_walk_in" BOOLEAN NOT NULL DEFAULT false,
  "is_home_service" BOOLEAN NOT NULL DEFAULT false,
  "home_service_address" TEXT,
  "home_service_latitude" DOUBLE PRECISION,
  "home_service_longitude" DOUBLE PRECISION,
  "arrival_latitude" DOUBLE PRECISION,
  "arrival_longitude" DOUBLE PRECISION,
  "checked_in_at" TIMESTAMP(3),
  "started_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "cancelled_at" TIMESTAMP(3),
  "cancelled_by_user_id" TEXT,
  "cancellation_reason" TEXT,
  "cancellation_fee_amount" DOUBLE PRECISION,
  "cancellation_fee_paid" BOOLEAN NOT NULL DEFAULT false,
  "no_show_at" TIMESTAMP(3),
  "rescheduled_from_id" TEXT,
  "rescheduled_to_id" TEXT,
  "queue_entry_id" TEXT,
  "source" TEXT NOT NULL DEFAULT 'direct',
  "referral_code_used" TEXT,
  "created_by_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "appointment_participants" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "appointment_id" TEXT NOT NULL,
  "professional_id" TEXT NOT NULL,
  "customer_id" TEXT,
  "dependent_id" TEXT,
  "role" TEXT NOT NULL DEFAULT 'professional',
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "appointment_services" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "appointment_id" TEXT NOT NULL,
  "service_id" TEXT NOT NULL,
  "professional_id" TEXT,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unit_price" DOUBLE PRECISION NOT NULL,
  "discount_percent" DOUBLE PRECISION,
  "discount_amount" DOUBLE PRECISION,
  "final_price" DOUBLE PRECISION NOT NULL,
  "duration_minutes" INTEGER NOT NULL,
  "tax_percent" DOUBLE PRECISION,
  "tax_amount" DOUBLE PRECISION,
  "starts_at" TIMESTAMP(3),
  "ends_at" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'pending',
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "appointment_resources" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "appointment_id" TEXT NOT NULL,
  "resource_id" TEXT NOT NULL,
  "stage_id" TEXT,
  "starts_at" TIMESTAMP(3),
  "ends_at" TIMESTAMP(3),
  "surcharge_amount" DOUBLE PRECISION,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "appointment_holds" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "appointment_id" TEXT,
  "customer_id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "branch_id" TEXT NOT NULL,
  "professional_id" TEXT,
  "resource_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "service_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "hold_token" TEXT NOT NULL UNIQUE,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "held_until" TIMESTAMP(3) NOT NULL,
  "starts_at" TIMESTAMP(3),
  "ends_at" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'active',
  "converted_at" TIMESTAMP(3),
  "created_by_ip" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "appointment_status_history" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "appointment_id" TEXT NOT NULL,
  "old_status" TEXT,
  "new_status" TEXT NOT NULL,
  "changed_by_id" TEXT,
  "reason" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "appointment_notes" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "appointment_id" TEXT NOT NULL,
  "author_user_id" TEXT NOT NULL,
  "note_text" TEXT NOT NULL,
  "is_private" BOOLEAN NOT NULL DEFAULT false,
  "is_pinned" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "appointment_media" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "appointment_id" TEXT NOT NULL,
  "media_id" TEXT NOT NULL,
  "media_type" TEXT NOT NULL,
  "is_before" BOOLEAN NOT NULL DEFAULT false,
  "is_after" BOOLEAN NOT NULL DEFAULT false,
  "caption" TEXT,
  "uploaded_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "booking_snapshots" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "appointment_id" TEXT NOT NULL UNIQUE,
  "snapshot_version" INTEGER NOT NULL DEFAULT 1,
  "services_snapshot" JSONB NOT NULL,
  "professionals_snapshot" JSONB NOT NULL,
  "resources_snapshot" JSONB NOT NULL,
  "branches_snapshot" JSONB NOT NULL,
  "company_snapshot" JSONB NOT NULL,
  "pricing_snapshot" JSONB NOT NULL,
  "policies_snapshot" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "booking_financial_snapshots" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "appointment_id" TEXT NOT NULL UNIQUE,
  "currency_code" TEXT NOT NULL,
  "exchange_rate_snapshot" JSONB,
  "services_total" DOUBLE PRECISION NOT NULL,
  "discount_total" DOUBLE PRECISION NOT NULL,
  "resource_surcharges" DOUBLE PRECISION NOT NULL,
  "tax_total" DOUBLE PRECISION NOT NULL,
  "deposit_percent" DOUBLE PRECISION,
  "deposit_amount" DOUBLE PRECISION NOT NULL,
  "cancellation_fee" DOUBLE PRECISION NOT NULL,
  "grand_total" DOUBLE PRECISION NOT NULL,
  "amount_due_now" DOUBLE PRECISION NOT NULL,
  "amount_due_later" DOUBLE PRECISION NOT NULL,
  "commission_rule_snapshot" JSONB,
  "tax_breakdown" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "queues" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "branch_id" TEXT NOT NULL,
  "name" TEXT NOT NULL DEFAULT 'Default',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "estimated_wait_per_person_minutes" INTEGER NOT NULL DEFAULT 15,
  "max_waiting" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "queue_entries" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "queue_id" TEXT NOT NULL,
  "appointment_id" TEXT,
  "customer_id" TEXT,
  "customer_name" TEXT,
  "customer_phone" TEXT,
  "service_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "professional_id" TEXT,
  "position" INTEGER NOT NULL,
  "estimated_wait_minutes" INTEGER,
  "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "called_at" TIMESTAMP(3),
  "served_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "cancelled_at" TIMESTAMP(3),
  "cancellation_reason" TEXT,
  "status" TEXT NOT NULL DEFAULT 'waiting',
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "payments" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "company_id" TEXT NOT NULL,
  "appointment_id" TEXT,
  "customer_id" TEXT NOT NULL,
  "payment_method" TEXT NOT NULL,
  "currency_code" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "tip_amount" DOUBLE PRECISION,
  "deposit_amount" DOUBLE PRECISION,
  "reference_code" TEXT,
  "external_transaction_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "paid_at" TIMESTAMP(3),
  "captured_at" TIMESTAMP(3),
  "refunded_at" TIMESTAMP(3),
  "failure_reason" TEXT,
  "gateway_response" JSONB,
  "cash_session_id" TEXT,
  "processed_by_user_id" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "payment_transactions" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "payment_id" TEXT NOT NULL,
  "transaction_type" TEXT NOT NULL,
  "gateway" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency_code" TEXT NOT NULL,
  "external_reference" TEXT,
  "status" TEXT NOT NULL,
  "gateway_response_code" TEXT,
  "gateway_response_message" TEXT,
  "raw_response" JSONB,
  "processed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "refunds" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "payment_id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency_code" TEXT NOT NULL,
  "reason" TEXT,
  "refund_method" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "external_reference" TEXT,
  "processed_at" TIMESTAMP(3),
  "processed_by_user_id" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "financial_ledger" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "company_id" TEXT NOT NULL,
  "payment_id" TEXT,
  "appointment_id" TEXT,
  "entry_type" TEXT NOT NULL,
  "debit_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "credit_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currency_code" TEXT NOT NULL,
  "exchange_rate_id" TEXT,
  "category" TEXT NOT NULL,
  "subcategory" TEXT,
  "description" TEXT,
  "reference_id" TEXT,
  "reference_type" TEXT,
  "transaction_date" TIMESTAMP(3) NOT NULL,
  "created_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "cash_sessions" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "branch_id" TEXT NOT NULL,
  "opened_by_user_id" TEXT NOT NULL,
  "closed_by_user_id" TEXT,
  "opening_cash" DOUBLE PRECISION NOT NULL,
  "closing_cash" DOUBLE PRECISION,
  "expected_cash" DOUBLE PRECISION,
  "difference_amount" DOUBLE PRECISION,
  "difference_note" TEXT,
  "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closed_at" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'open',
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "cash_movements" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "cash_session_id" TEXT NOT NULL,
  "movement_type" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency_code" TEXT NOT NULL,
  "reason" TEXT,
  "reference_id" TEXT,
  "created_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "exchange_rate_snapshots" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "base_currency" TEXT NOT NULL,
  "target_currency" TEXT NOT NULL,
  "rate" DOUBLE PRECISION NOT NULL,
  "source" TEXT,
  "effective_from" TIMESTAMP(3) NOT NULL,
  "effective_to" TIMESTAMP(3),
  "is_current" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "commissions" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "company_id" TEXT NOT NULL,
  "professional_id" TEXT,
  "appointment_id" TEXT,
  "payment_id" TEXT,
  "rule_id" TEXT,
  "commission_type" TEXT NOT NULL,
  "base_amount" DOUBLE PRECISION NOT NULL,
  "commission_percent" DOUBLE PRECISION,
  "commission_fixed" DOUBLE PRECISION,
  "commission_amount" DOUBLE PRECISION NOT NULL,
  "currency_code" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "payout_id" TEXT,
  "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paid_at" TIMESTAMP(3),
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "professional_payouts" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "company_id" TEXT NOT NULL,
  "professional_id" TEXT NOT NULL,
  "payout_period_start" TIMESTAMP(3) NOT NULL,
  "payout_period_end" TIMESTAMP(3) NOT NULL,
  "total_commission" DOUBLE PRECISION NOT NULL,
  "total_tips" DOUBLE PRECISION NOT NULL,
  "total_adjustments" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currency_code" TEXT NOT NULL,
  "gross_amount" DOUBLE PRECISION NOT NULL,
  "net_amount" DOUBLE PRECISION NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "paid_at" TIMESTAMP(3),
  "payment_method" TEXT,
  "reference_code" TEXT,
  "processed_by_user_id" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "professional_payout_items" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "payout_id" TEXT NOT NULL,
  "commission_id" TEXT,
  "item_type" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency_code" TEXT NOT NULL,
  "reference_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "wallets" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "customer_id" TEXT NOT NULL UNIQUE,
  "balance_cents" INTEGER NOT NULL DEFAULT 0,
  "currency_code" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "last_transaction_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "wallet_ledger" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "wallet_id" TEXT NOT NULL,
  "payment_id" TEXT,
  "transaction_type" TEXT NOT NULL,
  "amount_cents" INTEGER NOT NULL,
  "balance_after_cents" INTEGER NOT NULL,
  "currency_code" TEXT NOT NULL,
  "description" TEXT,
  "reference_id" TEXT,
  "reference_type" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "reviews" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "author_user_id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "branch_id" TEXT,
  "service_id" TEXT,
  "professional_id" TEXT,
  "appointment_id" TEXT,
  "title" TEXT,
  "body" TEXT,
  "overall_rating" DOUBLE PRECISION NOT NULL,
  "dimension_ratings" JSONB,
  "media_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "response_body" TEXT,
  "response_by_user_id" TEXT,
  "response_at" TIMESTAMP(3),
  "helpful_count" INTEGER NOT NULL DEFAULT 0,
  "reported_count" INTEGER NOT NULL DEFAULT 0,
  "is_verified" BOOLEAN NOT NULL DEFAULT false,
  "is_featured" BOOLEAN NOT NULL DEFAULT false,
  "is_anonymous" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'published',
  "published_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  "customersId" TEXT
);

CREATE TABLE "review_ratings" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "review_id" TEXT NOT NULL,
  "dimension" TEXT NOT NULL,
  "rating" DOUBLE PRECISION NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "review_media" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "review_id" TEXT NOT NULL,
  "media_id" TEXT NOT NULL,
  "media_type" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "review_reports" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "review_id" TEXT NOT NULL,
  "reporter_user_id" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "details" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "reviewed_by_id" TEXT,
  "reviewed_at" TIMESTAMP(3),
  "action_taken" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "posts" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "author_user_id" TEXT NOT NULL,
  "author_role" TEXT NOT NULL,
  "company_id" TEXT,
  "branch_id" TEXT,
  "professional_id" TEXT,
  "title" TEXT,
  "slug" TEXT,
  "body_plain" TEXT,
  "body_html" TEXT,
  "cover_media_id" TEXT,
  "media_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "service_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "category_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "is_promotion" BOOLEAN NOT NULL DEFAULT false,
  "promotion_start_at" TIMESTAMP(3),
  "promotion_end_at" TIMESTAMP(3),
  "view_count" INTEGER NOT NULL DEFAULT 0,
  "like_count" INTEGER NOT NULL DEFAULT 0,
  "comment_count" INTEGER NOT NULL DEFAULT 0,
  "share_count" INTEGER NOT NULL DEFAULT 0,
  "bookmark_count" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'published',
  "scheduled_at" TIMESTAMP(3),
  "published_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3)
);

CREATE TABLE "post_media" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "post_id" TEXT NOT NULL,
  "media_id" TEXT NOT NULL,
  "media_type" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "caption" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "post_services" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "post_id" TEXT NOT NULL,
  "service_id" TEXT NOT NULL,
  "category_id" TEXT,
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "likes" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "user_id" TEXT NOT NULL,
  "post_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "customersId" TEXT
);

CREATE TABLE "comments" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "user_id" TEXT NOT NULL,
  "post_id" TEXT NOT NULL,
  "parent_comment_id" TEXT,
  "body" TEXT NOT NULL,
  "like_count" INTEGER NOT NULL DEFAULT 0,
  "reported_count" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'published',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  "customersId" TEXT
);

CREATE TABLE "follows" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "follower_user_id" TEXT NOT NULL,
  "target_type" TEXT NOT NULL,
  "target_id" TEXT NOT NULL,
  "company_id" TEXT,
  "professional_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "customersId" TEXT
);

CREATE TABLE "favorites" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "user_id" TEXT NOT NULL,
  "favorite_type" TEXT NOT NULL,
  "entity_id" TEXT NOT NULL,
  "company_id" TEXT,
  "branch_id" TEXT,
  "service_id" TEXT,
  "professional_id" TEXT,
  "post_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "customersId" TEXT
);

CREATE TABLE "collections" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "user_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "cover_media_id" TEXT,
  "is_public" BOOLEAN NOT NULL DEFAULT false,
  "item_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "collection_items" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "collection_id" TEXT NOT NULL,
  "post_id" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "media_consents" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "user_id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "appointment_id" TEXT,
  "consent_type" TEXT NOT NULL,
  "allowed_usage" TEXT[] NOT NULL,
  "media_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "expires_at" TIMESTAMP(3),
  "signed_at" TIMESTAMP(3) NOT NULL,
  "revoked_at" TIMESTAMP(3),
  "customer_signature_url" TEXT,
  "witness_name" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "conversations" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "company_id" TEXT,
  "appointment_id" TEXT,
  "last_message_id" TEXT,
  "last_message_at" TIMESTAMP(3),
  "unread_count" JSONB,
  "is_archived" BOOLEAN NOT NULL DEFAULT false,
  "type" TEXT NOT NULL DEFAULT 'direct',
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "conversation_members" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "conversation_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "customer_id" TEXT,
  "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "left_at" TIMESTAMP(3),
  "last_read_message_id" TEXT,
  "last_read_at" TIMESTAMP(3),
  "is_admin" BOOLEAN NOT NULL DEFAULT false,
  "notifications_muted" BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE "messages" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "conversation_id" TEXT NOT NULL,
  "sender_user_id" TEXT NOT NULL,
  "message_type" TEXT NOT NULL DEFAULT 'text',
  "body_plain" TEXT,
  "body_html" TEXT,
  "reply_to_id" TEXT,
  "edited_at" TIMESTAMP(3),
  "deleted_at" TIMESTAMP(3),
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "message_attachments" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "message_id" TEXT NOT NULL,
  "media_id" TEXT NOT NULL,
  "media_type" TEXT NOT NULL,
  "file_name" TEXT,
  "size_bytes" INTEGER,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "notifications" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "recipient_user_id" TEXT NOT NULL,
  "notification_type" TEXT NOT NULL,
  "scope_type" TEXT,
  "scope_id" TEXT,
  "company_id" TEXT,
  "branch_id" TEXT,
  "title" TEXT NOT NULL,
  "title_translations" JSONB,
  "body" TEXT NOT NULL,
  "body_translations" JSONB,
  "image_media_id" TEXT,
  "deep_link" TEXT,
  "payload" JSONB,
  "priority" TEXT NOT NULL DEFAULT 'normal',
  "channels" TEXT[] NOT NULL,
  "sent_at" TIMESTAMP(3),
  "read_at" TIMESTAMP(3),
  "clicked_at" TIMESTAMP(3),
  "dismissed_at" TIMESTAMP(3),
  "expires_at" TIMESTAMP(3),
  "related_notification_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "customersId" TEXT
);

CREATE TABLE "notification_preferences" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "user_id" TEXT NOT NULL UNIQUE,
  "email_marketing" BOOLEAN NOT NULL DEFAULT false,
  "email_bookings" BOOLEAN NOT NULL DEFAULT true,
  "email_reviews" BOOLEAN NOT NULL DEFAULT true,
  "push_marketing" BOOLEAN NOT NULL DEFAULT false,
  "push_bookings" BOOLEAN NOT NULL DEFAULT true,
  "push_reviews" BOOLEAN NOT NULL DEFAULT true,
  "push_messages" BOOLEAN NOT NULL DEFAULT true,
  "push_system" BOOLEAN NOT NULL DEFAULT true,
  "sms_bookings" BOOLEAN NOT NULL DEFAULT false,
  "sms_reminders" BOOLEAN NOT NULL DEFAULT false,
  "nearby_enabled" BOOLEAN NOT NULL DEFAULT false,
  "nearby_radius_meters" INTEGER NOT NULL DEFAULT 1000,
  "auto_translate" BOOLEAN NOT NULL DEFAULT false,
  "reduced_motion" BOOLEAN NOT NULL DEFAULT false,
  "high_contrast" BOOLEAN NOT NULL DEFAULT false,
  "show_verified_only" BOOLEAN NOT NULL DEFAULT false,
  "default_payment_method_id" TEXT,
  "do_not_disturb" JSONB,
  "muted_types" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "sound_enabled" BOOLEAN NOT NULL DEFAULT true,
  "vibration_enabled" BOOLEAN NOT NULL DEFAULT true,
  "led_enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "location_preferences" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "user_id" TEXT NOT NULL UNIQUE,
  "gps_enabled" BOOLEAN NOT NULL DEFAULT false,
  "approximate_location" BOOLEAN NOT NULL DEFAULT false,
  "home_area_id" TEXT,
  "work_area_id" TEXT,
  "home_latitude" DOUBLE PRECISION,
  "home_longitude" DOUBLE PRECISION,
  "work_latitude" DOUBLE PRECISION,
  "work_longitude" DOUBLE PRECISION,
  "search_radius_default_m" INTEGER NOT NULL DEFAULT 5000,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "nearby_notification_preferences" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "user_id" TEXT NOT NULL UNIQUE,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "distance_threshold_meters" INTEGER NOT NULL DEFAULT 500,
  "min_rating" DOUBLE PRECISION,
  "category_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "favorite_businesses_only" BOOLEAN NOT NULL DEFAULT false,
  "followed_professionals_only" BOOLEAN NOT NULL DEFAULT false,
  "include_offers" BOOLEAN NOT NULL DEFAULT true,
  "include_availability" BOOLEAN NOT NULL DEFAULT true,
  "daily_max_notifications" INTEGER NOT NULL DEFAULT 5,
  "quiet_hours_start" TEXT,
  "quiet_hours_end" TEXT,
  "quiet_hours_timezone" TEXT,
  "cooldown_minutes_business" INTEGER NOT NULL DEFAULT 360,
  "cooldown_minutes_category" INTEGER NOT NULL DEFAULT 120,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "geofence_candidates" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "user_id" TEXT NOT NULL,
  "company_id" TEXT,
  "professional_id" TEXT,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "radius_meters" INTEGER NOT NULL DEFAULT 200,
  "priority_score" DOUBLE PRECISION NOT NULL,
  "expiration_at" TIMESTAMP(3),
  "refresh_batch_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "recommendation_events" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "user_id" TEXT NOT NULL,
  "recommendation_type" TEXT NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" TEXT NOT NULL,
  "score" DOUBLE PRECISION,
  "reasons" JSONB,
  "delivered_via" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "clicked_at" TIMESTAMP(3),
  "converted_at" TIMESTAMP(3),
  "dismissed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "notification_cooldowns" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "user_id" TEXT NOT NULL,
  "cooldown_key" TEXT NOT NULL,
  "scope_id" TEXT,
  "cooldown_until" TIMESTAMP(3) NOT NULL,
  "last_sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "send_count" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "business_nearby_campaigns" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "company_id" TEXT NOT NULL,
  "branch_id" TEXT,
  "category_id" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "promotion_id" TEXT,
  "budget_total" DOUBLE PRECISION,
  "budget_daily" DOUBLE PRECISION,
  "radius_meters" INTEGER NOT NULL DEFAULT 1000,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "target_category_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "min_rating_target" DOUBLE PRECISION,
  "is_active" BOOLEAN NOT NULL DEFAULT false,
  "starts_at" TIMESTAMP(3) NOT NULL,
  "ends_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "promotions" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "company_id" TEXT NOT NULL,
  "branch_id" TEXT,
  "code" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "cover_media_id" TEXT,
  "promotion_type" TEXT NOT NULL,
  "value_percent" DOUBLE PRECISION,
  "value_fixed" DOUBLE PRECISION,
  "minimum_order_amount" DOUBLE PRECISION,
  "maximum_discount" DOUBLE PRECISION,
  "eligible_category_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "eligible_service_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "eligible_professional_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "new_customers_only" BOOLEAN NOT NULL DEFAULT false,
  "first_visit_only" BOOLEAN NOT NULL DEFAULT false,
  "weekday_only" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  "happy_hour_start" TEXT,
  "happy_hour_end" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "is_public" BOOLEAN NOT NULL DEFAULT true,
  "starts_at" TIMESTAMP(3) NOT NULL,
  "ends_at" TIMESTAMP(3),
  "usage_limit" INTEGER,
  "usage_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "promotion_rules" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "promotion_id" TEXT NOT NULL,
  "rule_type" TEXT NOT NULL,
  "rule_json" JSONB NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "coupons" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "company_id" TEXT NOT NULL,
  "promotion_id" TEXT,
  "code" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "discount_type" TEXT NOT NULL,
  "discount_percent" DOUBLE PRECISION,
  "discount_fixed" DOUBLE PRECISION,
  "minimum_order_amount" DOUBLE PRECISION,
  "is_single_use" BOOLEAN NOT NULL DEFAULT true,
  "is_per_user" BOOLEAN NOT NULL DEFAULT false,
  "max_uses_total" INTEGER,
  "max_uses_per_user" INTEGER,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "valid_from" TIMESTAMP(3) NOT NULL,
  "valid_until" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "coupon_usage" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "coupon_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "promotion_id" TEXT,
  "order_id" TEXT,
  "amount_saved" DOUBLE PRECISION NOT NULL,
  "used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "packages" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "company_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "cover_media_id" TEXT,
  "category_id" TEXT,
  "service_ids" TEXT[] NOT NULL,
  "total_sessions_count" INTEGER NOT NULL,
  "validity_days" INTEGER,
  "price" DOUBLE PRECISION NOT NULL,
  "currency_code" TEXT NOT NULL,
  "discount_percent" DOUBLE PRECISION,
  "discount_fixed" DOUBLE PRECISION,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "is_featured" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "package_purchases" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "package_id" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL,
  "payment_id" TEXT,
  "sessions_purchased" INTEGER NOT NULL,
  "sessions_remaining" INTEGER NOT NULL,
  "price_paid" DOUBLE PRECISION NOT NULL,
  "currency_code" TEXT NOT NULL,
  "purchased_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "package_usage" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "package_purchase_id" TEXT NOT NULL,
  "appointment_id" TEXT,
  "service_id" TEXT NOT NULL,
  "professional_id" TEXT,
  "sessions_used" INTEGER NOT NULL DEFAULT 1,
  "used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "memberships" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "company_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "cover_media_id" TEXT,
  "price_monthly" DOUBLE PRECISION NOT NULL,
  "price_yearly" DOUBLE PRECISION NOT NULL,
  "currency_code" TEXT NOT NULL,
  "trial_days" INTEGER NOT NULL DEFAULT 0,
  "included_services" JSONB,
  "discount_percent" DOUBLE PRECISION,
  "features" JSONB,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "membership_subscriptions" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "membership_id" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL,
  "payment_method_id" TEXT,
  "billing_cycle" TEXT NOT NULL,
  "price_per_cycle" DOUBLE PRECISION NOT NULL,
  "currency_code" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "current_period_end" TIMESTAMP(3),
  "ends_at" TIMESTAMP(3),
  "cancelled_at" TIMESTAMP(3),
  "trial_end_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "gift_cards" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "company_id" TEXT,
  "code" TEXT NOT NULL UNIQUE,
  "recipient_name" TEXT,
  "recipient_email" TEXT,
  "recipient_phone" TEXT,
  "sender_name" TEXT,
  "message" TEXT,
  "cover_media_id" TEXT,
  "initial_amount" DOUBLE PRECISION NOT NULL,
  "currency_code" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "purchased_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "purchased_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "gift_card_ledger" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "gift_card_id" TEXT NOT NULL,
  "transaction_type" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "balance_after" DOUBLE PRECISION NOT NULL,
  "currency_code" TEXT NOT NULL,
  "reference_id" TEXT,
  "reference_type" TEXT,
  "wallet_id" TEXT,
  "description" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "loyalty_accounts" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "customer_id" TEXT NOT NULL UNIQUE,
  "tier" TEXT NOT NULL DEFAULT 'bronze',
  "points_balance" INTEGER NOT NULL DEFAULT 0,
  "total_points" INTEGER NOT NULL DEFAULT 0,
  "points_spent" INTEGER NOT NULL DEFAULT 0,
  "points_expiring" INTEGER NOT NULL DEFAULT 0,
  "next_tier_points" INTEGER,
  "tier_updated_at" TIMESTAMP(3),
  "last_activity_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "loyalty_ledger" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "loyalty_account_id" TEXT NOT NULL,
  "transaction_type" TEXT NOT NULL,
  "points_change" INTEGER NOT NULL,
  "balance_after" INTEGER NOT NULL,
  "reference_id" TEXT,
  "reference_type" TEXT,
  "expires_at" TIMESTAMP(3),
  "description" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "referrals" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "referrer_user_id" TEXT NOT NULL,
  "referred_user_id" TEXT NOT NULL UNIQUE,
  "referral_code_used" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "qualifying_event_type" TEXT,
  "qualifying_event_id" TEXT,
  "qualified_at" TIMESTAMP(3),
  "reward_type" TEXT,
  "reward_amount" DOUBLE PRECISION,
  "reward_points" INTEGER,
  "reward_granted_at" TIMESTAMP(3),
  "referral_source" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "products" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "company_id" TEXT NOT NULL,
  "category_id" TEXT,
  "sku" TEXT,
  "barcode" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "cover_media_id" TEXT,
  "price" DOUBLE PRECISION NOT NULL,
  "cost" DOUBLE PRECISION,
  "currency_code" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "is_salable" BOOLEAN NOT NULL DEFAULT true,
  "is_consumable" BOOLEAN NOT NULL DEFAULT false,
  "tax_percent" DOUBLE PRECISION,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "inventory_items" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "product_id" TEXT NOT NULL,
  "branch_id" TEXT,
  "quantity_on_hand" INTEGER NOT NULL DEFAULT 0,
  "quantity_reserved" INTEGER NOT NULL DEFAULT 0,
  "reorder_level" INTEGER NOT NULL DEFAULT 0,
  "reorder_quantity" INTEGER,
  "last_restocked_at" TIMESTAMP(3),
  "cost_unit" DOUBLE PRECISION,
  "location_note" TEXT,
  "batch_number" TEXT,
  "expires_at" TIMESTAMP(3),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "inventory_movements" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "product_id" TEXT NOT NULL,
  "inventory_id" TEXT,
  "branch_id" TEXT,
  "movement_type" TEXT NOT NULL,
  "quantity_change" INTEGER NOT NULL,
  "balance_after" INTEGER NOT NULL,
  "reference_id" TEXT,
  "reference_type" TEXT,
  "reason" TEXT,
  "unit_cost" DOUBLE PRECISION,
  "created_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "consent_forms" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "company_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "form_type" TEXT NOT NULL,
  "content_html" TEXT,
  "content_plain" TEXT NOT NULL,
  "fields_json" JSONB,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  "require_signature" BOOLEAN NOT NULL DEFAULT true,
  "require_photo_id" BOOLEAN NOT NULL DEFAULT false,
  "expires_days" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "consent_form_responses" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "consent_form_id" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL,
  "appointment_id" TEXT,
  "response_json" JSONB NOT NULL,
  "signature_url" TEXT,
  "photo_id_url" TEXT,
  "signed_at" TIMESTAMP(3) NOT NULL,
  "expires_at" TIMESTAMP(3),
  "revoked_at" TIMESTAMP(3),
  "ip_address" TEXT,
  "user_agent" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "subscriptions" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "company_id" TEXT NOT NULL,
  "plan_id" TEXT NOT NULL,
  "customer_user_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "billing_cycle" TEXT NOT NULL,
  "price_per_cycle" DOUBLE PRECISION NOT NULL,
  "currency_code" TEXT NOT NULL,
  "trial_ends_at" TIMESTAMP(3),
  "current_period_end" TIMESTAMP(3),
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "cancelled_at" TIMESTAMP(3),
  "ends_at" TIMESTAMP(3),
  "payment_method_id" TEXT,
  "external_reference" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "subscription_plans" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL UNIQUE,
  "description" TEXT,
  "price_monthly" DOUBLE PRECISION NOT NULL,
  "price_yearly" DOUBLE PRECISION NOT NULL,
  "currency_code" TEXT NOT NULL,
  "trial_days" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "tier_level" INTEGER NOT NULL DEFAULT 1,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "subscription_features" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "plan_id" TEXT NOT NULL,
  "feature_key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "value_json" JSONB,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "commission_rules" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "company_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "professional_id" TEXT,
  "service_category_id" TEXT,
  "service_id" TEXT,
  "calculation_type" TEXT NOT NULL,
  "percent_rate" DOUBLE PRECISION,
  "fixed_amount" DOUBLE PRECISION,
  "tiered_rates" JSONB,
  "effective_from" TIMESTAMP(3),
  "effective_to" TIMESTAMP(3),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "support_tickets" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "user_id" TEXT NOT NULL,
  "company_id" TEXT,
  "subject" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "priority" TEXT NOT NULL DEFAULT 'normal',
  "category" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "assigned_to_id" TEXT,
  "closed_at" TIMESTAMP(3),
  "satisfaction_rating" INTEGER,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "support_messages" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "ticket_id" TEXT NOT NULL,
  "author_user_id" TEXT NOT NULL,
  "author_type" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "attachment_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "is_internal_note" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "disputes" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "company_id" TEXT NOT NULL,
  "reporter_user_id" TEXT NOT NULL,
  "disputed_type" TEXT NOT NULL,
  "disputed_id" TEXT NOT NULL,
  "payment_id" TEXT,
  "appointment_id" TEXT,
  "reason" TEXT NOT NULL,
  "details" TEXT,
  "evidence_media_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "status" TEXT NOT NULL DEFAULT 'open',
  "disputed_amount" DOUBLE PRECISION,
  "currency_code" TEXT,
  "resolution" TEXT,
  "resolution_amount" DOUBLE PRECISION,
  "resolved_by_id" TEXT,
  "resolved_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "moderation_reports" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "reporter_user_id" TEXT NOT NULL,
  "target_type" TEXT NOT NULL,
  "target_id" TEXT NOT NULL,
  "reason_type" TEXT NOT NULL,
  "details" TEXT,
  "evidence_media_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "status" TEXT NOT NULL DEFAULT 'pending',
  "reviewed_by_id" TEXT,
  "reviewed_at" TIMESTAMP(3),
  "action_taken" TEXT,
  "action_details" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "audit_logs" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "actor_user_id" TEXT NOT NULL,
  "actor_role" TEXT,
  "action" TEXT NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" TEXT,
  "company_id" TEXT,
  "branch_id" TEXT,
  "old_value" JSONB,
  "new_value" JSONB,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "session_id" TEXT,
  "correlation_id" TEXT,
  "request_path" TEXT,
  "request_method" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "analytics_events" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "event_name" TEXT NOT NULL,
  "event_category" TEXT NOT NULL,
  "user_id" TEXT,
  "anonymous_id" TEXT,
  "company_id" TEXT,
  "branch_id" TEXT,
  "professional_id" TEXT,
  "service_id" TEXT,
  "appointment_id" TEXT,
  "properties" JSONB,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "screen_name" TEXT,
  "referrer" TEXT,
  "utm_source" TEXT,
  "utm_medium" TEXT,
  "utm_campaign" TEXT,
  "utm_content" TEXT,
  "session_id" TEXT,
  "device_type" TEXT,
  "os_name" TEXT,
  "app_version" TEXT,
  "client_ip" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "daily_analytics_snapshots" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "snapshot_date" TIMESTAMP(3) NOT NULL,
  "company_id" TEXT NOT NULL,
  "branch_id" TEXT,
  "professional_id" TEXT,
  "metric_key" TEXT NOT NULL,
  "metric_value" DOUBLE PRECISION NOT NULL,
  "metric_label" TEXT,
  "category" TEXT NOT NULL,
  "currency_code" TEXT,
  "comparison_date_value" DOUBLE PRECISION,
  "trend_direction" TEXT,
  "trend_percent" DOUBLE PRECISION,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "media" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "uploader_user_id" TEXT NOT NULL,
  "company_id" TEXT,
  "branch_id" TEXT,
  "original_file_name" TEXT NOT NULL,
  "stored_file_name" TEXT NOT NULL,
  "storage_key" TEXT NOT NULL,
  "storage_bucket" TEXT NOT NULL,
  "storage_provider" TEXT NOT NULL DEFAULT 'minio',
  "mime_category" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "size_bytes" INTEGER NOT NULL,
  "width_pixels" INTEGER,
  "height_pixels" INTEGER,
  "duration_seconds" DOUBLE PRECISION,
  "blurhash" TEXT,
  "dominant_color_hex" TEXT,
  "variants" JSONB,
  "alt_text" TEXT,
  "caption" TEXT,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "checksum_sha256" TEXT,
  "is_public" BOOLEAN NOT NULL DEFAULT true,
  "license_type" TEXT,
  "copyright_holder" TEXT,
  "status" TEXT NOT NULL DEFAULT 'uploaded',
  "processed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "password_reset_tokens" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "user_id" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL UNIQUE,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "used_at" TIMESTAMP(3),
  "ip_address" TEXT,
  "user_agent" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "email_verification_tokens" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "user_id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL UNIQUE,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "verified_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "phone_otp_tokens" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "user_id" TEXT,
  "phone" TEXT NOT NULL,
  "code_hash" TEXT NOT NULL,
  "purpose" TEXT NOT NULL DEFAULT 'verify',
  "expires_at" TIMESTAMP(3) NOT NULL,
  "verified_at" TIMESTAMP(3),
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "send_count" INTEGER NOT NULL DEFAULT 1,
  "ip_address" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "resource_media" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "resource_id" TEXT NOT NULL,
  "media_id" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "caption" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "customer_preferred_resources" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "customer_id" TEXT NOT NULL,
  "resource_id" TEXT NOT NULL,
  "rank_order" INTEGER NOT NULL DEFAULT 0,
  "note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "user_strikes" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "user_id" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'warning',
  "reason_type" TEXT NOT NULL,
  "reason_text" TEXT,
  "report_id" TEXT,
  "created_by_id" TEXT,
  "expires_at" TIMESTAMP(3),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "moderation_appeals" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "target_type" TEXT NOT NULL,
  "target_id" TEXT NOT NULL,
  "reporter_user_id" TEXT NOT NULL,
  "strike_id" TEXT,
  "reason_reversal" TEXT NOT NULL,
  "evidence_media_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "status" TEXT NOT NULL DEFAULT 'pending',
  "reviewed_by_id" TEXT,
  "reviewed_at" TIMESTAMP(3),
  "resolution" TEXT,
  "resolution_notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "country_taxes" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "country_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "tax_code" TEXT,
  "tax_type" TEXT NOT NULL DEFAULT 'vat',
  "rate_percent" DOUBLE PRECISION NOT NULL,
  "applies_to_services" BOOLEAN NOT NULL DEFAULT true,
  "applies_to_products" BOOLEAN NOT NULL DEFAULT true,
  "effective_from" TIMESTAMP(3),
  "effective_to" TIMESTAMP(3),
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "bank_accounts" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "owner_type" TEXT NOT NULL,
  "owner_id" TEXT NOT NULL,
  "bank_name" TEXT,
  "account_number" TEXT,
  "account_holder" TEXT,
  "routing_number" TEXT,
  "iban" TEXT,
  "swift_bic" TEXT,
  "currency_code" TEXT NOT NULL,
  "is_verified" BOOLEAN NOT NULL DEFAULT false,
  "verification_doc_id" TEXT,
  "payout_enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

ALTER TABLE "user_profiles" ADD CONSTRAINT "fk_user_profiles_user_id_users" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;
ALTER TABLE "user_profiles" ADD CONSTRAINT "fk_user_profiles_country_id_countries" FOREIGN KEY ("country_id") REFERENCES "countries" ("id") ON DELETE NO ACTION;
ALTER TABLE "user_profiles" ADD CONSTRAINT "fk_user_profiles_city_id_cities" FOREIGN KEY ("city_id") REFERENCES "cities" ("id") ON DELETE SET NULL;
ALTER TABLE "user_preferences" ADD CONSTRAINT "fk_user_preferences_user_id_users" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;
ALTER TABLE "search_history" ADD CONSTRAINT "fk_search_history_user_id_users" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;
ALTER TABLE "push_devices" ADD CONSTRAINT "fk_push_devices_user_id_users" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;
ALTER TABLE "sessions" ADD CONSTRAINT "fk_sessions_user_id_users" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;
ALTER TABLE "role_permissions" ADD CONSTRAINT "fk_role_permissions_role_id_roles" FOREIGN KEY ("role_id") REFERENCES "roles" ("id") ON DELETE CASCADE;
ALTER TABLE "role_permissions" ADD CONSTRAINT "fk_role_permissions_permission_id_permissions" FOREIGN KEY ("permission_id") REFERENCES "permissions" ("id") ON DELETE CASCADE;
ALTER TABLE "user_role_scopes" ADD CONSTRAINT "fk_user_role_scopes_user_id_users" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;
ALTER TABLE "user_role_scopes" ADD CONSTRAINT "fk_user_role_scopes_role_id_roles" FOREIGN KEY ("role_id") REFERENCES "roles" ("id") ON DELETE CASCADE;
ALTER TABLE "user_role_scopes" ADD CONSTRAINT "fk_user_role_scopes_companiesId_companies" FOREIGN KEY ("companiesId") REFERENCES "companies" ("id") ON DELETE NO ACTION;
ALTER TABLE "user_role_scopes" ADD CONSTRAINT "fk_user_role_scopes_branchesId_branches" FOREIGN KEY ("branchesId") REFERENCES "branches" ("id") ON DELETE NO ACTION;
ALTER TABLE "regions" ADD CONSTRAINT "fk_regions_country_id_countries" FOREIGN KEY ("country_id") REFERENCES "countries" ("id") ON DELETE CASCADE;
ALTER TABLE "districts" ADD CONSTRAINT "fk_districts_country_id_countries" FOREIGN KEY ("country_id") REFERENCES "countries" ("id") ON DELETE CASCADE;
ALTER TABLE "districts" ADD CONSTRAINT "fk_districts_region_id_regions" FOREIGN KEY ("region_id") REFERENCES "regions" ("id") ON DELETE CASCADE;
ALTER TABLE "cities" ADD CONSTRAINT "fk_cities_country_id_countries" FOREIGN KEY ("country_id") REFERENCES "countries" ("id") ON DELETE CASCADE;
ALTER TABLE "cities" ADD CONSTRAINT "fk_cities_region_id_regions" FOREIGN KEY ("region_id") REFERENCES "regions" ("id") ON DELETE SET NULL;
ALTER TABLE "cities" ADD CONSTRAINT "fk_cities_district_id_districts" FOREIGN KEY ("district_id") REFERENCES "districts" ("id") ON DELETE SET NULL;
ALTER TABLE "areas" ADD CONSTRAINT "fk_areas_city_id_cities" FOREIGN KEY ("city_id") REFERENCES "cities" ("id") ON DELETE CASCADE;
ALTER TABLE "areas" ADD CONSTRAINT "fk_areas_country_id_countries" FOREIGN KEY ("country_id") REFERENCES "countries" ("id") ON DELETE CASCADE;
ALTER TABLE "areas" ADD CONSTRAINT "fk_areas_regionsId_regions" FOREIGN KEY ("regionsId") REFERENCES "regions" ("id") ON DELETE NO ACTION;
ALTER TABLE "areas" ADD CONSTRAINT "fk_areas_districtsId_districts" FOREIGN KEY ("districtsId") REFERENCES "districts" ("id") ON DELETE NO ACTION;
ALTER TABLE "companies" ADD CONSTRAINT "fk_companies_owner_user_id_users" FOREIGN KEY ("owner_user_id") REFERENCES "users" ("id") ON DELETE NO ACTION;
ALTER TABLE "companies" ADD CONSTRAINT "fk_companies_country_id_countries" FOREIGN KEY ("country_id") REFERENCES "countries" ("id") ON DELETE NO ACTION;
ALTER TABLE "company_settings" ADD CONSTRAINT "fk_company_settings_company_id_companies" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE CASCADE;
ALTER TABLE "company_verification" ADD CONSTRAINT "fk_company_verification_company_id_companies" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE CASCADE;
ALTER TABLE "branches" ADD CONSTRAINT "fk_branches_company_id_companies" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE CASCADE;
ALTER TABLE "branches" ADD CONSTRAINT "fk_branches_country_id_countries" FOREIGN KEY ("country_id") REFERENCES "countries" ("id") ON DELETE NO ACTION;
ALTER TABLE "branches" ADD CONSTRAINT "fk_branches_city_id_cities" FOREIGN KEY ("city_id") REFERENCES "cities" ("id") ON DELETE SET NULL;
ALTER TABLE "branches" ADD CONSTRAINT "fk_branches_area_id_areas" FOREIGN KEY ("area_id") REFERENCES "areas" ("id") ON DELETE SET NULL;
ALTER TABLE "branches" ADD CONSTRAINT "fk_branches_region_id_regions" FOREIGN KEY ("region_id") REFERENCES "regions" ("id") ON DELETE SET NULL;
ALTER TABLE "branches" ADD CONSTRAINT "fk_branches_district_id_districts" FOREIGN KEY ("district_id") REFERENCES "districts" ("id") ON DELETE SET NULL;
ALTER TABLE "branch_locations" ADD CONSTRAINT "fk_branch_locations_branch_id_branches" FOREIGN KEY ("branch_id") REFERENCES "branches" ("id") ON DELETE CASCADE;
ALTER TABLE "branch_hours" ADD CONSTRAINT "fk_branch_hours_branch_id_branches" FOREIGN KEY ("branch_id") REFERENCES "branches" ("id") ON DELETE CASCADE;
ALTER TABLE "branch_exceptions" ADD CONSTRAINT "fk_branch_exceptions_branch_id_branches" FOREIGN KEY ("branch_id") REFERENCES "branches" ("id") ON DELETE CASCADE;
ALTER TABLE "professionals" ADD CONSTRAINT "fk_professionals_user_id_users" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE NO ACTION;
ALTER TABLE "professionals" ADD CONSTRAINT "fk_professionals_company_id_companies" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE CASCADE;
ALTER TABLE "professional_profiles" ADD CONSTRAINT "fk_professional_profiles_professional_id_professionals" FOREIGN KEY ("professional_id") REFERENCES "professionals" ("id") ON DELETE CASCADE;
ALTER TABLE "professional_branches" ADD CONSTRAINT "fk_professional_branches_professional_id_professionals" FOREIGN KEY ("professional_id") REFERENCES "professionals" ("id") ON DELETE CASCADE;
ALTER TABLE "professional_branches" ADD CONSTRAINT "fk_professional_branches_branch_id_branches" FOREIGN KEY ("branch_id") REFERENCES "branches" ("id") ON DELETE CASCADE;
ALTER TABLE "professional_services" ADD CONSTRAINT "fk_professional_services_professional_id_professionals" FOREIGN KEY ("professional_id") REFERENCES "professionals" ("id") ON DELETE CASCADE;
ALTER TABLE "professional_services" ADD CONSTRAINT "fk_professional_services_service_id_services" FOREIGN KEY ("service_id") REFERENCES "services" ("id") ON DELETE CASCADE;
ALTER TABLE "professional_schedules" ADD CONSTRAINT "fk_professional_schedules_professional_id_professionals" FOREIGN KEY ("professional_id") REFERENCES "professionals" ("id") ON DELETE CASCADE;
ALTER TABLE "professional_schedules" ADD CONSTRAINT "fk_professional_schedules_branch_id_branches" FOREIGN KEY ("branch_id") REFERENCES "branches" ("id") ON DELETE CASCADE;
ALTER TABLE "professional_schedule_exceptions" ADD CONSTRAINT "fk_professional_schedule_exceptions_professional_d15578ef39" FOREIGN KEY ("professional_id") REFERENCES "professionals" ("id") ON DELETE CASCADE;
ALTER TABLE "professional_schedule_exceptions" ADD CONSTRAINT "fk_professional_schedule_exceptions_branch_id_branches" FOREIGN KEY ("branch_id") REFERENCES "branches" ("id") ON DELETE SET NULL;
ALTER TABLE "service_categories" ADD CONSTRAINT "fk_service_categories_parent_id_service_categories" FOREIGN KEY ("parent_id") REFERENCES "service_categories" ("id") ON DELETE NO ACTION;
ALTER TABLE "services" ADD CONSTRAINT "fk_services_company_id_companies" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE CASCADE;
ALTER TABLE "services" ADD CONSTRAINT "fk_services_category_id_service_categories" FOREIGN KEY ("category_id") REFERENCES "service_categories" ("id") ON DELETE NO ACTION;
ALTER TABLE "service_translations" ADD CONSTRAINT "fk_service_translations_service_id_services" FOREIGN KEY ("service_id") REFERENCES "services" ("id") ON DELETE CASCADE;
ALTER TABLE "service_branch_settings" ADD CONSTRAINT "fk_service_branch_settings_service_id_services" FOREIGN KEY ("service_id") REFERENCES "services" ("id") ON DELETE CASCADE;
ALTER TABLE "service_branch_settings" ADD CONSTRAINT "fk_service_branch_settings_branch_id_branches" FOREIGN KEY ("branch_id") REFERENCES "branches" ("id") ON DELETE CASCADE;
ALTER TABLE "service_dependencies" ADD CONSTRAINT "fk_service_dependencies_service_id_services" FOREIGN KEY ("service_id") REFERENCES "services" ("id") ON DELETE CASCADE;
ALTER TABLE "service_dependencies" ADD CONSTRAINT "fk_service_dependencies_prerequisite_id_services" FOREIGN KEY ("prerequisite_id") REFERENCES "services" ("id") ON DELETE NO ACTION;
ALTER TABLE "service_stages" ADD CONSTRAINT "fk_service_stages_service_id_services" FOREIGN KEY ("service_id") REFERENCES "services" ("id") ON DELETE CASCADE;
ALTER TABLE "service_stages" ADD CONSTRAINT "fk_service_stages_resource_type_id_resource_types" FOREIGN KEY ("resource_type_id") REFERENCES "resource_types" ("id") ON DELETE SET NULL;
ALTER TABLE "resources" ADD CONSTRAINT "fk_resources_company_id_companies" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE CASCADE;
ALTER TABLE "resources" ADD CONSTRAINT "fk_resources_branch_id_branches" FOREIGN KEY ("branch_id") REFERENCES "branches" ("id") ON DELETE SET NULL;
ALTER TABLE "resources" ADD CONSTRAINT "fk_resources_resource_type_id_resource_types" FOREIGN KEY ("resource_type_id") REFERENCES "resource_types" ("id") ON DELETE SET NULL;
ALTER TABLE "resource_attributes" ADD CONSTRAINT "fk_resource_attributes_resource_id_resources" FOREIGN KEY ("resource_id") REFERENCES "resources" ("id") ON DELETE CASCADE;
ALTER TABLE "professional_resources" ADD CONSTRAINT "fk_professional_resources_professional_id_professionals" FOREIGN KEY ("professional_id") REFERENCES "professionals" ("id") ON DELETE CASCADE;
ALTER TABLE "professional_resources" ADD CONSTRAINT "fk_professional_resources_resource_id_resources" FOREIGN KEY ("resource_id") REFERENCES "resources" ("id") ON DELETE CASCADE;
ALTER TABLE "service_resource_requirements" ADD CONSTRAINT "fk_service_resource_requirements_service_id_services" FOREIGN KEY ("service_id") REFERENCES "services" ("id") ON DELETE CASCADE;
ALTER TABLE "service_resource_requirements" ADD CONSTRAINT "fk_service_resource_requirements_resource_type_i_b8539f4fe9" FOREIGN KEY ("resource_type_id") REFERENCES "resource_types" ("id") ON DELETE SET NULL;
ALTER TABLE "service_resource_requirements" ADD CONSTRAINT "fk_service_resource_requirements_resource_id_resources" FOREIGN KEY ("resource_id") REFERENCES "resources" ("id") ON DELETE SET NULL;
ALTER TABLE "resource_blocks" ADD CONSTRAINT "fk_resource_blocks_resource_id_resources" FOREIGN KEY ("resource_id") REFERENCES "resources" ("id") ON DELETE CASCADE;
ALTER TABLE "resource_maintenance" ADD CONSTRAINT "fk_resource_maintenance_resource_id_resources" FOREIGN KEY ("resource_id") REFERENCES "resources" ("id") ON DELETE CASCADE;
ALTER TABLE "floor_plans" ADD CONSTRAINT "fk_floor_plans_branch_id_branches" FOREIGN KEY ("branch_id") REFERENCES "branches" ("id") ON DELETE CASCADE;
ALTER TABLE "floor_plan_items" ADD CONSTRAINT "fk_floor_plan_items_floor_plan_id_floor_plans" FOREIGN KEY ("floor_plan_id") REFERENCES "floor_plans" ("id") ON DELETE CASCADE;
ALTER TABLE "floor_plan_items" ADD CONSTRAINT "fk_floor_plan_items_resource_id_resources" FOREIGN KEY ("resource_id") REFERENCES "resources" ("id") ON DELETE SET NULL;
ALTER TABLE "customers" ADD CONSTRAINT "fk_customers_user_id_users" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE NO ACTION;
ALTER TABLE "customer_profiles" ADD CONSTRAINT "fk_customer_profiles_customer_id_customers" FOREIGN KEY ("customer_id") REFERENCES "customers" ("id") ON DELETE CASCADE;
ALTER TABLE "customer_addresses" ADD CONSTRAINT "fk_customer_addresses_customer_id_customers" FOREIGN KEY ("customer_id") REFERENCES "customers" ("id") ON DELETE CASCADE;
ALTER TABLE "customer_preferences" ADD CONSTRAINT "fk_customer_preferences_customer_id_customers" FOREIGN KEY ("customer_id") REFERENCES "customers" ("id") ON DELETE CASCADE;
ALTER TABLE "customer_dependents" ADD CONSTRAINT "fk_customer_dependents_customer_id_customers" FOREIGN KEY ("customer_id") REFERENCES "customers" ("id") ON DELETE CASCADE;
ALTER TABLE "appointments" ADD CONSTRAINT "fk_appointments_company_id_companies" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE NO ACTION;
ALTER TABLE "appointments" ADD CONSTRAINT "fk_appointments_branch_id_branches" FOREIGN KEY ("branch_id") REFERENCES "branches" ("id") ON DELETE NO ACTION;
ALTER TABLE "appointments" ADD CONSTRAINT "fk_appointments_customer_id_customers" FOREIGN KEY ("customer_id") REFERENCES "customers" ("id") ON DELETE SET NULL;
ALTER TABLE "appointment_participants" ADD CONSTRAINT "fk_appointment_participants_appointment_id_appointments" FOREIGN KEY ("appointment_id") REFERENCES "appointments" ("id") ON DELETE CASCADE;
ALTER TABLE "appointment_participants" ADD CONSTRAINT "fk_appointment_participants_professional_id_professionals" FOREIGN KEY ("professional_id") REFERENCES "professionals" ("id") ON DELETE NO ACTION;
ALTER TABLE "appointment_participants" ADD CONSTRAINT "fk_appointment_participants_customer_id_customers" FOREIGN KEY ("customer_id") REFERENCES "customers" ("id") ON DELETE SET NULL;
ALTER TABLE "appointment_services" ADD CONSTRAINT "fk_appointment_services_appointment_id_appointments" FOREIGN KEY ("appointment_id") REFERENCES "appointments" ("id") ON DELETE CASCADE;
ALTER TABLE "appointment_services" ADD CONSTRAINT "fk_appointment_services_service_id_services" FOREIGN KEY ("service_id") REFERENCES "services" ("id") ON DELETE NO ACTION;
ALTER TABLE "appointment_services" ADD CONSTRAINT "fk_appointment_services_professional_id_professionals" FOREIGN KEY ("professional_id") REFERENCES "professionals" ("id") ON DELETE SET NULL;
ALTER TABLE "appointment_resources" ADD CONSTRAINT "fk_appointment_resources_appointment_id_appointments" FOREIGN KEY ("appointment_id") REFERENCES "appointments" ("id") ON DELETE CASCADE;
ALTER TABLE "appointment_resources" ADD CONSTRAINT "fk_appointment_resources_resource_id_resources" FOREIGN KEY ("resource_id") REFERENCES "resources" ("id") ON DELETE NO ACTION;
ALTER TABLE "appointment_holds" ADD CONSTRAINT "fk_appointment_holds_appointment_id_appointments" FOREIGN KEY ("appointment_id") REFERENCES "appointments" ("id") ON DELETE SET NULL;
ALTER TABLE "appointment_holds" ADD CONSTRAINT "fk_appointment_holds_customer_id_customers" FOREIGN KEY ("customer_id") REFERENCES "customers" ("id") ON DELETE NO ACTION;
ALTER TABLE "appointment_holds" ADD CONSTRAINT "fk_appointment_holds_company_id_companies" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE NO ACTION;
ALTER TABLE "appointment_holds" ADD CONSTRAINT "fk_appointment_holds_branch_id_branches" FOREIGN KEY ("branch_id") REFERENCES "branches" ("id") ON DELETE NO ACTION;
ALTER TABLE "appointment_status_history" ADD CONSTRAINT "fk_appointment_status_history_appointment_id_appointments" FOREIGN KEY ("appointment_id") REFERENCES "appointments" ("id") ON DELETE CASCADE;
ALTER TABLE "appointment_notes" ADD CONSTRAINT "fk_appointment_notes_appointment_id_appointments" FOREIGN KEY ("appointment_id") REFERENCES "appointments" ("id") ON DELETE CASCADE;
ALTER TABLE "appointment_media" ADD CONSTRAINT "fk_appointment_media_appointment_id_appointments" FOREIGN KEY ("appointment_id") REFERENCES "appointments" ("id") ON DELETE CASCADE;
ALTER TABLE "booking_snapshots" ADD CONSTRAINT "fk_booking_snapshots_appointment_id_appointments" FOREIGN KEY ("appointment_id") REFERENCES "appointments" ("id") ON DELETE CASCADE;
ALTER TABLE "booking_financial_snapshots" ADD CONSTRAINT "fk_booking_financial_snapshots_appointment_id_appointments" FOREIGN KEY ("appointment_id") REFERENCES "appointments" ("id") ON DELETE CASCADE;
ALTER TABLE "queues" ADD CONSTRAINT "fk_queues_branch_id_branches" FOREIGN KEY ("branch_id") REFERENCES "branches" ("id") ON DELETE CASCADE;
ALTER TABLE "queue_entries" ADD CONSTRAINT "fk_queue_entries_queue_id_queues" FOREIGN KEY ("queue_id") REFERENCES "queues" ("id") ON DELETE CASCADE;
ALTER TABLE "queue_entries" ADD CONSTRAINT "fk_queue_entries_appointment_id_appointments" FOREIGN KEY ("appointment_id") REFERENCES "appointments" ("id") ON DELETE SET NULL;
ALTER TABLE "queue_entries" ADD CONSTRAINT "fk_queue_entries_customer_id_customers" FOREIGN KEY ("customer_id") REFERENCES "customers" ("id") ON DELETE SET NULL;
ALTER TABLE "payments" ADD CONSTRAINT "fk_payments_company_id_companies" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE NO ACTION;
ALTER TABLE "payments" ADD CONSTRAINT "fk_payments_appointment_id_appointments" FOREIGN KEY ("appointment_id") REFERENCES "appointments" ("id") ON DELETE SET NULL;
ALTER TABLE "payments" ADD CONSTRAINT "fk_payments_customer_id_customers" FOREIGN KEY ("customer_id") REFERENCES "customers" ("id") ON DELETE NO ACTION;
ALTER TABLE "payments" ADD CONSTRAINT "fk_payments_cash_session_id_cash_sessions" FOREIGN KEY ("cash_session_id") REFERENCES "cash_sessions" ("id") ON DELETE SET NULL;
ALTER TABLE "payment_transactions" ADD CONSTRAINT "fk_payment_transactions_payment_id_payments" FOREIGN KEY ("payment_id") REFERENCES "payments" ("id") ON DELETE CASCADE;
ALTER TABLE "refunds" ADD CONSTRAINT "fk_refunds_payment_id_payments" FOREIGN KEY ("payment_id") REFERENCES "payments" ("id") ON DELETE NO ACTION;
ALTER TABLE "financial_ledger" ADD CONSTRAINT "fk_financial_ledger_payment_id_payments" FOREIGN KEY ("payment_id") REFERENCES "payments" ("id") ON DELETE SET NULL;
ALTER TABLE "financial_ledger" ADD CONSTRAINT "fk_financial_ledger_exchange_rate_id_exchange_rate_snapshots" FOREIGN KEY ("exchange_rate_id") REFERENCES "exchange_rate_snapshots" ("id") ON DELETE SET NULL;
ALTER TABLE "cash_sessions" ADD CONSTRAINT "fk_cash_sessions_branch_id_branches" FOREIGN KEY ("branch_id") REFERENCES "branches" ("id") ON DELETE NO ACTION;
ALTER TABLE "cash_movements" ADD CONSTRAINT "fk_cash_movements_cash_session_id_cash_sessions" FOREIGN KEY ("cash_session_id") REFERENCES "cash_sessions" ("id") ON DELETE CASCADE;
ALTER TABLE "commissions" ADD CONSTRAINT "fk_commissions_company_id_companies" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE NO ACTION;
ALTER TABLE "commissions" ADD CONSTRAINT "fk_commissions_professional_id_professionals" FOREIGN KEY ("professional_id") REFERENCES "professionals" ("id") ON DELETE SET NULL;
ALTER TABLE "commissions" ADD CONSTRAINT "fk_commissions_payment_id_payments" FOREIGN KEY ("payment_id") REFERENCES "payments" ("id") ON DELETE SET NULL;
ALTER TABLE "commissions" ADD CONSTRAINT "fk_commissions_rule_id_commission_rules" FOREIGN KEY ("rule_id") REFERENCES "commission_rules" ("id") ON DELETE SET NULL;
ALTER TABLE "commissions" ADD CONSTRAINT "fk_commissions_payout_id_professional_payouts" FOREIGN KEY ("payout_id") REFERENCES "professional_payouts" ("id") ON DELETE SET NULL;
ALTER TABLE "professional_payouts" ADD CONSTRAINT "fk_professional_payouts_professional_id_professionals" FOREIGN KEY ("professional_id") REFERENCES "professionals" ("id") ON DELETE NO ACTION;
ALTER TABLE "professional_payout_items" ADD CONSTRAINT "fk_professional_payout_items_payout_id_professional_payouts" FOREIGN KEY ("payout_id") REFERENCES "professional_payouts" ("id") ON DELETE CASCADE;
ALTER TABLE "professional_payout_items" ADD CONSTRAINT "fk_professional_payout_items_commission_id_commissions" FOREIGN KEY ("commission_id") REFERENCES "commissions" ("id") ON DELETE SET NULL;
ALTER TABLE "wallets" ADD CONSTRAINT "fk_wallets_customer_id_customers" FOREIGN KEY ("customer_id") REFERENCES "customers" ("id") ON DELETE NO ACTION;
ALTER TABLE "wallet_ledger" ADD CONSTRAINT "fk_wallet_ledger_wallet_id_wallets" FOREIGN KEY ("wallet_id") REFERENCES "wallets" ("id") ON DELETE CASCADE;
ALTER TABLE "wallet_ledger" ADD CONSTRAINT "fk_wallet_ledger_payment_id_payments" FOREIGN KEY ("payment_id") REFERENCES "payments" ("id") ON DELETE SET NULL;
ALTER TABLE "reviews" ADD CONSTRAINT "fk_reviews_author_user_id_users" FOREIGN KEY ("author_user_id") REFERENCES "users" ("id") ON DELETE NO ACTION;
ALTER TABLE "reviews" ADD CONSTRAINT "fk_reviews_company_id_companies" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE NO ACTION;
ALTER TABLE "reviews" ADD CONSTRAINT "fk_reviews_professional_id_professionals" FOREIGN KEY ("professional_id") REFERENCES "professionals" ("id") ON DELETE SET NULL;
ALTER TABLE "reviews" ADD CONSTRAINT "fk_reviews_service_id_services" FOREIGN KEY ("service_id") REFERENCES "services" ("id") ON DELETE SET NULL;
ALTER TABLE "reviews" ADD CONSTRAINT "fk_reviews_branch_id_branches" FOREIGN KEY ("branch_id") REFERENCES "branches" ("id") ON DELETE SET NULL;
ALTER TABLE "reviews" ADD CONSTRAINT "fk_reviews_appointment_id_appointments" FOREIGN KEY ("appointment_id") REFERENCES "appointments" ("id") ON DELETE SET NULL;
ALTER TABLE "reviews" ADD CONSTRAINT "fk_reviews_customersId_customers" FOREIGN KEY ("customersId") REFERENCES "customers" ("id") ON DELETE NO ACTION;
ALTER TABLE "review_ratings" ADD CONSTRAINT "fk_review_ratings_review_id_reviews" FOREIGN KEY ("review_id") REFERENCES "reviews" ("id") ON DELETE CASCADE;
ALTER TABLE "review_media" ADD CONSTRAINT "fk_review_media_review_id_reviews" FOREIGN KEY ("review_id") REFERENCES "reviews" ("id") ON DELETE CASCADE;
ALTER TABLE "review_reports" ADD CONSTRAINT "fk_review_reports_review_id_reviews" FOREIGN KEY ("review_id") REFERENCES "reviews" ("id") ON DELETE CASCADE;
ALTER TABLE "posts" ADD CONSTRAINT "fk_posts_author_user_id_users" FOREIGN KEY ("author_user_id") REFERENCES "users" ("id") ON DELETE NO ACTION;
ALTER TABLE "posts" ADD CONSTRAINT "fk_posts_company_id_companies" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE SET NULL;
ALTER TABLE "posts" ADD CONSTRAINT "fk_posts_branch_id_branches" FOREIGN KEY ("branch_id") REFERENCES "branches" ("id") ON DELETE SET NULL;
ALTER TABLE "posts" ADD CONSTRAINT "fk_posts_professional_id_professionals" FOREIGN KEY ("professional_id") REFERENCES "professionals" ("id") ON DELETE SET NULL;
ALTER TABLE "post_media" ADD CONSTRAINT "fk_post_media_post_id_posts" FOREIGN KEY ("post_id") REFERENCES "posts" ("id") ON DELETE CASCADE;
ALTER TABLE "post_services" ADD CONSTRAINT "fk_post_services_post_id_posts" FOREIGN KEY ("post_id") REFERENCES "posts" ("id") ON DELETE CASCADE;
ALTER TABLE "post_services" ADD CONSTRAINT "fk_post_services_service_id_services" FOREIGN KEY ("service_id") REFERENCES "services" ("id") ON DELETE CASCADE;
ALTER TABLE "post_services" ADD CONSTRAINT "fk_post_services_category_id_service_categories" FOREIGN KEY ("category_id") REFERENCES "service_categories" ("id") ON DELETE SET NULL;
ALTER TABLE "likes" ADD CONSTRAINT "fk_likes_user_id_users" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;
ALTER TABLE "likes" ADD CONSTRAINT "fk_likes_post_id_posts" FOREIGN KEY ("post_id") REFERENCES "posts" ("id") ON DELETE CASCADE;
ALTER TABLE "likes" ADD CONSTRAINT "fk_likes_customersId_customers" FOREIGN KEY ("customersId") REFERENCES "customers" ("id") ON DELETE NO ACTION;
ALTER TABLE "comments" ADD CONSTRAINT "fk_comments_user_id_users" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;
ALTER TABLE "comments" ADD CONSTRAINT "fk_comments_post_id_posts" FOREIGN KEY ("post_id") REFERENCES "posts" ("id") ON DELETE CASCADE;
ALTER TABLE "comments" ADD CONSTRAINT "fk_comments_parent_comment_id_comments" FOREIGN KEY ("parent_comment_id") REFERENCES "comments" ("id") ON DELETE NO ACTION;
ALTER TABLE "comments" ADD CONSTRAINT "fk_comments_customersId_customers" FOREIGN KEY ("customersId") REFERENCES "customers" ("id") ON DELETE NO ACTION;
ALTER TABLE "follows" ADD CONSTRAINT "fk_follows_follower_user_id_users" FOREIGN KEY ("follower_user_id") REFERENCES "users" ("id") ON DELETE CASCADE;
ALTER TABLE "follows" ADD CONSTRAINT "fk_follows_company_id_companies" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE CASCADE;
ALTER TABLE "follows" ADD CONSTRAINT "fk_follows_professional_id_professionals" FOREIGN KEY ("professional_id") REFERENCES "professionals" ("id") ON DELETE CASCADE;
ALTER TABLE "follows" ADD CONSTRAINT "fk_follows_customersId_customers" FOREIGN KEY ("customersId") REFERENCES "customers" ("id") ON DELETE NO ACTION;
ALTER TABLE "favorites" ADD CONSTRAINT "fk_favorites_user_id_users" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;
ALTER TABLE "favorites" ADD CONSTRAINT "fk_favorites_company_id_companies" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE CASCADE;
ALTER TABLE "favorites" ADD CONSTRAINT "fk_favorites_branch_id_branches" FOREIGN KEY ("branch_id") REFERENCES "branches" ("id") ON DELETE CASCADE;
ALTER TABLE "favorites" ADD CONSTRAINT "fk_favorites_service_id_services" FOREIGN KEY ("service_id") REFERENCES "services" ("id") ON DELETE CASCADE;
ALTER TABLE "favorites" ADD CONSTRAINT "fk_favorites_professional_id_professionals" FOREIGN KEY ("professional_id") REFERENCES "professionals" ("id") ON DELETE CASCADE;
ALTER TABLE "favorites" ADD CONSTRAINT "fk_favorites_post_id_posts" FOREIGN KEY ("post_id") REFERENCES "posts" ("id") ON DELETE CASCADE;
ALTER TABLE "favorites" ADD CONSTRAINT "fk_favorites_customersId_customers" FOREIGN KEY ("customersId") REFERENCES "customers" ("id") ON DELETE NO ACTION;
ALTER TABLE "collection_items" ADD CONSTRAINT "fk_collection_items_collection_id_collections" FOREIGN KEY ("collection_id") REFERENCES "collections" ("id") ON DELETE CASCADE;
ALTER TABLE "collection_items" ADD CONSTRAINT "fk_collection_items_post_id_posts" FOREIGN KEY ("post_id") REFERENCES "posts" ("id") ON DELETE CASCADE;
ALTER TABLE "conversation_members" ADD CONSTRAINT "fk_conversation_members_conversation_id_conversations" FOREIGN KEY ("conversation_id") REFERENCES "conversations" ("id") ON DELETE CASCADE;
ALTER TABLE "conversation_members" ADD CONSTRAINT "fk_conversation_members_user_id_users" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;
ALTER TABLE "conversation_members" ADD CONSTRAINT "fk_conversation_members_customer_id_customers" FOREIGN KEY ("customer_id") REFERENCES "customers" ("id") ON DELETE SET NULL;
ALTER TABLE "messages" ADD CONSTRAINT "fk_messages_conversation_id_conversations" FOREIGN KEY ("conversation_id") REFERENCES "conversations" ("id") ON DELETE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "fk_messages_sender_user_id_users" FOREIGN KEY ("sender_user_id") REFERENCES "users" ("id") ON DELETE NO ACTION;
ALTER TABLE "message_attachments" ADD CONSTRAINT "fk_message_attachments_message_id_messages" FOREIGN KEY ("message_id") REFERENCES "messages" ("id") ON DELETE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "fk_notifications_recipient_user_id_users" FOREIGN KEY ("recipient_user_id") REFERENCES "users" ("id") ON DELETE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "fk_notifications_customersId_customers" FOREIGN KEY ("customersId") REFERENCES "customers" ("id") ON DELETE NO ACTION;
ALTER TABLE "notification_preferences" ADD CONSTRAINT "fk_notification_preferences_user_id_users" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;
ALTER TABLE "location_preferences" ADD CONSTRAINT "fk_location_preferences_user_id_users" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;
ALTER TABLE "nearby_notification_preferences" ADD CONSTRAINT "fk_nearby_notification_preferences_user_id_users" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;
ALTER TABLE "business_nearby_campaigns" ADD CONSTRAINT "fk_business_nearby_campaigns_company_id_companies" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE CASCADE;
ALTER TABLE "business_nearby_campaigns" ADD CONSTRAINT "fk_business_nearby_campaigns_branch_id_branches" FOREIGN KEY ("branch_id") REFERENCES "branches" ("id") ON DELETE SET NULL;
ALTER TABLE "business_nearby_campaigns" ADD CONSTRAINT "fk_business_nearby_campaigns_category_id_service_categories" FOREIGN KEY ("category_id") REFERENCES "service_categories" ("id") ON DELETE SET NULL;
ALTER TABLE "promotions" ADD CONSTRAINT "fk_promotions_company_id_companies" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE CASCADE;
ALTER TABLE "promotions" ADD CONSTRAINT "fk_promotions_branch_id_branches" FOREIGN KEY ("branch_id") REFERENCES "branches" ("id") ON DELETE SET NULL;
ALTER TABLE "promotion_rules" ADD CONSTRAINT "fk_promotion_rules_promotion_id_promotions" FOREIGN KEY ("promotion_id") REFERENCES "promotions" ("id") ON DELETE CASCADE;
ALTER TABLE "coupons" ADD CONSTRAINT "fk_coupons_company_id_companies" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE CASCADE;
ALTER TABLE "coupons" ADD CONSTRAINT "fk_coupons_promotion_id_promotions" FOREIGN KEY ("promotion_id") REFERENCES "promotions" ("id") ON DELETE SET NULL;
ALTER TABLE "coupon_usage" ADD CONSTRAINT "fk_coupon_usage_coupon_id_coupons" FOREIGN KEY ("coupon_id") REFERENCES "coupons" ("id") ON DELETE NO ACTION;
ALTER TABLE "coupon_usage" ADD CONSTRAINT "fk_coupon_usage_user_id_users" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE NO ACTION;
ALTER TABLE "coupon_usage" ADD CONSTRAINT "fk_coupon_usage_company_id_companies" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE NO ACTION;
ALTER TABLE "coupon_usage" ADD CONSTRAINT "fk_coupon_usage_promotion_id_promotions" FOREIGN KEY ("promotion_id") REFERENCES "promotions" ("id") ON DELETE SET NULL;
ALTER TABLE "packages" ADD CONSTRAINT "fk_packages_company_id_companies" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE CASCADE;
ALTER TABLE "package_purchases" ADD CONSTRAINT "fk_package_purchases_package_id_packages" FOREIGN KEY ("package_id") REFERENCES "packages" ("id") ON DELETE NO ACTION;
ALTER TABLE "package_purchases" ADD CONSTRAINT "fk_package_purchases_customer_id_customers" FOREIGN KEY ("customer_id") REFERENCES "customers" ("id") ON DELETE NO ACTION;
ALTER TABLE "package_usage" ADD CONSTRAINT "fk_package_usage_package_purchase_id_package_purchases" FOREIGN KEY ("package_purchase_id") REFERENCES "package_purchases" ("id") ON DELETE CASCADE;
ALTER TABLE "package_usage" ADD CONSTRAINT "fk_package_usage_appointment_id_appointments" FOREIGN KEY ("appointment_id") REFERENCES "appointments" ("id") ON DELETE SET NULL;
ALTER TABLE "package_usage" ADD CONSTRAINT "fk_package_usage_service_id_services" FOREIGN KEY ("service_id") REFERENCES "services" ("id") ON DELETE NO ACTION;
ALTER TABLE "memberships" ADD CONSTRAINT "fk_memberships_company_id_companies" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE CASCADE;
ALTER TABLE "membership_subscriptions" ADD CONSTRAINT "fk_membership_subscriptions_membership_id_memberships" FOREIGN KEY ("membership_id") REFERENCES "memberships" ("id") ON DELETE NO ACTION;
ALTER TABLE "membership_subscriptions" ADD CONSTRAINT "fk_membership_subscriptions_customer_id_customers" FOREIGN KEY ("customer_id") REFERENCES "customers" ("id") ON DELETE NO ACTION;
ALTER TABLE "gift_cards" ADD CONSTRAINT "fk_gift_cards_company_id_companies" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE SET NULL;
ALTER TABLE "gift_card_ledger" ADD CONSTRAINT "fk_gift_card_ledger_gift_card_id_gift_cards" FOREIGN KEY ("gift_card_id") REFERENCES "gift_cards" ("id") ON DELETE CASCADE;
ALTER TABLE "gift_card_ledger" ADD CONSTRAINT "fk_gift_card_ledger_wallet_id_wallets" FOREIGN KEY ("wallet_id") REFERENCES "wallets" ("id") ON DELETE SET NULL;
ALTER TABLE "loyalty_accounts" ADD CONSTRAINT "fk_loyalty_accounts_customer_id_customers" FOREIGN KEY ("customer_id") REFERENCES "customers" ("id") ON DELETE NO ACTION;
ALTER TABLE "loyalty_ledger" ADD CONSTRAINT "fk_loyalty_ledger_loyalty_account_id_loyalty_accounts" FOREIGN KEY ("loyalty_account_id") REFERENCES "loyalty_accounts" ("id") ON DELETE CASCADE;
ALTER TABLE "referrals" ADD CONSTRAINT "fk_referrals_referrer_user_id_users" FOREIGN KEY ("referrer_user_id") REFERENCES "users" ("id") ON DELETE NO ACTION;
ALTER TABLE "referrals" ADD CONSTRAINT "fk_referrals_referred_user_id_users" FOREIGN KEY ("referred_user_id") REFERENCES "users" ("id") ON DELETE NO ACTION;
ALTER TABLE "products" ADD CONSTRAINT "fk_products_company_id_companies" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE CASCADE;
ALTER TABLE "inventory_items" ADD CONSTRAINT "fk_inventory_items_product_id_products" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE CASCADE;
ALTER TABLE "inventory_items" ADD CONSTRAINT "fk_inventory_items_branch_id_branches" FOREIGN KEY ("branch_id") REFERENCES "branches" ("id") ON DELETE SET NULL;
ALTER TABLE "inventory_movements" ADD CONSTRAINT "fk_inventory_movements_product_id_products" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE NO ACTION;
ALTER TABLE "inventory_movements" ADD CONSTRAINT "fk_inventory_movements_inventory_id_inventory_items" FOREIGN KEY ("inventory_id") REFERENCES "inventory_items" ("id") ON DELETE SET NULL;
ALTER TABLE "inventory_movements" ADD CONSTRAINT "fk_inventory_movements_branch_id_branches" FOREIGN KEY ("branch_id") REFERENCES "branches" ("id") ON DELETE SET NULL;
ALTER TABLE "consent_forms" ADD CONSTRAINT "fk_consent_forms_company_id_companies" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE CASCADE;
ALTER TABLE "consent_form_responses" ADD CONSTRAINT "fk_consent_form_responses_consent_form_id_consent_forms" FOREIGN KEY ("consent_form_id") REFERENCES "consent_forms" ("id") ON DELETE CASCADE;
ALTER TABLE "consent_form_responses" ADD CONSTRAINT "fk_consent_form_responses_customer_id_customers" FOREIGN KEY ("customer_id") REFERENCES "customers" ("id") ON DELETE NO ACTION;
ALTER TABLE "consent_form_responses" ADD CONSTRAINT "fk_consent_form_responses_appointment_id_appointments" FOREIGN KEY ("appointment_id") REFERENCES "appointments" ("id") ON DELETE SET NULL;
ALTER TABLE "subscriptions" ADD CONSTRAINT "fk_subscriptions_company_id_companies" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE CASCADE;
ALTER TABLE "subscriptions" ADD CONSTRAINT "fk_subscriptions_plan_id_subscription_plans" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans" ("id") ON DELETE NO ACTION;
ALTER TABLE "subscription_features" ADD CONSTRAINT "fk_subscription_features_plan_id_subscription_plans" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans" ("id") ON DELETE CASCADE;
ALTER TABLE "commission_rules" ADD CONSTRAINT "fk_commission_rules_company_id_companies" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE CASCADE;
ALTER TABLE "support_messages" ADD CONSTRAINT "fk_support_messages_ticket_id_support_tickets" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets" ("id") ON DELETE CASCADE;
ALTER TABLE "disputes" ADD CONSTRAINT "fk_disputes_company_id_companies" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "fk_audit_logs_actor_user_id_users" FOREIGN KEY ("actor_user_id") REFERENCES "users" ("id") ON DELETE NO ACTION;
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "fk_password_reset_tokens_user_id_users" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "fk_email_verification_tokens_user_id_users" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;
ALTER TABLE "phone_otp_tokens" ADD CONSTRAINT "fk_phone_otp_tokens_user_id_users" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;
ALTER TABLE "resource_media" ADD CONSTRAINT "fk_resource_media_resource_id_resources" FOREIGN KEY ("resource_id") REFERENCES "resources" ("id") ON DELETE CASCADE;
ALTER TABLE "resource_media" ADD CONSTRAINT "fk_resource_media_media_id_media" FOREIGN KEY ("media_id") REFERENCES "media" ("id") ON DELETE CASCADE;
ALTER TABLE "customer_preferred_resources" ADD CONSTRAINT "fk_customer_preferred_resources_customer_id_customers" FOREIGN KEY ("customer_id") REFERENCES "customers" ("id") ON DELETE CASCADE;
ALTER TABLE "customer_preferred_resources" ADD CONSTRAINT "fk_customer_preferred_resources_resource_id_resources" FOREIGN KEY ("resource_id") REFERENCES "resources" ("id") ON DELETE CASCADE;
ALTER TABLE "user_strikes" ADD CONSTRAINT "fk_user_strikes_user_id_users" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;
ALTER TABLE "country_taxes" ADD CONSTRAINT "fk_country_taxes_country_id_countries" FOREIGN KEY ("country_id") REFERENCES "countries" ("id") ON DELETE CASCADE;

CREATE INDEX "idx_users_email" ON "users" ("email");
CREATE INDEX "idx_users_phone" ON "users" ("phone");
CREATE INDEX "idx_users_is_active" ON "users" ("is_active");
CREATE INDEX "idx_users_created_at" ON "users" ("created_at");
CREATE INDEX "idx_user_profiles_country_id" ON "user_profiles" ("country_id");
CREATE INDEX "idx_user_profiles_city_id" ON "user_profiles" ("city_id");
CREATE INDEX "idx_search_history_user_id_created_at" ON "search_history" ("user_id", "created_at");
CREATE INDEX "idx_search_history_query_text" ON "search_history" ("query_text");
CREATE INDEX "idx_push_devices_user_id_is_enabled" ON "push_devices" ("user_id", "is_enabled");
CREATE INDEX "idx_push_devices_platform" ON "push_devices" ("platform");
CREATE INDEX "idx_sessions_user_id" ON "sessions" ("user_id");
CREATE INDEX "idx_sessions_family_id" ON "sessions" ("family_id");
CREATE INDEX "idx_sessions_expires_at" ON "sessions" ("expires_at");
CREATE INDEX "idx_sessions_revoked_at" ON "sessions" ("revoked_at");
CREATE INDEX "idx_roles_key" ON "roles" ("key");
CREATE INDEX "idx_roles_scope_type" ON "roles" ("scope_type");
CREATE INDEX "idx_permissions_key" ON "permissions" ("key");
CREATE INDEX "idx_permissions_group" ON "permissions" ("group");
CREATE UNIQUE INDEX "uidx_role_permissions_role_id_permission_id" ON "role_permissions" ("role_id", "permission_id");
CREATE INDEX "idx_role_permissions_permission_id" ON "role_permissions" ("permission_id");
CREATE UNIQUE INDEX "uidx_user_role_scopes_user_id_role_id_scope_type_scope_id" ON "user_role_scopes" ("user_id", "role_id", "scope_type", "scope_id");
CREATE INDEX "idx_user_role_scopes_user_id" ON "user_role_scopes" ("user_id");
CREATE INDEX "idx_user_role_scopes_user_id_role_key_scope_type_scope_id" ON "user_role_scopes" ("user_id", "role_key", "scope_type", "scope_id");
CREATE INDEX "idx_user_role_scopes_company_id" ON "user_role_scopes" ("company_id");
CREATE INDEX "idx_user_role_scopes_branch_id" ON "user_role_scopes" ("branch_id");
CREATE INDEX "idx_countries_iso_code" ON "countries" ("iso_code");
CREATE INDEX "idx_countries_is_active" ON "countries" ("is_active");
CREATE UNIQUE INDEX "uidx_regions_country_id_code" ON "regions" ("country_id", "code");
CREATE INDEX "idx_regions_country_id" ON "regions" ("country_id");
CREATE INDEX "idx_regions_is_active" ON "regions" ("is_active");
CREATE UNIQUE INDEX "uidx_districts_region_id_code" ON "districts" ("region_id", "code");
CREATE INDEX "idx_districts_region_id" ON "districts" ("region_id");
CREATE INDEX "idx_districts_country_id" ON "districts" ("country_id");
CREATE INDEX "idx_districts_is_active" ON "districts" ("is_active");
CREATE INDEX "idx_cities_country_id" ON "cities" ("country_id");
CREATE INDEX "idx_cities_region_id" ON "cities" ("region_id");
CREATE INDEX "idx_cities_district_id" ON "cities" ("district_id");
CREATE INDEX "idx_cities_name" ON "cities" ("name");
CREATE INDEX "idx_cities_is_active" ON "cities" ("is_active");
CREATE INDEX "idx_areas_city_id" ON "areas" ("city_id");
CREATE INDEX "idx_areas_country_id" ON "areas" ("country_id");
CREATE INDEX "idx_areas_name" ON "areas" ("name");
CREATE INDEX "idx_areas_is_active" ON "areas" ("is_active");
CREATE INDEX "idx_companies_owner_user_id" ON "companies" ("owner_user_id");
CREATE INDEX "idx_companies_country_id" ON "companies" ("country_id");
CREATE INDEX "idx_companies_city_id" ON "companies" ("city_id");
CREATE INDEX "idx_companies_slug" ON "companies" ("slug");
CREATE INDEX "idx_companies_is_verified_is_active" ON "companies" ("is_verified", "is_active");
CREATE INDEX "idx_companies_avg_rating" ON "companies" ("avg_rating");
CREATE INDEX "idx_companies_review_count" ON "companies" ("review_count");
CREATE INDEX "idx_companies_follower_count" ON "companies" ("follower_count");
CREATE INDEX "idx_companies_created_at" ON "companies" ("created_at");
CREATE INDEX "idx_companies_display_name" ON "companies" ("display_name");
CREATE UNIQUE INDEX "uidx_branches_company_id_slug" ON "branches" ("company_id", "slug");
CREATE INDEX "idx_branches_company_id" ON "branches" ("company_id");
CREATE INDEX "idx_branches_country_id" ON "branches" ("country_id");
CREATE INDEX "idx_branches_city_id" ON "branches" ("city_id");
CREATE INDEX "idx_branches_area_id" ON "branches" ("area_id");
CREATE INDEX "idx_branches_slug" ON "branches" ("slug");
CREATE INDEX "idx_branches_is_active" ON "branches" ("is_active");
CREATE INDEX "idx_branches_latitude_longitude" ON "branches" ("latitude", "longitude");
CREATE UNIQUE INDEX "uidx_branch_hours_branch_id_day_of_week" ON "branch_hours" ("branch_id", "day_of_week");
CREATE INDEX "idx_branch_hours_branch_id" ON "branch_hours" ("branch_id");
CREATE UNIQUE INDEX "uidx_branch_exceptions_branch_id_exception_date" ON "branch_exceptions" ("branch_id", "exception_date");
CREATE INDEX "idx_branch_exceptions_branch_id" ON "branch_exceptions" ("branch_id");
CREATE INDEX "idx_branch_exceptions_exception_date" ON "branch_exceptions" ("exception_date");
CREATE INDEX "idx_professionals_user_id" ON "professionals" ("user_id");
CREATE INDEX "idx_professionals_company_id" ON "professionals" ("company_id");
CREATE INDEX "idx_professionals_is_active" ON "professionals" ("is_active");
CREATE INDEX "idx_professionals_avg_rating" ON "professionals" ("avg_rating");
CREATE INDEX "idx_professionals_review_count" ON "professionals" ("review_count");
CREATE INDEX "idx_professionals_follower_count" ON "professionals" ("follower_count");
CREATE INDEX "idx_professionals_display_name" ON "professionals" ("display_name");
CREATE UNIQUE INDEX "uidx_professional_branches_professional_id_branch_id" ON "professional_branches" ("professional_id", "branch_id");
CREATE INDEX "idx_professional_branches_branch_id" ON "professional_branches" ("branch_id");
CREATE UNIQUE INDEX "uidx_professional_services_professional_id_service_id" ON "professional_services" ("professional_id", "service_id");
CREATE INDEX "idx_professional_services_service_id" ON "professional_services" ("service_id");
CREATE INDEX "idx_professional_schedules_professional_id" ON "professional_schedules" ("professional_id");
CREATE INDEX "idx_professional_schedules_branch_id" ON "professional_schedules" ("branch_id");
CREATE INDEX "idx_professional_schedule_exceptions_professional_id" ON "professional_schedule_exceptions" ("professional_id");
CREATE INDEX "idx_professional_schedule_exceptions_exception_date" ON "professional_schedule_exceptions" ("exception_date");
CREATE INDEX "idx_service_categories_parent_id" ON "service_categories" ("parent_id");
CREATE INDEX "idx_service_categories_country_id" ON "service_categories" ("country_id");
CREATE INDEX "idx_service_categories_slug" ON "service_categories" ("slug");
CREATE INDEX "idx_service_categories_is_active" ON "service_categories" ("is_active");
CREATE INDEX "idx_service_categories_sort_order" ON "service_categories" ("sort_order");
CREATE INDEX "idx_service_categories_name" ON "service_categories" ("name");
CREATE UNIQUE INDEX "uidx_services_company_id_slug" ON "services" ("company_id", "slug");
CREATE INDEX "idx_services_company_id" ON "services" ("company_id");
CREATE INDEX "idx_services_category_id" ON "services" ("category_id");
CREATE INDEX "idx_services_slug" ON "services" ("slug");
CREATE INDEX "idx_services_is_active" ON "services" ("is_active");
CREATE INDEX "idx_services_base_price" ON "services" ("base_price");
CREATE INDEX "idx_services_avg_rating" ON "services" ("avg_rating");
CREATE INDEX "idx_services_review_count" ON "services" ("review_count");
CREATE INDEX "idx_services_booking_count" ON "services" ("booking_count");
CREATE INDEX "idx_services_duration_minutes" ON "services" ("duration_minutes");
CREATE UNIQUE INDEX "uidx_service_translations_service_id_locale" ON "service_translations" ("service_id", "locale");
CREATE INDEX "idx_service_translations_locale" ON "service_translations" ("locale");
CREATE UNIQUE INDEX "uidx_service_branch_settings_service_id_branch_id" ON "service_branch_settings" ("service_id", "branch_id");
CREATE INDEX "idx_service_branch_settings_branch_id" ON "service_branch_settings" ("branch_id");
CREATE UNIQUE INDEX "uidx_service_dependencies_service_id_prerequisite_id" ON "service_dependencies" ("service_id", "prerequisite_id");
CREATE INDEX "idx_service_dependencies_prerequisite_id" ON "service_dependencies" ("prerequisite_id");
CREATE INDEX "idx_service_stages_service_id" ON "service_stages" ("service_id");
CREATE INDEX "idx_service_stages_stage_order" ON "service_stages" ("stage_order");
CREATE INDEX "idx_resources_company_id" ON "resources" ("company_id");
CREATE INDEX "idx_resources_branch_id" ON "resources" ("branch_id");
CREATE INDEX "idx_resources_resource_type_id" ON "resources" ("resource_type_id");
CREATE INDEX "idx_resources_type" ON "resources" ("type");
CREATE INDEX "idx_resources_is_active" ON "resources" ("is_active");
CREATE INDEX "idx_resources_name" ON "resources" ("name");
CREATE INDEX "idx_resource_attributes_resource_id" ON "resource_attributes" ("resource_id");
CREATE INDEX "idx_resource_attributes_attribute_key" ON "resource_attributes" ("attribute_key");
CREATE UNIQUE INDEX "uidx_professional_resources_professional_id_resource_id" ON "professional_resources" ("professional_id", "resource_id");
CREATE INDEX "idx_professional_resources_resource_id" ON "professional_resources" ("resource_id");
CREATE INDEX "idx_service_resource_requirements_service_id" ON "service_resource_requirements" ("service_id");
CREATE INDEX "idx_service_resource_requirements_resource_type_id" ON "service_resource_requirements" ("resource_type_id");
CREATE INDEX "idx_service_resource_requirements_resource_id" ON "service_resource_requirements" ("resource_id");
CREATE INDEX "idx_resource_blocks_resource_id" ON "resource_blocks" ("resource_id");
CREATE INDEX "idx_resource_blocks_starts_at_ends_at" ON "resource_blocks" ("starts_at", "ends_at");
CREATE INDEX "idx_resource_maintenance_resource_id" ON "resource_maintenance" ("resource_id");
CREATE INDEX "idx_resource_maintenance_scheduled_at" ON "resource_maintenance" ("scheduled_at");
CREATE INDEX "idx_resource_maintenance_status" ON "resource_maintenance" ("status");
CREATE INDEX "idx_floor_plans_branch_id" ON "floor_plans" ("branch_id");
CREATE INDEX "idx_floor_plan_items_floor_plan_id" ON "floor_plan_items" ("floor_plan_id");
CREATE INDEX "idx_floor_plan_items_resource_id" ON "floor_plan_items" ("resource_id");
CREATE INDEX "idx_customers_user_id" ON "customers" ("user_id");
CREATE INDEX "idx_customers_referral_code" ON "customers" ("referral_code");
CREATE INDEX "idx_customers_referred_by_user_id" ON "customers" ("referred_by_user_id");
CREATE INDEX "idx_customers_total_bookings" ON "customers" ("total_bookings");
CREATE INDEX "idx_customers_loyalty_points" ON "customers" ("loyalty_points");
CREATE INDEX "idx_customer_addresses_customer_id" ON "customer_addresses" ("customer_id");
CREATE INDEX "idx_customer_addresses_is_default" ON "customer_addresses" ("is_default");
CREATE INDEX "idx_customer_dependents_customer_id" ON "customer_dependents" ("customer_id");
CREATE INDEX "idx_appointments_company_id" ON "appointments" ("company_id");
CREATE INDEX "idx_appointments_branch_id" ON "appointments" ("branch_id");
CREATE INDEX "idx_appointments_customer_id" ON "appointments" ("customer_id");
CREATE INDEX "idx_appointments_customer_user_id" ON "appointments" ("customer_user_id");
CREATE INDEX "idx_appointments_status" ON "appointments" ("status");
CREATE INDEX "idx_appointments_starts_at_ends_at" ON "appointments" ("starts_at", "ends_at");
CREATE INDEX "idx_appointments_starts_at" ON "appointments" ("starts_at");
CREATE INDEX "idx_appointments_created_at" ON "appointments" ("created_at");
CREATE INDEX "idx_appointments_is_walk_in" ON "appointments" ("is_walk_in");
CREATE INDEX "idx_appointments_source" ON "appointments" ("source");
CREATE UNIQUE INDEX "uidx_appointment_participants_appointment_id_pro_e25906febb" ON "appointment_participants" ("appointment_id", "professional_id", "customer_id", "dependent_id");
CREATE INDEX "idx_appointment_participants_appointment_id" ON "appointment_participants" ("appointment_id");
CREATE INDEX "idx_appointment_participants_professional_id" ON "appointment_participants" ("professional_id");
CREATE INDEX "idx_appointment_participants_customer_id" ON "appointment_participants" ("customer_id");
CREATE INDEX "idx_appointment_services_appointment_id" ON "appointment_services" ("appointment_id");
CREATE INDEX "idx_appointment_services_service_id" ON "appointment_services" ("service_id");
CREATE INDEX "idx_appointment_services_professional_id" ON "appointment_services" ("professional_id");
CREATE UNIQUE INDEX "uidx_appointment_resources_appointment_id_resour_a631935d18" ON "appointment_resources" ("appointment_id", "resource_id", "stage_id");
CREATE INDEX "idx_appointment_resources_appointment_id" ON "appointment_resources" ("appointment_id");
CREATE INDEX "idx_appointment_resources_resource_id" ON "appointment_resources" ("resource_id");
CREATE INDEX "idx_appointment_holds_customer_id" ON "appointment_holds" ("customer_id");
CREATE INDEX "idx_appointment_holds_company_id" ON "appointment_holds" ("company_id");
CREATE INDEX "idx_appointment_holds_branch_id" ON "appointment_holds" ("branch_id");
CREATE INDEX "idx_appointment_holds_status" ON "appointment_holds" ("status");
CREATE INDEX "idx_appointment_holds_expires_at" ON "appointment_holds" ("expires_at");
CREATE INDEX "idx_appointment_holds_held_until" ON "appointment_holds" ("held_until");
CREATE INDEX "idx_appointment_status_history_appointment_id" ON "appointment_status_history" ("appointment_id");
CREATE INDEX "idx_appointment_status_history_new_status" ON "appointment_status_history" ("new_status");
CREATE INDEX "idx_appointment_status_history_created_at" ON "appointment_status_history" ("created_at");
CREATE INDEX "idx_appointment_notes_appointment_id" ON "appointment_notes" ("appointment_id");
CREATE INDEX "idx_appointment_notes_is_pinned" ON "appointment_notes" ("is_pinned");
CREATE INDEX "idx_appointment_media_appointment_id" ON "appointment_media" ("appointment_id");
CREATE INDEX "idx_appointment_media_media_id" ON "appointment_media" ("media_id");
CREATE INDEX "idx_queues_branch_id" ON "queues" ("branch_id");
CREATE INDEX "idx_queues_is_active" ON "queues" ("is_active");
CREATE INDEX "idx_queue_entries_queue_id" ON "queue_entries" ("queue_id");
CREATE INDEX "idx_queue_entries_customer_id" ON "queue_entries" ("customer_id");
CREATE INDEX "idx_queue_entries_status" ON "queue_entries" ("status");
CREATE INDEX "idx_queue_entries_joined_at" ON "queue_entries" ("joined_at");
CREATE INDEX "idx_queue_entries_position" ON "queue_entries" ("position");
CREATE INDEX "idx_payments_company_id" ON "payments" ("company_id");
CREATE INDEX "idx_payments_appointment_id" ON "payments" ("appointment_id");
CREATE INDEX "idx_payments_customer_id" ON "payments" ("customer_id");
CREATE INDEX "idx_payments_status" ON "payments" ("status");
CREATE INDEX "idx_payments_payment_method" ON "payments" ("payment_method");
CREATE INDEX "idx_payments_paid_at" ON "payments" ("paid_at");
CREATE INDEX "idx_payments_reference_code" ON "payments" ("reference_code");
CREATE INDEX "idx_payments_external_transaction_id" ON "payments" ("external_transaction_id");
CREATE INDEX "idx_payment_transactions_payment_id" ON "payment_transactions" ("payment_id");
CREATE INDEX "idx_payment_transactions_status" ON "payment_transactions" ("status");
CREATE INDEX "idx_payment_transactions_processed_at" ON "payment_transactions" ("processed_at");
CREATE INDEX "idx_payment_transactions_external_reference" ON "payment_transactions" ("external_reference");
CREATE INDEX "idx_refunds_payment_id" ON "refunds" ("payment_id");
CREATE INDEX "idx_refunds_company_id" ON "refunds" ("company_id");
CREATE INDEX "idx_refunds_customer_id" ON "refunds" ("customer_id");
CREATE INDEX "idx_refunds_status" ON "refunds" ("status");
CREATE INDEX "idx_financial_ledger_company_id" ON "financial_ledger" ("company_id");
CREATE INDEX "idx_financial_ledger_payment_id" ON "financial_ledger" ("payment_id");
CREATE INDEX "idx_financial_ledger_appointment_id" ON "financial_ledger" ("appointment_id");
CREATE INDEX "idx_financial_ledger_entry_type" ON "financial_ledger" ("entry_type");
CREATE INDEX "idx_financial_ledger_transaction_date" ON "financial_ledger" ("transaction_date");
CREATE INDEX "idx_financial_ledger_category" ON "financial_ledger" ("category");
CREATE INDEX "idx_financial_ledger_reference_id_reference_type" ON "financial_ledger" ("reference_id", "reference_type");
CREATE INDEX "idx_cash_sessions_branch_id" ON "cash_sessions" ("branch_id");
CREATE INDEX "idx_cash_sessions_status" ON "cash_sessions" ("status");
CREATE INDEX "idx_cash_sessions_opened_at" ON "cash_sessions" ("opened_at");
CREATE INDEX "idx_cash_sessions_opened_by_user_id" ON "cash_sessions" ("opened_by_user_id");
CREATE INDEX "idx_cash_movements_cash_session_id" ON "cash_movements" ("cash_session_id");
CREATE INDEX "idx_cash_movements_movement_type" ON "cash_movements" ("movement_type");
CREATE UNIQUE INDEX "uidx_exchange_rate_snapshots_base_currency_targe_7faea3393b" ON "exchange_rate_snapshots" ("base_currency", "target_currency", "effective_from");
CREATE INDEX "idx_exchange_rate_snapshots_base_currency_target_currency" ON "exchange_rate_snapshots" ("base_currency", "target_currency");
CREATE INDEX "idx_exchange_rate_snapshots_effective_from" ON "exchange_rate_snapshots" ("effective_from");
CREATE INDEX "idx_exchange_rate_snapshots_is_current" ON "exchange_rate_snapshots" ("is_current");
CREATE INDEX "idx_commissions_company_id" ON "commissions" ("company_id");
CREATE INDEX "idx_commissions_professional_id" ON "commissions" ("professional_id");
CREATE INDEX "idx_commissions_appointment_id" ON "commissions" ("appointment_id");
CREATE INDEX "idx_commissions_payment_id" ON "commissions" ("payment_id");
CREATE INDEX "idx_commissions_status" ON "commissions" ("status");
CREATE INDEX "idx_commissions_calculated_at" ON "commissions" ("calculated_at");
CREATE INDEX "idx_professional_payouts_company_id" ON "professional_payouts" ("company_id");
CREATE INDEX "idx_professional_payouts_professional_id" ON "professional_payouts" ("professional_id");
CREATE INDEX "idx_professional_payouts_status" ON "professional_payouts" ("status");
CREATE INDEX "idx_professional_payouts_payout_period_start_pay_b7514fd464" ON "professional_payouts" ("payout_period_start", "payout_period_end");
CREATE INDEX "idx_professional_payout_items_payout_id" ON "professional_payout_items" ("payout_id");
CREATE INDEX "idx_wallets_is_active" ON "wallets" ("is_active");
CREATE INDEX "idx_wallet_ledger_wallet_id" ON "wallet_ledger" ("wallet_id");
CREATE INDEX "idx_wallet_ledger_transaction_type" ON "wallet_ledger" ("transaction_type");
CREATE INDEX "idx_wallet_ledger_created_at" ON "wallet_ledger" ("created_at");
CREATE INDEX "idx_reviews_author_user_id" ON "reviews" ("author_user_id");
CREATE INDEX "idx_reviews_company_id" ON "reviews" ("company_id");
CREATE INDEX "idx_reviews_professional_id" ON "reviews" ("professional_id");
CREATE INDEX "idx_reviews_service_id" ON "reviews" ("service_id");
CREATE INDEX "idx_reviews_branch_id" ON "reviews" ("branch_id");
CREATE INDEX "idx_reviews_appointment_id" ON "reviews" ("appointment_id");
CREATE INDEX "idx_reviews_overall_rating" ON "reviews" ("overall_rating");
CREATE INDEX "idx_reviews_is_verified" ON "reviews" ("is_verified");
CREATE INDEX "idx_reviews_status" ON "reviews" ("status");
CREATE INDEX "idx_reviews_created_at" ON "reviews" ("created_at");
CREATE INDEX "idx_reviews_helpful_count" ON "reviews" ("helpful_count");
CREATE UNIQUE INDEX "uidx_review_ratings_review_id_dimension" ON "review_ratings" ("review_id", "dimension");
CREATE INDEX "idx_review_ratings_review_id" ON "review_ratings" ("review_id");
CREATE INDEX "idx_review_ratings_dimension" ON "review_ratings" ("dimension");
CREATE INDEX "idx_review_media_review_id" ON "review_media" ("review_id");
CREATE INDEX "idx_review_media_sort_order" ON "review_media" ("sort_order");
CREATE INDEX "idx_review_reports_review_id" ON "review_reports" ("review_id");
CREATE INDEX "idx_review_reports_reporter_user_id" ON "review_reports" ("reporter_user_id");
CREATE INDEX "idx_review_reports_status" ON "review_reports" ("status");
CREATE INDEX "idx_posts_author_user_id" ON "posts" ("author_user_id");
CREATE INDEX "idx_posts_author_role" ON "posts" ("author_role");
CREATE INDEX "idx_posts_company_id" ON "posts" ("company_id");
CREATE INDEX "idx_posts_professional_id" ON "posts" ("professional_id");
CREATE INDEX "idx_posts_branch_id" ON "posts" ("branch_id");
CREATE INDEX "idx_posts_status" ON "posts" ("status");
CREATE INDEX "idx_posts_published_at" ON "posts" ("published_at");
CREATE INDEX "idx_posts_created_at" ON "posts" ("created_at");
CREATE INDEX "idx_posts_like_count" ON "posts" ("like_count");
CREATE INDEX "idx_posts_view_count" ON "posts" ("view_count");
CREATE INDEX "idx_posts_slug" ON "posts" ("slug");
CREATE INDEX "idx_post_media_post_id" ON "post_media" ("post_id");
CREATE INDEX "idx_post_media_sort_order" ON "post_media" ("sort_order");
CREATE UNIQUE INDEX "uidx_post_services_post_id_service_id" ON "post_services" ("post_id", "service_id");
CREATE INDEX "idx_post_services_service_id" ON "post_services" ("service_id");
CREATE UNIQUE INDEX "uidx_likes_user_id_post_id" ON "likes" ("user_id", "post_id");
CREATE INDEX "idx_likes_post_id" ON "likes" ("post_id");
CREATE INDEX "idx_comments_user_id" ON "comments" ("user_id");
CREATE INDEX "idx_comments_post_id" ON "comments" ("post_id");
CREATE INDEX "idx_comments_parent_comment_id" ON "comments" ("parent_comment_id");
CREATE INDEX "idx_comments_status" ON "comments" ("status");
CREATE INDEX "idx_comments_created_at" ON "comments" ("created_at");
CREATE UNIQUE INDEX "uidx_follows_follower_user_id_target_type_target_id" ON "follows" ("follower_user_id", "target_type", "target_id");
CREATE INDEX "idx_follows_follower_user_id" ON "follows" ("follower_user_id");
CREATE INDEX "idx_follows_company_id" ON "follows" ("company_id");
CREATE INDEX "idx_follows_professional_id" ON "follows" ("professional_id");
CREATE INDEX "idx_follows_target_type_target_id" ON "follows" ("target_type", "target_id");
CREATE UNIQUE INDEX "uidx_favorites_user_id_favorite_type_entity_id" ON "favorites" ("user_id", "favorite_type", "entity_id");
CREATE INDEX "idx_favorites_user_id" ON "favorites" ("user_id");
CREATE INDEX "idx_favorites_favorite_type" ON "favorites" ("favorite_type");
CREATE INDEX "idx_favorites_company_id" ON "favorites" ("company_id");
CREATE INDEX "idx_favorites_service_id" ON "favorites" ("service_id");
CREATE INDEX "idx_favorites_professional_id" ON "favorites" ("professional_id");
CREATE INDEX "idx_favorites_post_id" ON "favorites" ("post_id");
CREATE INDEX "idx_collections_user_id" ON "collections" ("user_id");
CREATE INDEX "idx_collections_is_public" ON "collections" ("is_public");
CREATE UNIQUE INDEX "uidx_collection_items_collection_id_post_id" ON "collection_items" ("collection_id", "post_id");
CREATE INDEX "idx_collection_items_collection_id" ON "collection_items" ("collection_id");
CREATE INDEX "idx_media_consents_user_id" ON "media_consents" ("user_id");
CREATE INDEX "idx_media_consents_company_id" ON "media_consents" ("company_id");
CREATE INDEX "idx_media_consents_appointment_id" ON "media_consents" ("appointment_id");
CREATE INDEX "idx_conversations_company_id" ON "conversations" ("company_id");
CREATE INDEX "idx_conversations_appointment_id" ON "conversations" ("appointment_id");
CREATE INDEX "idx_conversations_last_message_at" ON "conversations" ("last_message_at");
CREATE INDEX "idx_conversations_type" ON "conversations" ("type");
CREATE UNIQUE INDEX "uidx_conversation_members_conversation_id_user_id" ON "conversation_members" ("conversation_id", "user_id");
CREATE INDEX "idx_conversation_members_conversation_id" ON "conversation_members" ("conversation_id");
CREATE INDEX "idx_conversation_members_user_id" ON "conversation_members" ("user_id");
CREATE INDEX "idx_conversation_members_customer_id" ON "conversation_members" ("customer_id");
CREATE INDEX "idx_messages_conversation_id" ON "messages" ("conversation_id");
CREATE INDEX "idx_messages_sender_user_id" ON "messages" ("sender_user_id");
CREATE INDEX "idx_messages_created_at" ON "messages" ("created_at");
CREATE INDEX "idx_messages_conversation_id_created_at" ON "messages" ("conversation_id", "created_at");
CREATE INDEX "idx_message_attachments_message_id" ON "message_attachments" ("message_id");
CREATE INDEX "idx_notifications_recipient_user_id" ON "notifications" ("recipient_user_id");
CREATE INDEX "idx_notifications_notification_type" ON "notifications" ("notification_type");
CREATE INDEX "idx_notifications_company_id" ON "notifications" ("company_id");
CREATE INDEX "idx_notifications_read_at" ON "notifications" ("read_at");
CREATE INDEX "idx_notifications_sent_at" ON "notifications" ("sent_at");
CREATE INDEX "idx_notifications_created_at" ON "notifications" ("created_at");
CREATE INDEX "idx_notifications_recipient_user_id_read_at" ON "notifications" ("recipient_user_id", "read_at");
CREATE INDEX "idx_notifications_recipient_user_id_created_at" ON "notifications" ("recipient_user_id", "created_at");
CREATE INDEX "idx_geofence_candidates_user_id" ON "geofence_candidates" ("user_id");
CREATE INDEX "idx_geofence_candidates_company_id" ON "geofence_candidates" ("company_id");
CREATE INDEX "idx_geofence_candidates_professional_id" ON "geofence_candidates" ("professional_id");
CREATE INDEX "idx_geofence_candidates_priority_score" ON "geofence_candidates" ("priority_score");
CREATE INDEX "idx_geofence_candidates_expiration_at" ON "geofence_candidates" ("expiration_at");
CREATE INDEX "idx_recommendation_events_user_id" ON "recommendation_events" ("user_id");
CREATE INDEX "idx_recommendation_events_recommendation_type" ON "recommendation_events" ("recommendation_type");
CREATE INDEX "idx_recommendation_events_entity_type_entity_id" ON "recommendation_events" ("entity_type", "entity_id");
CREATE INDEX "idx_recommendation_events_created_at" ON "recommendation_events" ("created_at");
CREATE UNIQUE INDEX "uidx_notification_cooldowns_user_id_cooldown_key_scope_id" ON "notification_cooldowns" ("user_id", "cooldown_key", "scope_id");
CREATE INDEX "idx_notification_cooldowns_user_id_cooldown_key_scope_id" ON "notification_cooldowns" ("user_id", "cooldown_key", "scope_id");
CREATE INDEX "idx_notification_cooldowns_cooldown_until" ON "notification_cooldowns" ("cooldown_until");
CREATE INDEX "idx_business_nearby_campaigns_company_id" ON "business_nearby_campaigns" ("company_id");
CREATE INDEX "idx_business_nearby_campaigns_is_active" ON "business_nearby_campaigns" ("is_active");
CREATE INDEX "idx_business_nearby_campaigns_starts_at_ends_at" ON "business_nearby_campaigns" ("starts_at", "ends_at");
CREATE INDEX "idx_promotions_company_id" ON "promotions" ("company_id");
CREATE INDEX "idx_promotions_branch_id" ON "promotions" ("branch_id");
CREATE INDEX "idx_promotions_code" ON "promotions" ("code");
CREATE INDEX "idx_promotions_is_active" ON "promotions" ("is_active");
CREATE INDEX "idx_promotions_starts_at_ends_at" ON "promotions" ("starts_at", "ends_at");
CREATE INDEX "idx_promotion_rules_promotion_id" ON "promotion_rules" ("promotion_id");
CREATE INDEX "idx_coupons_company_id" ON "coupons" ("company_id");
CREATE INDEX "idx_coupons_code" ON "coupons" ("code");
CREATE INDEX "idx_coupons_is_active" ON "coupons" ("is_active");
CREATE INDEX "idx_coupons_valid_from_valid_until" ON "coupons" ("valid_from", "valid_until");
CREATE INDEX "idx_coupon_usage_coupon_id" ON "coupon_usage" ("coupon_id");
CREATE INDEX "idx_coupon_usage_user_id" ON "coupon_usage" ("user_id");
CREATE INDEX "idx_coupon_usage_company_id" ON "coupon_usage" ("company_id");
CREATE INDEX "idx_packages_company_id" ON "packages" ("company_id");
CREATE INDEX "idx_packages_is_active" ON "packages" ("is_active");
CREATE INDEX "idx_package_purchases_package_id" ON "package_purchases" ("package_id");
CREATE INDEX "idx_package_purchases_customer_id" ON "package_purchases" ("customer_id");
CREATE INDEX "idx_package_purchases_status" ON "package_purchases" ("status");
CREATE INDEX "idx_package_usage_package_purchase_id" ON "package_usage" ("package_purchase_id");
CREATE INDEX "idx_package_usage_appointment_id" ON "package_usage" ("appointment_id");
CREATE INDEX "idx_memberships_company_id" ON "memberships" ("company_id");
CREATE INDEX "idx_memberships_is_active" ON "memberships" ("is_active");
CREATE INDEX "idx_membership_subscriptions_membership_id" ON "membership_subscriptions" ("membership_id");
CREATE INDEX "idx_membership_subscriptions_customer_id" ON "membership_subscriptions" ("customer_id");
CREATE INDEX "idx_membership_subscriptions_status" ON "membership_subscriptions" ("status");
CREATE INDEX "idx_gift_cards_company_id" ON "gift_cards" ("company_id");
CREATE INDEX "idx_gift_cards_code" ON "gift_cards" ("code");
CREATE INDEX "idx_gift_cards_is_active" ON "gift_cards" ("is_active");
CREATE INDEX "idx_gift_cards_expires_at" ON "gift_cards" ("expires_at");
CREATE INDEX "idx_gift_card_ledger_gift_card_id" ON "gift_card_ledger" ("gift_card_id");
CREATE INDEX "idx_gift_card_ledger_transaction_type" ON "gift_card_ledger" ("transaction_type");
CREATE INDEX "idx_loyalty_accounts_tier" ON "loyalty_accounts" ("tier");
CREATE INDEX "idx_loyalty_ledger_loyalty_account_id" ON "loyalty_ledger" ("loyalty_account_id");
CREATE INDEX "idx_loyalty_ledger_transaction_type" ON "loyalty_ledger" ("transaction_type");
CREATE INDEX "idx_loyalty_ledger_expires_at" ON "loyalty_ledger" ("expires_at");
CREATE INDEX "idx_referrals_referrer_user_id" ON "referrals" ("referrer_user_id");
CREATE INDEX "idx_referrals_status" ON "referrals" ("status");
CREATE INDEX "idx_referrals_referral_code_used" ON "referrals" ("referral_code_used");
CREATE INDEX "idx_products_company_id" ON "products" ("company_id");
CREATE INDEX "idx_products_sku" ON "products" ("sku");
CREATE INDEX "idx_products_barcode" ON "products" ("barcode");
CREATE INDEX "idx_products_is_active" ON "products" ("is_active");
CREATE INDEX "idx_products_name" ON "products" ("name");
CREATE UNIQUE INDEX "uidx_inventory_items_product_id_branch_id_batch_number" ON "inventory_items" ("product_id", "branch_id", "batch_number");
CREATE INDEX "idx_inventory_items_product_id" ON "inventory_items" ("product_id");
CREATE INDEX "idx_inventory_items_branch_id" ON "inventory_items" ("branch_id");
CREATE INDEX "idx_inventory_items_expires_at" ON "inventory_items" ("expires_at");
CREATE INDEX "idx_inventory_movements_product_id" ON "inventory_movements" ("product_id");
CREATE INDEX "idx_inventory_movements_inventory_id" ON "inventory_movements" ("inventory_id");
CREATE INDEX "idx_inventory_movements_movement_type" ON "inventory_movements" ("movement_type");
CREATE INDEX "idx_inventory_movements_created_at" ON "inventory_movements" ("created_at");
CREATE INDEX "idx_consent_forms_company_id" ON "consent_forms" ("company_id");
CREATE INDEX "idx_consent_forms_is_active" ON "consent_forms" ("is_active");
CREATE INDEX "idx_consent_form_responses_consent_form_id" ON "consent_form_responses" ("consent_form_id");
CREATE INDEX "idx_consent_form_responses_customer_id" ON "consent_form_responses" ("customer_id");
CREATE INDEX "idx_consent_form_responses_appointment_id" ON "consent_form_responses" ("appointment_id");
CREATE INDEX "idx_subscriptions_company_id" ON "subscriptions" ("company_id");
CREATE INDEX "idx_subscriptions_plan_id" ON "subscriptions" ("plan_id");
CREATE INDEX "idx_subscriptions_status" ON "subscriptions" ("status");
CREATE INDEX "idx_subscription_plans_code" ON "subscription_plans" ("code");
CREATE INDEX "idx_subscription_plans_is_active" ON "subscription_plans" ("is_active");
CREATE INDEX "idx_subscription_features_plan_id" ON "subscription_features" ("plan_id");
CREATE INDEX "idx_subscription_features_feature_key" ON "subscription_features" ("feature_key");
CREATE INDEX "idx_commission_rules_company_id" ON "commission_rules" ("company_id");
CREATE INDEX "idx_commission_rules_professional_id" ON "commission_rules" ("professional_id");
CREATE INDEX "idx_commission_rules_is_active" ON "commission_rules" ("is_active");
CREATE INDEX "idx_support_tickets_user_id" ON "support_tickets" ("user_id");
CREATE INDEX "idx_support_tickets_company_id" ON "support_tickets" ("company_id");
CREATE INDEX "idx_support_tickets_status" ON "support_tickets" ("status");
CREATE INDEX "idx_support_tickets_priority" ON "support_tickets" ("priority");
CREATE INDEX "idx_support_tickets_created_at" ON "support_tickets" ("created_at");
CREATE INDEX "idx_support_messages_ticket_id" ON "support_messages" ("ticket_id");
CREATE INDEX "idx_support_messages_created_at" ON "support_messages" ("created_at");
CREATE INDEX "idx_disputes_company_id" ON "disputes" ("company_id");
CREATE INDEX "idx_disputes_reporter_user_id" ON "disputes" ("reporter_user_id");
CREATE INDEX "idx_disputes_status" ON "disputes" ("status");
CREATE INDEX "idx_disputes_disputed_type_disputed_id" ON "disputes" ("disputed_type", "disputed_id");
CREATE INDEX "idx_moderation_reports_target_type_target_id" ON "moderation_reports" ("target_type", "target_id");
CREATE INDEX "idx_moderation_reports_reporter_user_id" ON "moderation_reports" ("reporter_user_id");
CREATE INDEX "idx_moderation_reports_status" ON "moderation_reports" ("status");
CREATE INDEX "idx_moderation_reports_created_at" ON "moderation_reports" ("created_at");
CREATE INDEX "idx_audit_logs_actor_user_id" ON "audit_logs" ("actor_user_id");
CREATE INDEX "idx_audit_logs_action" ON "audit_logs" ("action");
CREATE INDEX "idx_audit_logs_entity_type_entity_id" ON "audit_logs" ("entity_type", "entity_id");
CREATE INDEX "idx_audit_logs_company_id" ON "audit_logs" ("company_id");
CREATE INDEX "idx_audit_logs_branch_id" ON "audit_logs" ("branch_id");
CREATE INDEX "idx_audit_logs_created_at" ON "audit_logs" ("created_at");
CREATE INDEX "idx_analytics_events_event_name" ON "analytics_events" ("event_name");
CREATE INDEX "idx_analytics_events_event_category" ON "analytics_events" ("event_category");
CREATE INDEX "idx_analytics_events_user_id" ON "analytics_events" ("user_id");
CREATE INDEX "idx_analytics_events_company_id" ON "analytics_events" ("company_id");
CREATE INDEX "idx_analytics_events_created_at" ON "analytics_events" ("created_at");
CREATE INDEX "idx_analytics_events_event_name_created_at" ON "analytics_events" ("event_name", "created_at");
CREATE UNIQUE INDEX "uidx_daily_analytics_snapshots_snapshot_date_com_e3902f621f" ON "daily_analytics_snapshots" ("snapshot_date", "company_id", "branch_id", "professional_id", "metric_key");
CREATE INDEX "idx_daily_analytics_snapshots_snapshot_date" ON "daily_analytics_snapshots" ("snapshot_date");
CREATE INDEX "idx_daily_analytics_snapshots_company_id" ON "daily_analytics_snapshots" ("company_id");
CREATE INDEX "idx_daily_analytics_snapshots_branch_id" ON "daily_analytics_snapshots" ("branch_id");
CREATE INDEX "idx_daily_analytics_snapshots_professional_id" ON "daily_analytics_snapshots" ("professional_id");
CREATE INDEX "idx_daily_analytics_snapshots_metric_key" ON "daily_analytics_snapshots" ("metric_key");
CREATE UNIQUE INDEX "uidx_media_storage_bucket_storage_key" ON "media" ("storage_bucket", "storage_key");
CREATE INDEX "idx_media_uploader_user_id" ON "media" ("uploader_user_id");
CREATE INDEX "idx_media_company_id" ON "media" ("company_id");
CREATE INDEX "idx_media_branch_id" ON "media" ("branch_id");
CREATE INDEX "idx_media_mime_category" ON "media" ("mime_category");
CREATE INDEX "idx_media_storage_bucket_storage_key" ON "media" ("storage_bucket", "storage_key");
CREATE INDEX "idx_media_status" ON "media" ("status");
CREATE INDEX "idx_media_created_at" ON "media" ("created_at");
CREATE INDEX "idx_media_is_public" ON "media" ("is_public");
CREATE INDEX "idx_password_reset_tokens_user_id" ON "password_reset_tokens" ("user_id");
CREATE INDEX "idx_password_reset_tokens_expires_at" ON "password_reset_tokens" ("expires_at");
CREATE INDEX "idx_email_verification_tokens_user_id" ON "email_verification_tokens" ("user_id");
CREATE INDEX "idx_email_verification_tokens_expires_at" ON "email_verification_tokens" ("expires_at");
CREATE INDEX "idx_phone_otp_tokens_user_id" ON "phone_otp_tokens" ("user_id");
CREATE INDEX "idx_phone_otp_tokens_phone" ON "phone_otp_tokens" ("phone");
CREATE INDEX "idx_phone_otp_tokens_purpose" ON "phone_otp_tokens" ("purpose");
CREATE INDEX "idx_phone_otp_tokens_expires_at" ON "phone_otp_tokens" ("expires_at");
CREATE UNIQUE INDEX "uidx_resource_media_resource_id_media_id_sort_order" ON "resource_media" ("resource_id", "media_id", "sort_order");
CREATE INDEX "idx_resource_media_resource_id" ON "resource_media" ("resource_id");
CREATE INDEX "idx_resource_media_media_id" ON "resource_media" ("media_id");
CREATE UNIQUE INDEX "uidx_customer_preferred_resources_customer_id_resource_id" ON "customer_preferred_resources" ("customer_id", "resource_id");
CREATE INDEX "idx_customer_preferred_resources_customer_id" ON "customer_preferred_resources" ("customer_id");
CREATE INDEX "idx_customer_preferred_resources_resource_id" ON "customer_preferred_resources" ("resource_id");
CREATE INDEX "idx_user_strikes_user_id" ON "user_strikes" ("user_id");
CREATE INDEX "idx_user_strikes_is_active" ON "user_strikes" ("is_active");
CREATE INDEX "idx_user_strikes_severity" ON "user_strikes" ("severity");
CREATE INDEX "idx_user_strikes_expires_at" ON "user_strikes" ("expires_at");
CREATE INDEX "idx_moderation_appeals_target_type_target_id" ON "moderation_appeals" ("target_type", "target_id");
CREATE INDEX "idx_moderation_appeals_reporter_user_id" ON "moderation_appeals" ("reporter_user_id");
CREATE INDEX "idx_moderation_appeals_status" ON "moderation_appeals" ("status");
CREATE INDEX "idx_moderation_appeals_created_at" ON "moderation_appeals" ("created_at");
CREATE INDEX "idx_country_taxes_country_id" ON "country_taxes" ("country_id");
CREATE INDEX "idx_country_taxes_tax_type" ON "country_taxes" ("tax_type");
CREATE INDEX "idx_country_taxes_is_default" ON "country_taxes" ("is_default");
CREATE INDEX "idx_bank_accounts_owner_type_owner_id" ON "bank_accounts" ("owner_type", "owner_id");
CREATE INDEX "idx_bank_accounts_currency_code" ON "bank_accounts" ("currency_code");
CREATE INDEX "idx_bank_accounts_is_verified" ON "bank_accounts" ("is_verified");
CREATE INDEX "idx_bank_accounts_payout_enabled" ON "bank_accounts" ("payout_enabled");

-- Database-level overlap guards. Application SERIALIZABLE transactions remain in place as a second layer.

CREATE OR REPLACE FUNCTION lookiva_guard_professional_overlap() RETURNS trigger AS $$
DECLARE v_start TIMESTAMP(3); v_end TIMESTAMP(3); v_status TEXT;
BEGIN
  SELECT starts_at, ends_at, status INTO v_start, v_end, v_status FROM appointments WHERE id = NEW.appointment_id;
  IF v_status IN ('pending','confirmed','checked_in','in_progress') AND v_start IS NOT NULL AND v_end IS NOT NULL AND EXISTS (
    SELECT 1 FROM appointment_participants ap JOIN appointments a ON a.id=ap.appointment_id
    WHERE ap.professional_id=NEW.professional_id AND ap.id<>NEW.id
      AND a.status IN ('pending','confirmed','checked_in','in_progress')
      AND a.starts_at < v_end AND a.ends_at > v_start
  ) THEN RAISE EXCEPTION 'Professional booking overlap'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_guard_professional_overlap BEFORE INSERT OR UPDATE ON appointment_participants
FOR EACH ROW EXECUTE FUNCTION lookiva_guard_professional_overlap();

CREATE OR REPLACE FUNCTION lookiva_guard_resource_overlap() RETURNS trigger AS $$
DECLARE v_start TIMESTAMP(3); v_end TIMESTAMP(3); v_status TEXT;
BEGIN
  SELECT COALESCE(NEW.starts_at,starts_at), COALESCE(NEW.ends_at,ends_at), status INTO v_start, v_end, v_status FROM appointments WHERE id = NEW.appointment_id;
  IF v_status IN ('pending','confirmed','checked_in','in_progress') AND v_start IS NOT NULL AND v_end IS NOT NULL AND EXISTS (
    SELECT 1 FROM appointment_resources ar JOIN appointments a ON a.id=ar.appointment_id
    WHERE ar.resource_id=NEW.resource_id AND ar.id<>NEW.id
      AND a.status IN ('pending','confirmed','checked_in','in_progress')
      AND COALESCE(ar.starts_at,a.starts_at) < v_end AND COALESCE(ar.ends_at,a.ends_at) > v_start
  ) THEN RAISE EXCEPTION 'Resource booking overlap'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_guard_resource_overlap BEFORE INSERT OR UPDATE ON appointment_resources
FOR EACH ROW EXECUTE FUNCTION lookiva_guard_resource_overlap();

CREATE OR REPLACE FUNCTION lookiva_guard_appointment_reschedule() RETURNS trigger AS $$
BEGIN
  IF NEW.status IN ('pending','confirmed','checked_in','in_progress') AND (NEW.starts_at IS DISTINCT FROM OLD.starts_at OR NEW.ends_at IS DISTINCT FROM OLD.ends_at OR NEW.status IS DISTINCT FROM OLD.status) THEN
    IF EXISTS (
      SELECT 1 FROM appointment_participants mine JOIN appointment_participants other ON other.professional_id=mine.professional_id AND other.appointment_id<>NEW.id
      JOIN appointments a ON a.id=other.appointment_id
      WHERE mine.appointment_id=NEW.id AND a.status IN ('pending','confirmed','checked_in','in_progress') AND a.starts_at<NEW.ends_at AND a.ends_at>NEW.starts_at
    ) THEN RAISE EXCEPTION 'Professional booking overlap after reschedule'; END IF;
    IF EXISTS (
      SELECT 1 FROM appointment_resources mine JOIN appointment_resources other ON other.resource_id=mine.resource_id AND other.appointment_id<>NEW.id
      JOIN appointments a ON a.id=other.appointment_id
      WHERE mine.appointment_id=NEW.id AND a.status IN ('pending','confirmed','checked_in','in_progress')
        AND COALESCE(other.starts_at,a.starts_at)<NEW.ends_at AND COALESCE(other.ends_at,a.ends_at)>NEW.starts_at
    ) THEN RAISE EXCEPTION 'Resource booking overlap after reschedule'; END IF;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_guard_appointment_reschedule BEFORE UPDATE OF starts_at, ends_at, status ON appointments
FOR EACH ROW EXECUTE FUNCTION lookiva_guard_appointment_reschedule();

