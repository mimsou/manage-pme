-- AlterTable: add defaultCurrencyCode to company
ALTER TABLE "company" ADD COLUMN "defaultCurrencyCode" TEXT DEFAULT 'TND';

-- CreateTable: currencies (devises)
CREATE TABLE "currencies" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT,
    "unit" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "currencies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "currencies_code_key" ON "currencies"("code");

-- CreateTable: exchange_rates (taux de change vers TND)
CREATE TABLE "exchange_rates" (
    "id" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "rateToTND" DECIMAL(18,6) NOT NULL,
    "rateDate" DATE NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "exchange_rates_currencyCode_rateDate_key" ON "exchange_rates"("currencyCode", "rateDate");
CREATE INDEX "exchange_rates_currencyCode_idx" ON "exchange_rates"("currencyCode");
CREATE INDEX "exchange_rates_rateDate_idx" ON "exchange_rates"("rateDate");

-- AlterTable: add currencyCode to sales
ALTER TABLE "sales" ADD COLUMN "currencyCode" TEXT;
