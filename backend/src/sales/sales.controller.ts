import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/sale.dto';
import { CreateRefundDto } from './dto/create-refund.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SaleType } from '@prisma/client';

@ApiTags('Sales')
@Controller('sales')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @ApiOperation({ summary: 'Create sale' })
  async create(@Body() createSaleDto: CreateSaleDto, @Request() req) {
    return this.salesService.create(createSaleDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all sales' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'clientId', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'type', required: false, enum: SaleType })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('clientId') clientId?: string,
    @Query('userId') userId?: string,
    @Query('type') type?: SaleType,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.salesService.findAll({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      clientId,
      userId,
      type,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get sale by id' })
  async findOne(@Param('id') id: string) {
    return this.salesService.findOne(id);
  }

  @Put(':id/cancel')
  @ApiOperation({ summary: 'Cancel sale' })
  async cancel(@Param('id') id: string, @Request() req) {
    return this.salesService.cancel(id, req.user.id);
  }

  @Post(':id/refund')
  @ApiOperation({ summary: 'Create credit note (avoir) for sale' })
  async createRefund(@Param('id') id: string, @Body() dto: CreateRefundDto, @Request() req) {
    return this.salesService.createRefund(id, dto, req.user.id);
  }
}

