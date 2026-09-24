-- CreateTable
CREATE TABLE "CompatibilityScore" (
    "id" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "factors" JSONB NOT NULL,
    "modelVersion" TEXT NOT NULL DEFAULT 'deterministic-v1',
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "propertyId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "CompatibilityScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompatibilityScore_tenantId_idx" ON "CompatibilityScore"("tenantId");

-- CreateIndex
CREATE INDEX "CompatibilityScore_propertyId_idx" ON "CompatibilityScore"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "CompatibilityScore_propertyId_tenantId_key" ON "CompatibilityScore"("propertyId", "tenantId");

-- AddForeignKey
ALTER TABLE "CompatibilityScore" ADD CONSTRAINT "CompatibilityScore_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompatibilityScore" ADD CONSTRAINT "CompatibilityScore_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
