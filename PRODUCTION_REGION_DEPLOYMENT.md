# Deploy Fitur Wilayah dan Analisa ke Produksi

Proses ini bersifat aditif. Data penjualan lama dan kolom `shippingAddress`
tidak dihapus. Kolom wilayah baru dibuat nullable, kemudian diisi oleh proses
backfill berdasarkan alamat lama.

## 1. Persiapan

1. Buat backup database produksi dan pastikan backup dapat dipulihkan.
2. Deploy seluruh source terbaru, termasuk `datawilayah/datawilayah.sql`.
3. Pastikan `.env` di server menunjuk ke database produksi yang benar.
4. Jalankan instalasi dependency dan build backend/frontend seperti proses
   deploy yang sudah digunakan server.

Jangan menjalankan `npm run seed` di produksi karena command tersebut
menjalankan seluruh seeder aplikasi.

## 2. Migration dan Data Wilayah

Push ke branch `main` akan menjalankan langkah berikut secara otomatis melalui
`.github/workflows/deploy.yml`:

```powershell
npm run migrate:production
npm run seed:regions:production
npm run backfill:regions:production
```

Langkah terakhir adalah dry-run dan tidak mengubah penjualan lama.

Seeder wilayah menggunakan `INSERT IGNORE`, sehingga aman dijalankan ulang
apabila proses deploy terputus.

Periksa jumlah data:

```sql
SELECT COUNT(*) AS provinces FROM provinsi;
SELECT COUNT(*) AS regencies FROM kabupaten;
SELECT COUNT(*) AS districts FROM kecamatan;
SELECT COUNT(*) AS villages FROM kelurahan;
```

Dataset saat ini seharusnya menghasilkan 34 provinsi, 501 kabupaten/kota,
6.994 kecamatan, dan 187.878 kelurahan/desa.

## 3. Backfill Penjualan Lama

Build backend lebih dahulu, lalu jalankan dry-run:

```powershell
npm run build
npm run backfill:regions:production
```

Dry-run hanya membaca data. Periksa nilai `mappedProvinces`,
`mappedRegencies`, `mappedDistricts`, `mappedVillages`, dan contoh
`unmatched`. Simpan output ini sebagai catatan deploy.

Jika hasilnya masuk akal, buka GitHub Actions, pilih workflow
`Backfill Wilayah Penjualan`, klik `Run workflow`, lalu pilih mode `apply`.
Workflow akan melakukan dry-run sekali lagi sebelum menerapkan perubahan.

Command ekuivalen jika perlu dijalankan langsung di VPS:

```powershell
npm run backfill:regions:production:apply
```

Backfill hanya memproses penjualan yang belum memiliki `shippingProvinceId`.
Karena itu proses dapat dilanjutkan atau dijalankan ulang tanpa menimpa hasil
yang sudah tersimpan. Semua update dalam satu eksekusi memakai transaction.

## 4. Urutan Aktivasi Aplikasi

1. Jalankan migration dan seed wilayah saat aplikasi lama masih aktif.
2. Aktifkan backend versi baru.
3. Pastikan endpoint region dan analytics merespons normal.
4. Aktifkan frontend versi baru.
5. Jalankan backfill; halaman Analisa akan bertambah cakupannya setelah proses
   selesai.

Urutan ini menjaga form penjualan lama tetap bekerja selama deployment dan
mencegah frontend baru meminta endpoint yang belum tersedia.

## 5. Verifikasi

```sql
SELECT
  COUNT(*) AS total_sales,
  SUM(shippingProvinceId IS NOT NULL) AS mapped_province,
  SUM(shippingRegencyId IS NOT NULL) AS mapped_regency,
  SUM(shippingDistrictId IS NOT NULL) AS mapped_district,
  SUM(shippingVillageId IS NOT NULL) AS mapped_village
FROM sales
WHERE isInitialBalance = 0
  AND shippingAddress IS NOT NULL;
```

Buat satu transaksi uji dari form Penjualan dan periksa bahwa alamat lengkap,
ID wilayah, serta kode pos tersimpan. Setelah itu periksa halaman `Analisa`.

## Rollback

Jika frontend bermasalah, kembalikan frontend/backend ke versi sebelumnya.
Kolom dan tabel baru boleh dibiarkan karena versi lama tidak menggunakannya.
Jangan menjalankan migration `down` setelah transaksi baru tersimpan; pemulihan
database dari backup adalah jalur rollback data yang paling aman.
