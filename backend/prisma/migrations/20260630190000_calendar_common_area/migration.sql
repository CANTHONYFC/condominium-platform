-- AlterTable
ALTER TABLE "calendar_events" ADD COLUMN "commonAreaId" TEXT;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_commonAreaId_fkey" FOREIGN KEY ("commonAreaId") REFERENCES "common_areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "calendar_events_tenantId_commonAreaId_startAt_idx" ON "calendar_events"("tenantId", "commonAreaId", "startAt");
