-- AlterTable
ALTER TABLE "Collection" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "color" TEXT,
ADD COLUMN     "fileFormat" TEXT;

-- CreateIndex
CREATE INDEX "Collection_isPublic_idx" ON "Collection"("isPublic");

-- CreateIndex
CREATE INDEX "Product_fileFormat_idx" ON "Product"("fileFormat");

-- CreateIndex
CREATE INDEX "Product_color_idx" ON "Product"("color");
