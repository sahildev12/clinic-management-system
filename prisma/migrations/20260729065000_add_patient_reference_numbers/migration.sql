-- AlterTable ClinicSetting
ALTER TABLE "ClinicSetting" ADD COLUMN "patientReferenceTemplate" TEXT NOT NULL DEFAULT 'PAT-{YEAR}-{SEQ:6}';

-- CreateTable PatientReferenceCounter
CREATE TABLE "PatientReferenceCounter" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "nextValue" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientReferenceCounter_pkey" PRIMARY KEY ("id")
);

INSERT INTO "PatientReferenceCounter" ("id", "nextValue", "updatedAt")
VALUES ('default', 1, CURRENT_TIMESTAMP);

-- AlterTable Patient (nullable first for backfill)
ALTER TABLE "Patient" ADD COLUMN "patientReference" TEXT;

-- Backfill existing patients with sequential references
WITH ordered AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (ORDER BY "createdAt" ASC, "id" ASC) AS seq
  FROM "Patient"
  WHERE "patientReference" IS NULL
)
UPDATE "Patient" AS p
SET "patientReference" =
  'PAT-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(o.seq::text, 6, '0')
FROM ordered AS o
WHERE p."id" = o."id";

-- Advance counter past backfilled values
UPDATE "PatientReferenceCounter"
SET
  "nextValue" = COALESCE((
    SELECT COUNT(*)::integer FROM "Patient"
  ), 0) + 1,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'default';

-- Enforce required + unique
ALTER TABLE "Patient" ALTER COLUMN "patientReference" SET NOT NULL;

CREATE UNIQUE INDEX "Patient_patientReference_key" ON "Patient"("patientReference");
