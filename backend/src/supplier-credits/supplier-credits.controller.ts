import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SupplierCreditsService } from './supplier-credits.service';
import { SettingsService, SETTING_KEYS } from '../settings/settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Supplier credits')
@Controller('supplier-credits')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SupplierCreditsController {
  constructor(
    private readonly supplierCreditsService: SupplierCreditsService,
    private readonly settingsService: SettingsService,
  ) {}

  @Get('suppliers')
  @ApiOperation({
    summary: 'Liste fournisseurs avec solde dû (achats non soldés), filtres',
  })
  @ApiQuery({ name: 'supplierId', required: false })
  @ApiQuery({ name: 'minTotal', required: false, type: Number })
  @ApiQuery({ name: 'maxTotal', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'overdueMinDays', required: false, type: Number })
  async getSupplierPayablesSummary(
    @Query('supplierId') supplierId?: string,
    @Query('minTotal') minTotal?: string,
    @Query('maxTotal') maxTotal?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('overdueMinDays') overdueMinDays?: string,
  ) {
    return this.supplierCreditsService.getSupplierPayablesSummary({
      supplierId,
      minTotal: minTotal != null ? parseFloat(minTotal) : undefined,
      maxTotal: maxTotal != null ? parseFloat(maxTotal) : undefined,
      search,
      page: page != null ? parseInt(page, 10) : undefined,
      limit: limit != null ? parseInt(limit, 10) : undefined,
      overdueMinDays: overdueMinDays != null ? parseInt(overdueMinDays, 10) : undefined,
    });
  }

  @Get('overdue-count')
  @ApiOperation({
    summary:
      'Nombre d’achats avec solde dû en retard d’au moins X jours (badge). Utilise le réglage si days absent.',
  })
  @ApiQuery({ name: 'days', required: false, type: Number })
  async getOverdueCount(@Query('days') days?: string) {
    let threshold = 30;
    if (days != null && days !== '') {
      const n = parseInt(days, 10);
      if (Number.isFinite(n) && n >= 0) threshold = n;
    } else {
      threshold = await this.settingsService.getNumber(
        SETTING_KEYS.CREDIT_OVERDUE_DAYS_THRESHOLD,
        30,
      );
    }
    return this.supplierCreditsService.getOverdueCount(threshold);
  }

  @Get('suppliers/:supplierId')
  @ApiOperation({ summary: 'Détail dettes fournisseur : achats non soldés' })
  async getSupplierPayableDetail(@Param('supplierId') supplierId: string) {
    return this.supplierCreditsService.getSupplierPayableDetail(supplierId);
  }
}
