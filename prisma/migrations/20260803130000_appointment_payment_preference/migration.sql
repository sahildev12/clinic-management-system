-- CreateEnum
CREATE TYPE "PaymentPreference" AS ENUM ('ONLINE', 'COUNTER');

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN "paymentPreference" "PaymentPreference";
