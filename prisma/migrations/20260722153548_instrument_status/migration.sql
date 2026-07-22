-- CreateEnum
CREATE TYPE "InstrumentStatus" AS ENUM ('active', 'maintenance_required', 'no_longer_in_use');

-- AlterTable: add new columns first, backfill from the old boolean, then drop it
ALTER TABLE "Instrument"
  ADD COLUMN     "status" "InstrumentStatus" NOT NULL DEFAULT 'active',
  ADD COLUMN     "statusSince" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Instrument" SET "status" = 'no_longer_in_use' WHERE "isActive" = false;

ALTER TABLE "Instrument" DROP COLUMN "isActive";
