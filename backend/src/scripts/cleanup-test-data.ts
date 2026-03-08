import { sequelize } from '../config/database';
import { Sale, SaleItem, Purchase, PurchaseItem, StockMovement, Product } from '../models';
import { Op } from 'sequelize';

async function cleanupTestData() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('Starting cleanup of test data...');
    
    // Get today's date (for identifying today's test data)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // 1. Find and delete Sales created today
    const salesToDelete = await Sale.findAll({
      where: {
        createdAt: {
          [Op.gte]: today
        }
      },
      include: [{ model: SaleItem, as: 'items' }],
      transaction
    });
    
    console.log(`Found ${salesToDelete.length} sales to delete`);
    
    // Restore stock for sales
    for (const sale of salesToDelete) {
      if (sale.items) {
        for (const item of sale.items) {
          const product = await Product.findByPk(item.productId, { transaction });
          if (product) {
            await product.update(
              { stock: product.stock + item.quantity },
              { transaction }
            );
            console.log(`  Restored ${item.quantity} stock for product ${product.name}`);
          }
        }
      }
    }
    
    // Delete sale items
    await SaleItem.destroy({
      where: {
        saleId: {
          [Op.in]: salesToDelete.map(s => s.id)
        }
      },
      transaction
    });
    
    // Delete sales
    await Sale.destroy({
      where: {
        createdAt: {
          [Op.gte]: today
        }
      },
      transaction
    });
    
    // 2. Find and delete Purchases created today
    const purchasesToDelete = await Purchase.findAll({
      where: {
        createdAt: {
          [Op.gte]: today
        }
      },
      include: [{ model: PurchaseItem, as: 'items' }],
      transaction
    });
    
    console.log(`Found ${purchasesToDelete.length} purchases to delete`);
    
    // Restore stock for purchases (subtract back)
    for (const purchase of purchasesToDelete) {
      if (purchase.items) {
        for (const item of purchase.items) {
          const product = await Product.findByPk(item.productId, { transaction });
          if (product) {
            await product.update(
              { stock: product.stock - item.quantity },
              { transaction }
            );
            console.log(`  Removed ${item.quantity} stock for product ${product.name}`);
          }
        }
      }
    }
    
    // Delete purchase items
    await PurchaseItem.destroy({
      where: {
        purchaseId: {
          [Op.in]: purchasesToDelete.map(p => p.id)
        }
      },
      transaction
    });
    
    // Delete purchases
    await Purchase.destroy({
      where: {
        createdAt: {
          [Op.gte]: today
        }
      },
      transaction
    });
    
    // 3. Delete StockMovements created today
    const deletedMovements = await StockMovement.destroy({
      where: {
        createdAt: {
          [Op.gte]: today
        }
      },
      transaction
    });
    
    console.log(`Deleted ${deletedMovements} stock movements`);
    
    await transaction.commit();
    
    console.log('\n✅ Cleanup completed successfully!');
    console.log(`- Deleted ${salesToDelete.length} sales`);
    console.log(`- Deleted ${purchasesToDelete.length} purchases`);
    console.log(`- Deleted ${deletedMovements} stock movements`);
    console.log('- Stock quantities have been restored');
    
    process.exit(0);
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

cleanupTestData();
