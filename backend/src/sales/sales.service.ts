import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSaleDto } from './dto/sale.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { SaleType, PaymentMethod, SaleStatus } from '@prisma/client';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateSaleDto, userId: string) {
    // Vérifier que tous les produits existent et ont du stock
    const products = await Promise.all(
      data.items.map((item) =>
        this.prisma.product.findUnique({
          where: { id: item.productId },
        })
      )
    );

    for (let i = 0; i < products.length; i++) {
      if (!products[i]) {
        throw new NotFoundException(`Product ${data.items[i].productId} not found`);
      }
      if (products[i].stockCurrent < data.items[i].quantity) {
        throw new BadRequestException(
          `Insufficient stock for product ${products[i].name}`
        );
      }
    }

    // Calculer les totaux
    let subtotal = new Decimal(0);
    let totalMargin = new Decimal(0);

    const saleItems = data.items.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      const unitPrice = new Decimal(item.unitPrice || product.salePrice);
      const purchasePrice = new Decimal(product.purchasePrice);
      const discount = new Decimal(item.discount || 0);
      const quantity = item.quantity;
      const itemTotal = unitPrice.mul(quantity).sub(discount);
      const itemMargin = unitPrice.sub(purchasePrice).mul(quantity).sub(discount);

      subtotal = subtotal.add(itemTotal);
      totalMargin = totalMargin.add(itemMargin);

      return {
        productId: item.productId,
        quantity,
        unitPrice,
        discount,
        totalPrice: itemTotal,
        purchasePrice,
        margin: itemMargin,
      };
    });

    const discount = new Decimal(data.discount || 0);
    const finalSubtotal = subtotal.sub(discount);
    const taxRate = data.type === SaleType.INVOICE ? 0.2 : 0; // 20% TVA pour factures
    const tax = finalSubtotal.mul(taxRate);
    const total = finalSubtotal.add(tax);

    // Générer le numéro de ticket/facture
    const ticketNumber = data.type === SaleType.TICKET
      ? `TKT-${Date.now()}`
      : null;
    const invoiceNumber = data.type === SaleType.INVOICE
      ? `INV-${Date.now()}`
      : null;

    // Créer la vente
    const sale = await this.prisma.sale.create({
      data: {
        clientId: data.clientId,
        userId,
        cashRegisterId: data.cashRegisterId,
        type: data.type,
        status: SaleStatus.COMPLETED,
        ticketNumber,
        invoiceNumber,
        subtotal: finalSubtotal,
        discount,
        tax,
        total,
        paymentMethod: data.paymentMethod,
        cashAmount: data.cashAmount ? new Decimal(data.cashAmount) : null,
        cardAmount: data.cardAmount ? new Decimal(data.cardAmount) : null,
        margin: totalMargin,
        items: {
          create: saleItems,
        },
      },
      include: {
        client: true,
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
      },
    });

    // Mettre à jour le stock et créer les mouvements de stock
    for (const item of data.items) {
      const product = products.find((p) => p.id === item.productId);
      await this.prisma.product.update({
        where: { id: item.productId },
        data: {
          stockCurrent: {
            decrement: item.quantity,
          },
        },
      });

      await this.prisma.stockMovement.create({
        data: {
          productId: item.productId,
          type: 'SALE',
          quantity: -item.quantity,
          unitPrice: new Decimal(item.unitPrice || product.salePrice),
          totalValue: new Decimal(item.unitPrice || product.salePrice).mul(item.quantity),
          reference: ticketNumber || invoiceNumber || 'SALE',
          referenceId: sale.id,
          userId,
        },
      });
    }

    return sale;
  }

  async findAll(filters?: {
    startDate?: Date;
    endDate?: Date;
    clientId?: string;
    userId?: string;
    type?: SaleType;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    if (filters?.clientId) where.clientId = filters.clientId;
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.type) where.type = filters.type;

    const [sales, total] = await Promise.all([
      this.prisma.sale.findMany({
        where,
        include: {
          client: true,
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
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.sale.count({ where }),
    ]);

    return {
      data: sales,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        client: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
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
        refunds: true,
        cashRegister: true,
      },
    });

    if (!sale) {
      throw new NotFoundException('Sale not found');
    }

    return sale;
  }

  async cancel(id: string, userId: string) {
    const sale = await this.findOne(id);

    if (sale.status === SaleStatus.CANCELLED) {
      throw new BadRequestException('Sale already cancelled');
    }

    // Restaurer le stock
    for (const item of sale.items) {
      await this.prisma.product.update({
        where: { id: item.productId },
        data: {
          stockCurrent: {
            increment: item.quantity,
          },
        },
      });

      await this.prisma.stockMovement.create({
        data: {
          productId: item.productId,
          type: 'ADJUSTMENT',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          reference: 'CANCELLED_SALE',
          referenceId: sale.id,
          userId,
          reason: 'Annulation de vente',
        },
      });
    }

    return this.prisma.sale.update({
      where: { id },
      data: {
        status: SaleStatus.CANCELLED,
      },
      include: {
        client: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
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
        refunds: true,
        cashRegister: true,
      },
    });
  }
}

