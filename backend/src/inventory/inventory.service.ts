import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateInventoryDto,
  AddInventoryItemDto,
  UpdateInventoryItemDto,
} from './dto/inventory.dto';
import { InventoryStatus, StockMovementType } from '@prisma/client';

const itemInclude = {
  product: {
    include: {
      category: true,
    },
  },
  productVariant: true,
} as const;

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
        items: { include: itemInclude },
      },
    });
  }

  async findAll(status?: InventoryStatus) {
    const where: { status?: InventoryStatus } = {};
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
          include: itemInclude,
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
          include: itemInclude,
          orderBy: { createdAt: 'asc' },
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

    if (inventory.status !== InventoryStatus.IN_PROGRESS) {
      if (inventory.status === InventoryStatus.DRAFT) {
        throw new BadRequestException(
          'Démarrez l’inventaire (bouton Démarrer) avant d’ajouter des lignes de comptage.',
        );
      }
      throw new BadRequestException('Cannot add items to completed inventory');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: data.productId },
      include: { variants: { select: { id: true } } },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const hasVariants = product.variants.length > 0;

    if (hasVariants && !data.productVariantId) {
      throw new BadRequestException(
        'Ce produit a des variantes : indiquez productVariantId pour compter au niveau du SKU',
      );
    }

    if (!hasVariants && data.productVariantId) {
      throw new BadRequestException('Ce produit n\'a pas de variante : ne pas envoyer productVariantId');
    }

    let theoreticalQty: number;
    let productVariantId: string | null = null;

    if (data.productVariantId) {
      const variant = await this.prisma.productVariant.findFirst({
        where: {
          id: data.productVariantId,
          productId: data.productId,
        },
      });
      if (!variant) {
        throw new BadRequestException('Variante introuvable ou ne correspond pas au produit');
      }
      theoreticalQty = variant.stockCurrent;
      productVariantId = variant.id;
    } else {
      theoreticalQty = product.stockCurrent;
    }

    const difference = data.countedQty - theoreticalQty;

    const existing = await this.prisma.inventoryItem.findFirst({
      where: {
        inventoryId,
        ...(productVariantId
          ? { productVariantId }
          : { productId: data.productId, productVariantId: null }),
      },
    });

    if (existing) {
      return this.prisma.inventoryItem.update({
        where: { id: existing.id },
        data: {
          countedQty: data.countedQty,
          difference,
          reason: data.reason !== undefined ? data.reason : existing.reason,
        },
        include: itemInclude,
      });
    }

    return this.prisma.inventoryItem.create({
      data: {
        inventoryId,
        productId: data.productId,
        productVariantId,
        theoreticalQty,
        countedQty: data.countedQty,
        difference,
        reason: data.reason,
      },
      include: itemInclude,
    });
  }

  async updateItem(inventoryId: string, itemId: string, data: UpdateInventoryItemDto) {
    const inventory = await this.findOne(inventoryId);

    if (inventory.status !== InventoryStatus.IN_PROGRESS) {
      if (inventory.status === InventoryStatus.DRAFT) {
        throw new BadRequestException(
          'Démarrez l’inventaire avant de modifier des lignes de comptage.',
        );
      }
      throw new BadRequestException('Cannot update items on completed inventory');
    }

    const item = inventory.items.find((i) => i.id === itemId);
    if (!item) {
      throw new NotFoundException('Inventory line not found');
    }

    const difference = data.countedQty - item.theoreticalQty;

    return this.prisma.inventoryItem.update({
      where: { id: itemId },
      data: {
        countedQty: data.countedQty,
        difference,
        reason: data.reason !== undefined ? data.reason : item.reason,
      },
      include: itemInclude,
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

    for (const item of inventory.items) {
      if (item.difference === 0) continue;

      if (item.productVariantId) {
        await this.prisma.productVariant.update({
          where: { id: item.productVariantId },
          data: { stockCurrent: item.countedQty },
        });
      } else {
        await this.prisma.product.update({
          where: { id: item.productId },
          data: { stockCurrent: item.countedQty },
        });
      }

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

    return this.prisma.inventory.update({
      where: { id: inventoryId },
      data: {
        status: InventoryStatus.VALIDATED,
      },
      include: {
        items: {
          include: itemInclude,
        },
      },
    });
  }

  /**
   * Suppression autorisée tant que l’inventaire n’est pas validé (pas d’ajustement de stock enregistré).
   */
  async remove(inventoryId: string) {
    const inv = await this.prisma.inventory.findUnique({
      where: { id: inventoryId },
    });

    if (!inv) {
      throw new NotFoundException('Inventory not found');
    }

    if (inv.status === InventoryStatus.VALIDATED) {
      throw new BadRequestException(
        'Impossible de supprimer un inventaire déjà validé : les stocks ont été ajustés.',
      );
    }

    await this.prisma.inventory.delete({
      where: { id: inventoryId },
    });
  }
}
