import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import {
  CreateInventoryDto,
  AddInventoryItemDto,
  UpdateInventoryItemDto,
} from './dto/inventory.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { InventoryStatus, UserRole } from '@prisma/client';

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

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Delete inventory',
    description:
      'Autorisé si le statut n’est pas VALIDATED (pas d’ajustement de stock). Les lignes sont supprimées en cascade.',
  })
  async remove(@Param('id') id: string) {
    return this.inventoryService.remove(id);
  }

  @Post(':id/items')
  @ApiOperation({ summary: 'Add or update inventory line (upsert by product / variant)' })
  async addItem(
    @Param('id') id: string,
    @Body() addInventoryItemDto: AddInventoryItemDto,
  ) {
    return this.inventoryService.addItem(id, addInventoryItemDto);
  }

  @Patch(':id/items/:itemId')
  @ApiOperation({ summary: 'Update counted quantity on an inventory line' })
  async updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() updateInventoryItemDto: UpdateInventoryItemDto,
  ) {
    return this.inventoryService.updateItem(id, itemId, updateInventoryItemDto);
  }

  @Put(':id/start')
  @ApiOperation({ summary: 'Start inventory' })
  async start(@Param('id') id: string) {
    return this.inventoryService.start(id);
  }

  @Put(':id/complete')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Complete inventory (freeze counting)' })
  async complete(@Param('id') id: string) {
    return this.inventoryService.complete(id);
  }

  @Put(':id/validate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Validate inventory and adjust stocks' })
  async validate(@Param('id') id: string, @Request() req) {
    return this.inventoryService.validate(id, req.user.id);
  }
}
