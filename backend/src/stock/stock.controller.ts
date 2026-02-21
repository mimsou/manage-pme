import { Controller, Get, Post, Param, Query, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { StockService } from './stock.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StockMovementType } from '@prisma/client';
import { CreateDamageDto } from './dto/damage.dto';

@ApiTags('Stock')
@Controller('stock')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get('movements')
  @ApiOperation({ summary: 'Get stock movements' })
  @ApiQuery({ name: 'productId', required: false })
  @ApiQuery({ name: 'type', required: false, enum: StockMovementType })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getMovements(
    @Query('productId') productId?: string,
    @Query('type') type?: StockMovementType,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.stockService.getMovements({
      productId,
      type,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Get products with low stock' })
  async getLowStockProducts() {
    return this.stockService.getLowStockProducts();
  }

  @Get('product/:id/history')
  @ApiOperation({ summary: 'Get product stock history' })
  async getProductStockHistory(@Param('id') id: string) {
    return this.stockService.getProductStockHistory(id);
  }

  @Post('damage')
  @ApiOperation({ summary: 'Create a damage/loss stock movement' })
  async createDamage(@Body() createDamageDto: CreateDamageDto, @Request() req: any) {
    return this.stockService.createDamage(createDamageDto, req.user.id);
  }
}

