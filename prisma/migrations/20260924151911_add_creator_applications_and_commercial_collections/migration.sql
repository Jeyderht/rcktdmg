-- CreateEnum
CREATE TYPE "CreatorApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CommercialCollectionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'COLLECTION_PUBLISHED';
ALTER TYPE "NotificationType" ADD VALUE 'CREATOR_APPLICATION_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE 'CREATOR_APPLICATION_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'CREATOR_APPLICATION_REJECTED';

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "commercialCollectionId" TEXT;

-- CreateTable
CREATE TABLE "CreatorApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "publicName" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "portfolioUrl" TEXT,
    "portfolioFileUrl" TEXT,
    "websiteUrl" TEXT,
    "instagramUrl" TEXT,
    "facebookUrl" TEXT,
    "tiktokUrl" TEXT,
    "status" "CreatorApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorApplicationCategory" (
    "applicationId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "CreatorApplicationCategory_pkey" PRIMARY KEY ("applicationId","categoryId")
);

-- CreateTable
CREATE TABLE "CommercialCollection" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "coverUrl" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "status" "CommercialCollectionStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommercialCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialCollectionItem" (
    "collectionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommercialCollectionItem_pkey" PRIMARY KEY ("collectionId","productId")
);

-- CreateIndex
CREATE INDEX "CreatorApplication_status_createdAt_idx" ON "CreatorApplication"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CreatorApplication_userId_status_idx" ON "CreatorApplication"("userId", "status");

-- CreateIndex
CREATE INDEX "CreatorApplicationCategory_categoryId_idx" ON "CreatorApplicationCategory"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialCollection_slug_key" ON "CommercialCollection"("slug");

-- CreateIndex
CREATE INDEX "CommercialCollection_creatorId_idx" ON "CommercialCollection"("creatorId");

-- CreateIndex
CREATE INDEX "CommercialCollection_status_idx" ON "CommercialCollection"("status");

-- CreateIndex
CREATE INDEX "CommercialCollectionItem_productId_idx" ON "CommercialCollectionItem"("productId");

-- CreateIndex
CREATE INDEX "OrderItem_commercialCollectionId_idx" ON "OrderItem"("commercialCollectionId");

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_commercialCollectionId_fkey" FOREIGN KEY ("commercialCollectionId") REFERENCES "CommercialCollection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorApplication" ADD CONSTRAINT "CreatorApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorApplication" ADD CONSTRAINT "CreatorApplication_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorApplicationCategory" ADD CONSTRAINT "CreatorApplicationCategory_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "CreatorApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorApplicationCategory" ADD CONSTRAINT "CreatorApplicationCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialCollection" ADD CONSTRAINT "CommercialCollection_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialCollectionItem" ADD CONSTRAINT "CommercialCollectionItem_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "CommercialCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialCollectionItem" ADD CONSTRAINT "CommercialCollectionItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
