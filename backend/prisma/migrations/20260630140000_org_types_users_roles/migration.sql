-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('MANAGEMENT_FIRM', 'CONDOMINIUM', 'BUILDING');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('CONDOMINIUM', 'BUILDING');

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN "organizationType" "OrganizationType" NOT NULL DEFAULT 'MANAGEMENT_FIRM';
ALTER TABLE "tenants" ADD COLUMN "maxUsers" INTEGER NOT NULL DEFAULT 10;

-- AlterTable
ALTER TABLE "condominiums" ADD COLUMN "propertyType" "PropertyType" NOT NULL DEFAULT 'CONDOMINIUM';

-- AlterTable
ALTER TABLE "residents" ADD COLUMN "userId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "residents_userId_key" ON "residents"("userId");

-- AddForeignKey
ALTER TABLE "residents" ADD CONSTRAINT "residents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
