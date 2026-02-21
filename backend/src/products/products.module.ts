import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { SkuGeneratorService } from './sku-generator.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProductsController],
  providers: [ProductsService, SkuGeneratorService],
  exports: [ProductsService, SkuGeneratorService],
})
export class ProductsModule {}

