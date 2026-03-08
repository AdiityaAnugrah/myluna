/**
 * Reset semua data transaksi (produk, penjualan, pembelian, stok, dll)
 * Users & Roles TIDAK dihapus supaya masih bisa login
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function resetData() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'luna_sistem',
    multipleStatements: true,
  });

  console.log('🗑️  Menghapus semua data transaksi...\n');

  try {
    await conn.query('SET FOREIGN_KEY_CHECKS = 0;');

    const tables = [
      'audit_logs',
      'stock_movements',
      'sale_items',
      'settlements',
      'sales',
      'purchase_items',
      'purchases',
      'product_variants',
      'products',
      'categories',
      'suppliers',
      'change_requests',
      'expenses',
      'other_incomes',
    ];

    for (const table of tables) {
      await conn.query(`TRUNCATE TABLE \`${table}\`;`);
      console.log(`  ✅ ${table} dibersihkan`);
    }

    await conn.query('SET FOREIGN_KEY_CHECKS = 1;');

    console.log('\n✅ Semua data berhasil dihapus!');
    console.log('👤 Users & Roles tetap ada, silakan login seperti biasa.\n');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await conn.end();
  }
}

resetData();
