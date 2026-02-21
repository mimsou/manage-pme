import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseDto, UpdatePurchaseDto, ReceivePurchaseDto } from './dto/purchase.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { PurchaseStatus, StockMovementType } from '@prisma/client';

@Injectable()
export class PurchasesService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreatePurchaseDto, userId: string) {
    // Vérifier que le fournisseur existe
    const supplier = await this.prisma.supplier.findUnique({
      where: { id: data.supplierId },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    // Vérifier que tous les produits existent
    const products = await Promise.all(
      data.items.map((item) =>
        this.prisma.product.findUnique({
          where: { id: item.productId },
        })
      )
    );

    if (products.some((p) => !p)) {
      throw new NotFoundException('One or more products not found');
    }

    // Calculer le montant total
    const totalAmount = data.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );

    // Créer l'achat
    const purchase = await this.prisma.purchase.create({
      data: {
        supplierId: data.supplierId,
        reference: data.reference,
        invoiceNumber: data.invoiceNumber,
        invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : null,
        deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
        status: PurchaseStatus.PENDING,
        totalAmount: new Decimal(totalAmount),
        notes: data.notes,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            receivedQty: 0,
            unitPrice: new Decimal(item.unitPrice),
            totalPrice: new Decimal(item.unitPrice * item.quantity),
          })),
        },
      },
      include: {
        supplier: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    return purchase;
  }

  async findAll(filters?: {
    supplierId?: string;
    status?: PurchaseStatus;
    startDate?: Date;
    endDate?: Date;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters?.supplierId) where.supplierId = filters.supplierId;
    if (filters?.status) where.status = filters.status;

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    if (filters?.search) {
      where.OR = [
        { reference: { contains: filters.search, mode: 'insensitive' } },
        { invoiceNumber: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [purchases, total] = await Promise.all([
      this.prisma.purchase.findMany({
        where,
        include: {
          supplier: {
            select: {
              id: true,
              name: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.purchase.count({ where }),
    ]);

    return {
      data: purchases,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        },
        stockMovements: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!purchase) {
      throw new NotFoundException('Purchase not found');
    }

    return purchase;
  }

  async update(id: string, data: UpdatePurchaseDto) {
    const purchase = await this.findOne(id);

    return this.prisma.purchase.update({
      where: { id },
      data: {
        invoiceNumber: data.invoiceNumber,
        invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : undefined,
        deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : undefined,
        status: data.status,
        notes: data.notes,
      },
      include: {
        supplier: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async receive(id: string, data: ReceivePurchaseDto, userId: string) {
    const purchase = await this.findOne(id);

    if (purchase.status === PurchaseStatus.CANCELLED) {
      throw new BadRequestException('Cannot receive a cancelled purchase');
    }

    // Mettre à jour les quantités reçues et le stock
    for (const itemData of data.items) {
      const purchaseItem = purchase.items.find((item) => item.id === itemData.itemId);
      if (!purchaseItem) {
        throw new NotFoundException(`Purchase item ${itemData.itemId} not found`);
      }

      if (itemData.receivedQuantity < 0 || itemData.receivedQuantity > purchaseItem.quantity) {
        throw new BadRequestException('Invalid received quantity');
      }

      const quantityToAdd = itemData.receivedQuantity - purchaseItem.receivedQty;

      if (quantityToAdd > 0) {
        // Mettre à jour le stock
        await this.prisma.product.update({
          where: { id: purchaseItem.productId },
          data: {
            stockCurrent: {
              increment: quantityToAdd,
            },
          },
        });

        // Créer le mouvement de stock
        await this.prisma.stockMovement.create({
          data: {
            productId: purchaseItem.productId,
            type: StockMovementType.ENTRY,
            quantity: quantityToAdd,
            unitPrice: purchaseItem.unitPrice,
            totalValue: purchaseItem.unitPrice.mul(quantityToAdd),
            reference: purchase.reference,
            referenceId: purchase.id,
            supplierId: purchase.supplierId,
            purchaseId: purchase.id,
            userId,
          },
        });
      }

      // Mettre à jour la quantité reçue
      await this.prisma.purchaseItem.update({
        where: { id: itemData.itemId },
        data: {
          receivedQty: itemData.receivedQuantity,
        },
      });
    }

    // Mettre à jour le statut de l'achat
    const allItemsReceived = purchase.items.every(
      (item) => {
        const receivedItem = data.items.find((di) => di.itemId === item.id);
        const receivedQty = receivedItem?.receivedQuantity || item.receivedQty;
        return receivedQty === item.quantity;
      }
    );

    const someItemsReceived = purchase.items.some(
      (item) => {
        const receivedItem = data.items.find((di) => di.itemId === item.id);
        const receivedQty = receivedItem?.receivedQuantity || item.receivedQty;
        return receivedQty > 0;
      }
    );

    let newStatus = purchase.status;
    if (allItemsReceived) {
      newStatus = PurchaseStatus.RECEIVED;
    } else if (someItemsReceived) {
      newStatus = PurchaseStatus.PARTIAL;
    }

    return this.prisma.purchase.update({
      where: { id },
      data: {
        status: newStatus,
        deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : undefined,
        notes: data.notes,
      },
      include: {
        supplier: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    const purchase = await this.findOne(id);

    if (purchase.status === PurchaseStatus.RECEIVED || purchase.status === PurchaseStatus.PARTIAL) {
      throw new BadRequestException('Cannot delete a received purchase');
    }

    return this.prisma.purchase.delete({
      where: { id },
    });
  }
}


