-- AlterTable
ALTER TABLE "transactions" ADD COLUMN "calendarEventId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "transactions_calendarEventId_key" ON "transactions"("calendarEventId");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_calendarEventId_fkey" FOREIGN KEY ("calendarEventId") REFERENCES "calendar_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill maintenance costs as service expenses
INSERT INTO "transactions" (
  "id",
  "tenantId",
  "condominiumId",
  "type",
  "category",
  "amount",
  "description",
  "vendor",
  "attachmentUrl",
  "transactionDate",
  "calendarEventId",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid(),
  ce."tenantId",
  ce."condominiumId",
  'EXPENSE',
  'servicio',
  ce."cost",
  'Mantenimiento: ' || ce."title",
  ce."vendor",
  ce."attachmentUrl",
  ce."startAt",
  ce."id",
  NOW(),
  NOW()
FROM "calendar_events" ce
WHERE ce."type" = 'MAINTENANCE'
  AND ce."deletedAt" IS NULL
  AND ce."cost" IS NOT NULL
  AND ce."cost" > 0
  AND ce."status" <> 'CANCELLED'
  AND ce."condominiumId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "transactions" t WHERE t."calendarEventId" = ce."id"
  );
