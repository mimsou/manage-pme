import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { ClientsModule } from './clients/clients.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { SalesModule } from './sales/sales.module';
import { StockModule } from './stock/stock.module';
import { InventoryModule } from './inventory/inventory.module';
import { CashRegisterModule } from './cash-register/cash-register.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { PurchasesModule } from './purchases/purchases.module';
import { CompanyModule } from './company/company.module';
import { CurrencyModule } from './currency/currency.module';
import { CreditsModule } from './credits/credits.module';
import { SettingsModule } from './settings/settings.module';
import { QuotesModule } from './quotes/quotes.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    CategoriesModule,
    ClientsModule,
    SuppliersModule,
    SalesModule,
    StockModule,
    InventoryModule,
    CashRegisterModule,
    DashboardModule,
    PurchasesModule,
    CompanyModule,
    CurrencyModule,
    CreditsModule,
    SettingsModule,
    QuotesModule,
  ],
})
export class AppModule {}

