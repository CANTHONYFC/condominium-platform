-- CreateEnum
CREATE TYPE "ChargeConceptType" AS ENUM ('FIXED', 'VARIABLE');

-- CreateEnum
CREATE TYPE "BillingSheetStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "charge_concepts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "condominiumId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ChargeConceptType" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "charge_concepts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_sheets" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "condominiumId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "label" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" "BillingSheetStatus" NOT NULL DEFAULT 'DRAFT',
    "fixedPools" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_sheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "charge_lines" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "billingSheetId" TEXT NOT NULL,
    "chargeConceptId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "maintenanceFeeId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "isManualOverride" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "charge_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "charge_concepts_tenantId_condominiumId_idx" ON "charge_concepts"("tenantId", "condominiumId");

-- CreateIndex
CREATE UNIQUE INDEX "charge_concepts_condominiumId_code_key" ON "charge_concepts"("condominiumId", "code");

-- CreateIndex
CREATE INDEX "billing_sheets_tenantId_condominiumId_idx" ON "billing_sheets"("tenantId", "condominiumId");

-- CreateIndex
CREATE UNIQUE INDEX "billing_sheets_condominiumId_period_key" ON "billing_sheets"("condominiumId", "period");

-- CreateIndex
CREATE INDEX "charge_lines_tenantId_unitId_idx" ON "charge_lines"("tenantId", "unitId");

-- CreateIndex
CREATE UNIQUE INDEX "charge_lines_billingSheetId_chargeConceptId_unitId_key" ON "charge_lines"("billingSheetId", "chargeConceptId", "unitId");

-- AddForeignKey
ALTER TABLE "charge_lines" ADD CONSTRAINT "charge_lines_billingSheetId_fkey" FOREIGN KEY ("billingSheetId") REFERENCES "billing_sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charge_lines" ADD CONSTRAINT "charge_lines_chargeConceptId_fkey" FOREIGN KEY ("chargeConceptId") REFERENCES "charge_concepts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charge_lines" ADD CONSTRAINT "charge_lines_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charge_lines" ADD CONSTRAINT "charge_lines_maintenanceFeeId_fkey" FOREIGN KEY ("maintenanceFeeId") REFERENCES "maintenance_fees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
