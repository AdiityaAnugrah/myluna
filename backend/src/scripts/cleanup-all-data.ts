import { sequelize } from '../config/database';
import { Settlement, Sale, SaleItem, Purchase, PurchaseItem, StockMovement } from '../models';

async function cleanupAllData() {
  try {
    console.log('🧹 Starting data cleanup...');
    
    // Delete in correct order to respect foreign keys
    
    // 1. Delete Settlements first (depends on Sales)
    const settlementsDeleted = await Settlement.destroy({ where: {}, force: true });
    console.log(`✅ Deleted ${settlementsDeleted} settlements`);
    
    // 2. Delete Sale Items
    const saleItemsDeleted = await SaleItem.destroy({ where: {}, force: true });
    console.log(`✅ Deleted ${saleItemsDeleted} sale items`);
    
    // 3. Delete Sales
    const salesDeleted = await Sale.destroy({ where: {}, force: true });
    console.log(`✅ Deleted ${salesDeleted} sales`);
    
    // 4. Delete Purchase Items
    const purchaseItemsDeleted = await PurchaseItem.destroy({ where: {}, force: true });
    console.log(`✅ Deleted ${purchaseItemsDeleted} purchase items`);
    
    // 5. Delete Purchases
    const purchasesDeleted = await Purchase.destroy({ where: {}, force: true });
    console.log(`✅ Deleted ${purchasesDeleted} purchases`);
    
    // 6. Delete Stock Movements
    const stockMovementsDeleted = await StockMovement.destroy({ where: {}, force: true });
    console.log(`✅ Deleted ${stockMovementsDeleted} stock movements`);
    
    console.log('\n🎉 Data cleanup completed successfully!');
    console.log('📦 Products, Categories, Suppliers, and Users are preserved.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

// Run cleanup
cleanupAllData();
