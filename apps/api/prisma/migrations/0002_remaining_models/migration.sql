-- LOOKIVA Phase 2-11 migration 0002:
-- * Adds §203-missing models (resource_media, customer_preferred_resources)
-- * Adds moderation support tables (user_strikes, moderation_appeals)
-- * Adds finance/taxes support (country_taxes, bank_accounts)
-- * Adds §204-based partial indexes and composite indexes
-- * Adds the EXCLUDE USING gist appointment overlap guard required by §211 AC-R2
--
-- Notes:
--   - Purely additive; no drops of existing tables/columns
--   - btree_gist required for EXCLUDE constraints with int4/text + tsrange

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================================
-- resource_media (§203)
-- ============================================================
CREATE TABLE IF NOT EXISTS "resource_media" (
    "id"            TEXT NOT NULL PRIMARY KEY,
    "resource_id"   TEXT NOT NULL REFERENCES "resources"("id") ON DELETE CASCADE,
    "media_id"      TEXT NOT NULL REFERENCES "media"("id") ON DELETE CASCADE,
    "sort_order"    INTEGER NOT NULL DEFAULT 0,
    "caption"       TEXT,
    "created_at"    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "resource_media_unique_sort" UNIQUE ("resource_id", "media_id", "sort_order")
);
CREATE INDEX IF NOT EXISTS "_resource_media_resource_idx" ON "resource_media"("resource_id");
CREATE INDEX IF NOT EXISTS "_resource_media_media_idx"    ON "resource_media"("media_id");

-- ============================================================
-- customer_preferred_resources (§203)
-- ============================================================
CREATE TABLE IF NOT EXISTS "customer_preferred_resources" (
    "id"           TEXT NOT NULL PRIMARY KEY,
    "customer_id"  TEXT NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
    "resource_id"  TEXT NOT NULL REFERENCES "resources"("id") ON DELETE CASCADE,
    "rank_order"   INTEGER NOT NULL DEFAULT 0,
    "note"         TEXT,
    "created_at"   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "customer_preferred_resources_unique" UNIQUE ("customer_id", "resource_id")
);
CREATE INDEX IF NOT EXISTS "_cust_pref_res_customer_idx" ON "customer_preferred_resources"("customer_id");
CREATE INDEX IF NOT EXISTS "_cust_pref_res_resource_idx" ON "customer_preferred_resources"("resource_id");

-- ============================================================
-- user_strikes (moderation support)
-- ============================================================
CREATE TABLE IF NOT EXISTS "user_strikes" (
    "id"             TEXT NOT NULL PRIMARY KEY,
    "user_id"        TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "severity"       TEXT NOT NULL DEFAULT 'warning',
    "reason_type"    TEXT NOT NULL,
    "reason_text"    TEXT,
    "report_id"      TEXT,
    "created_by_id"  TEXT,
    "expires_at"     TIMESTAMPTZ,
    "is_active"      BOOLEAN NOT NULL DEFAULT true,
    "created_at"     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "_user_strikes_user_idx"    ON "user_strikes"("user_id");
CREATE INDEX IF NOT EXISTS "_user_strikes_active_idx"  ON "user_strikes"("is_active");
CREATE INDEX IF NOT EXISTS "_user_strikes_severity_idx" ON "user_strikes"("severity");
CREATE INDEX IF NOT EXISTS "_user_strikes_expires_idx"  ON "user_strikes"("expires_at") WHERE "expires_at" IS NOT NULL;

-- ============================================================
-- moderation_appeals (moderation support)
-- ============================================================
CREATE TABLE IF NOT EXISTS "moderation_appeals" (
    "id"                  TEXT NOT NULL PRIMARY KEY,
    "target_type"         TEXT NOT NULL,
    "target_id"           TEXT NOT NULL,
    "reporter_user_id"    TEXT NOT NULL,
    "strike_id"           TEXT,
    "reason_reversal"     TEXT NOT NULL,
    "evidence_media_ids"  TEXT[],
    "status"              TEXT NOT NULL DEFAULT 'pending',
    "reviewed_by_id"      TEXT,
    "reviewed_at"         TIMESTAMPTZ,
    "resolution"          TEXT,
    "resolution_notes"    TEXT,
    "created_at"          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "_mod_appeals_target_idx"   ON "moderation_appeals"("target_type", "target_id");
CREATE INDEX IF NOT EXISTS "_mod_appeals_reporter_idx" ON "moderation_appeals"("reporter_user_id");
CREATE INDEX IF NOT EXISTS "_mod_appeals_status_idx"   ON "moderation_appeals"("status");
CREATE INDEX IF NOT EXISTS "_mod_appeals_created_idx"  ON "moderation_appeals"("created_at");

-- ============================================================
-- country_taxes (finance / taxes support)
-- ============================================================
CREATE TABLE IF NOT EXISTS "country_taxes" (
    "id"                  TEXT NOT NULL PRIMARY KEY,
    "country_id"          TEXT NOT NULL REFERENCES "countries"("id") ON DELETE CASCADE,
    "name"                TEXT NOT NULL,
    "tax_code"            TEXT,
    "tax_type"            TEXT NOT NULL DEFAULT 'vat',
    "rate_percent"        DOUBLE PRECISION NOT NULL,
    "applies_to_services" BOOLEAN NOT NULL DEFAULT true,
    "applies_to_products" BOOLEAN NOT NULL DEFAULT true,
    "effective_from"      TIMESTAMPTZ,
    "effective_to"        TIMESTAMPTZ,
    "is_default"          BOOLEAN NOT NULL DEFAULT false,
    "created_at"          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "_country_taxes_country_idx" ON "country_taxes"("country_id");
CREATE INDEX IF NOT EXISTS "_country_taxes_type_idx"    ON "country_taxes"("tax_type");
CREATE INDEX IF NOT EXISTS "_country_taxes_default_idx" ON "country_taxes"("is_default") WHERE "is_default" = true;

-- ============================================================
-- bank_accounts (finance / payouts support)
-- ============================================================
CREATE TABLE IF NOT EXISTS "bank_accounts" (
    "id"                   TEXT NOT NULL PRIMARY KEY,
    "owner_type"           TEXT NOT NULL,
    "owner_id"             TEXT NOT NULL,
    "bank_name"            TEXT,
    "account_number"       TEXT,
    "account_holder"       TEXT,
    "routing_number"       TEXT,
    "iban"                 TEXT,
    "swift_bic"            TEXT,
    "currency_code"        TEXT NOT NULL,
    "is_verified"          BOOLEAN NOT NULL DEFAULT false,
    "verification_doc_id"  TEXT,
    "payout_enabled"       BOOLEAN NOT NULL DEFAULT true,
    "created_at"           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "_bank_accounts_owner_idx"     ON "bank_accounts"("owner_type", "owner_id");
CREATE INDEX IF NOT EXISTS "_bank_accounts_currency_idx"  ON "bank_accounts"("currency_code");
CREATE INDEX IF NOT EXISTS "_bank_accounts_verified_idx"  ON "bank_accounts"("is_verified") WHERE "is_verified" = true;
CREATE INDEX IF NOT EXISTS "_bank_accounts_payout_idx"    ON "bank_accounts"("payout_enabled") WHERE "payout_enabled" = true;

-- ============================================================
-- §204 Extra composite + partial indexes
-- ============================================================

-- email / phone already have unique indexes; add role composite scope lookups
CREATE INDEX IF NOT EXISTS "_user_role_scopes_company_role" ON "user_role_scopes"("scope_company_id", "role_id") WHERE "scope_company_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "_user_role_scopes_branch_role"  ON "user_role_scopes"("scope_branch_id", "role_id")  WHERE "scope_branch_id" IS NOT NULL;

-- appointment start/end + status combinations (§204 explicit)
CREATE INDEX IF NOT EXISTS "_appt_start_end_status"  ON "appointments"("start_at", "end_at", "status");
CREATE INDEX IF NOT EXISTS "_appt_pro_start"         ON "appointments"("professional_id", "start_at") WHERE "status" NOT IN ('cancelled', 'no_show');
CREATE INDEX IF NOT EXISTS "_appt_branch_start"      ON "appointments"("branch_id", "start_at")       WHERE "status" NOT IN ('cancelled', 'no_show');
CREATE INDEX IF NOT EXISTS "_appt_customer_start"    ON "appointments"("customer_id", "start_at");

-- payments (§204: payment reference index)
CREATE INDEX IF NOT EXISTS "_payments_reference_idx"  ON "payments"("external_reference") WHERE "external_reference" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "_payments_status_created" ON "payments"("status", "created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "_payments_idempotency" ON "payments"("idempotency_key") WHERE "idempotency_key" IS NOT NULL;

-- posts (§204)
CREATE INDEX IF NOT EXISTS "_posts_company_published"   ON "posts"("company_id", "published_at" DESC) WHERE "status" = 'published';
CREATE INDEX IF NOT EXISTS "_posts_pro_published"       ON "posts"("professional_id", "published_at" DESC) WHERE "status" = 'published';
CREATE INDEX IF NOT EXISTS "_posts_author_published"    ON "posts"("author_user_id", "published_at" DESC) WHERE "status" = 'published';

-- reviews (§204)
CREATE INDEX IF NOT EXISTS "_reviews_company_created"   ON "reviews"("company_id", "created_at" DESC) WHERE "status" = 'published';
CREATE INDEX IF NOT EXISTS "_reviews_pro_created"       ON "reviews"("professional_id", "created_at" DESC) WHERE "status" = 'published';
CREATE INDEX IF NOT EXISTS "_reviews_customer_created"  ON "reviews"("customer_id", "created_at" DESC);

-- unread notifications (§204 explicit: unread notifications index)
CREATE INDEX IF NOT EXISTS "_notifications_unread"      ON "notifications"("recipient_user_id", "created_at" DESC) WHERE "read_at" IS NULL;

-- conversation + time (§204 explicit: conversation/time)
CREATE INDEX IF NOT EXISTS "_messages_conv_created"     ON "messages"("conversation_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "_messages_sender_created"   ON "messages"("sender_user_id", "created_at" DESC);

-- financial_ledger efficiency: by account + posting date
CREATE INDEX IF NOT EXISTS "_ledger_accounting_date"     ON "financial_ledger"("account_type", "account_id", "posted_at" DESC);
CREATE INDEX IF NOT EXISTS "_ledger_reference"          ON "financial_ledger"("reference_type", "reference_id") WHERE "reference_id" IS NOT NULL;

-- analytics_events date-range scans
CREATE INDEX IF NOT EXISTS "_analytics_events_date_user" ON "analytics_events"("created_at" DESC, "user_id");
CREATE INDEX IF NOT EXISTS "_analytics_events_company"   ON "analytics_events"("company_id", "event_name", "created_at" DESC);

-- ============================================================
-- §211 AC-R2: Appointment overlap guard (EXCLUDE USING gist)
--  Prevents two rows for the same branch + professional + resource
--  from overlapping in time, unless the status is a terminal
--  "cancelled" / "no_show" state. The tsrange is [start, end).
-- ============================================================
ALTER TABLE "appointments"
  ADD COLUMN IF NOT EXISTS "_overlap_time" TSTZRANGE
    GENERATED ALWAYS AS (
      CASE
        WHEN "status" IN ('cancelled', 'no_show') THEN NULL
        ELSE TSTZRANGE("start_at", "end_at", '[)')
      END
    ) STORED;

-- professional double-booking
ALTER TABLE "appointments"
  DROP CONSTRAINT IF EXISTS "appt_pro_overlap_excl";
ALTER TABLE "appointments"
  ADD CONSTRAINT "appt_pro_overlap_excl"
  EXCLUDE USING gist (
    "professional_id" WITH =,
    "_overlap_time" WITH &&
  ) WHERE ("_overlap_time" IS NOT NULL AND "professional_id" IS NOT NULL);

-- branch-level resource double-booking is enforced at the application layer in
-- Task 3 (BookingService) using an advisory-lock + explicit overlap query.
-- The appointment_resources table carries the per-resource rows and Task 3
-- re-checks overlap on each resource during the create-hold / confirm-booking
-- transaction. A stored GENERATED column can not reliably join to another
-- table, so branch/resource overlap is guarded in code + tests (§211).
