import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StockMovementType } from '@prisma/client';
import { CreateDamageDto } from './dto/damage.dto';
import { Decimal } from '@prisma/client/runtime/library';

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

  async getLowStockProducts() {
    // Récupérer tous les produits actifs et filtrer en mémoire
    // Note: Pour une vraie requête SQL, on utiliserait une requête brute Prisma
    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
      },
      include: {
        category: true,
      },
    });

    // Filtrer les produits avec stock <= stockMin
    return products
      .filter((p) => p.stockCurrent <= p.stockMin)
      .sort((a, b) => a.stockCurrent - b.stockCurrent);
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

