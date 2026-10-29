-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "miniaturaBloqueada" TEXT,
ADD COLUMN     "previewLibre" BOOLEAN NOT NULL DEFAULT true;
