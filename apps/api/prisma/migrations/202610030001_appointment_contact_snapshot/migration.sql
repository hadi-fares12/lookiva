ALTER TABLE "appointments"
  ADD COLUMN IF NOT EXISTS "contact_name" TEXT,
  ADD COLUMN IF NOT EXISTS "contact_phone" TEXT,
  ADD COLUMN IF NOT EXISTS "contact_email" TEXT;
