-- CreateEnum
CREATE TYPE "EmailJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "common_area_schedules" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "commonAreaId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "slotMinutes" INTEGER NOT NULL DEFAULT 60,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "common_area_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common_area_blocks" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "commonAreaId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "common_area_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_jobs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "ownerId" TEXT,
    "unitId" TEXT,
    "subject" TEXT NOT NULL,
    "status" "EmailJobStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "metadata" JSONB,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_jobs_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN "vendor" TEXT,
ADD COLUMN "receiptNumber" TEXT,
ADD COLUMN "attachmentUrl" TEXT;

-- AlterTable
ALTER TABLE "calendar_events" ADD COLUMN "vendor" TEXT,
ADD COLUMN "cost" DECIMAL(14,2),
ADD COLUMN "attachmentUrl" TEXT,
ADD COLUMN "status" "MaintenanceStatus" NOT NULL DEFAULT 'SCHEDULED';

-- CreateIndex
CREATE UNIQUE INDEX "common_area_schedules_commonAreaId_dayOfWeek_key" ON "common_area_schedules"("commonAreaId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "common_area_blocks_commonAreaId_startAt_endAt_idx" ON "common_area_blocks"("commonAreaId", "startAt", "endAt");

-- CreateIndex
CREATE INDEX "email_jobs_tenantId_status_idx" ON "email_jobs"("tenantId", "status");

-- CreateIndex
CREATE INDEX "transactions_tenantId_condominiumId_type_idx" ON "transactions"("tenantId", "condominiumId", "type");

-- CreateIndex
CREATE INDEX "calendar_events_tenantId_condominiumId_type_idx" ON "calendar_events"("tenantId", "condominiumId", "type");

-- AddForeignKey
ALTER TABLE "common_area_schedules" ADD CONSTRAINT "common_area_schedules_commonAreaId_fkey" FOREIGN KEY ("commonAreaId") REFERENCES "common_areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common_area_blocks" ADD CONSTRAINT "common_area_blocks_commonAreaId_fkey" FOREIGN KEY ("commonAreaId") REFERENCES "common_areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
