
import { sequelize } from '../config/database';
import { Sale, SaleItem, Product } from '../models';

async function debugVariants() {
  try {
    const sale = await Sale.findOne({
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: SaleItem,
          as: 'items',
          include: [
            {
              model: Product,
              as: 'product',
               attributes: ['id', 'name', 'variantList']
            }
          ]
        }
      ]
    });

    if (!sale) {
      console.log('No sales found.');
      return;
    }

    console.log(`Checking Sale: ${sale.saleNumber}`);
    
    if (sale.items) {
        sale.items.forEach((item: any) => {
            console.log(`Product: ${item.product.name}`);
            console.log(`VariantList Type: ${typeof item.product.variantList}`);
            console.log(`VariantList Value:`, item.product.variantList);
            console.log('-----------------------------------');
        });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

debugVariants();
