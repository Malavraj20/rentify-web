-- CreateEnum
CREATE TYPE "DocumentProvider" AS ENUM ('TENANT', 'OWNER');

-- CreateEnum
CREATE TYPE "DocumentVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AgreementStatus" ADD VALUE 'INFORMATION_REQUIRED';
ALTER TYPE "AgreementStatus" ADD VALUE 'DOCUMENTS_REQUIRED';
ALTER TYPE "AgreementStatus" ADD VALUE 'AWAITING_TENANT_SIGNATURE';
ALTER TYPE "AgreementStatus" ADD VALUE 'AWAITING_OWNER_SIGNATURE';
ALTER TYPE "AgreementStatus" ADD VALUE 'READY_FOR_LAWYER_REVIEW';
ALTER TYPE "AgreementStatus" ADD VALUE 'SENT_TO_LAWYER';
ALTER TYPE "AgreementStatus" ADD VALUE 'UNDER_LEGAL_REVIEW';
ALTER TYPE "AgreementStatus" ADD VALUE 'AWAITING_FINAL_AGREEMENT';
ALTER TYPE "AgreementStatus" ADD VALUE 'FINAL_AGREEMENT_UPLOADED';

-- AlterTable
ALTER TABLE "Agreement" ADD COLUMN     "finalAgreementFileData" TEXT,
ADD COLUMN     "finalAgreementFileMimeType" TEXT,
ADD COLUMN     "finalAgreementFileName" TEXT,
ADD COLUMN     "finalAgreementUploadedAt" TIMESTAMP(3),
ADD COLUMN     "finalAgreementUploadedById" TEXT,
ADD COLUMN     "lawyerNotes" TEXT,
ADD COLUMN     "requiredOwnerDocuments" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "requiredTenantDocuments" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "sentToLawyerAt" TIMESTAMP(3),
ADD COLUMN     "underReviewAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AgreementDocument" (
    "id" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "providedBy" "DocumentProvider" NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileData" TEXT NOT NULL,
    "fileMimeType" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verificationStatus" "DocumentVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "verificationNotes" TEXT,
    "agreementId" TEXT NOT NULL,

    CONSTRAINT "AgreementDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgreementDocument_agreementId_idx" ON "AgreementDocument"("agreementId");

-- CreateIndex
CREATE INDEX "AgreementDocument_providedBy_idx" ON "AgreementDocument"("providedBy");

-- CreateIndex
CREATE INDEX "AgreementDocument_documentType_idx" ON "AgreementDocument"("documentType");

-- AddForeignKey
ALTER TABLE "AgreementDocument" ADD CONSTRAINT "AgreementDocument_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "Agreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
