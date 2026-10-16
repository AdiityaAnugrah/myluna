-- Pilih database MyLuna yang benar pada phpMyAdmin sebelum menjalankan.
-- Hanya metadata schema dan satu produk yang sudah diidentifikasi operator.
-- Tidak mengubah data, stok, ID, atau konfigurasi.

SELECT VERSION() AS database_version, DATABASE() AS selected_database;

SELECT TABLE_NAME, ENGINE, TABLE_COLLATION
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'wms_db'
  AND TABLE_NAME IN ('products','product_variants','sales','sale_items','sale_return_items');

SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE,
       COLUMN_DEFAULT, COLUMN_KEY, EXTRA, CHARACTER_MAXIMUM_LENGTH
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'wms_db'
  AND TABLE_NAME IN ('products','product_variants','sales','sale_items','sale_return_items')
ORDER BY TABLE_NAME, ORDINAL_POSITION;

SELECT TABLE_NAME, INDEX_NAME, NON_UNIQUE, SEQ_IN_INDEX, COLUMN_NAME
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'wms_db'
  AND TABLE_NAME IN ('products','product_variants','sales','sale_items','sale_return_items')
ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;

SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME,
       REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'wms_db'
  AND TABLE_NAME IN ('products','product_variants','sales','sale_items','sale_return_items')
  AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME, CONSTRAINT_NAME, ORDINAL_POSITION;

SELECT p.id AS product_id, p.sku, p.name AS product_name, p.stock AS product_stock,
       v.id AS variant_id, v.productId AS variant_product_id,
       v.name AS variant_name, v.value AS variant_value, v.stock AS variant_stock
FROM `wms_db`.`products` p
LEFT JOIN `wms_db`.`product_variants` v ON v.productId = p.id
WHERE p.id = '7ef42be0-9851-4d75-ab2b-13e9acd58990';

SELECT saleNumber, status, platform
FROM `wms_db`.`sales`
WHERE saleNumber = 'L00000227'
   OR saleNumber LIKE 'L00000227-CANCELLED-%'
   OR saleNumber LIKE 'L00000227-REJECTED-%'
LIMIT 20;
