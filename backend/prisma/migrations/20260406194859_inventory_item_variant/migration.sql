-- AlterTable
ALTER TABLE "inventory_items" ADD COLUMN     "productVariantId" TEXT;

-- CreateIndex
CREATE INDEX "inventory_items_productVariantId_idx" ON "inventory_items"("productVariantId");

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
