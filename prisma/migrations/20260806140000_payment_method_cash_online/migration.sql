-- Replace PaymentMethod values: keep CASH, map UPI/OTHER → ONLINE

ALTER TABLE "Payment" ALTER COLUMN "method" DROP DEFAULT;
ALTER TABLE "Payment" ALTER COLUMN "method" TYPE TEXT USING ("method"::text);

UPDATE "Payment"
SET "method" = 'ONLINE'
WHERE "method" IN ('UPI', 'OTHER');

CREATE TYPE "PaymentMethod_new" AS ENUM ('CASH', 'ONLINE');

ALTER TABLE "Payment"
  ALTER COLUMN "method" TYPE "PaymentMethod_new"
  USING ("method"::"PaymentMethod_new");

ALTER TABLE "Payment" ALTER COLUMN "method" SET DEFAULT 'CASH'::"PaymentMethod_new";

DROP TYPE "PaymentMethod";
ALTER TYPE "PaymentMethod_new" RENAME TO "PaymentMethod";
