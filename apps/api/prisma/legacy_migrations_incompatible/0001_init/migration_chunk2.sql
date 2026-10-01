-- LOOKIVA Initial Migration - CHUNK 2: GEO + Platform
-- NOTE: This file is part 2 of 6. Content below will be concatenated conceptually.
-- The actual migration.sql file is a single file. For the real migration,
-- the correct approach is to have all DDL in one file. We'll create one final file after.

-- ==================== GEO ====================
CREATE TABLE "countries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "iso_code" VARCHAR(8) NOT NULL,
    "iso3_code" VARCHAR(8),
    "name_en" VARCHAR(128) NOT NULL,
    "name_ar" VARCHAR(128),
    "name_fr" VARCHAR(128),
    "dial_code" VARCHAR(16),
    "currency_code" VARCHAR(8),
    "language_code" VARCHAR(8),
    "flag_url" VARCHAR(512),
    "timezone" VARCHAR(64),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER DEFAULT 0,
    "meta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "countries_iso_code_key" ON "countries"("iso_code");
CREATE INDEX "countries_is_active_idx" ON "countries"("is_active");
CREATE INDEX "countries_name_en_idx" ON "countries"("name_en");

CREATE TABLE "regions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "country_id" UUID NOT NULL,
    "iso_code" VARCHAR(32),
    "name_en" VARCHAR(128) NOT NULL,
    "name_ar" VARCHAR(128),
    "name_fr" VARCHAR(128),
    "sort_order" INTEGER DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "meta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "regions_country_id_idx" ON "regions"("country_id");
CREATE INDEX "regions_country_active_idx" ON "regions"("country_id", "is_active");
CREATE INDEX "regions_name_en_idx" ON "regions"("name_en");

CREATE TABLE "districts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "region_id" UUID NOT NULL,
    "name_en" VARCHAR(128) NOT NULL,
    "name_ar" VARCHAR(128),
    "name_fr" VARCHAR(128),
    "sort_order" INTEGER DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "meta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "districts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "districts_region_id_idx" ON "districts"("region_id");
CREATE INDEX "districts_is_active_idx" ON "districts"("is_active");

CREATE TABLE "cities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "district_id" UUID NOT NULL,
    "name_en" VARCHAR(128) NOT NULL,
    "name_ar" VARCHAR(128),
    "name_fr" VARCHAR(128),
    "latitude" DECIMAL(10, 7),
    "longitude" DECIMAL(10, 7),
    "sort_order" INTEGER DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "meta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "cities_district_id_idx" ON "cities"("district_id");
CREATE INDEX "cities_name_en_idx" ON "cities"("name_en");
CREATE INDEX "cities_is_active_idx" ON "cities"("is_active");

CREATE TABLE "areas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "city_id" UUID NOT NULL,
    "name_en" VARCHAR(128) NOT NULL,
    "name_ar" VARCHAR(128),
    "name_fr" VARCHAR(128),
    "latitude" DECIMAL(10, 7),
    "longitude" DECIMAL(10, 7),
    "postal_code" VARCHAR(32),
    "sort_order" INTEGER DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "meta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "areas_city_id_idx" ON "areas"("city_id");
CREATE INDEX "areas_name_en_idx" ON "areas"("name_en");
CREATE INDEX "areas_is_active_idx" ON "areas"("is_active");

-- ==================== PLATFORM ====================
CREATE TABLE "languages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(8) NOT NULL,
    "name_en" VARCHAR(64) NOT NULL,
    "name_native" VARCHAR(64),
    "direction" VARCHAR(8) DEFAULT 'ltr',
    "flag_url" VARCHAR(512),
    "is_rtl" BOOLEAN NOT NULL DEFAULT false,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "languages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "languages_code_key" ON "languages"("code");

CREATE TABLE "currencies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(8) NOT NULL,
    "name_en" VARCHAR(64) NOT NULL,
    "symbol" VARCHAR(8),
    "decimal_places" INTEGER NOT NULL DEFAULT 2,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "exchange_rate_to_usd" DECIMAL(18, 6),
    "sort_order" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "currencies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "currencies_code_key" ON "currencies"("code");

CREATE TABLE "platform_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" VARCHAR(128) NOT NULL,
    "value" JSONB,
    "value_type" VARCHAR(32) NOT NULL DEFAULT 'string',
    "description" TEXT,
    "group" VARCHAR(64),
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_settings_key_key" ON "platform_settings"("key");
CREATE INDEX "platform_settings_group_idx" ON "platform_settings"("group");
CREATE INDEX "platform_settings_is_public_idx" ON "platform_settings"("is_public");

CREATE TABLE "theme_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "mode" VARCHAR(32) NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "palette_data" JSONB NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "theme_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "theme_settings_mode_key" ON "theme_settings"("mode");

CREATE TABLE "feature_flags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" VARCHAR(128) NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "description" TEXT,
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "rollout_percentage" INTEGER NOT NULL DEFAULT 0,
    "allowed_user_ids" UUID[],
    "allowed_company_ids" UUID[],
    "environment" VARCHAR(32),
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "feature_flags_key_key" ON "feature_flags"("key");
CREATE INDEX "feature_flags_is_enabled_idx" ON "feature_flags"("is_enabled");

CREATE TABLE "remote_config" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "platform" VARCHAR(32) NOT NULL,
    "version_min" VARCHAR(32) NOT NULL,
    "version_max" VARCHAR(32),
    "config_data" JSONB NOT NULL,
    "force_update" BOOLEAN NOT NULL DEFAULT false,
    "maintenance_mode" BOOLEAN NOT NULL DEFAULT false,
    "maintenance_message" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "remote_config_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "remote_config_platform_idx" ON "remote_config"("platform");
CREATE INDEX "remote_config_is_active_idx" ON "remote_config"("is_active");
