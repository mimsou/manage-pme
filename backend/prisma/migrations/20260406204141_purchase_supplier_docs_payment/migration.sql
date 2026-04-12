-- CreateEnum
CREATE TYPE "SupplierDocumentType" AS ENUM ('PURCHASE_ORDER', 'DELIVERY_NOTE', 'SUPPLIER_INVOICE');

-- AlterTable
ALTER TABLE "purchases" ADD COLUMN     "amountPaid" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "documentType" "SupplierDocumentType" NOT NULL DEFAULT 'PURCHASE_ORDER',
ADD COLUMN     "dueDate" DATE,
ADD COLUMN     "supplierDeliveryNoteDate" DATE,
ADD COLUMN     "supplierDeliveryNoteNumber" TEXT;
