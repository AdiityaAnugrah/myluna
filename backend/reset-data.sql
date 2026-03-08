-- ⚠️ RESET TRANSACTION DATA ONLY ⚠️
-- Hapus data transaksi saja
-- TETAP ADA: Users, Products, Categories, Suppliers, Platforms

-- Order penting karena foreign key!

-- 1. Hapus Expenses
DELETE FROM expenses;

-- 2. Hapus Settlements
DELETE FROM settlements;

-- 3. Hapus Sale Items (harus dulu sebelum Sales)
DELETE FROM sale_items;

-- 4. Hapus Sales
DELETE FROM sales;

-- 5. Hapus Purchase Items (harus dulu sebelum Purchases)
DELETE FROM purchase_items;

-- 6. Hapus Purchases
DELETE FROM purchases;

-- Selesai!
SELECT '🎉 Data transaksi berhasil dihapus!' as message;
