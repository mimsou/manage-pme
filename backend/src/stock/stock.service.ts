import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PurchaseStatus, StockMovementType } from '@prisma/client';
import { CreateDamageDto } from './dto/damage.dto';
import { Decimal } from '@prisma/client/runtime/library';

function decToNum(v: Decimal | null | undefined): number {
  if (v == null) return 0;
  return Number(v);
}

@Injectable()
export class StockService {
  constructor(private prisma: PrismaService) {}

  async getMovements(filters?: {
    productId?: string;
    type?: StockMovementType;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters?.productId) where.productId = filters.productId;
    if (filters?.type) where.type = filters.type;

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const [movements, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
            },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          supplier: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return {
      data: movements,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * PMP unitaire par produit (niveau parent) à partir des réceptions d’achat.
   */
  private async computePmpByProductId(): Promise<Map<string, { pmpUnit: number; source: 'purchases' }>> {
    const rows = await this.prisma.purchaseItem.findMany({
      where: {
        receivedQty: { gt: 0 },
        purchase: {
          status: { in: [PurchaseStatus.RECEIVED, PurchaseStatus.PARTIAL] },
        },
      },
      select: {
        productId: true,
        receivedQty: true,
        unitPrice: true,
      },
    });

    const acc = new Map<string, { sumQty: number; sumWeighted: number }>();
    for (const row of rows) {
      const qty = row.receivedQty;
      const price = decToNum(row.unitPrice);
      const prev = acc.get(row.productId) ?? { sumQty: 0, sumWeighted: 0 };
      prev.sumQty += qty;
      prev.sumWeighted += qty * price;
      acc.set(row.productId, prev);
    }

    const out = new Map<string, { pmpUnit: number; source: 'purchases' }>();
    for (const [productId, v] of acc) {
      if (v.sumQty > 0) {
        out.set(productId, { pmpUnit: v.sumWeighted / v.sumQty, source: 'purchases' });
      }
    }
    return out;
  }

  async getSnapshot() {
    const [products, pmpByProduct] = await Promise.all([
      this.prisma.product.findMany({
        where: { isActive: true },
        include: {
          category: true,
          variants: true,
        },
        orderBy: { name: 'asc' },
      }),
      this.computePmpByProductId(),
    ]);

    type Line = {
      lineKey: string;
      productId: string;
      productName: string;
      categoryId: string;
      categoryName: string;
      variantId: string | null;
      variantLabel: string | null;
      sku: string;
      barcode: string | null;
      qty: number;
      stockMin: number;
      isLowStock: boolean;
      unitPurchasePrice: number;
      unitSalePrice: number;
      pmpUnit: number;
      pmpSource: 'purchases' | 'catalog';
      valuePurchase: number;
      valueSale: number;
      valuePmp: number;
    };

    const lines: Line[] = [];

    const totals = {
      totalQty: 0,
      valuePurchase: 0,
      valueSale: 0,
      valuePmp: 0,
    };

    const byCategory = new Map<
      string,
      {
        categoryId: string;
        categoryName: string;
        totalQty: number;
        valuePurchase: number;
        valueSale: number;
        valuePmp: number;
      }
    >();

    const bumpCategory = (
      categoryId: string,
      categoryName: string,
      qty: number,
      vp: number,
      vs: number,
      vmp: number,
    ) => {
      const prev = byCategory.get(categoryId) ?? {
        categoryId,
        categoryName,
        totalQty: 0,
        valuePurchase: 0,
        valueSale: 0,
        valuePmp: 0,
      };
      prev.totalQty += qty;
      prev.valuePurchase += vp;
      prev.valueSale += vs;
      prev.valuePmp += vmp;
      byCategory.set(categoryId, prev);
    };

    for (const p of products) {
      const catId = p.categoryId;
      const catName = p.category?.name ?? '—';

      const pmpEntry = pmpByProduct.get(p.id);
      const catalogPurchase = decToNum(p.purchasePrice);
      const pmpUnitBase = pmpEntry?.pmpUnit ?? catalogPurchase;
      const pmpSource: 'purchases' | 'catalog' = pmpEntry ? 'purchases' : 'catalog';

      const hasVariantRows = p.variants.length > 0;

      if (hasVariantRows) {
        for (const v of p.variants) {
          const qty = v.stockCurrent;
          const unitPurchase = v.purchasePrice != null ? decToNum(v.purchasePrice) : catalogPurchase;
          const unitSale = v.salePrice != null ? decToNum(v.salePrice) : decToNum(p.salePrice);
          const vp = qty * unitPurchase;
          const vs = qty * unitSale;
          const vmp = qty * pmpUnitBase;

          const isLow = qty <= v.stockMin;

          const line: Line = {
            lineKey: `${p.id}:${v.id}`,
            productId: p.id,
            productName: p.name,
            categoryId: catId,
            categoryName: catName,
            variantId: v.id,
            variantLabel: `${v.name}: ${v.value}`,
            sku: v.sku,
            barcode: v.barcode ?? null,
            qty,
            stockMin: v.stockMin,
            isLowStock: isLow,
            unitPurchasePrice: unitPurchase,
            unitSalePrice: unitSale,
            pmpUnit: pmpUnitBase,
            pmpSource,
            valuePurchase: vp,
            valueSale: vs,
            valuePmp: vmp,
          };
          lines.push(line);
          totals.totalQty += qty;
          totals.valuePurchase += vp;
          totals.valueSale += vs;
          totals.valuePmp += vmp;
          bumpCategory(catId, catName, qty, vp, vs, vmp);
        }
      } else {
        const qty = p.stockCurrent;
        const unitPurchase = catalogPurchase;
        const unitSale = decToNum(p.salePrice);
        const vp = qty * unitPurchase;
        const vs = qty * unitSale;
        const vmp = qty * pmpUnitBase;
        const isLow = qty <= p.stockMin;

        lines.push({
          lineKey: p.id,
          productId: p.id,
          productName: p.name,
          categoryId: catId,
          categoryName: catName,
          variantId: null,
          variantLabel: null,
          sku: p.sku,
          barcode: p.barcode ?? null,
          qty,
          stockMin: p.stockMin,
          isLowStock: isLow,
          unitPurchasePrice: unitPurchase,
          unitSalePrice: unitSale,
          pmpUnit: pmpUnitBase,
          pmpSource,
          valuePurchase: vp,
          valueSale: vs,
          valuePmp: vmp,
        });
        totals.totalQty += qty;
        totals.valuePurchase += vp;
        totals.valueSale += vs;
        totals.valuePmp += vmp;
        bumpCategory(catId, catName, qty, vp, vs, vmp);
      }
    }

    return {
      generatedAt: new Date().toISOString(),
      totals,
      byCategory: Array.from(byCategory.values()).sort((a, b) =>
        a.categoryName.localeCompare(b.categoryName, 'fr'),
      ),
      lines,
    };
  }

  async getLowStockProducts() {
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      include: { category: true, variants: true },
    });

    const lines: Array<{
      productId: string;
      productName: string;
      sku: string;
      stockCurrent: number;
      stockMin: number;
      categoryId: string;
      categoryName: string;
      variantId: string | null;
      variantLabel: string | null;
    }> = [];

    for (const p of products) {
      const catName = p.category?.name ?? '—';
      if (p.variants.length > 0) {
        for (const v of p.variants) {
          if (v.stockCurrent <= v.stockMin) {
            lines.push({
              productId: p.id,
              productName: p.name,
              sku: v.sku,
              stockCurrent: v.stockCurrent,
              stockMin: v.stockMin,
              categoryId: p.categoryId,
              categoryName: catName,
              variantId: v.id,
              variantLabel: `${v.name}: ${v.value}`,
            });
          }
        }
      } else if (p.stockCurrent <= p.stockMin) {
        lines.push({
          productId: p.id,
          productName: p.name,
          sku: p.sku,
          stockCurrent: p.stockCurrent,
          stockMin: p.stockMin,
          categoryId: p.categoryId,
          categoryName: catName,
          variantId: null,
          variantLabel: null,
        });
      }
    }

    return lines.sort((a, b) => a.stockCurrent - b.stockCurrent);
  }

  async getProductStockHistory(productId: string) {
    const movements = await this.prisma.stockMovement.findMany({
      where: { productId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
      },
    });

    return {
      product,
      movements,
    };
  }

  async createDamage(data: CreateDamageDto, userId: string) {
    // Vérifier que le produit existe
    const product = await this.prisma.product.findUnique({
      where: { id: data.productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Vérifier que le type est DAMAGE ou LOSS
    if (data.type !== 'DAMAGE' && data.type !== 'LOSS') {
      throw new BadRequestException('Type must be DAMAGE or LOSS');
    }

    // Vérifier que la quantité n'est pas 0
    if (data.quantity === 0) {
      throw new BadRequestException('Quantity cannot be zero');
    }

    // Vérifier que si on retire du stock, il y en a assez
    if (data.quantity < 0 && product.stockCurrent < Math.abs(data.quantity)) {
      throw new BadRequestException('Insufficient stock');
    }

    // Mettre à jour le stock
    await this.prisma.product.update({
      where: { id: data.productId },
      data: {
        stockCurrent: {
          increment: data.quantity,
        },
      },
    });

    // Créer le mouvement de stock
    const movement = await this.prisma.stockMovement.create({
      data: {
        productId: data.productId,
        type: data.type as StockMovementType,
        quantity: data.quantity,
        unitPrice: product.purchasePrice,
        totalValue: product.purchasePrice.mul(Math.abs(data.quantity)),
        reason: data.reason,
        reference: 'DAMAGE',
        userId,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return movement;
  }
}

