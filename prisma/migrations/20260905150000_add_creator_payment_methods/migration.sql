-- CreateEnum
CREATE TYPE "PaymentMethodType" AS ENUM ('BANK', 'YAPE', 'PLIN');

-- CreateTable
CREATE TABLE "CreatorPaymentMethod" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "type" "PaymentMethodType" NOT NULL,
    "holderName" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "bankName" TEXT,
    "accountNumber" TEXT,
    "cci" TEXT,
    "phone" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorPaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CreatorPaymentMethod_creatorId_idx" ON "CreatorPaymentMethod"("creatorId");

-- CreateIndex
CREATE INDEX "CreatorPaymentMethod_type_idx" ON "CreatorPaymentMethod"("type");

-- AddColumn
ALTER TABLE "Withdrawal" ADD COLUMN "paymentMethodId" TEXT;

-- CreateIndex
CREATE INDEX "Withdrawal_paymentMethodId_idx" ON "Withdrawal"("paymentMethodId");

-- AddForeignKey
ALTER TABLE "CreatorPaymentMethod"
ADD CONSTRAINT "CreatorPaymentMethod_creatorId_fkey"
FOREIGN KEY ("creatorId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Withdrawal"
ADD CONSTRAINT "Withdrawal_paymentMethodId_fkey"
FOREIGN KEY ("paymentMethodId") REFERENCES "CreatorPaymentMethod"("id")
ON DELETE SET NULL ON UPDATE CASCADE;