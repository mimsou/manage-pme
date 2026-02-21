import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrencyService } from './currency.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Currency')
@Controller('currency')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  @Get('list')
  @ApiOperation({ summary: 'Liste des devises actives' })
  async list() {
    return this.currencyService.findAll();
  }

  @Get('default')
  @ApiOperation({ summary: 'Code devise par défaut' })
  async getDefault() {
    return { code: await this.currencyService.getDefaultCurrencyCode() };
  }

  @Post('default')
  @ApiOperation({ summary: 'Définir la devise par défaut' })
  async setDefault(@Body() body: { code: string }) {
    await this.currencyService.setDefaultCurrency(body.code);
    return { code: body.code };
  }

  @Get('rates')
  @ApiOperation({ summary: 'Derniers taux de change (vers TND)' })
  async getRates() {
    return this.currencyService.getLatestRates();
  }

  @Post('import-bct')
  @ApiOperation({ summary: 'Importer les cours depuis la BCT (Tunisie)' })
  async importBCT() {
    return this.currencyService.importFromBCT();
  }
}
