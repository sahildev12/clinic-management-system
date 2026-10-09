-- Per-doctor schedule settings
CREATE TABLE "ProviderSchedule" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "appointmentDurationMinutes" INTEGER NOT NULL DEFAULT 30,
    "workDays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6]::INTEGER[],
    "workStartHour" INTEGER NOT NULL DEFAULT 9,
    "workEndHour" INTEGER NOT NULL DEFAULT 18,
    "lunchStartHour" INTEGER NOT NULL DEFAULT 13,
    "lunchEndHour" INTEGER NOT NULL DEFAULT 14,
    "useClinicHours" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderSchedule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProviderSchedule_providerId_key" ON "ProviderSchedule"("providerId");

ALTER TABLE "ProviderSchedule" ADD CONSTRAINT "ProviderSchedule_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill schedules for existing doctors from clinic lunch settings
INSERT INTO "ProviderSchedule" (
    "id",
    "providerId",
    "appointmentDurationMinutes",
    "workDays",
    "workStartHour",
    "workEndHour",
    "lunchStartHour",
    "lunchEndHour",
    "useClinicHours",
    "updatedAt"
)
SELECT
    'ps_' || p."id",
    p."id",
    30,
    ARRAY[1, 2, 3, 4, 5, 6]::INTEGER[],
    9,
    18,
    COALESCE(cs."lunchStartHour", 13),
    COALESCE(cs."lunchEndHour", 14),
    true,
    CURRENT_TIMESTAMP
FROM "Provider" p
LEFT JOIN "ClinicSetting" cs ON cs."clinicId" = p."clinicId"
WHERE p."providerType" = 'DOCTOR'
  AND NOT EXISTS (
    SELECT 1 FROM "ProviderSchedule" ps WHERE ps."providerId" = p."id"
  );
