# Deploy Fitur Wilayah dan Analisa ke Produksi

Proses ini bersifat aditif. Data penjualan lama dan kolom `shippingAddress`
tidak dihapus. Master lama tetap disimpan; baris yang tidak ada dalam dataset
v2 hanya diberi `isActive = false` agar foreign key transaksi tetap valid.

## 1. Persiapan

1. Buat backup database produksi dan pastikan backup dapat dipulihkan.
2. Deploy seluruh source terbaru, termasuk `datawilayah/v2`.
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
npm run seed:regions:v2:production
npm run reconcile:regions:v2:production
```

Langkah terakhir adalah dry-run dan tidak mengubah penjualan lama.

Importer v2 mempertahankan ID internal yang dapat dicocokkan, menambahkan ID
baru untuk wilayah baru, dan tidak menghapus wilayah lama. Importer aman
dijalankan ulang; checksum CSV dan jumlah baris divalidasi sebelum transaksi.

Periksa jumlah data:

```sql
SELECT COUNT(*) AS provinces FROM provinsi WHERE isActive = 1;
SELECT COUNT(*) AS regencies FROM kabupaten WHERE isActive = 1;
SELECT COUNT(*) AS districts FROM kecamatan WHERE isActive = 1;
SELECT COUNT(*) AS villages FROM kelurahan WHERE isActive = 1;
```

Dataset saat ini menghasilkan 38 provinsi, 514 kabupaten/kota, 7.285
kecamatan, dan 83.762 desa/kelurahan aktif. Sumber dan checksum tercatat di
`datawilayah/v2/SOURCE.md`. Data kode pos berasal dari dataset komunitas, jadi
hasil ambigu tetap perlu diverifikasi.

## 3. Rekonsiliasi Penjualan Lama

Build backend lebih dahulu, lalu jalankan dry-run:

```powershell
npm run build
npm run reconcile:regions:v2:production
```

Dry-run hanya membaca data. Periksa nilai `mappedProvinces`,
`mappedRegencies`, `mappedDistricts`, `mappedVillages`, dan contoh
`unmatched`, dan `changes`. Simpan output ini sebagai catatan deploy.

Jika hasilnya masuk akal, buka GitHub Actions, pilih workflow
`Rekonsiliasi Wilayah Penjualan`, klik `Run workflow`, lalu pilih mode `apply`.
Workflow akan melakukan dry-run sekali lagi sebelum menerapkan perubahan.

Command ekuivalen jika perlu dijalankan langsung di VPS:

```powershell
npm run reconcile:regions:v2:production:apply
```

Rekonsiliasi memeriksa semua penjualan beralamat, termasuk ID lama yang kini
menunjuk wilayah nonaktif. Teks `shippingAddress` tidak diubah. Hanya baris
yang hasil pemetaannya berbeda yang diperbarui dan seluruh update memakai satu
transaction. Jalankan dry-run lagi setelah `apply`; nilai `changes` harus 0.

## 4. Urutan Aktivasi Aplikasi

1. Jalankan migration dan seed wilayah saat aplikasi lama masih aktif.
2. Aktifkan backend versi baru.
3. Pastikan endpoint region dan analytics merespons normal.
4. Aktifkan frontend versi baru.
5. Jalankan rekonsiliasi manual; halaman Analisa akan bertambah cakupannya
   setelah proses selesai.

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
