import { Module } from '@nestjs/common';
import { SupplierCreditsController } from './supplier-credits.controller';
import { SupplierCreditsService } from './supplier-credits.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [PrismaModule, SettingsModule],
  controllers: [SupplierCreditsController],
  providers: [SupplierCreditsService],
  exports: [SupplierCreditsService],
})
export class SupplierCreditsModule {}
