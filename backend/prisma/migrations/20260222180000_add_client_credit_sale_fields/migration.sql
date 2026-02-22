-- AlterTable
ALTER TABLE "sales" ADD COLUMN "amountPaid" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "sales" ADD COLUMN "dueDate" DATE;

-- Backfill: consider existing completed sales as fully paid
UPDATE "sales" SET "amountPaid" = "total" WHERE "status" = 'COMPLETED' AND "amountPaid" = 0;
