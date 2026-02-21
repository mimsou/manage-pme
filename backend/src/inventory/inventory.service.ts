import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInventoryDto, AddInventoryItemDto } from './dto/inventory.dto';
import { InventoryStatus, StockMovementType } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateInventoryDto, userId: string) {
    const reference = `INV-${Date.now()}`;

    return this.prisma.inventory.create({
      data: {
        ...data,
        reference,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        items: true,
      },
    });
  }

  async findAll(status?: InventoryStatus) {
    const where: any = {};
    if (status) where.status = status;

    return this.prisma.inventory.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        items: {
          include: {
            product: true,
          },
        },
        _count: {
          select: { items: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const inventory = await this.prisma.inventory.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        items: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    if (!inventory) {
      throw new NotFoundException('Inventory not found');
    }

    return inventory;
  }

  async addItem(inventoryId: string, data: AddInventoryItemDto) {
    const inventory = await this.findOne(inventoryId);

    if (inventory.status !== InventoryStatus.DRAFT && inventory.status !== InventoryStatus.IN_PROGRESS) {
      throw new BadRequestException('Cannot add items to completed inventory');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: data.productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const difference = data.countedQty - product.stockCurrent;

    return this.prisma.inventoryItem.create({
      data: {
        inventoryId,
        productId: data.productId,
        theoreticalQty: product.stockCurrent,
        countedQty: data.countedQty,
        difference,
        reason: data.reason,
      },
      include: {
        product: true,
      },
    });
  }

  async start(inventoryId: string) {
    return this.prisma.inventory.update({
      where: { id: inventoryId },
      data: {
        status: InventoryStatus.IN_PROGRESS,
        startDate: new Date(),
      },
    });
  }

  async complete(inventoryId: string) {
    return this.prisma.inventory.update({
      where: { id: inventoryId },
      data: {
        status: InventoryStatus.COMPLETED,
        endDate: new Date(),
      },
    });
  }

  async validate(inventoryId: string, userId: string) {
    const inventory = await this.findOne(inventoryId);

    if (inventory.status !== InventoryStatus.COMPLETED) {
      throw new BadRequestException('Inventory must be completed before validation');
    }

    // Ajuster les stocks et créer les mouvements
    for (const item of inventory.items) {
      if (item.difference !== 0) {
        await this.prisma.product.update({
          where: { id: item.productId },
          data: {
            stockCurrent: item.countedQty,
          },
        });

        await this.prisma.stockMovement.create({
          data: {
            productId: item.productId,
            type: StockMovementType.INVENTORY,
            quantity: item.difference,
            reference: inventory.reference,
            referenceId: inventory.id,
            userId,
            reason: item.reason || 'Ajustement inventaire',
          },
        });
      }
    }

    return this.prisma.inventory.update({
      where: { id: inventoryId },
      data: {
        status: InventoryStatus.VALIDATED,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }
}

