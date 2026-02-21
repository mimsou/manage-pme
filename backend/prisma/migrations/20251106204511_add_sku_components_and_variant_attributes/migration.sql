-- AlterTable
ALTER TABLE "product_variants" ADD COLUMN     "attributes" JSONB,
ADD COLUMN     "stockMin" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "sku_components" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sku_components_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sku_components_type_idx" ON "sku_components"("type");

-- CreateIndex
CREATE UNIQUE INDEX "sku_components_type_value_key" ON "sku_components"("type", "value");

-- CreateIndex
CREATE INDEX "product_variants_sku_idx" ON "product_variants"("sku");
