ALTER TABLE "posts"
  ADD COLUMN "verified_review_id" TEXT,
  ADD COLUMN "verified_appointment_id" TEXT,
  ADD COLUMN "is_verified_work" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "verified_work_at" TIMESTAMP(3);

CREATE INDEX "posts_verified_review_id_idx"
  ON "posts"("verified_review_id");

CREATE INDEX "posts_verified_appointment_id_idx"
  ON "posts"("verified_appointment_id");

CREATE INDEX "posts_is_verified_work_idx"
  ON "posts"("is_verified_work");

ALTER TABLE "posts"
  ADD CONSTRAINT "posts_verified_review_id_fkey"
  FOREIGN KEY ("verified_review_id") REFERENCES "reviews"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "posts"
  ADD CONSTRAINT "posts_verified_appointment_id_fkey"
  FOREIGN KEY ("verified_appointment_id") REFERENCES "appointments"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
