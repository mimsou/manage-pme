import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Settings')
@Controller('settings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all settings (key-value)' })
  async getAll() {
    return this.settingsService.getAll();
  }

  @Put()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update settings (admin only)' })
  async update(@Body() body: Record<string, string>) {
    for (const [key, value] of Object.entries(body)) {
      if (value !== undefined && value !== null) {
        await this.settingsService.set(key, String(value));
      }
    }
    return this.settingsService.getAll();
  }
}
