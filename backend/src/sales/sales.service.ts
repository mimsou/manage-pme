import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSaleDto } from './dto/sale.dto';
import { CreateRefundDto } from './dto/create-refund.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { SaleType, PaymentMethod, SaleStatus } from '@prisma/client';
import { StockMovementType } from '@prisma/client';

@Injectable()
export class SalesService {
  constructor(
    private prisma: PrismaService,
  ) {}

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

    const company = await this.prisma.company.findFirst();
    const defaultCurrency = company?.defaultCurrencyCode ?? 'TND';
    const currencyCode = data.currencyCode?.trim() || defaultCurrency;

    const isCreditSale = (data.paymentMethod as string) === 'CREDIT';
    const cashAmt = !isCreditSale && data.cashAmount != null ? new Decimal(data.cashAmount) : new Decimal(0);
    const cardAmt = !isCreditSale && data.cardAmount != null ? new Decimal(data.cardAmount) : new Decimal(0);
    const amountPaid = isCreditSale ? new Decimal(0) : cashAmt.add(cardAmt);
    const dueDate = data.dueDate ? new Date(data.dueDate) : (data.type === SaleType.INVOICE ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null);

    const paymentMethodValue = isCreditSale ? 'CREDIT' : data.paymentMethod;
    let sale;
    try {
      sale = await this.prisma.sale.create({
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
          amountPaid,
          dueDate,
          paymentMethod: paymentMethodValue as PaymentMethod,
          cashAmount: !isCreditSale && data.cashAmount != null ? cashAmt : null,
          cardAmount: !isCreditSale && data.cardAmount != null ? cardAmt : null,
          margin: totalMargin,
          currencyCode,
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
    } catch (err: any) {
      const msg = err?.message ?? '';
      if (isCreditSale && (msg.includes('PaymentMethod') || msg.includes('enum') || msg.includes('invalid input value'))) {
        throw new BadRequestException(
          'La valeur CREDIT pour le paiement n\'est pas reconnue en base. Exécutez la migration : npx prisma migrate deploy (dans le dossier backend).'
        );
      }
      throw err;
    }

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

  /** Enregistrer un règlement (crédit client) sur une vente */
  async recordPayment(id: string, amount: number) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: { client: true, items: { include: { product: true } } },
    });
    if (!sale) throw new NotFoundException('Vente non trouvée');
    if (sale.status === SaleStatus.CANCELLED) {
      throw new BadRequestException('Impossible d\'enregistrer un règlement sur une vente annulée.');
    }
    const total = Number(sale.total);
    const currentPaid = Number(sale.amountPaid);
    const due = total - currentPaid;
    if (due <= 0) throw new BadRequestException('Cette vente est déjà entièrement réglée.');
    const paymentAmount = Math.min(amount, due);
    const newAmountPaid = new Decimal(currentPaid + paymentAmount);
    return this.prisma.sale.update({
      where: { id },
      data: { amountPaid: newAmountPaid },
      include: {
        client: true,
        user: { select: { id: true, firstName: true, lastName: true } },
        items: { include: { product: true } },
      },
    });
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

  /** Créer un avoir (note de crédit) sur une vente — conforme aux usages tunisiens */
  async createRefund(saleId: string, dto: CreateRefundDto, userId: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        client: true,
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        items: { include: { product: true } },
        refunds: true,
      },
    });

    if (!sale) throw new NotFoundException('Vente non trouvée');
    if (sale.status === SaleStatus.CANCELLED) {
      throw new BadRequestException('Impossible de créer un avoir sur une vente annulée.');
    }

    // Quantités déjà remboursées par ligne (avoir précédents)
    const refundedByItemId: Record<string, number> = {};
    for (const ref of sale.refunds) {
      const items = (ref.refundedItems as Array<{ saleItemId: string; quantity: number }>) || [];
      for (const it of items) {
        refundedByItemId[it.saleItemId] = (refundedByItemId[it.saleItemId] || 0) + it.quantity;
      }
    }

    const saleItemMap = new Map(sale.items.map((i) => [i.id, i]));
    let totalRefundAmount = new Decimal(0);
    const refundedItemsPayload: Array<{
      saleItemId: string;
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: Decimal;
      totalPrice: Decimal;
      taxAmount?: number;
    }> = [];

    for (const req of dto.items) {
      const saleItem = saleItemMap.get(req.saleItemId);
      if (!saleItem) {
        throw new BadRequestException(`Ligne de vente invalide: ${req.saleItemId}`);
      }
      const alreadyRefunded = refundedByItemId[req.saleItemId] || 0;
      const maxQty = saleItem.quantity - alreadyRefunded;
      if (maxQty <= 0) {
        throw new BadRequestException(
          `Quantité déjà remboursée pour le produit "${saleItem.product?.name}".`,
        );
      }
      if (req.quantity > maxQty) {
        throw new BadRequestException(
          `Quantité avoir (${req.quantity}) supérieure au restant remboursable (${maxQty}) pour "${saleItem.product?.name}".`,
        );
      }

      const unitPrice = saleItem.unitPrice;
      const totalPrice = unitPrice.mul(req.quantity).sub(saleItem.discount.mul(req.quantity).div(saleItem.quantity));
      totalRefundAmount = totalRefundAmount.add(totalPrice);

      refundedItemsPayload.push({
        saleItemId: saleItem.id,
        productId: saleItem.productId,
        productName: saleItem.product?.name || 'Produit',
        quantity: req.quantity,
        unitPrice,
        totalPrice,
      });
    }

    if (refundedItemsPayload.length === 0) {
      throw new BadRequestException('Aucune ligne à rembourser.');
    }

    // TVA proportionnelle si facture (20 %)
    const taxRate = sale.type === SaleType.INVOICE ? 0.2 : 0;
    const subtotalRefund = totalRefundAmount;
    const taxRefund = subtotalRefund.mul(taxRate);
    const totalWithTax = subtotalRefund.add(taxRefund);

    // Numéro d'avoir unique (norme tunisienne : référence unique)
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.prisma.saleRefund.count({
      where: { avoirNumber: { startsWith: `AV-${today}` } },
    });
    const avoirNumber = `AV-${today}-${String(count + 1).padStart(3, '0')}`;

    // Créer l'avoir
    const refund = await this.prisma.saleRefund.create({
      data: {
        saleId,
        avoirNumber,
        reason: dto.reason || null,
        refundAmount: totalWithTax,
        refundedItems: refundedItemsPayload as any,
        userId,
      },
    });

    // Restaurer le stock et créer les mouvements (traçabilité)
    for (const it of refundedItemsPayload) {
      await this.prisma.product.update({
        where: { id: it.productId },
        data: { stockCurrent: { increment: it.quantity } },
      });
      await this.prisma.stockMovement.create({
        data: {
          productId: it.productId,
          type: StockMovementType.REFUND,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          totalValue: it.totalPrice,
          reference: avoirNumber,
          referenceId: refund.id,
          userId,
          reason: `Avoir ${avoirNumber} - Référence: ${sale.invoiceNumber || sale.ticketNumber || sale.id}`,
        },
      });
    }

    // Si la vente est intégralement remboursée, passer en REFUNDED
    const totalAlreadyRefunded = sale.refunds.reduce((s, r) => s + Number(r.refundAmount), 0);
    const newTotalRefunded = totalAlreadyRefunded + Number(totalWithTax);
    if (Math.abs(newTotalRefunded - Number(sale.total)) < 0.02) {
      await this.prisma.sale.update({
        where: { id: saleId },
        data: { status: SaleStatus.REFUNDED },
      });
    }

    return this.prisma.saleRefund.findUnique({
      where: { id: refund.id },
      include: {
        sale: {
          include: {
            client: true,
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
            items: { include: { product: true } },
          },
        },
      },
    });
  }
}

