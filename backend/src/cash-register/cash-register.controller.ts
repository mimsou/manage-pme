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
import { CashRegisterService } from './cash-register.service';
import { OpenCashRegisterDto, CloseCashRegisterDto } from './dto/cash-register.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CashRegisterStatus } from '@prisma/client';

@ApiTags('Cash Register')
@Controller('cash-register')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CashRegisterController {
  constructor(private readonly cashRegisterService: CashRegisterService) {}

  @Post('open')
  @ApiOperation({ summary: 'Open cash register' })
  async open(@Body() openCashRegisterDto: OpenCashRegisterDto, @Request() req) {
    return this.cashRegisterService.open(openCashRegisterDto, req.user.id);
  }

  @Put(':id/close')
  @ApiOperation({ summary: 'Close cash register' })
  async close(
    @Param('id') id: string,
    @Body() closeCashRegisterDto: CloseCashRegisterDto,
    @Request() req,
  ) {
    return this.cashRegisterService.close(id, closeCashRegisterDto, req.user.id);
  }

  @Get('current')
  @ApiOperation({ summary: 'Get current open cash register' })
  async getCurrent(@Request() req) {
    return this.cashRegisterService.getCurrent(req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all cash registers' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: CashRegisterStatus })
  async findAll(
    @Query('userId') userId?: string,
    @Query('status') status?: CashRegisterStatus,
  ) {
    return this.cashRegisterService.findAll(userId, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get cash register by id' })
  async findOne(@Param('id') id: string) {
    return this.cashRegisterService.findOne(id);
  }
}

