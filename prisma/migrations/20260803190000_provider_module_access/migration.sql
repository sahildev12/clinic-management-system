-- AlterTable
ALTER TABLE "Provider" ADD COLUMN "moduleAccess" TEXT[] DEFAULT ARRAY[]::TEXT[];