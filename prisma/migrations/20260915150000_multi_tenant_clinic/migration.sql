-- CreateEnum
CREATE TYPE "ProviderType" AS ENUM ('DOCTOR', 'STAFF');

-- CreateEnum
CREATE TYPE "DoctorCategory" AS ENUM ('GENERAL_DENTISTRY', 'ORTHODONTICS', 'ENDODONTICS', 'PERIODONTICS', 'PEDIATRIC_DENTISTRY', 'ORAL_SURGERY', 'PROSTHODONTICS', 'OTHER');

-- CreateTable
CREATE TABLE "Clinic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Clinic_pkey" PRIMARY KEY ("id")
);

-- Default tenant for existing single-clinic data
INSERT INTO "Clinic" ("id", "name", "slug", "active", "createdAt", "updatedAt")
VALUES (
    'clm_default_tenant',
    COALESCE((SELECT "clinicName" FROM "ClinicSetting" WHERE "key" = 'default' LIMIT 1), 'CarePlus Clinic'),
    'careplus-clinic',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Add nullable clinic columns
ALTER TABLE "Patient" ADD COLUMN "clinicId" TEXT;
ALTER TABLE "Provider" ADD COLUMN "clinicId" TEXT;
ALTER TABLE "Provider" ADD COLUMN "providerType" "ProviderType" NOT NULL DEFAULT 'STAFF';
ALTER TABLE "Provider" ADD COLUMN "category" "DoctorCategory";
ALTER TABLE "Appointment" ADD COLUMN "clinicId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "clinicId" TEXT;
ALTER TABLE "Expense" ADD COLUMN "clinicId" TEXT;
ALTER TABLE "Reminder" ADD COLUMN "clinicId" TEXT;
ALTER TABLE "Medicine" ADD COLUMN "clinicId" TEXT;
ALTER TABLE "Prescription" ADD COLUMN "clinicId" TEXT;
ALTER TABLE "ContactMessage" ADD COLUMN "clinicId" TEXT;
ALTER TABLE "MediaAsset" ADD COLUMN "clinicId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "clinicId" TEXT;

-- Backfill tenant id
UPDATE "Patient" SET "clinicId" = 'clm_default_tenant' WHERE "clinicId" IS NULL;
UPDATE "Provider" SET "clinicId" = 'clm_default_tenant' WHERE "clinicId" IS NULL;
UPDATE "Appointment" SET "clinicId" = 'clm_default_tenant' WHERE "clinicId" IS NULL;
UPDATE "Payment" SET "clinicId" = 'clm_default_tenant' WHERE "clinicId" IS NULL;
UPDATE "Expense" SET "clinicId" = 'clm_default_tenant' WHERE "clinicId" IS NULL;
UPDATE "Reminder" SET "clinicId" = 'clm_default_tenant' WHERE "clinicId" IS NULL;
UPDATE "Medicine" SET "clinicId" = 'clm_default_tenant' WHERE "clinicId" IS NULL;
UPDATE "Prescription" SET "clinicId" = 'clm_default_tenant' WHERE "clinicId" IS NULL;
UPDATE "ContactMessage" SET "clinicId" = 'clm_default_tenant' WHERE "clinicId" IS NULL;
UPDATE "MediaAsset" SET "clinicId" = 'clm_default_tenant' WHERE "clinicId" IS NULL;

-- First provider becomes doctor if any exist
UPDATE "Provider"
SET "providerType" = 'DOCTOR', "category" = 'GENERAL_DENTISTRY'
WHERE "id" = (SELECT "id" FROM "Provider" ORDER BY "createdAt" ASC LIMIT 1);

-- Patient reference: drop global unique, add composite
DROP INDEX IF EXISTS "Patient_patientReference_key";
ALTER TABLE "Patient" ALTER COLUMN "clinicId" SET NOT NULL;

-- ClinicSetting per clinic
ALTER TABLE "ClinicSetting" ADD COLUMN "clinicId" TEXT;
UPDATE "ClinicSetting" SET "clinicId" = 'clm_default_tenant' WHERE "clinicId" IS NULL;
ALTER TABLE "ClinicSetting" ALTER COLUMN "clinicId" SET NOT NULL;
ALTER TABLE "ClinicSetting" DROP COLUMN "key";

-- PatientReferenceCounter per clinic
CREATE TABLE "PatientReferenceCounter_new" (
    "clinicId" TEXT NOT NULL,
    "nextValue" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientReferenceCounter_new_pkey" PRIMARY KEY ("clinicId")
);

INSERT INTO "PatientReferenceCounter_new" ("clinicId", "nextValue", "updatedAt")
SELECT 'clm_default_tenant', COALESCE((SELECT "nextValue" FROM "PatientReferenceCounter" WHERE "id" = 'default'), 1), CURRENT_TIMESTAMP;

DROP TABLE "PatientReferenceCounter";
ALTER TABLE "PatientReferenceCounter_new" RENAME TO "PatientReferenceCounter";

-- NOT NULL on remaining tables
ALTER TABLE "Provider" ALTER COLUMN "clinicId" SET NOT NULL;
ALTER TABLE "Appointment" ALTER COLUMN "clinicId" SET NOT NULL;
ALTER TABLE "Payment" ALTER COLUMN "clinicId" SET NOT NULL;
ALTER TABLE "Expense" ALTER COLUMN "clinicId" SET NOT NULL;
ALTER TABLE "Reminder" ALTER COLUMN "clinicId" SET NOT NULL;
ALTER TABLE "Medicine" ALTER COLUMN "clinicId" SET NOT NULL;
ALTER TABLE "Prescription" ALTER COLUMN "clinicId" SET NOT NULL;
ALTER TABLE "ContactMessage" ALTER COLUMN "clinicId" SET NOT NULL;
ALTER TABLE "MediaAsset" ALTER COLUMN "clinicId" SET NOT NULL;

-- Indexes
CREATE UNIQUE INDEX "Clinic_slug_key" ON "Clinic"("slug");
CREATE INDEX "Clinic_active_idx" ON "Clinic"("active");
CREATE INDEX "Clinic_name_idx" ON "Clinic"("name");

CREATE UNIQUE INDEX "Patient_clinicId_patientReference_key" ON "Patient"("clinicId", "patientReference");
CREATE INDEX "Patient_clinicId_idx" ON "Patient"("clinicId");

CREATE INDEX "Provider_clinicId_idx" ON "Provider"("clinicId");
CREATE INDEX "Provider_providerType_idx" ON "Provider"("providerType");

CREATE INDEX "Appointment_clinicId_idx" ON "Appointment"("clinicId");
CREATE INDEX "Payment_clinicId_idx" ON "Payment"("clinicId");
CREATE INDEX "Expense_clinicId_idx" ON "Expense"("clinicId");
CREATE INDEX "Reminder_clinicId_idx" ON "Reminder"("clinicId");
CREATE INDEX "Medicine_clinicId_idx" ON "Medicine"("clinicId");
CREATE INDEX "Prescription_clinicId_idx" ON "Prescription"("clinicId");
CREATE INDEX "ContactMessage_clinicId_idx" ON "ContactMessage"("clinicId");
CREATE INDEX "MediaAsset_clinicId_idx" ON "MediaAsset"("clinicId");
CREATE INDEX "AuditLog_clinicId_idx" ON "AuditLog"("clinicId");

CREATE UNIQUE INDEX "ClinicSetting_clinicId_key" ON "ClinicSetting"("clinicId");

-- Foreign keys
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Provider" ADD CONSTRAINT "Provider_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Medicine" ADD CONSTRAINT "Medicine_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContactMessage" ADD CONSTRAINT "ContactMessage_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClinicSetting" ADD CONSTRAINT "ClinicSetting_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PatientReferenceCounter" ADD CONSTRAINT "PatientReferenceCounter_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
