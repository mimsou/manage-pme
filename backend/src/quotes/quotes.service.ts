import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SalesService } from '../sales/sales.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { ConvertToSaleDto } from './dto/convert-to-sale.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { QuoteStatus } from '@prisma/client';
import { SaleType, PaymentMethod } from '@prisma/client';

@Injectable()
export class QuotesService {
  constructor(
    private prisma: PrismaService,
    private salesService: SalesService,
  ) {}

  async create(data: CreateQuoteDto, userId: string) {
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
    }

    let subtotal = new Decimal(0);
    const quoteItems = data.items.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      const unitPrice = new Decimal(item.unitPrice ?? Number(product!.salePrice));
      const discount = new Decimal(item.discount ?? 0);
      const quantity = item.quantity;
      const itemTotal = unitPrice.mul(quantity).sub(discount);
      subtotal = subtotal.add(itemTotal);
      return {
        productId: item.productId,
        quantity,
        unitPrice,
        discount,
        totalPrice: itemTotal,
      };
    });

    const discount = new Decimal(data.discount ?? 0);
    const finalSubtotal = subtotal.sub(discount);
    const taxRate = 0.2; // TVA 20% pour devis (aligné facture B2B)
    const tax = finalSubtotal.mul(taxRate);
    const total = finalSubtotal.add(tax);

    const company = await this.prisma.company.findFirst();
    const defaultCurrency = company?.defaultCurrencyCode ?? 'TND';
    const currencyCode = data.currencyCode?.trim() || defaultCurrency;

    const quoteNumber = `DEV-${Date.now()}`;
    const validUntil = data.validUntil ? new Date(data.validUntil) : null;

    const quote = await this.prisma.quote.create({
      data: {
        quoteNumber,
        clientId: data.clientId,
        userId,
        status: QuoteStatus.DRAFT,
        subtotal: finalSubtotal,
        discount,
        tax,
        total,
        validUntil,
        notes: data.notes ?? null,
        currencyCode,
        items: {
          create: quoteItems,
        },
      },
      include: {
        client: true,
        user: { select: { id: true, firstName: true, lastName: true } },
        items: { include: { product: true } },
      },
    });

    return quote;
  }

  async findAll(filters?: {
    startDate?: Date;
    endDate?: Date;
    clientId?: string;
    status?: QuoteStatus;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) (where.createdAt as any).gte = filters.startDate;
      if (filters.endDate) (where.createdAt as any).lte = filters.endDate;
    }
    if (filters?.clientId) where.clientId = filters.clientId;
    if (filters?.status) where.status = filters.status;

    const [quotes, total] = await Promise.all([
      this.prisma.quote.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: true,
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.quote.count({ where }),
    ]);

    return { data: quotes, total, page, limit };
  }

  async findOne(id: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: {
        client: true,
        user: { select: { id: true, firstName: true, lastName: true } },
        items: { include: { product: true } },
        convertedSale: true,
      },
    });
    if (!quote) {
      throw new NotFoundException('Devis introuvable');
    }
    return quote;
  }

  async convertToSale(quoteId: string, userId: string, dto: ConvertToSaleDto) {
    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
      include: { items: { include: { product: true } }, client: true },
    });
    if (!quote) {
      throw new NotFoundException('Devis introuvable');
    }
    if (quote.status === QuoteStatus.CONVERTED) {
      throw new BadRequestException('Ce devis a déjà été converti en facture.');
    }
    if (quote.convertedSaleId) {
      throw new BadRequestException('Ce devis a déjà été converti en facture.');
    }

    const quantityMap = new Map<string, number>();
    if (dto.quantities && dto.quantities.length > 0) {
      for (const q of dto.quantities) {
        const item = quote.items.find((i) => i.id === q.quoteItemId);
        if (!item) {
          throw new BadRequestException(`Ligne de devis inconnue: ${q.quoteItemId}`);
        }
        if (q.quantity < 1 || q.quantity > item.quantity) {
          throw new BadRequestException(
            `Quantité invalide pour ${item.product.name}: entre 1 et ${item.quantity}`,
          );
        }
        quantityMap.set(item.id, q.quantity);
      }
      // Ne garder que les lignes présentes dans quantities
    }

    const items =
      quantityMap.size > 0
        ? quote.items
            .filter((i) => quantityMap.has(i.id))
            .map((i) => ({
              productId: i.productId,
              quantity: quantityMap.get(i.id)!,
              unitPrice: Number(i.unitPrice),
              discount: Number(i.discount),
            }))
        : quote.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: Number(i.unitPrice),
            discount: Number(i.discount),
          }));

    if (items.length === 0) {
      throw new BadRequestException('Aucune ligne à facturer.');
    }

    const createSaleDto = {
      clientId: quote.clientId ?? undefined,
      type: SaleType.INVOICE,
      items,
      discount: Number(quote.discount),
      paymentMethod: PaymentMethod.CREDIT as PaymentMethod,
      currencyCode: quote.currencyCode ?? undefined,
    };

    const sale = await this.salesService.create(createSaleDto, userId);

    await this.prisma.quote.update({
      where: { id: quoteId },
      data: {
        status: QuoteStatus.CONVERTED,
        convertedSaleId: sale.id,
      },
    });

    return this.salesService.findOne(sale.id);
  }

  async updateStatus(quoteId: string, status: QuoteStatus) {
    const quote = await this.prisma.quote.findUnique({ where: { id: quoteId } });
    if (!quote) {
      throw new NotFoundException('Devis introuvable');
    }
    if (quote.status === QuoteStatus.CONVERTED) {
      throw new BadRequestException('Impossible de modifier un devis déjà converti.');
    }
    return this.prisma.quote.update({
      where: { id: quoteId },
      data: { status },
      include: {
        client: true,
        user: { select: { id: true, firstName: true, lastName: true } },
        items: { include: { product: true } },
      },
    });
  }
}
