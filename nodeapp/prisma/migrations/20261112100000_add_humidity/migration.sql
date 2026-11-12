-- AlterTable
ALTER TABLE "beacon" ADD COLUMN IF NOT EXISTS "humidity" INTEGER;

-- AlterTable
ALTER TABLE "beacon_history" ADD COLUMN IF NOT EXISTS "humidity" INTEGER;
