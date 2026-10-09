-- Clear auto-created default provider linkage and placeholder team rows
UPDATE "ClinicSetting" SET "defaultProviderId" = NULL;

DELETE FROM "Provider"
WHERE "name" LIKE '% - General Physician'
  AND "specialty" IS NULL
  AND "phone" IS NULL
  AND "email" IS NULL;

-- Drop default provider column
ALTER TABLE "ClinicSetting" DROP CONSTRAINT IF EXISTS "ClinicSetting_defaultProviderId_fkey";
ALTER TABLE "ClinicSetting" DROP COLUMN IF EXISTS "defaultProviderId";
