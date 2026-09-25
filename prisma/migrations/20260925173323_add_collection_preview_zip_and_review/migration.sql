-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CommercialCollectionStatus" ADD VALUE 'PENDING_REVIEW';
ALTER TYPE "CommercialCollectionStatus" ADD VALUE 'REJECTED';

-- AlterTable
ALTER TABLE "CommercialCollection" ADD COLUMN     "previewUrl" TEXT,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "zipUrl" TEXT;
