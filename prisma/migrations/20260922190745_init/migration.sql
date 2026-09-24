-- CreateEnum
CREATE TYPE "Role" AS ENUM ('tenant', 'buyer', 'owner', 'admin');

-- CreateEnum
CREATE TYPE "ListingFor" AS ENUM ('rent', 'sale', 'both');

-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('draft', 'active');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('low', 'medium', 'high');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'tenant',
    "phone" TEXT,
    "preferredLocation" TEXT,
    "budget" INTEGER,
    "preferredBedrooms" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "sellingPrice" INTEGER,
    "listingFor" "ListingFor" NOT NULL DEFAULT 'rent',
    "location" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "pincode" TEXT,
    "bedrooms" INTEGER NOT NULL,
    "bathrooms" INTEGER NOT NULL,
    "size" INTEGER NOT NULL,
    "commute" TEXT,
    "matchScore" INTEGER,
    "healthScore" INTEGER,
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'low',
    "amenities" TEXT[],
    "description" TEXT NOT NULL,
    "securityDeposit" INTEGER NOT NULL,
    "maintenance" INTEGER NOT NULL,
    "otherCharges" INTEGER,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "availableFrom" TIMESTAMP(3),
    "views" INTEGER NOT NULL DEFAULT 0,
    "furnishing" TEXT NOT NULL,
    "status" "PropertyStatus" NOT NULL DEFAULT 'draft',
    "floor" TEXT,
    "totalFloors" TEXT,
    "parking" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyImage" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "propertyId" TEXT NOT NULL,

    CONSTRAINT "PropertyImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RenterPreferences" (
    "id" TEXT NOT NULL,
    "budget" TEXT NOT NULL,
    "propertyType" TEXT NOT NULL,
    "occupants" TEXT NOT NULL,
    "pets" TEXT NOT NULL,
    "furnishing" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "RenterPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuyerPreferences" (
    "id" TEXT NOT NULL,
    "budget" TEXT NOT NULL,
    "propertyType" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "furnishing" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "BuyerPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "Property_ownerId_idx" ON "Property"("ownerId");

-- CreateIndex
CREATE INDEX "Property_city_idx" ON "Property"("city");

-- CreateIndex
CREATE INDEX "Property_status_idx" ON "Property"("status");

-- CreateIndex
CREATE INDEX "Property_listingFor_idx" ON "Property"("listingFor");

-- CreateIndex
CREATE INDEX "Property_price_idx" ON "Property"("price");

-- CreateIndex
CREATE INDEX "PropertyImage_propertyId_displayOrder_idx" ON "PropertyImage"("propertyId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "RenterPreferences_userId_key" ON "RenterPreferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BuyerPreferences_userId_key" ON "BuyerPreferences"("userId");

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyImage" ADD CONSTRAINT "PropertyImage_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RenterPreferences" ADD CONSTRAINT "RenterPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerPreferences" ADD CONSTRAINT "BuyerPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
