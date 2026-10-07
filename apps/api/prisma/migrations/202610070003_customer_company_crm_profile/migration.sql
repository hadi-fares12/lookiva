CREATE TABLE "customer_company_profiles" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "company_id" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL,
  "merged_into_customer_id" TEXT,
  "notes" TEXT,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "created_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX "customer_company_profiles_company_id_customer_id_key"
  ON "customer_company_profiles"("company_id", "customer_id");

CREATE INDEX "customer_company_profiles_company_id_idx"
  ON "customer_company_profiles"("company_id");

CREATE INDEX "customer_company_profiles_customer_id_idx"
  ON "customer_company_profiles"("customer_id");

CREATE INDEX "customer_company_profiles_merged_into_customer_id_idx"
  ON "customer_company_profiles"("merged_into_customer_id");

CREATE INDEX "customer_company_profiles_tags_idx"
  ON "customer_company_profiles" USING GIN ("tags");

ALTER TABLE "customer_company_profiles"
  ADD CONSTRAINT "customer_company_profiles_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "customer_company_profiles"
  ADD CONSTRAINT "customer_company_profiles_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "customers"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "customer_company_profiles"
  ADD CONSTRAINT "customer_company_profiles_merged_into_customer_id_fkey"
  FOREIGN KEY ("merged_into_customer_id") REFERENCES "customers"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
