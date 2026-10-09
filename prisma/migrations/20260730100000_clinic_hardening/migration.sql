-- Clinic System Hardening: audit log, providers, payment voiding, inventory
-- transactions, patient clinical records, and patient archiving.
--
-- Ordering follows the "nullable first, backfill, then constrain" pattern:
--   1. Create enums
--   2. Add new columns as nullable (or with safe defaults)
--   3. Create new tables
--   4. Backfill data (receipt numbers, booking references, default provider)
--   5. Create indexes / unique constraints
--   6. Add foreign keys

-- ============================================================
-- 1. CreateEnum
-- ============================================================
CREATE TYPE "InventoryTransactionType" AS ENUM ('ADJUSTMENT', 'DISPENSE', 'REVERSAL');

CREATE TYPE "PatientConditionStatus" AS ENUM ('ACTIVE', 'RESOLVED');

-- ============================================================
-- 2. AlterTable (nullable-first / safe-default columns)
-- ============================================================

-- Patient: soft-archive support
ALTER TABLE "Patient" ADD COLUMN "archivedAt" TIMESTAMP(3);

-- Appointment: provider assignment, duration, booking reference
ALTER TABLE "Appointment"
  ADD COLUMN "bookingReference" TEXT,
  ADD COLUMN "durationMinutes" INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN "providerId" TEXT;

-- Payment: receipts and void tracking
ALTER TABLE "Payment"
  ADD COLUMN "receiptNumber" TEXT,
  ADD COLUMN "voidReason" TEXT,
  ADD COLUMN "voidedAt" TIMESTAMP(3),
  ADD COLUMN "voidedByUserId" TEXT;

-- Medicine: reorder threshold
ALTER TABLE "Medicine" ADD COLUMN "reorderLevel" INTEGER NOT NULL DEFAULT 10;

-- ClinicSetting: singleton key + default provider
ALTER TABLE "ClinicSetting"
  ADD COLUMN "defaultProviderId" TEXT,
  ADD COLUMN "key" TEXT NOT NULL DEFAULT 'default';

-- ============================================================
-- 3. CreateTable
-- ============================================================

CREATE TABLE "Provider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "specialty" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryTransaction" (
    "id" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "type" "InventoryTransactionType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "note" TEXT,
    "prescriptionId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryTransaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PatientAllergy" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "severity" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientAllergy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PatientCondition" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "PatientConditionStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientCondition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Encounter" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "providerId" TEXT,
    "visitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chiefComplaint" TEXT,
    "notes" TEXT,
    "vitalsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Encounter_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorEmail" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- 4. Backfill
-- ============================================================

-- 4a. Guard against duplicate ClinicSetting rows colliding on the new
-- singleton "key" default before the unique index is created below.
WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt" ASC, "id" ASC) AS rn
  FROM "ClinicSetting"
)
UPDATE "ClinicSetting" AS cs
SET "key" = CASE WHEN ranked.rn = 1 THEN 'default' ELSE 'default-' || ranked.rn::text END
FROM ranked
WHERE cs."id" = ranked."id";

-- 4b. Create a default provider from the clinic name (if any clinic settings
-- exist) so existing appointments/settings have something sensible to point
-- to. This is best-effort and safe to skip if a Provider already exists.
INSERT INTO "Provider" ("id", "name", "active", "createdAt", "updatedAt")
SELECT
  substr(md5(random()::text || clock_timestamp()::text), 1, 25),
  COALESCE(NULLIF(TRIM((SELECT "clinicName" FROM "ClinicSetting" ORDER BY "createdAt" ASC LIMIT 1)), ''), 'Clinic') || ' - General Physician',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Provider")
  AND EXISTS (SELECT 1 FROM "ClinicSetting");

-- 4c. Point the clinic's default provider at the newly created provider.
UPDATE "ClinicSetting"
SET "defaultProviderId" = (SELECT "id" FROM "Provider" ORDER BY "createdAt" ASC LIMIT 1)
WHERE "defaultProviderId" IS NULL
  AND EXISTS (SELECT 1 FROM "Provider");

-- 4d. Backfill payment receipt numbers as RCP-000001, RCP-000002, ...
-- ordered by when the payment was actually made.
WITH ordered AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (ORDER BY "paidAt" ASC, "createdAt" ASC, "id" ASC) AS seq
  FROM "Payment"
  WHERE "receiptNumber" IS NULL
)
UPDATE "Payment" AS p
SET "receiptNumber" = 'RCP-' || LPAD(o.seq::text, 6, '0')
FROM ordered AS o
WHERE p."id" = o."id";

-- 4e. Backfill appointment booking references as APT-000001, APT-000002, ...
-- ordered by the scheduled appointment time.
WITH ordered AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (ORDER BY "dateTime" ASC, "createdAt" ASC, "id" ASC) AS seq
  FROM "Appointment"
  WHERE "bookingReference" IS NULL
)
UPDATE "Appointment" AS a
SET "bookingReference" = 'APT-' || LPAD(o.seq::text, 6, '0')
FROM ordered AS o
WHERE a."id" = o."id";

-- ============================================================
-- 5. CreateIndex (including uniques, now that data is backfilled)
-- ============================================================

CREATE INDEX "Provider_name_idx" ON "Provider"("name");
CREATE INDEX "Provider_active_idx" ON "Provider"("active");

CREATE INDEX "InventoryTransaction_medicineId_idx" ON "InventoryTransaction"("medicineId");
CREATE INDEX "InventoryTransaction_prescriptionId_idx" ON "InventoryTransaction"("prescriptionId");
CREATE INDEX "InventoryTransaction_type_idx" ON "InventoryTransaction"("type");
CREATE INDEX "InventoryTransaction_createdAt_idx" ON "InventoryTransaction"("createdAt");

CREATE INDEX "PatientAllergy_patientId_idx" ON "PatientAllergy"("patientId");

CREATE INDEX "PatientCondition_patientId_idx" ON "PatientCondition"("patientId");
CREATE INDEX "PatientCondition_status_idx" ON "PatientCondition"("status");

CREATE INDEX "Encounter_patientId_idx" ON "Encounter"("patientId");
CREATE INDEX "Encounter_appointmentId_idx" ON "Encounter"("appointmentId");
CREATE INDEX "Encounter_visitedAt_idx" ON "Encounter"("visitedAt");

CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX "AuditLog_actorUserId_idx" ON "AuditLog"("actorUserId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

CREATE INDEX "Appointment_providerId_idx" ON "Appointment"("providerId");
CREATE UNIQUE INDEX "Appointment_bookingReference_key" ON "Appointment"("bookingReference");

CREATE UNIQUE INDEX "ClinicSetting_key_key" ON "ClinicSetting"("key");

CREATE INDEX "Patient_archivedAt_idx" ON "Patient"("archivedAt");

CREATE UNIQUE INDEX "Payment_receiptNumber_key" ON "Payment"("receiptNumber");
CREATE INDEX "Payment_voidedAt_idx" ON "Payment"("voidedAt");

-- ============================================================
-- 6. AddForeignKey
-- ============================================================

ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PatientAllergy" ADD CONSTRAINT "PatientAllergy_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PatientCondition" ADD CONSTRAINT "PatientCondition_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ClinicSetting" ADD CONSTRAINT "ClinicSetting_defaultProviderId_fkey" FOREIGN KEY ("defaultProviderId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;
