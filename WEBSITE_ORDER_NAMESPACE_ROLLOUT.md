# Pemisahan identitas order website — 17 Oktober 2026

## Scope

- Order WEBSITE baru memakai nomor internal `LWEB-<nomor-website>`; nomor pelanggan tidak berubah.
- Untuk nomor panjang, key internal memakai hash deterministik 20 hex dan selalu diverifikasi terhadap referensi sumber penuh. Konflik key tidak digabung otomatis.
- Key internal maksimal 25 karakter agar suffix pembatalan existing tetap muat dalam VARCHAR(50).
- Referensi sumber disimpan pada sales.notes existing, bersifat tetap, dan hanya dibuat oleh integrasi tepercaya. Tidak ada migration.
- Order WEBSITE lama tetap dibaca dengan nomor aslinya, tanpa forced migration/rename.
- Jika nomor eksternal sudah dipakai transaksi non-WEBSITE dan belum ada referensi WEBSITE yang sah, impor ditahan 409 untuk review. Tidak ada insert/update stok otomatis.
- L00000227 tetap dibiarkan sebagai pencatatan manual sesuai instruksi pemilik; tidak dikirim ulang oleh rilis.
- Invoice manual baru tidak memakai prefix LWEB-. Transaksi manual lama tidak diganti.
- Shipping, retur dan callback menggunakan resolver sumber yang sama. Notifikasi retur non-WEBSITE tidak dikirim ke website hanya karena invoice berawalan L.
- Respons receiver menambahkan website_order_id; saleNumber tetap nomor internal. Lunarea memvalidasi website_order_id dengan fallback saleNumber untuk backend lama.

## Bukti pengujian

- Unit/regresi backend: 134 tes mock lulus pada checkpoint rilis; TypeScript noEmit lulus.
- Suite MySQL 8.0.42 hasil restore localhost terisolasi: 10 tes lulus, termasuk transaksi/race/retry, benturan manual dan perlindungan source metadata.
- PHP: 369 tes, 2156 assertions; satu tes staging opt-in dilewati saat rerun unit. Kontrak ACK lama/baru diuji.
- Uji MySQL tidak menjalankan aplikasi server, scheduler atau API produksi. Server staging ditutup normal.
- Bukan klaim bahwa semua mapping produk telah selesai. Tidak ada pesanan produksi baru yang dibuat untuk pengujian.

## Urutan rilis

1. Deploy kompatibilitas ACK Lunarea lebih dahulu; tetap menerima backend lama.
2. Pastikan deployment Lunarea berhasil.
3. Deploy backend MyLuna tanpa menjalankan migration, seed, atau perintah koreksi stok.
4. Periksa kesehatan HTTP dan gunakan audit SELECT-only untuk memeriksa referensi katalog.
5. Pesanan nyata hanya diteruskan setelah review admin, bukan sebagai smoke test.

## Rollback

Jika ada anomali, hentikan penerusan baru. Jangan rename/hapus sales atau membalik stok massal.
Sesudah order namespace dibuat, parser source dan resolver kompatibel harus tetap dipertahankan;
jangan rollback ke versi yang menganggap saleNumber internal sebagai nomor pelanggan.
Tidak ada SQL downgrade, penghapusan mapping, atau migrasi data historis pada rilis ini.
