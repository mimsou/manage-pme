import { PrismaClient, UserRole, ClientType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Nettoyer les données existantes (optionnel, pour éviter les doublons)
  console.log('🧹 Cleaning existing data...');
  await prisma.supplierProduct.deleteMany();
  await prisma.purchaseItem.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.saleRefund.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.cashRegister.deleteMany();
  await prisma.priceHistory.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.client.deleteMany();
  await prisma.supplierContact.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  // Hash password for users
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Create users
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'System',
      role: UserRole.ADMIN,
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@example.com' },
    update: {},
    create: {
      email: 'manager@example.com',
      password: hashedPassword,
      firstName: 'Manager',
      lastName: 'User',
      role: UserRole.MANAGER,
    },
  });

  const vendeur = await prisma.user.upsert({
    where: { email: 'vendeur@example.com' },
    update: {},
    create: {
      email: 'vendeur@example.com',
      password: hashedPassword,
      firstName: 'Vendeur',
      lastName: 'User',
      role: UserRole.VENDEUR,
    },
  });

  console.log('✅ Users created');

  // Create categories
  // Note: We use findFirst/upsert with name since Category.id is UUID and auto-generated
  let categoryElectronique = await prisma.category.findFirst({
    where: { name: 'Électronique' },
  });
  if (!categoryElectronique) {
    categoryElectronique = await prisma.category.create({
      data: {
        name: 'Électronique',
        description: 'Produits électroniques',
      },
    });
  }

  let categoryVetements = await prisma.category.findFirst({
    where: { name: 'Vêtements' },
  });
  if (!categoryVetements) {
    categoryVetements = await prisma.category.create({
      data: {
        name: 'Vêtements',
        description: 'Vêtements et accessoires',
      },
    });
  }

  let categoryCosmetique = await prisma.category.findFirst({
    where: { name: 'Cosmétique' },
  });
  if (!categoryCosmetique) {
    categoryCosmetique = await prisma.category.create({
      data: {
        name: 'Cosmétique',
        description: 'Produits cosmétiques',
      },
    });
  }

  console.log('✅ Categories created');

  // Create products with upsert to avoid duplicates
  const products = await Promise.all([
    prisma.product.upsert({
      where: { sku: 'PHONE-001' },
      update: {},
      create: {
        name: 'Smartphone Premium',
        description: 'Smartphone haut de gamme',
        sku: 'PHONE-001',
        barcode: '1234567890123',
        categoryId: categoryElectronique.id,
        purchasePrice: 600.0,
        salePrice: 899.99,
        stockMin: 5,
        stockCurrent: 25,
      },
    }),
    prisma.product.upsert({
      where: { sku: 'TSHIRT-001' },
      update: {},
      create: {
        name: 'T-Shirt Coton',
        description: 'T-shirt en coton bio',
        sku: 'TSHIRT-001',
        barcode: '1234567890124',
        categoryId: categoryVetements.id,
        purchasePrice: 8.5,
        salePrice: 19.99,
        stockMin: 10,
        stockCurrent: 50,
      },
    }),
    prisma.product.upsert({
      where: { sku: 'PERFUME-001' },
      update: {},
      create: {
        name: 'Parfum Eau de Toilette',
        description: 'Parfum 100ml',
        sku: 'PERFUME-001',
        barcode: '1234567890125',
        categoryId: categoryCosmetique.id,
        purchasePrice: 25.0,
        salePrice: 49.99,
        stockMin: 5,
        stockCurrent: 30,
      },
    }),
  ]);

  console.log('✅ Products created');

  // Create clients
  const existingClientParticulier = await prisma.client.findFirst({
    where: { email: 'jean.dupont@example.com' },
  });
  
  const clientParticulier = existingClientParticulier
    ? await prisma.client.update({
        where: { id: existingClientParticulier.id },
        data: {
          type: ClientType.PARTICULIER,
          firstName: 'Jean',
          lastName: 'Dupont',
          email: 'jean.dupont@example.com',
          phone: '+33123456789',
          address: '123 Rue de la République',
          city: 'Paris',
          postalCode: '75001',
          country: 'FR',
        },
      })
    : await prisma.client.create({
        data: {
          type: ClientType.PARTICULIER,
          firstName: 'Jean',
          lastName: 'Dupont',
          email: 'jean.dupont@example.com',
          phone: '+33123456789',
          address: '123 Rue de la République',
          city: 'Paris',
          postalCode: '75001',
          country: 'FR',
        },
      });

  const existingClientSociete = await prisma.client.findFirst({
    where: { email: 'contact@entreprise.com' },
  });

  const clientSociete = existingClientSociete
    ? await prisma.client.update({
        where: { id: existingClientSociete.id },
        data: {
          type: ClientType.SOCIETE,
          companyName: 'Entreprise SARL',
          email: 'contact@entreprise.com',
          phone: '+33987654321',
          address: '456 Avenue des Champs',
          city: 'Lyon',
          postalCode: '69001',
          country: 'FR',
          vatNumber: 'FR12345678901',
        },
      })
    : await prisma.client.create({
        data: {
          type: ClientType.SOCIETE,
          companyName: 'Entreprise SARL',
          email: 'contact@entreprise.com',
          phone: '+33987654321',
          address: '456 Avenue des Champs',
          city: 'Lyon',
          postalCode: '69001',
          country: 'FR',
          vatNumber: 'FR12345678901',
        },
      });

  console.log('✅ Clients created');

  // Create suppliers
  const existingSupplier1 = await prisma.supplier.findFirst({
    where: { email: 'contact@techsupplier.com' },
  });

  const supplier1 = existingSupplier1
    ? await prisma.supplier.update({
        where: { id: existingSupplier1.id },
        data: {
          name: 'Fournisseur Tech SARL',
          contactPerson: 'Marie Martin',
          email: 'contact@techsupplier.com',
          phone: '+33111222333',
          address: '789 Rue de la Tech',
          city: 'Paris',
          postalCode: '75002',
          country: 'FR',
          vatNumber: 'FR98765432109',
          paymentTerms: '30 jours',
          discount: 5.0,
        },
      })
    : await prisma.supplier.create({
        data: {
          name: 'Fournisseur Tech SARL',
          contactPerson: 'Marie Martin',
          email: 'contact@techsupplier.com',
          phone: '+33111222333',
          address: '789 Rue de la Tech',
          city: 'Paris',
          postalCode: '75002',
          country: 'FR',
          vatNumber: 'FR98765432109',
          paymentTerms: '30 jours',
          discount: 5.0,
        },
      });

  const existingSupplier2 = await prisma.supplier.findFirst({
    where: { email: 'contact@modegrossiste.com' },
  });

  const supplier2 = existingSupplier2
    ? await prisma.supplier.update({
        where: { id: existingSupplier2.id },
        data: {
          name: 'Grossiste Mode',
          contactPerson: 'Pierre Durand',
          email: 'contact@modegrossiste.com',
          phone: '+33444555666',
          address: '321 Boulevard de la Mode',
          city: 'Marseille',
          postalCode: '13001',
          country: 'FR',
          paymentTerms: '60 jours',
          discount: 10.0,
        },
      })
    : await prisma.supplier.create({
        data: {
          name: 'Grossiste Mode',
          contactPerson: 'Pierre Durand',
          email: 'contact@modegrossiste.com',
          phone: '+33444555666',
          address: '321 Boulevard de la Mode',
          city: 'Marseille',
          postalCode: '13001',
          country: 'FR',
          paymentTerms: '60 jours',
          discount: 10.0,
        },
      });

  console.log('✅ Suppliers created');

  // Create supplier products with upsert
  await prisma.supplierProduct.upsert({
    where: {
      supplierId_productId: {
        supplierId: supplier1.id,
        productId: products[0].id,
      },
    },
    update: {},
    create: {
      supplierId: supplier1.id,
      productId: products[0].id,
      supplierSku: 'SUP-PHONE-001',
      price: 600.0,
    },
  });

  await prisma.supplierProduct.upsert({
    where: {
      supplierId_productId: {
        supplierId: supplier2.id,
        productId: products[1].id,
      },
    },
    update: {},
    create: {
      supplierId: supplier2.id,
      productId: products[1].id,
      supplierSku: 'SUP-TSHIRT-001',
      price: 8.5,
    },
  });

  console.log('✅ Supplier products created');

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

