import { sequelize } from '../config/database';
import { Product, ProductVariant } from '../models';
import { Op } from 'sequelize';

async function migrateVariants() {
  const transaction = await sequelize.transaction();
  try {
    console.log('Starting variant migration...');

    // Fetch products that have variants (not null)
    // We can't easily check for empty JSON in all SQL dialects, so fetch all non-null and filter in JS
    const products = await Product.findAll({
      where: {
        variants: {
          [Op.ne]: null,
        },
      },
      attributes: ['id', 'name', 'variants', 'stock'],
      transaction,
    });

    console.log(`Found ${products.length} products with potential legacy variants.`);

    let migratedCount = 0;
    let errorCount = 0;

    for (const product of products) {
        const rawVariants = product.variants;
        let parsedVariants: string[] = [];

        if (!rawVariants) continue;

        try {
            if (typeof rawVariants === 'string') {
                // Handle double encoded JSON if necessary, or just parse
                parsedVariants = JSON.parse(rawVariants);
                
                // Sometimes it might be double encoded "[\"A\",\"B\"]" -> inside DB as string
                if (typeof parsedVariants === 'string') {
                    parsedVariants = JSON.parse(parsedVariants);
                }
            } else if (Array.isArray(rawVariants)) {
                parsedVariants = rawVariants;
            }

            if (!Array.isArray(parsedVariants) || parsedVariants.length === 0) {
                // console.log(`Skipping product ${product.name}: Validation failed or empty variants`);
                continue;
            }

            console.log(`Migrating ${product.name}: ${JSON.stringify(parsedVariants)}`);

            const variantEntries = parsedVariants.map(variantName => ({
                productId: product.id,
                name: 'Warna', // Default assumption based on "Putih", "Marble"
                value: String(variantName),
                priceAdjustment: 0,
                stock: product.stock, // Defaulting to product stock
            }));

            await ProductVariant.bulkCreate(variantEntries, { transaction });
            migratedCount++;

        } catch (e) {
            console.error(`Failed to parse/migrate variants for product ${product.name} (ID: ${product.id}):`, e);
            errorCount++;
        }
    }

    await transaction.commit();
    console.log('Migration completed successfully.');
    console.log(`Migrated products: ${migratedCount}`);
    console.log(`Errors: ${errorCount}`);

  } catch (error) {
    await transaction.rollback();
    console.error('Migration failed:', error);
  } finally {
    await sequelize.close();
  }
}

migrateVariants();
