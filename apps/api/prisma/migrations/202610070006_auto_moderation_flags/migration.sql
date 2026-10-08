CREATE TABLE "moderation_auto_flags" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "target_type" TEXT NOT NULL,
  "target_id" TEXT NOT NULL,
  "author_user_id" TEXT,
  "reason_type" TEXT NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL,
  "details" JSONB,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "reviewed_by_id" TEXT,
  "reviewed_at" TIMESTAMP(3),
  "action_taken" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE INDEX "moderation_auto_flags_target_type_target_id_idx"
  ON "moderation_auto_flags"("target_type", "target_id");

CREATE INDEX "moderation_auto_flags_author_user_id_idx"
  ON "moderation_auto_flags"("author_user_id");

CREATE INDEX "moderation_auto_flags_status_idx"
  ON "moderation_auto_flags"("status");

CREATE INDEX "moderation_auto_flags_created_at_idx"
  ON "moderation_auto_flags"("created_at");
