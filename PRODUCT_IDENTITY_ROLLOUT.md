# Pengamanan identitas produk Lunarea dan MyLuna

Status: perubahan lokal; belum deployment. Tidak ada migration baru dan tidak ada SQL produksi yang dijalankan.

## Temuan yang diperbaiki

- Produk website tanpa mapping sebelumnya dibuat sebagai COMPONENT dengan productId null.
- Edit master/approval produk menghapus seluruh varian lalu membuat ulang UUID.
- Schema Zod form membuang ID varian sebelum request dikirim.
- Edit varian bisa menimpa stok terbaru menggunakan stok dari form lama.
- Pencarian produk berdasarkan nama dan pemilihan varian/retur yang ambigu berisiko salah referensi.
- Dry-run impor order sebelumnya berhenti sebelum memeriksa produk dan stok.

## Kontrak baru

ID barang website tetap. products.id dan product_variants.id MyLuna tetap.
Order baru dapat membawa luna_product_id dan luna_variant_id tambahan; harga, jumlah, dan waktu pembayaran asli tetap.
Impor hanya membuat PRODUCT dengan master dan varian valid; mapping ambigu/tidak tersedia menghasilkan 422/409 sebelum mutasi inventory.
Identitas tiap sale_item disimpan sebagai blok versi di sales.notes existing, bukan menambah kolom.
Pembatalan/retur menggunakan varian UUID snapshot; order lama tanpa blok memakai nama varian exact yang tunggal atau dihentikan untuk rekonsiliasi.
Edit catatan mempertahankan blok identitas. Jangan melakukan bulk SQL notes yang membuang blok tersebut.
Edit master mempertahankan UUID/stok varian. Varian lama yang dihilangkan dari form menghasilkan 409; penghapusan/arsip varian butuh alur terpisah.

## Mapping tanpa mengubah primary key

Pakai marketplaceLinks.websiteId existing yang sudah diverifikasi atau LUNA_WEB_PRODUCT_MAP pada konfigurasi backend.
Mapping harus satu produk website ke satu UUID MyLuna. Nama produk bukan kunci.
Konfigurasi yang sama dipakai untuk impor order dan payload sinkron katalog.

Contoh berdasarkan pasangan yang diberikan operator (belum diterapkan ke server):

    LUNA_WEB_PRODUCT_MAP={"B20240116151233":"7ef42be0-9851-4d75-ab2b-13e9acd58990"}

Jangan menimpa mapping lain. Gabungkan pasangan yang sudah diverifikasi dan tinjau konflik.
UUID varian CHERRY HITAM belum diberikan operator; ambil secara read-only dari master sebenarnya.
Order lama L00000227 tetap menggunakan snapshot pembayaran asli dan varian exact yang tunggal saat import legacy.
Jangan mengubah jumlah tujuh unit, nominal 445550, tanggal, stok 23/33, atau membuat dummy product untuk meloloskan impor.

## Gate sebelum push/deployment

1. Backup database MyLuna dan website dengan akses terbatas; buktikan restore di staging terpisah.
2. Verifikasi schema aktual products, product_variants, sales, sale_items, sale_return_items serta konstanta/barang/stok website.
   Periksa sales.notes TEXT cukup panjang, marketplaceLinks JSON valid, tipe PK/FK, engine InnoDB, dan kapasitas konstanta.value.
   Schema produksi lengkap belum diaudit langsung pada sesi ini.
3. Verifikasi akun DATABASE di staging menunjuk salinan staging, bukan produksi.
4. Workflow lokal .github/workflows/deploy.yml sekarang manual (workflow_dispatch), diserialkan,
   dan tidak menjalankan migration, seed, atau rekonsiliasi database. Perubahan ini belum dipush.
   Workflow remote lama masih perlu diperiksa, termasuk run yang sudah antre/berjalan dan pemicu deploy lain.
   Jangan menjalankan deployment manual sebelum backup, schema, dan pengujian staging disetujui.
5. Pastikan WEBSITE_ORDER_USER_ID menunjuk operator integrasi aktif yang benar dan review siapa yang boleh melihat pesanan WEBSITE.
6. Review mapping lengkap secara manual; tidak ada fuzzy backfill otomatis.
7. Deploy backend penerima lebih dahulu di staging, lalu website. Checkout identity flag tetap OFF sampai mapping lengkap.
8. Jalankan dry-run autentikasi dengan snapshot order asli pada staging: validasi mapping, ownership varian, stok agregat dan tanggal/nominal.
9. Pada staging uji impor dua kali, retry bersamaan, transaksi gagal di tengah, cancel/reject, rename varian, retur dan restock.
   Pastikan satu sale, satu set sale_items, stok terpotong/dipulihkan sekali, tanpa UUID berubah.
10. Review lalu jadwalkan deployment produksi terpisah. Jangan otomatis meneruskan order produksi untuk pengujian.

## Rollback

- Hentikan penerusan/sinkron katalog lewat flag integrasi existing jika ada anomali; matikan LUNA_PRODUCT_IDENTITY_ENABLED di website.
- Jangan menghapus metadata, sales, sale_items, product_variants, atau membalik stok dengan SQL massal.
- Setelah ada order ber-snapshot UUID, jangan kembali ke kode lama yang menghapus/membuat ulang varian atau memulihkan stok hanya dari nama.
  Gunakan rollback kompatibel yang mempertahankan codec/guard UUID dan hentikan aksi inventory sementara.
- Rekonsiliasi satu order yang terdampak dengan audit stok dan bukti transaksi. Restore backup produksi hanya lewat persetujuan operator dan rencana pemulihan tersendiri.

Unit test lokal memakai mock, bukan bukti kesesuaian schema produksi atau keberhasilan transaksi MySQL sungguhan.

## Perkembangan pengujian

Selain unit test mock, suite websiteMysqlStaging.test.ts kini menguji handler aktual terhadap restore
MySQL 8.0.42 localhost terisolasi, termasuk race/retry dan rollback. Akses DB dikunci ke user/database audit;
callback HTTP, notifikasi, dan audit-service eksternal dimatikan/dimock. Tidak memakai .env produksi.
Instance audit ditutup normal setelah tes. Lihat jasmine-shop/SHIPPING_IDENTITY_RELEASE.md untuk SQL website
dan batasan rollout. Tidak ada perubahan schema produksi MyLuna, push, atau deployment pada sesi ini.
