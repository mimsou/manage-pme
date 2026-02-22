import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CreditsService } from './credits.service';
import { SettingsService, SETTING_KEYS } from '../settings/settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Credits')
@Controller('credits')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CreditsController {
  constructor(
    private readonly creditsService: CreditsService,
    private readonly settingsService: SettingsService,
  ) {}

  @Get('clients')
  @ApiOperation({ summary: 'List clients with credit balance (unpaid), filter by client, amount, overdue days' })
  @ApiQuery({ name: 'clientId', required: false })
  @ApiQuery({ name: 'minTotal', required: false, type: Number })
  @ApiQuery({ name: 'maxTotal', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'overdueMinDays', required: false, type: Number })
  async getClientCreditsSummary(
    @Query('clientId') clientId?: string,
    @Query('minTotal') minTotal?: string,
    @Query('maxTotal') maxTotal?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('overdueMinDays') overdueMinDays?: string,
  ) {
    return this.creditsService.getClientCreditsSummary({
      clientId,
      minTotal: minTotal != null ? parseFloat(minTotal) : undefined,
      maxTotal: maxTotal != null ? parseFloat(maxTotal) : undefined,
      search,
      page: page != null ? parseInt(page) : undefined,
      limit: limit != null ? parseInt(limit) : undefined,
      overdueMinDays: overdueMinDays != null ? parseInt(overdueMinDays, 10) : undefined,
    });
  }

  @Get('overdue-count')
  @ApiOperation({ summary: 'Count of unpaid invoices overdue by at least X days (for badge). Uses setting if days not provided.' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  async getOverdueCount(@Query('days') days?: string) {
    let threshold = 30;
    if (days != null && days !== '') {
      const n = parseInt(days, 10);
      if (Number.isFinite(n) && n >= 0) threshold = n;
    } else {
      threshold = await this.settingsService.getNumber(SETTING_KEYS.CREDIT_OVERDUE_DAYS_THRESHOLD, 30);
    }
    return this.creditsService.getOverdueCount(threshold);
  }

  @Get('clients/:clientId')
  @ApiOperation({ summary: 'Credit detail for one client: unpaid sales with aging' })
  async getClientCreditDetail(@Param('clientId') clientId: string) {
    return this.creditsService.getClientCreditDetail(clientId);
  }
}
