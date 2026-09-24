-- CreateEnum
CREATE TYPE "AgreementStatus" AS ENUM ('DRAFT', 'PENDING', 'AWAITING_SIGNATURES', 'ACTIVE', 'COMPLETED', 'REJECTED');

-- CreateTable
CREATE TABLE "Agreement" (
    "id" TEXT NOT NULL,
    "status" "AgreementStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "monthlyRent" INTEGER NOT NULL,
    "securityDeposit" INTEGER NOT NULL,
    "maintenanceAmount" INTEGER,
    "noticePeriodDays" INTEGER NOT NULL,
    "paymentDueDay" INTEGER NOT NULL,
    "maintenanceResponsibility" TEXT NOT NULL,
    "otherTerms" TEXT,
    "tenantAddress" TEXT,
    "tenantDocId" TEXT,
    "tenantPhone" TEXT,
    "tenantEmail" TEXT,
    "ownerAddress" TEXT,
    "ownerDocId" TEXT,
    "ownerPhone" TEXT,
    "ownerEmail" TEXT,
    "tenantPhoto" TEXT,
    "tenantSignature" TEXT,
    "tenantSignedAt" TIMESTAMP(3),
    "ownerPhoto" TEXT,
    "ownerSignature" TEXT,
    "ownerSignedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "propertyId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "bookingId" TEXT,

    CONSTRAINT "Agreement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Agreement_propertyId_idx" ON "Agreement"("propertyId");

-- CreateIndex
CREATE INDEX "Agreement_tenantId_idx" ON "Agreement"("tenantId");

-- CreateIndex
CREATE INDEX "Agreement_ownerId_idx" ON "Agreement"("ownerId");

-- CreateIndex
CREATE INDEX "Agreement_status_idx" ON "Agreement"("status");

-- CreateIndex
CREATE INDEX "Agreement_bookingId_idx" ON "Agreement"("bookingId");

-- AddForeignKey
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
