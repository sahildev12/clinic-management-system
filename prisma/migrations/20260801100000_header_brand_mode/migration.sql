-- AlterEnum
CREATE TYPE "HeaderBrandMode" AS ENUM ('ICON_AND_TEXT', 'FULL_IMAGE');

-- AlterTable
ALTER TABLE "ClinicSetting" ADD COLUMN "headerBrandMode" "HeaderBrandMode" NOT NULL DEFAULT 'ICON_AND_TEXT';
