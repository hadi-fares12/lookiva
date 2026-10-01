-- LOOKIVA Initial Migration - CHUNK 1: Extensions + Users + RBAC
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- ==================== USERS & AUTH ====================
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255),
    "phone" VARCHAR(32),
    "username" VARCHAR(64),
    "password_hash" VARCHAR(255) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    "email_verified_at" TIMESTAMP(3),
    "phone_verified_at" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "last_login_ip" VARCHAR(64),
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE INDEX "users_status_idx" ON "users"("status");
CREATE INDEX "users_email_status_idx" ON "users"("email", "status");
CREATE INDEX "users_phone_status_idx" ON "users"("phone", "status");
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

CREATE TABLE "user_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "first_name" VARCHAR(128),
    "last_name" VARCHAR(128),
    "full_name" VARCHAR(256),
    "avatar_media_id" UUID,
    "gender" VARCHAR(16),
    "birth_date" DATE,
    "nationality" VARCHAR(64),
    "bio" TEXT,
    "timezone" VARCHAR(64),
    "language_code" VARCHAR(8) DEFAULT 'en',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "user_profiles"("user_id");
CREATE INDEX "user_profiles_full_name_idx" ON "user_profiles"("full_name");

CREATE TABLE "user_preferences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "theme_mode" VARCHAR(32) DEFAULT 'system',
    "language_code" VARCHAR(8) DEFAULT 'en',
    "currency_code" VARCHAR(8) DEFAULT 'USD',
    "measurement_unit" VARCHAR(16) DEFAULT 'metric',
    "distance_unit" VARCHAR(16) DEFAULT 'km',
    "notifications_enabled" BOOLEAN DEFAULT true,
    "marketing_enabled" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_preferences_user_id_key" ON "user_preferences"("user_id");

CREATE TABLE "sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "refresh_token_hash" VARCHAR(255) NOT NULL,
    "family_id" UUID NOT NULL,
    "user_agent" TEXT,
    "ip_address" VARCHAR(64),
    "device_type" VARCHAR(32),
    "device_os" VARCHAR(64),
    "device_browser" VARCHAR(64),
    "location" JSONB,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "revoke_reason" VARCHAR(64),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");
CREATE INDEX "sessions_family_id_idx" ON "sessions"("family_id");
CREATE INDEX "sessions_refresh_token_hash_idx" ON "sessions"("refresh_token_hash");
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");
CREATE INDEX "sessions_user_active_idx" ON "sessions"("user_id", "revoked_at", "expires_at");

-- ==================== RBAC ====================
CREATE TABLE "roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" VARCHAR(64) NOT NULL,
    "name" JSONB NOT NULL,
    "description" JSONB,
    "scope_type" VARCHAR(32) NOT NULL DEFAULT 'company',
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_assignable" BOOLEAN NOT NULL DEFAULT true,
    "weight" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "roles_key_key" ON "roles"("key");
CREATE INDEX "roles_scope_type_idx" ON "roles"("scope_type");

CREATE TABLE "permissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" VARCHAR(128) NOT NULL,
    "name" JSONB NOT NULL,
    "description" JSONB,
    "group" VARCHAR(64),
    "module" VARCHAR(64),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "permissions_key_key" ON "permissions"("key");
CREATE INDEX "permissions_group_idx" ON "permissions"("group");
CREATE INDEX "permissions_module_idx" ON "permissions"("module");

CREATE TABLE "role_permissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "role_permissions_role_id_permission_id_key" ON "role_permissions"("role_id", "permission_id");
CREATE INDEX "role_permissions_permission_id_idx" ON "role_permissions"("permission_id");

CREATE TABLE "user_role_scopes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "scope_type" VARCHAR(32) NOT NULL,
    "scope_id" VARCHAR(64),
    "company_id" UUID,
    "branch_id" UUID,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" UUID,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "user_role_scopes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "user_role_scopes_user_id_idx" ON "user_role_scopes"("user_id");
CREATE INDEX "user_role_scopes_role_id_idx" ON "user_role_scopes"("role_id");
CREATE INDEX "user_role_scopes_scope_idx" ON "user_role_scopes"("scope_type", "scope_id");
CREATE INDEX "user_role_scopes_company_id_idx" ON "user_role_scopes"("company_id");
CREATE INDEX "user_role_scopes_branch_id_idx" ON "user_role_scopes"("branch_id");
CREATE UNIQUE INDEX "user_role_scopes_user_role_scope_unique" ON "user_role_scopes"("user_id", "role_id", "scope_type", "scope_id");
