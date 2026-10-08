CREATE TABLE "withdrawal_requests" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "company_id" TEXT NOT NULL,
  "bank_account_id" TEXT NOT NULL,
  "requested_by_user_id" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency_code" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "reason" TEXT,
  "reference_code" TEXT,
  "reviewed_by_user_id" TEXT,
  "reviewed_at" TIMESTAMP(3),
  "rejection_reason" TEXT,
  "processed_at" TIMESTAMP(3),
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE INDEX "withdrawal_requests_company_id_idx"
  ON "withdrawal_requests"("company_id");

CREATE INDEX "withdrawal_requests_bank_account_id_idx"
  ON "withdrawal_requests"("bank_account_id");

CREATE INDEX "withdrawal_requests_status_idx"
  ON "withdrawal_requests"("status");

CREATE INDEX "withdrawal_requests_currency_code_idx"
  ON "withdrawal_requests"("currency_code");

CREATE INDEX "withdrawal_requests_created_at_idx"
  ON "withdrawal_requests"("created_at");

ALTER TABLE "withdrawal_requests"
  ADD CONSTRAINT "withdrawal_requests_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "withdrawal_requests"
  ADD CONSTRAINT "withdrawal_requests_bank_account_id_fkey"
  FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
