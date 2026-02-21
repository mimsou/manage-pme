import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Migrating categories to UUID IDs...');

  // Trouver toutes les catégories avec des IDs non-UUID
  const allCategories = await prisma.category.findMany();

  const categoriesToMigrate = allCategories.filter((cat) => {
    // Vérifier si l'ID est un UUID valide
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return !uuidRegex.test(cat.id);
  });

  if (categoriesToMigrate.length === 0) {
    console.log('✅ All categories already have UUID IDs');
    return;
  }

  console.log(`Found ${categoriesToMigrate.length} categories to migrate`);

  // Créer un mapping des anciens IDs vers les nouveaux IDs
  const idMapping = new Map<string, string>();

  // Étape 1: Créer toutes les nouvelles catégories avec des UUIDs
  for (const category of categoriesToMigrate) {
    console.log(`Creating new category "${category.name}" with UUID...`);

    // Créer une nouvelle catégorie avec un UUID (Prisma génère automatiquement l'UUID)
    const newCategory = await prisma.category.create({
      data: {
        name: category.name,
        description: category.description,
        // parentId sera mis à jour plus tard
      },
    });

    // Stocker le mapping
    idMapping.set(category.id, newCategory.id);
    console.log(`  → Old ID: ${category.id} → New UUID: ${newCategory.id}`);
  }

  // Étape 2: Mettre à jour les parentId des nouvelles catégories
  for (const category of categoriesToMigrate) {
    const newCategoryId = idMapping.get(category.id);
    if (!newCategoryId) continue;

    if (category.parentId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(category.parentId)) {
        // L'ancien parentId n'est pas un UUID, trouver le nouveau parentId
        const newParentId = idMapping.get(category.parentId);
        if (newParentId) {
          await prisma.category.update({
            where: { id: newCategoryId },
            data: { parentId: newParentId },
          });
          console.log(`  → Updated parentId for category "${category.name}"`);
        }
      } else {
        // L'ancien parentId est déjà un UUID, le copier
        await prisma.category.update({
          where: { id: newCategoryId },
          data: { parentId: category.parentId },
        });
      }
    }
  }

  // Étape 3: Mettre à jour tous les produits qui référencent les anciennes catégories
  for (const category of categoriesToMigrate) {
    const newCategoryId = idMapping.get(category.id);
    if (!newCategoryId) continue;

    await prisma.product.updateMany({
      where: { categoryId: category.id },
      data: { categoryId: newCategoryId },
    });
    console.log(`  → Updated products for category "${category.name}"`);
  }

  // Étape 4: Mettre à jour les parentId des catégories existantes qui référencent les anciennes catégories
  const allCategoriesAfterMigration = await prisma.category.findMany();
  for (const category of allCategoriesAfterMigration) {
    if (category.parentId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(category.parentId)) {
        // Vérifier si l'ancien parentId a été migré
        const newParentId = idMapping.get(category.parentId);
        if (newParentId) {
          await prisma.category.update({
            where: { id: category.id },
            data: { parentId: newParentId },
          });
          console.log(`  → Updated parentId for existing category "${category.name}"`);
        } else {
          // Si le parent n'a pas été trouvé, mettre parentId à null
          console.log(`⚠️  Category "${category.name}" has a non-UUID parentId that was not migrated: "${category.parentId}"`);
          await prisma.category.update({
            where: { id: category.id },
            data: { parentId: null },
          });
        }
      }
    }
  }

  // Étape 5: Supprimer les anciennes catégories
  for (const category of categoriesToMigrate) {
    await prisma.category.delete({
      where: { id: category.id },
    });
    console.log(`✅ Deleted old category "${category.name}"`);
  }

  console.log('✅ Migration completed!');
}

main()
  .catch((e) => {
    console.error('❌ Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

