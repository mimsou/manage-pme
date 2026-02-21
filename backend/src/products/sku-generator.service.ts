import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SkuGeneratorService {
  constructor(private prisma: PrismaService) {}

  /**
   * Génère un SKU à partir d'une chaîne de construction
   * Exemple: "T-shirt" + ["NOIR", "M"] = "TS-NOIR-M"
   */
  generateSku(baseName: string, components: string[]): string {
    // Prendre les 2 premières lettres du nom de base en majuscules
    const basePrefix = baseName
      .replace(/[^a-zA-Z0-9]/g, '') // Enlever caractères spéciaux
      .substring(0, 2)
      .toUpperCase();
    
    // Joindre les composants avec des tirets
    const componentsStr = components
      .map(c => c.toUpperCase().replace(/[^a-zA-Z0-9]/g, ''))
      .filter(c => c.length > 0)
      .join('-');
    
    return componentsStr ? `${basePrefix}-${componentsStr}` : basePrefix;
  }

  /**
   * Récupère les suggestions d'auto-complétion pour un type de composant
   */
  async getComponentSuggestions(type: string, search?: string): Promise<string[]> {
    const where: any = { type };
    if (search) {
      where.value = { contains: search, mode: 'insensitive' };
    }
    
    const components = await this.prisma.skuComponent.findMany({
      where,
      select: { value: true },
      distinct: ['value'],
      orderBy: { value: 'asc' },
      take: 20,
    });
    
    return components.map(c => c.value);
  }

  /**
   * Sauvegarde un composant SKU pour l'auto-complétion
   */
  async saveComponent(type: string, value: string): Promise<void> {
    await this.prisma.skuComponent.upsert({
      where: {
        type_value: { type, value: value.toUpperCase() },
      },
      update: {},
      create: {
        type,
        value: value.toUpperCase(),
      },
    });
  }

  /**
   * Sauvegarde plusieurs composants SKU
   */
  async saveComponents(components: Array<{ type: string; value: string }>): Promise<void> {
    for (const component of components) {
      await this.saveComponent(component.type, component.value);
    }
  }
}


