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
import { InventoryService } from './inventory.service';
import { CreateInventoryDto, AddInventoryItemDto } from './dto/inventory.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InventoryStatus } from '@prisma/client';

@ApiTags('Inventory')
@Controller('inventory')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  @ApiOperation({ summary: 'Create inventory' })
  async create(@Body() createInventoryDto: CreateInventoryDto, @Request() req) {
    return this.inventoryService.create(createInventoryDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all inventories' })
  @ApiQuery({ name: 'status', required: false, enum: InventoryStatus })
  async findAll(@Query('status') status?: InventoryStatus) {
    return this.inventoryService.findAll(status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get inventory by id' })
  async findOne(@Param('id') id: string) {
    return this.inventoryService.findOne(id);
  }

  @Post(':id/items')
  @ApiOperation({ summary: 'Add item to inventory' })
  async addItem(
    @Param('id') id: string,
    @Body() addInventoryItemDto: AddInventoryItemDto,
  ) {
    return this.inventoryService.addItem(id, addInventoryItemDto);
  }

  @Put(':id/start')
  @ApiOperation({ summary: 'Start inventory' })
  async start(@Param('id') id: string) {
    return this.inventoryService.start(id);
  }

  @Put(':id/complete')
  @ApiOperation({ summary: 'Complete inventory' })
  async complete(@Param('id') id: string) {
    return this.inventoryService.complete(id);
  }

  @Put(':id/validate')
  @ApiOperation({ summary: 'Validate inventory and adjust stocks' })
  async validate(@Param('id') id: string, @Request() req) {
    return this.inventoryService.validate(id, req.user.id);
  }
}

