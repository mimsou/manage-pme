/**
 * Script : suppression de toutes les données métier de la base.
 * Conservé : users, refresh_tokens, company (identité et paramètres).
 * Supprimé : ventes, achats, produits, catégories, clients, fournisseurs,
 *            stocks, inventaires, caisses, devises et taux.
 *
 * Usage : npx ts-node prisma/wipe-business-data.ts
 * Ou    : npm run prisma:wipe-business
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Suppression des données métier...');

  // Ordre : tables enfants d'abord (contraintes FK)
  const result = await prisma.$transaction(async (tx) => {
    const r: Record<string, number> = {};

    r.sale_refunds = (await tx.saleRefund.deleteMany({})).count;
    r.sale_items = (await tx.saleItem.deleteMany({})).count;
    r.sales = (await tx.sale.deleteMany({})).count;
    r.purchase_items = (await tx.purchaseItem.deleteMany({})).count;
    r.purchases = (await tx.purchase.deleteMany({})).count;
    r.stock_movements = (await tx.stockMovement.deleteMany({})).count;
    r.inventory_items = (await tx.inventoryItem.deleteMany({})).count;
    r.inventories = (await tx.inventory.deleteMany({})).count;
    r.price_history = (await tx.priceHistory.deleteMany({})).count;
    r.supplier_products = (await tx.supplierProduct.deleteMany({})).count;
    r.product_variants = (await tx.productVariant.deleteMany({})).count;
    r.products = (await tx.product.deleteMany({})).count;
    r.sku_components = (await tx.skuComponent.deleteMany({})).count;
    r.categories = (await tx.category.deleteMany({})).count;
    r.clients = (await tx.client.deleteMany({})).count;
    r.supplier_contacts = (await tx.supplierContact.deleteMany({})).count;
    r.suppliers = (await tx.supplier.deleteMany({})).count;
    r.cash_registers = (await tx.cashRegister.deleteMany({})).count;
    r.exchange_rates = (await tx.exchangeRate.deleteMany({})).count;
    r.currencies = (await tx.currency.deleteMany({})).count;

    return r;
  });

  const total = Object.values(result).reduce((a, b) => a + b, 0);
  console.log('Résumé des suppressions :');
  Object.entries(result).forEach(([table, count]) => {
    if (count > 0) console.log(`  - ${table}: ${count} enregistrement(s)`);
  });
  console.log(`Total: ${total} enregistrement(s) supprimé(s).`);
  console.log('Conservé: users, refresh_tokens, company.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
