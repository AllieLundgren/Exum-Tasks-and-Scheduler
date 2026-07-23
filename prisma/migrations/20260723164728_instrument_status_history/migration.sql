-- CreateTable
CREATE TABLE "InstrumentStatusEvent" (
    "id" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "status" "InstrumentStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstrumentStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InstrumentStatusEvent_instrumentId_startedAt_idx" ON "InstrumentStatusEvent"("instrumentId", "startedAt");

-- AddForeignKey
ALTER TABLE "InstrumentStatusEvent" ADD CONSTRAINT "InstrumentStatusEvent_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "Instrument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: seed one initial event per existing instrument reflecting its current
-- status/statusSince, so history tracking is continuous from this point forward.
INSERT INTO "InstrumentStatusEvent" ("id", "instrumentId", "status", "startedAt")
SELECT gen_random_uuid()::text, "id", "status", "statusSince" FROM "Instrument";
