import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CurrencyService } from '../currency/currency.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private currencyService: CurrencyService,
  ) {}

  async getStats(startDate?: Date, endDate?: Date) {
    const where: any = { status: 'COMPLETED' };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const defaultCode = await this.currencyService.getDefaultCurrencyCode();
    const rates = await this.currencyService.getLatestRates();

    const [
      totalSales,
      salesForTotals,
      topProducts,
      lowStockProducts,
      recentSales,
      totalPurchases,
      totalPurchaseAmount,
      pendingPurchases,
    ] = await Promise.all([
      this.prisma.sale.count({ where }),
      this.prisma.sale.findMany({
        where,
        select: { total: true, margin: true, currencyCode: true },
      }),
      this.prisma.saleItem.groupBy({
        by: ['productId'],
        where: { sale: where },
        _sum: {
          quantity: true,
          totalPrice: true,
        },
        orderBy: {
          _sum: {
            quantity: 'desc',
          },
        },
        take: 10,
      }),
      this.prisma.product.findMany({
        where: {
          isActive: true,
        },
        take: 50, // Prendre plus pour filtrer ensuite
      }),
      this.prisma.sale.findMany({
        where,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.purchase.count({
        where: {
          ...where,
          status: { in: ['RECEIVED', 'PARTIAL'] },
        },
      }),
      this.prisma.purchase.aggregate({
        where: {
          ...where,
          status: { in: ['RECEIVED', 'PARTIAL'] },
        },
        _sum: {
          totalAmount: true,
        },
      }),
      this.prisma.purchase.count({
        where: {
          ...where,
          status: 'PENDING',
        },
      }),
    ]);

    // Filtrer les produits avec stock bas
    const filteredLowStock = lowStockProducts
      .filter((p) => p.stockCurrent <= p.stockMin)
      .sort((a, b) => a.stockCurrent - b.stockCurrent)
      .slice(0, 10);

    // Enrichir les top produits avec les infos produits
    const topProductsWithDetails = await Promise.all(
      topProducts.map(async (item) => {
        const product = await this.prisma.product.findUnique({
          where: { id: item.productId },
          select: {
            id: true,
            name: true,
            sku: true,
            salePrice: true,
          },
        });
        return {
          ...item,
          product,
        };
      })
    );

    let totalRevenue = 0;
    let totalMargin = 0;
    for (const s of salesForTotals) {
      const code = s.currencyCode || 'TND';
      totalRevenue += this.currencyService.convert(Number(s.total), code, defaultCode, rates);
      totalMargin += s.margin
        ? this.currencyService.convert(Number(s.margin), code, defaultCode, rates)
        : 0;
    }

    return {
      totalSales,
      defaultCurrencyCode: defaultCode,
      totalRevenue: new Decimal(totalRevenue.toFixed(2)),
      totalMargin: new Decimal(totalMargin.toFixed(2)),
      topProducts: topProductsWithDetails,
      lowStockProducts: filteredLowStock,
      recentSales,
      totalPurchases,
      totalPurchaseAmount: totalPurchaseAmount._sum.totalAmount || new Decimal(0),
      pendingPurchases,
    };
  }

  async getSalesChart(startDate: Date, endDate: Date, groupBy: 'day' | 'week' | 'month' = 'day') {
    const sales = await this.prisma.sale.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: 'COMPLETED',
      },
      select: {
        createdAt: true,
        total: true,
        margin: true,
        currencyCode: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const defaultCode = await this.currencyService.getDefaultCurrencyCode();
    const rates = await this.currencyService.getLatestRates();

    return sales.map((s) => ({
      date: s.createdAt,
      value: this.currencyService.convert(
        Number(s.total),
        s.currencyCode || 'TND',
        defaultCode,
        rates,
      ),
      margin: s.margin
        ? this.currencyService.convert(
            Number(s.margin),
            s.currencyCode || 'TND',
            defaultCode,
            rates,
          )
        : 0,
    }));
  }
}

