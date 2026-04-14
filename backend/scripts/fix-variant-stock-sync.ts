/**
 * fix-variant-stock-sync.ts
 *
 * Script perbaikan: sinkronkan product.stock = SUM(variant.stock)
 * untuk semua produk bervariant yang datanya tidak konsisten akibat bug.
 *
 * Jalankan: npx ts-node scripts/fix-variant-stock-sync.ts
 */

import { sequelize } from '../src/config/database';
import { QueryTypes } from 'sequelize';

interface DiscrepancyRow {
  id: string;
  name: string;
  sku: string;
  product_stock: number;
  variant_stock_sum: number;
  selisih: number;
}

async function main() {
  await sequelize.authenticate();
  console.log('\n=== Sinkronisasi Stok Produk Bervariant ===\n');

  // 1. Temukan semua produk bermasalah
  const discrepancies = await sequelize.query<DiscrepancyRow>(
    `SELECT
       p.id,
       p.name,
       p.sku,
       p.stock AS product_stock,
       IFNULL(SUM(pv.stock), 0) AS variant_stock_sum,
       (p.stock - IFNULL(SUM(pv.stock), 0)) AS selisih
     FROM products p
     JOIN product_variants pv ON pv.productId = p.id
     GROUP BY p.id, p.name, p.sku, p.stock
     HAVING (p.stock - IFNULL(SUM(pv.stock), 0)) != 0
     ORDER BY ABS(p.stock - IFNULL(SUM(pv.stock), 0)) DESC`,
    { type: QueryTypes.SELECT }
  );

  if (discrepancies.length === 0) {
    console.log('✅ Semua produk bervariant sudah sinkron. Tidak ada yang perlu diperbaiki.');
    await sequelize.close();
    return;
  }

  console.log(`Ditemukan ${discrepancies.length} produk tidak sinkron:\n`);
  console.log(
    'No'.padEnd(4) +
    'Nama Produk'.padEnd(30) +
    'SKU'.padEnd(35) +
    'product.stock'.padEnd(15) +
    'variant sum'.padEnd(13) +
    'Selisih'
  );
  console.log('-'.repeat(105));

  for (let i = 0; i < discrepancies.length; i++) {
    const d = discrepancies[i];
    const flag = d.product_stock < 0 ? ' ⚠️  NEGATIF' : '';
    console.log(
      String(i + 1).padEnd(4) +
      d.name.substring(0, 28).padEnd(30) +
      d.sku.padEnd(35) +
      String(d.product_stock).padEnd(15) +
      String(d.variant_stock_sum).padEnd(13) +
      String(d.selisih) + flag
    );
  }

  console.log('\n--- Ringkasan ---');
  const lebihTinggi = discrepancies.filter(d => d.selisih > 0).length;
  const lebihRendah = discrepancies.filter(d => d.selisih < 0).length;
  const negatif     = discrepancies.filter(d => d.product_stock < 0).length;
  console.log(`  product_stock lebih tinggi (sale reject/delete lama): ${lebihTinggi} produk`);
  console.log(`  variant_sum lebih tinggi  (purchase delete lama)    : ${lebihRendah} produk`);
  console.log(`  product_stock negatif (berbahaya)                   : ${negatif} produk`);

  console.log('\nMenjalankan perbaikan...\n');

  const transaction = await sequelize.transaction();
  try {
    let fixed = 0;
    for (const d of discrepancies) {
      await sequelize.query(
        `UPDATE products SET stock = :newStock WHERE id = :id`,
        {
          replacements: { newStock: d.variant_stock_sum, id: d.id },
          type: QueryTypes.UPDATE,
          transaction,
        }
      );
      console.log(`  ✅ [${d.sku}] ${d.name}: ${d.product_stock} → ${d.variant_stock_sum}`);
      fixed++;
    }

    await transaction.commit();
    console.log(`\n✅ Selesai. ${fixed} produk berhasil disinkronkan.`);
  } catch (err) {
    await transaction.rollback();
    console.error('\n❌ Gagal, rollback dilakukan:', err);
    process.exit(1);
  }

  // 2. Verifikasi akhir
  const remaining = await sequelize.query<{ jumlah: number }>(
    `SELECT COUNT(*) AS jumlah
     FROM products p
     JOIN (SELECT productId, SUM(stock) AS s FROM product_variants GROUP BY productId) pv
       ON pv.productId = p.id
     WHERE p.stock != pv.s`,
    { type: QueryTypes.SELECT }
  );
  const sisa = remaining[0]?.jumlah ?? 0;
  console.log(`\nVerifikasi akhir: ${sisa} produk masih tidak sinkron (seharusnya 0).`);

  await sequelize.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
