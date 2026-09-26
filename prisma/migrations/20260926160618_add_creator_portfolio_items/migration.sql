-- AlterTable
ALTER TABLE "CreatorApplication" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "coverUrl" TEXT,
ADD COLUMN     "experience" TEXT,
ADD COLUMN     "otherUrl" TEXT,
ADD COLUMN     "portfolioDescription" TEXT;

-- CreateTable
CREATE TABLE "CreatorPortfolioItem" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "linkUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreatorPortfolioItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CreatorPortfolioItem_applicationId_sortOrder_idx" ON "CreatorPortfolioItem"("applicationId", "sortOrder");

-- AddForeignKey
ALTER TABLE "CreatorPortfolioItem" ADD CONSTRAINT "CreatorPortfolioItem_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "CreatorApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
