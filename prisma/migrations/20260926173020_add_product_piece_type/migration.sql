-- CreateEnum
CREATE TYPE "PieceType" AS ENUM ('EVENT_STORY', 'EVENT_FLYER', 'EVENT_COVER', 'EVENT_PROFILE', 'EVENT_POST', 'EVENT_OTHER');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "pieceType" "PieceType";
