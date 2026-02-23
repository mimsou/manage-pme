import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { QuotesService } from './quotes.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { ConvertToSaleDto } from './dto/convert-to-sale.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QuoteStatus } from '@prisma/client';

@ApiTags('Quotes')
@Controller('quotes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post()
  @ApiOperation({ summary: 'Create quote (devis)' })
  async create(@Body() dto: CreateQuoteDto, @Request() req: { user: { id: string } }) {
    return this.quotesService.create(dto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List quotes' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'clientId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: QuoteStatus })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('clientId') clientId?: string,
    @Query('status') status?: QuoteStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.quotesService.findAll({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      clientId,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get quote by id' })
  async findOne(@Param('id') id: string) {
    return this.quotesService.findOne(id);
  }

  @Post(':id/convert-to-sale')
  @ApiOperation({ summary: 'Convert quote to invoice (full or partial quantities)' })
  async convertToSale(
    @Param('id') id: string,
    @Body() dto: ConvertToSaleDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.quotesService.convertToSale(id, req.user.id, dto);
  }
}
