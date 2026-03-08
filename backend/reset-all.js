const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const sequelize = new Sequelize(
  process.env.DB_NAME || 'wms_db',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    logging: false
  }
);

async function resetAll() {
  try {
    console.log('🔄 Starting FULL data reset...\n');
    console.log('⚠️  This will delete ALL data except user accounts!\n');

    // Disable FK checks so we can delete in any order
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');

    const tables = [
      'audit_logs',
      'stock_movements',
      'sale_return_requests',
      'change_requests',
      'product_status_requests',
      'other_incomes',
      'expenses',
      'settlements',
      'sale_items',
      'sales',
      'purchase_items',
      'purchases',
      'product_variants',
      'products',
      'categories',
      'suppliers',
      'platforms',
    ];

    for (const table of tables) {
      try {
        await sequelize.query(`DELETE FROM \`${table}\``);
        await sequelize.query(`ALTER TABLE \`${table}\` AUTO_INCREMENT = 1`);
        console.log(`✅ Cleared: ${table}`);
      } catch (err) {
        console.log(`⚠️  Skipped (not found): ${table}`);
      }
    }

    // Re-enable FK checks
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('\n🎉 FULL RESET COMPLETE!');
    console.log('Preserved: Users (accounts still intact)\n');

    process.exit(0);
  } catch (error) {
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1').catch(() => {});
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

resetAll();
