import { sequelize } from '../config/database';
import { Product, ProductVariant } from '../models';

async function checkVariants() {
  try {
    // Simulate productController.getAll - removed unused call to avoid lint error
    // const products = await Product.findAll({...});

    // Check total variants
    const totalVariants = await ProductVariant.count();
    console.log(`\nTotal ProductVariant entries in DB: ${totalVariants}`);

    const productsWithLegacyVariants = await Product.findAll({
        attributes: ['id', 'name', 'variants'],
        limit: 5
    });

    console.log('\nChecking legacy variants column:');
    productsWithLegacyVariants.forEach((p: any) => {
        if (p.variants) {
             console.log(`Product: ${p.name}, Variants: ${typeof p.variants === 'string' ? p.variants : JSON.stringify(p.variants)}`);
        }
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

checkVariants();
