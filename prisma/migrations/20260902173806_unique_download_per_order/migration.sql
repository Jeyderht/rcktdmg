/*
  Warnings:

  - A unique constraint covering the columns `[userId,productId,orderId]` on the table `Download` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Download_userId_productId_orderId_key" ON "Download"("userId", "productId", "orderId");
