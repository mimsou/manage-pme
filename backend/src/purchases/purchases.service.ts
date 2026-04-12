import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePurchaseDto,
  UpdatePurchaseDto,
  ReceivePurchaseDto,
  RecordPurchasePaymentDto,
} from './dto/purchase.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { Prisma, PurchaseStatus, StockMovementType, SupplierDocumentType } from '@prisma/client';

/** Client Prisma utilisable pour la réception (service ou transaction). */
type PrismaDb = PrismaService | Prisma.TransactionClient;

@Injectable()
export class PurchasesService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreatePurchaseDto, userId: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id: data.supplierId },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    const products = await Promise.all(
      data.items.map((item) =>
        this.prisma.product.findUnique({
          where: { id: item.productId },
        }),
      ),
    );

    if (products.some((p) => !p)) {
      throw new NotFoundException('One or more products not found');
    }

    const documentType = data.documentType ?? SupplierDocumentType.PURCHASE_ORDER;
    if (data.autoReceiveFull && documentType !== SupplierDocumentType.DELIVERY_NOTE) {
      throw new BadRequestException('autoReceiveFull is only valid for DELIVERY_NOTE');
    }

    const totalAmount = data.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );

    const createPayload = {
      supplierId: data.supplierId,
      reference: data.reference,
      documentType,
      supplierDeliveryNoteNumber: data.supplierDeliveryNoteNumber ?? null,
      supplierDeliveryNoteDate: data.supplierDeliveryNoteDate
        ? new Date(data.supplierDeliveryNoteDate)
        : null,
      invoiceNumber: data.invoiceNumber,
      invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : null,
      deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
      status: PurchaseStatus.PENDING,
      totalAmount: new Decimal(totalAmount),
      amountPaid: new Decimal(0),
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
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
    };

    const shouldAutoReceive =
      documentType === SupplierDocumentType.DELIVERY_NOTE && data.autoReceiveFull === true;

    if (shouldAutoReceive) {
      return this.prisma.$transaction(async (tx) => {
        const purchase = await tx.purchase.create({
          data: createPayload,
          include: {
            supplier: true,
            items: { include: { product: true } },
          },
        });
        const receiveDto: ReceivePurchaseDto = {
          items: purchase.items.map((i) => ({
            itemId: i.id,
            receivedQuantity: i.quantity,
          })),
          deliveryDate: data.deliveryDate,
          notes: data.notes,
        };
        return this.executeReceive(tx, purchase.id, receiveDto, userId);
      });
    }

    return this.prisma.purchase.create({
      data: createPayload,
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

    const where: Record<string, unknown> = {};

    if (filters?.supplierId) where.supplierId = filters.supplierId;
    if (filters?.status) where.status = filters.status;

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) (where.createdAt as Record<string, Date>).gte = filters.startDate;
      if (filters.endDate) (where.createdAt as Record<string, Date>).lte = filters.endDate;
    }

    if (filters?.search) {
      where.OR = [
        { reference: { contains: filters.search, mode: 'insensitive' } },
        { invoiceNumber: { contains: filters.search, mode: 'insensitive' } },
        { supplierDeliveryNoteNumber: { contains: filters.search, mode: 'insensitive' } },
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
    await this.findOne(id);

    return this.prisma.purchase.update({
      where: { id },
      data: {
        invoiceNumber: data.invoiceNumber,
        invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : undefined,
        deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : undefined,
        status: data.status,
        notes: data.notes,
        documentType: data.documentType,
        supplierDeliveryNoteNumber: data.supplierDeliveryNoteNumber,
        supplierDeliveryNoteDate: data.supplierDeliveryNoteDate
          ? new Date(data.supplierDeliveryNoteDate)
          : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
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

  async recordPayment(id: string, data: RecordPurchasePaymentDto) {
    const purchase = await this.findOne(id);

    if (
      purchase.status === PurchaseStatus.CANCELLED ||
      purchase.status === PurchaseStatus.RETURNED
    ) {
      throw new BadRequestException('Cannot record payment for this purchase');
    }

    const total = new Decimal(purchase.totalAmount);
    const currentPaid = new Decimal(purchase.amountPaid);
    const add = new Decimal(data.amount);
    const next = currentPaid.add(add);

    if (next.gt(total)) {
      throw new BadRequestException('Payment would exceed purchase total');
    }

    return this.prisma.purchase.update({
      where: { id },
      data: {
        amountPaid: next,
        ...(data.dueDate != null ? { dueDate: new Date(data.dueDate) } : {}),
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
    return this.executeReceive(this.prisma, id, data, userId);
  }

  private async executeReceive(db: PrismaDb, id: string, data: ReceivePurchaseDto, userId: string) {
    const purchase = await db.purchase.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: true,
      },
    });

    if (!purchase) {
      throw new NotFoundException('Purchase not found');
    }

    if (purchase.status === PurchaseStatus.CANCELLED) {
      throw new BadRequestException('Cannot receive a cancelled purchase');
    }

    if (purchase.status === PurchaseStatus.RETURNED) {
      throw new BadRequestException('Cannot receive a returned purchase');
    }

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
        await db.product.update({
          where: { id: purchaseItem.productId },
          data: {
            stockCurrent: {
              increment: quantityToAdd,
            },
          },
        });

        await db.stockMovement.create({
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

      await db.purchaseItem.update({
        where: { id: itemData.itemId },
        data: {
          receivedQty: itemData.receivedQuantity,
        },
      });
    }

    const allItemsReceived = purchase.items.every((item) => {
      const receivedItem = data.items.find((di) => di.itemId === item.id);
      const receivedQty = receivedItem?.receivedQuantity ?? item.receivedQty;
      return receivedQty === item.quantity;
    });

    const someItemsReceived = purchase.items.some((item) => {
      const receivedItem = data.items.find((di) => di.itemId === item.id);
      const receivedQty = receivedItem?.receivedQuantity ?? item.receivedQty;
      return receivedQty > 0;
    });

    let newStatus = purchase.status;
    if (allItemsReceived) {
      newStatus = PurchaseStatus.RECEIVED;
    } else if (someItemsReceived) {
      newStatus = PurchaseStatus.PARTIAL;
    }

    return db.purchase.update({
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
