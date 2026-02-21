import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats(startDate?: Date, endDate?: Date) {
    const where: any = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [
      totalSales,
      totalRevenue,
      totalMargin,
      topProducts,
      lowStockProducts,
      recentSales,
      totalPurchases,
      totalPurchaseAmount,
      pendingPurchases,
    ] = await Promise.all([
      this.prisma.sale.count({
        where: {
          ...where,
          status: 'COMPLETED',
        },
      }),
      this.prisma.sale.aggregate({
        where: {
          ...where,
          status: 'COMPLETED',
        },
        _sum: {
          total: true,
        },
      }),
      this.prisma.sale.aggregate({
        where: {
          ...where,
          status: 'COMPLETED',
        },
        _sum: {
          margin: true,
        },
      }),
      this.prisma.saleItem.groupBy({
        by: ['productId'],
        where: {
          sale: {
            ...where,
            status: 'COMPLETED',
          },
        },
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
        where: {
          ...where,
          status: 'COMPLETED',
        },
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

    return {
      totalSales,
      totalRevenue: totalRevenue._sum.total || new Decimal(0),
      totalMargin: totalMargin._sum.margin || new Decimal(0),
      topProducts: topProductsWithDetails,
      lowStockProducts: filteredLowStock,
      recentSales,
      totalPurchases,
      totalPurchaseAmount: totalPurchaseAmount._sum.totalAmount || new Decimal(0),
      pendingPurchases,
    };
  }

  async getSalesChart(startDate: Date, endDate: Date, groupBy: 'day' | 'week' | 'month' = 'day') {
    // Cette fonction nécessiterait une requête SQL brute pour grouper par période
    // Pour l'instant, on retourne les ventes par jour
    const sales = await this.prisma.sale.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        status: 'COMPLETED',
      },
      select: {
        createdAt: true,
        total: true,
        margin: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return sales;
  }
}

