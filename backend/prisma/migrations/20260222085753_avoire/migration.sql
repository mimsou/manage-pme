/*
  Warnings:

  - A unique constraint covering the columns `[avoirNumber]` on the table `sale_refunds` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "StockMovementType" ADD VALUE 'REFUND';

-- AlterTable
ALTER TABLE "sale_refunds" ADD COLUMN     "avoirNumber" TEXT,
ADD COLUMN     "userId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "sale_refunds_avoirNumber_key" ON "sale_refunds"("avoirNumber");

-- CreateIndex
CREATE INDEX "sale_refunds_avoirNumber_idx" ON "sale_refunds"("avoirNumber");

-- AddForeignKey
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "currencies"("code") ON DELETE CASCADE ON UPDATE CASCADE;
