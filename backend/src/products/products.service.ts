import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SkuGeneratorService } from './sku-generator.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { CreateProductWithVariantsDto } from './dto/create-product-with-variants.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private skuGenerator: SkuGeneratorService,
  ) {}

  async create(data: CreateProductDto) {
    const existingSku = await this.prisma.product.findUnique({
      where: { sku: data.sku },
    });
    if (existingSku) {
      throw new BadRequestException('Ce SKU existe déjà. Veuillez utiliser un SKU unique.');
    }

    const { barcode: _b, ...rest } = data;
    const product = await this.prisma.product.create({
      data: {
        ...rest,
        barcode: data.sku,
        purchasePrice: new Decimal(data.purchasePrice),
        salePrice: new Decimal(data.salePrice),
      },
      include: {
        category: true,
        variants: true,
      },
    });

    // Créer un historique de prix
    await this.prisma.priceHistory.create({
      data: {
        productId: product.id,
        purchasePrice: new Decimal(data.purchasePrice),
        salePrice: new Decimal(data.salePrice),
        reason: 'Création produit',
      },
    });

    return product;
  }

  async findAll(filters?: {
    categoryId?: string;
    search?: string;
    lowStock?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters?.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } },
        { barcode: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters?.lowStock) {
      // Les produits avec stock actuel <= stock minimum
      // Note: Cette condition nécessite une requête plus complexe, on l'implémentera avec une requête brute si nécessaire
      // Pour l'instant, on garde une condition simple
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          category: true,
          variants: true,
          _count: {
            select: { stockMovements: true, saleItems: true },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByBarcode(barcode: string) {
    const product = await this.prisma.product.findUnique({
      where: { barcode },
      include: {
        category: true,
        variants: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        variants: true,
        priceHistory: {
          orderBy: { changedAt: 'desc' },
          take: 10,
        },
        supplierProducts: {
          include: {
            supplier: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(id: string, data: UpdateProductDto) {
    const product = await this.findOne(id);

    // Vérifier si le SKU est modifié et s'il existe déjà pour un autre produit
    if (data.sku && data.sku !== product.sku) {
      const existingSku = await this.prisma.product.findUnique({
        where: { sku: data.sku },
      });
      if (existingSku && existingSku.id !== id) {
        throw new BadRequestException('Ce SKU existe déjà. Veuillez utiliser un SKU unique.');
      }
    }

    // Si le prix change, créer un historique
    if (data.purchasePrice || data.salePrice) {
      await this.prisma.priceHistory.create({
        data: {
          productId: id,
          purchasePrice: data.purchasePrice
            ? new Decimal(data.purchasePrice)
            : product.purchasePrice,
          salePrice: data.salePrice ? new Decimal(data.salePrice) : product.salePrice,
          reason: data.priceChangeReason || 'Mise à jour',
        },
      });
    }

    const { barcode: _b, ...rest } = data;
    const updateData: any = {
      ...rest,
      purchasePrice: data.purchasePrice ? new Decimal(data.purchasePrice) : undefined,
      salePrice: data.salePrice ? new Decimal(data.salePrice) : undefined,
      barcode: (data.sku !== undefined ? data.sku : product.sku) as string,
    };
    return this.prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        variants: true,
      },
    });
  }

  async remove(id: string) {
    return this.prisma.product.delete({
      where: { id },
    });
  }

  /**
   * Créer un produit avec plusieurs variantes
   * Chaque variante est créée comme un produit séparé dans la liste
   */
  async createWithVariants(data: CreateProductWithVariantsDto) {
    // Générer les SKU et préparer les données pour chaque variante
    const variantsData = await Promise.all(
      data.variants.map(async (variant) => {
        const componentValues = variant.attributes.map((attr) => attr.value);
        const generatedSku = this.skuGenerator.generateSku(data.name, componentValues);

        // Sauvegarder les composants pour l'auto-complétion
        const components = variant.attributes.map((attr) => ({
          type: attr.type,
          value: attr.value,
        }));
        await this.skuGenerator.saveComponents(components);

        // Construire le nom du produit avec les attributs
        const attributesStr = variant.attributes
          .map((attr) => `${attr.type}: ${attr.value}`)
          .join(', ');
        const productName = `${data.name} (${attributesStr})`;

        // Chaque variante doit avoir ses propres prix
        if (!variant.purchasePrice || !variant.salePrice) {
          throw new BadRequestException(
            `La variante avec SKU ${generatedSku} doit avoir un prix d'achat et un prix de vente définis`,
          );
        }

        return {
          name: productName,
          sku: generatedSku,
          purchasePrice: new Decimal(variant.purchasePrice),
          salePrice: new Decimal(variant.salePrice),
          stockCurrent: variant.stockCurrent,
          stockMin: variant.stockMin,
          barcode: generatedSku,
        };
      }),
    );

    // Vérifier l'unicité des SKU
    const skus = variantsData.map((v) => v.sku);
    const existingProducts = await this.prisma.product.findMany({
      where: { sku: { in: skus } },
    });
    if (existingProducts.length > 0) {
      throw new BadRequestException(
        `Les SKU suivants existent déjà: ${existingProducts.map((p) => p.sku).join(', ')}`,
      );
    }

    // Créer un produit séparé pour chaque variante
    const createdProducts = await Promise.all(
      variantsData.map(async (variantData) => {
        const product = await this.prisma.product.create({
          data: {
            name: variantData.name,
            description: data.description,
            categoryId: data.categoryId,
            sku: variantData.sku,
            barcode: variantData.barcode,
            purchasePrice: variantData.purchasePrice,
            salePrice: variantData.salePrice,
            unit: data.unit ?? 'pièce',
            stockCurrent: variantData.stockCurrent,
            stockMin: variantData.stockMin,
            hasVariants: false,
          },
          include: {
            category: true,
            variants: true,
          },
        });

        // Créer un historique de prix pour chaque produit
        await this.prisma.priceHistory.create({
          data: {
            productId: product.id,
            purchasePrice: variantData.purchasePrice,
            salePrice: variantData.salePrice,
            reason: 'Création produit variante',
          },
        });

        return product;
      }),
    );

    return createdProducts;
  }

  /**
   * Récupère les suggestions d'auto-complétion pour un type de composant SKU
   */
  async getSkuComponentSuggestions(type: string, search?: string): Promise<string[]> {
    return this.skuGenerator.getComponentSuggestions(type, search);
  }
}

