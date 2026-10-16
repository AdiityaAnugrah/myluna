# Bukti produksi integrasi Lunarea–MyLuna — 17 Oktober 2026 WIB

## Kesimpulan yang benar-benar terbukti

- Audit membaca database produksi melalui SELECT dalam transaksi READ ONLY; tidak membuat/meneruskan/mengubah order atau stok.
- MyLuna: wms_db, MySQL 8.0.42-0ubuntu0.20.04.1. Website: luna_lunareafurniture, MySQL 8.0.42-0ubuntu0.20.04.1.
- Waktu snapshot master UTC: 2026-10-16T17:05:04.874973Z; website UTC: 2026-10-16T17:05:05.085797Z. Kedua snapshot tidak atomik lintas database.
- Pengambilan timestamp menggunakan DATE_FORMAT(UTC_TIMESTAMP), bukan konversi Date implisit driver. Report awal sebelum perbaikan inspector bukan rujukan timestamp final.
- Katalog produksi: 113 produk website (109 aktif), 99 produk master, 176 varian master.
- Baru 1 produk website mempunyai referensi ID master eksplisit. 112 belum mempunyai referensi; 108 di antaranya aktif.
- Pasangan MT120 terkonfirmasi operator dan ditemukan pada master: B20240116151233 -> 7ef42be0-9851-4d75-ab2b-13e9acd58990; CHERRY HITAM -> 3b2bb1d3-df78-4272-92b2-87612eac4c1d.
- Flag LUNA_PRODUCT_IDENTITY_ENABLED pada file konfigurasi website masih OFF. Data konfigurasi file bukan pembacaan memori proses web.
- konstanta.value benar-benar TEXT NOT NULL dan stok.nama VARCHAR(100) NOT NULL pada produksi.
- Token integrasi pada kedua file konfigurasi sama dan terisi; nilainya tidak dicantumkan.

## Operator yang dipilih pemilik sistem

- Pemilik sistem secara eksplisit memilih username aditya dengan role DEV. Password tidak diperlukan dan tidak dimasukkan ke file, Git, atau login oleh alat audit.
- SELECT memverifikasi username unik tepat, UUID valid, role DEV dan status aktif. WEBSITE_ORDER_USER_ID kemudian ditetapkan pada .env backend dengan backup privat.
- Hanya backend MyLuna direstart. Tidak ada perubahan data users, roles, sales atau stok.
- Workflow konfigurasi: https://github.com/AdiityaAnugrah/myluna/actions/runs/38936823058 (success).
- Audit setelah perubahan: configured=true, configured_exists=true, configured_active=true, resolution_source=CONFIGURED_USER, effective_role=DEV.
- Fingerprint operator sebelum/sesudah: 614108814f66e34a. Artinya akun efektif tidak diganti secara diam-diam; pemilihannya kini eksplisit.
- Persetujuan bisnis dibuktikan oleh pilihan pemilik dan workflow konfigurasi, bukan disimpulkan dari database sendiri.

## Konflik L00000227 — BUKAN konfirmasi impor website

- Website mempunyai 1 pesanan L00000227; status tersimpan Proses dan data_mid tersimpan settlement. Status Midtrans live tidak dipanggil pada audit ini.
- MyLuna mempunyai 1 record bernomor sama, tetapi platform=WHATSAPP, status=WAITING_APPROVAL.
- TotalAmount record WHATSAPP tidak sama dengan gross_amount pesanan website.
- saleDate tersimpan pada record WHATSAPP: 2026-10-16 00:00:00. Waktu UTC yang diharapkan dari snapshot website: 2026-10-15 07:09:11.
- Tidak ditemukan blok snapshot UUID integrasi pada record tersebut. productId yang tidak null saja bukan bukti record berasal dari website.
- Pemilik record tersebut tidak sama dengan operator integrasi yang kini dikonfigurasi.
- Tidak ditemukan stock movement dengan reference WEB:L00000227. Ini tidak menyatakan stok transaksi manual tidak pernah berubah.
- Kesimpulan: terbukti benturan nomor dengan record non-WEBSITE. Identitas otomatis kedua record tidak terbukti sama; pemilik memilih membiarkan order saat ini karena sudah dicatat admin MyLuna.
- Keputusan eksplisit pemilik: biarkan L00000227 apa adanya. Jangan menimpa platform, mengganti nomor, mengubah total/tanggal, merekonsiliasi stok atau mengimpor ulang otomatis. Tidak ada perubahan pada order tersebut.
- Pernyataan awal bahwa keberadaan nomor yang sama membuktikan penerimaan website telah dikoreksi setelah pemeriksaan platform, nominal dan snapshot.

## Akar masalah berdasarkan codebase

- backend/src/controllers/sale.controller.ts, create: nomor invoice manual disimpan sebagai saleNumber; tidak terpisah namespace dari order website.
- backend/src/controllers/webOrderIntegration.controller.ts, importLunareaOrder: memakai order_id website langsung sebagai saleNumber; record bernomor sama dengan platform non-WEBSITE ditolak.
- backend/src/controllers/webOrderIntegration.controller.ts, importLunareaReturn: lookup awal hanya berdasarkan saleNumber; pengaman platform perlu direview sebelum membuka retur lintas sumber.
- frontend/app/(dashboard)/sales/page.tsx: tombol Website Menunggu Proses memakai platform WEBSITE + status WAITING_APPROVAL. Record WHATSAPP tidak termasuk filter tersebut.
- backend/src/services/websiteFulfillment.service.ts: callback memakai sale.saleNumber sebagai order_id. Solusi namespace harus memperbarui resolusi order eksternal, callback, retur dan retry secara konsisten, bukan sekadar mengganti nomor.

## Cakupan stok dan batas pembuktian

- Ada 63 produk dengan stok induk berbeda dari jumlah stok varian. Ini fakta snapshot, bukan diagnosis kerusakan. Tidak ada koreksi stok otomatis.
- Tidak ada transaksi penjualan, retur, callback, atau pembayaran produksi yang dijalankan sebagai tes.
- Test kode final: 127 tes backend mock pada 12 suite lulus, termasuk klasifikasi benturan dan operator eksplisit. TypeScript noEmit lulus.
- Query audit diuji pada restore MySQL 8 terisolasi; inspector PHP juga diuji dengan parser CI4 dan MySQLi terhadap salinan. Instance staging dimatikan normal.
- Audit produksi berhasil: https://github.com/AdiityaAnugrah/myluna/actions/runs/38936918361 ; source SHA bc95699bd980ea17c7d5181085f40eb2baab3a87.
- SHA-256 JSON bukti tersaring privat: 265fffff4b30c19062e40ce589a74b97a4befaa78469f2614bbcb07bcd10729b. File asli disimpan di REFERENSI/shipping-staging/production-evidence-38936918361.json dan diabaikan Git.
- Tidak ada SQL produksi tambahan yang diperlukan untuk audit dan penetapan operator ini.

## Keputusan berikutnya yang memerlukan bukti/konfirmasi

1. L00000227 ditutup dari cakupan tindakan otomatis sesuai keputusan pemilik: pertahankan pencatatan admin yang sudah ada. Ini keputusan operasional, bukan klaim bahwa nilai/identitas kedua record identik.
2. Sediakan referensi pasangan ID/SKU otoritatif untuk 112 produk yang belum terhubung. Kemiripan nama/model, harga, dan stok tidak dipakai sebagai persetujuan otomatis.
3. Setelah hubungan sumber disepakati, terapkan identitas eksternal terpisah dan pengaman platform seluruh jalur (import, shipping, retur, callback, retry), diuji di staging dahulu.
4. Tetap matikan aktivasi massal sampai produk aktif dan semua varian yang dijual terpetakan serta transaksi lintas sumber tervalidasi.

## Daftar seluruh katalog website pada snapshot produksi

Kandidat nama berikut hanya alat bantu review. Walaupun hanya ada satu kandidat, statusnya tetap BELUM TERBUKTI tanpa referensi/konfirmasi ID. Tidak ada kandidat yang ditulis ke database.

| ID website | Nama | Aktif | Bukti ID eksplisit | ID master terverifikasi | Varian / status | Kandidat nama — BELUM DISETUJUI |
|---|---|---|---|---|---|---|
| B20231221032701 | Meja TV - LTV 200 | Ya | NO_EXPLICIT_REFERENCE | - | CHERRY PUTIH: UNVERIFIED | 95cc97ef-824f-41b5-823e-07909aad83ad / LTV 200 |
| B20231226094436 | Meja TV - LSTV 101 | Ya | NO_EXPLICIT_REFERENCE | - | CHERRY PUTIH: UNVERIFIED | 1f1a4c25-bc58-4a76-b92d-516d8e4dd850 / LSTV 101 |
| B20231226144729 | Meja Rias - MR 810 | Ya | NO_EXPLICIT_REFERENCE | - | WINGE: UNVERIFIED; MARBLE: UNVERIFIED; PUTIH: UNVERIFIED; MAHONI: UNVERIFIED | 2c2e9df6-76e1-4c56-af3d-714f0c3db340 / MR 810 |
| B20240104140737 | Rak Serbaguna - RSG 10 | Ya | NO_EXPLICIT_REFERENCE | - | JATI: UNVERIFIED; SONOMA: UNVERIFIED | e90f74aa-2d9b-4bbe-9499-ddfedf1a61b0 / RSG 10 |
| B20240104141536 | Lemari Dewasa - WS 9052 | Ya | NO_EXPLICIT_REFERENCE | - | Putih: UNVERIFIED | - |
| B20240104142009 | Meja Tulis - MT 105 | Ya | NO_EXPLICIT_REFERENCE | - | SONOMA HITAM: UNVERIFIED | 3e204e80-68f4-4bbd-873d-f13151d76180 / MT 105; e810535a-f278-4cc8-afed-a28a980c343f / MT 105 |
| B20240104142252 | Meja Belajar - MB 822 | Ya | NO_EXPLICIT_REFERENCE | - | Pink: UNVERIFIED; Putih: UNVERIFIED; Biru: UNVERIFIED; Hijau: UNVERIFIED | - |
| B20240104142812 | Meja TV - LSTV 100 | Ya | NO_EXPLICIT_REFERENCE | - | CHERRY PUTIH: UNVERIFIED | e6c5089f-a68c-4cc9-a7ea-0c2084767b6f / LSTV 100 |
| B20240105110136 | Meja TV - TTV 120 L | Ya | NO_EXPLICIT_REFERENCE | - | PUTIH MAHONI: UNVERIFIED | 5e7f379b-6df9-4637-9b7c-a7dd3fbca755 / TTV 120 L |
| B20240116150233 | Meja TV - TTV 80 L | Ya | NO_EXPLICIT_REFERENCE | - | PUTIH MAHONI: UNVERIFIED | f6b5c98b-cc5a-4911-8d3b-d94eb3db4105 / TTV 80 L |
| B20240116151233 | Meja Tulis - MT 120 | Ya | EXPLICIT_REFERENCE_PRESENT | 7ef42be0-9851-4d75-ab2b-13e9acd58990 | CHERRY HITAM: OPERATOR_CONFIRMED_AND_PRESENT | - |
| B20240116151437 | Meja Komputer - MC 02 | Ya | NO_EXPLICIT_REFERENCE | - | WINGE: UNVERIFIED; JATI: UNVERIFIED | a9d3c11b-a6a6-434f-9c05-0e6c46a228e8 / MC 02 |
| B20240116155930 | Meja Belajar - MBRS 280 | Ya | NO_EXPLICIT_REFERENCE | - | Winge: UNVERIFIED; Putih Winge: UNVERIFIED; Putih Mahoni: UNVERIFIED | - |
| B20240117114048 | Meja Rias - MR 830 | Ya | NO_EXPLICIT_REFERENCE | - | WINGE: UNVERIFIED; PUTIH: UNVERIFIED | d5f86b8f-faba-4096-8f90-1caf74f3e29b / MR 830 |
| B20240206102020 | Meja TV - LTV 202 | Ya | NO_EXPLICIT_REFERENCE | - | CHERRY PUTIH: UNVERIFIED | 87cdfacc-d2b2-49aa-ba57-da5831bcd24c / LTV 202 |
| B20240206104431 | Meja Belajar - MB 801 | Ya | NO_EXPLICIT_REFERENCE | - | Putih: UNVERIFIED; Biru: UNVERIFIED; Pink: UNVERIFIED | - |
| B20240206110353 | Meja Belajar Rias - MB MR 168 KACA | Ya | NO_EXPLICIT_REFERENCE | - | BIRU: UNVERIFIED; PINK: UNVERIFIED; SONOMA: UNVERIFIED | - |
| B20240209202739 | Lemari Dewasa - ALD 9112 BEAUTY | Ya | NO_EXPLICIT_REFERENCE | - | Sonoma: UNVERIFIED | - |
| B20240209210218 | Meja Belajar - MBCS 150 | Ya | NO_EXPLICIT_REFERENCE | - | PUTIH MAHONI: UNVERIFIED | 8bb4371d-a47f-40c3-bcef-e8578fbb5df8 / MBCS 150 |
| B20240212110739 | Meja TV - DTV 150 | Ya | NO_EXPLICIT_REFERENCE | - | Walnut: UNVERIFIED | - |
| B20240212111638 | Meja TV - RTV 80 | Ya | NO_EXPLICIT_REFERENCE | - | SONOMA: UNVERIFIED | 1b57a16b-6fca-411e-9567-b0ddde714910 / RTV 80 |
| B20240212112609 | Meja TV - RTV 120 | Ya | NO_EXPLICIT_REFERENCE | - | PUTIH: UNVERIFIED | 083308a8-cf9b-4ee5-a69a-8686fd5418b2 / RTV 120 |
| B20240212113451 | Rak Serbaguna - RSG 3S | Ya | NO_EXPLICIT_REFERENCE | - | BIRU: UNVERIFIED; SONOMA: UNVERIFIED; PUTIH: UNVERIFIED | 91fdc608-0185-4c66-87f3-35a8dd56ffef / RSG 3S |
| B20240212114312 | Rak Serbaguna - RSG 4S | Ya | NO_EXPLICIT_REFERENCE | - | SONOMA: UNVERIFIED; PUTIH: UNVERIFIED | da713f45-1064-4b44-9219-86d7dd528257 / RSG 4S |
| B20240212120041 | Rak Serbaguna - RSG A4.4 | Ya | NO_EXPLICIT_REFERENCE | - | PUTIH: UNVERIFIED; SONOMA: UNVERIFIED; WINGE: UNVERIFIED | - |
| B20240212120745 | Rak Serbaguna - RSG C5.5 | Ya | NO_EXPLICIT_REFERENCE | - | PUTIH: UNVERIFIED; SONOMA: UNVERIFIED | - |
| B20240212144359 | Rak Serbaguna - RSD 100 | Ya | NO_EXPLICIT_REFERENCE | - | MARBLE WINGE: UNVERIFIED; PUTIH: UNVERIFIED | 515883d6-fb2d-49c9-b42a-2addf359d17a / RSD 100 |
| B20240212145330 | Rak Serbaguna - RSD 120 | Ya | NO_EXPLICIT_REFERENCE | - | MARBLE WINGE: UNVERIFIED; PUTIH: UNVERIFIED | 2de34a47-c1fe-4074-90d6-b0652025c799 / RSD 120 |
| B20240212150717 | Meja Tulis - MT 205 | Ya | NO_EXPLICIT_REFERENCE | - | SONOMA: UNVERIFIED; JATI HITAM: UNVERIFIED; WINGE: UNVERIFIED | eeccce32-25a2-483d-8c41-7d428387a1ca / MT 205 |
| B20240212153331 | Meja Komputer - MC 551 Saemas | Ya | NO_EXPLICIT_REFERENCE | - | CHERRY: UNVERIFIED | - |
| B20240212160003 | Rak Besi - RB 6140 | Ya | NO_EXPLICIT_REFERENCE | - | SONOMA: UNVERIFIED | 52b9c96c-4820-4dc4-bb7c-2e9316904a28 / RB 6140 |
| B20240213093057 | Meja Tulis - MT 570 SAEMAS | Ya | NO_EXPLICIT_REFERENCE | - | SONOMA: UNVERIFIED; CHERRY: UNVERIFIED | dde26206-59fe-464b-976c-cd276afccc3c / MT 570 SAEMAS |
| B20240213094112 | Meja Tulis - MT 580 SAEMAS | Ya | NO_EXPLICIT_REFERENCE | - | CHERRY: UNVERIFIED | 2319b1aa-5e70-4129-9f49-b8b61a173467 / MT 580 SAEMAS |
| B20240213101553 | Rak Besi - RB 6180 P | Ya | NO_EXPLICIT_REFERENCE | - | SONOMA: UNVERIFIED | 43edd8f7-306d-4fd2-8416-de9d00059280 / RB 6180 P |
| B20240213102615 | Lemari Dewasa - ALD 8112 Andalan | Tidak | NO_EXPLICIT_REFERENCE | - | Winge: UNVERIFIED | - |
| B20240213104005 | Lemari Dewasa - ALD 8112 L Andalan | Ya | NO_EXPLICIT_REFERENCE | - | PUTIH: UNVERIFIED; MARBLE: UNVERIFIED; GOLDIE: UNVERIFIED | - |
| B20240213105409 | Lemari Dewasa - ALD 8122 | Ya | NO_EXPLICIT_REFERENCE | - | PUTIH: UNVERIFIED | 2b482e49-11ac-47d3-9563-6b1970c2b20d / ALD 8122; 5b39f54a-df25-49b1-b873-456f64790856 / ALD 8122 |
| B20240213111208 | Lemari Dewasa - ALD 8113 Andalan | Ya | NO_EXPLICIT_REFERENCE | - | PUTIH: UNVERIFIED; WINGE: UNVERIFIED | - |
| B20240213111930 | Lemari Dewasa - ALD 8113 LH | Ya | NO_EXPLICIT_REFERENCE | - | PUTIH: UNVERIFIED; GOLDIE: UNVERIFIED; MARBLE: UNVERIFIED | 4a2843ed-faeb-4974-8f57-783d0221b474 / ALD 8113 LH; cd7bd33c-a7c4-4e38-b245-67642381100d / ALD 8113 LH |
| B20240213112613 | Lemari Dewasa - ALD 8112 Andalan KP | Ya | NO_EXPLICIT_REFERENCE | - | Putih: UNVERIFIED | - |
| B20240213113317 | Lemari Anak - ALA 832 | Ya | NO_EXPLICIT_REFERENCE | - | Sonoma: UNVERIFIED; Putih: UNVERIFIED | - |
| B20240213114225 | Lemari Anak - ALA 859 | Ya | NO_EXPLICIT_REFERENCE | - | WINGE PUTIH: UNVERIFIED | 34d253d0-026e-4c89-958e-0d19c9a86b2c / ALA 859 |
| B20240213115123 | Meja Belajar - MB 812 GAMBAR SERAT | Ya | NO_EXPLICIT_REFERENCE | - | Pink: UNVERIFIED; Sonoma Putih: UNVERIFIED; Biru: UNVERIFIED | - |
| B20240213115624 | Meja Belajar - MBKB 100 | Ya | NO_EXPLICIT_REFERENCE | - | SONOMA: UNVERIFIED | e69ba733-436c-4f77-9a28-99a1944cb4a4 / MBKB 100 |
| B20240213120239 | Meja Belajar - MBRB 120 | Ya | NO_EXPLICIT_REFERENCE | - | SONOMA: UNVERIFIED | 9019a901-b70b-4e78-a921-7918b381cb5f / MBRB 120 |
| B20240213130331 | Meja Belajar - MBRS 180 | Ya | NO_EXPLICIT_REFERENCE | - | PUTIH: UNVERIFIED; SONOMA: UNVERIFIED | 9acc2f33-ae55-45a9-b241-ff460174b442 / MBRS 180 |
| B20240213130743 | Meja Belajar - MBRS 380 | Ya | NO_EXPLICIT_REFERENCE | - | Putih Pink: UNVERIFIED; Putih Biru: UNVERIFIED | - |
| B20240213131138 | Meja Belajar - MBRS 580 | Ya | NO_EXPLICIT_REFERENCE | - | Putih Pink: UNVERIFIED | - |
| B20240213131913 | Meja Rias - MRS 866 | Ya | NO_EXPLICIT_REFERENCE | - | Kotak Putih: UNVERIFIED; Oval Marbel: UNVERIFIED; Kotak Marbel: UNVERIFIED; Oval Putih: UNVERIFIED | - |
| B20240213134212 | Meja Rias - MRSB 8002 H | Ya | NO_EXPLICIT_REFERENCE | - | SONOMA BESI PUTIH: UNVERIFIED | ae6fa12c-985b-4e74-bd47-04f9ab27530d / MRSB 8002 H |
| B20240213135053 | Meja TV - LTV 201 | Ya | NO_EXPLICIT_REFERENCE | - | CHERRY PUTIH: UNVERIFIED | 15f00c9c-3c4d-4009-babb-30954582198a / LTV 201 |
| B20240213135558 | Meja TV - LSTV 102 | Ya | NO_EXPLICIT_REFERENCE | - | CHERRY PUTIH: UNVERIFIED | 32250667-7b1e-482a-a313-0c1e9cd2a77c / LSTV 102 |
| B20240213140822 | Meja TV - MTV 606 | Ya | NO_EXPLICIT_REFERENCE | - | New Dark Brown: UNVERIFIED | - |
| B20240213141331 | Meja TV - MTV 608 | Ya | NO_EXPLICIT_REFERENCE | - | New Dark Brown: UNVERIFIED | - |
| B20240213143606 | Meja TV - MTV K 606 L | Ya | NO_EXPLICIT_REFERENCE | - | CHERRY: UNVERIFIED | 0a780a38-d0ff-4be0-9f07-32a935b332a8 / MTV K 606 L |
| B20240214221123 | Rak Serbaguna - RSG K | Ya | NO_EXPLICIT_REFERENCE | - | PUTIH: UNVERIFIED; ORANGE: UNVERIFIED | 2c7883d4-af8c-4e33-8905-ea0fac054b51 / RSG K |
| B20240214221539 | Rak Serbaguna - RSG K 120 | Ya | NO_EXPLICIT_REFERENCE | - | PUTIH WINGE: UNVERIFIED | 78d36efc-cc19-4b20-a2a1-fd1823f4c0f5 / RSG K 120 |
| B20240214221847 | Rak Serbaguna - RSG 12 | Ya | NO_EXPLICIT_REFERENCE | - | WINGE: UNVERIFIED; PUTIH: UNVERIFIED; SONOMA: UNVERIFIED | ea86a5d0-cc86-43a5-812c-b7ff308df4fd / RSG 12 |
| B20240214222145 | Rak Serbaguna - RSG 15 | Ya | NO_EXPLICIT_REFERENCE | - | PUTIH: UNVERIFIED; SONOMA: UNVERIFIED; DIRECTPINE: UNVERIFIED; JATI: UNVERIFIED; WINGE: UNVERIFIED | c5e983e3-2cd0-4c99-bd79-9ed9613133b1 / RSG 15 |
| B20240214222413 | Rak Sepatu - RS 6030 KACA | Ya | NO_EXPLICIT_REFERENCE | - | SONOMA: UNVERIFIED; MARBLE: UNVERIFIED; JATI: UNVERIFIED; MAHONI: UNVERIFIED; PUTIH: UNVERIFIED | - |
| B20240214222707 | Rak Sepatu - RS 7030 | Ya | NO_EXPLICIT_REFERENCE | - | PUTIH: UNVERIFIED | c8c9bf17-040f-45b2-a281-b8956a2fead4 / RS 7030 |
| B20240214222948 | Rak Sepatu - RS 8030 | Ya | NO_EXPLICIT_REFERENCE | - | PUTIH: UNVERIFIED | 84ba16af-40fe-4642-bc1e-b9861b18ad48 / RS 8030 |
| B20240214223214 | Rak Sepatu - RSS 8036 | Ya | NO_EXPLICIT_REFERENCE | - | PUTIH: UNVERIFIED; MAHONI: UNVERIFIED | 7d65675d-1874-43b9-aeb3-6ba2fca590cb / RSS 8036 |
| B20240214223443 | Rak Sepatu - RSLP 121 | Ya | NO_EXPLICIT_REFERENCE | - | Mahoni: UNVERIFIED | - |
| B20240214223820 | Rak Serbaguna - RSD 80 | Ya | NO_EXPLICIT_REFERENCE | - | MARBLE WINGE: UNVERIFIED; PUTIH: UNVERIFIED | 5bea0b21-a4e0-4905-98a7-eddda03b4bd4 / RSD 80 |
| B20240214224418 | Meja Tulis - MT 140 | Ya | NO_EXPLICIT_REFERENCE | - | SONOMA: UNVERIFIED | a248b8c6-b2e0-4f71-a1a8-8931af8d23d3 / MT 140 |
| B20240214225454 | Meja Tulis - MT 550 | Ya | NO_EXPLICIT_REFERENCE | - | CHERRY: UNVERIFIED | - |
| B20240214225740 | Meja Tulis - MT 552 | Ya | NO_EXPLICIT_REFERENCE | - | CHERRY: UNVERIFIED | - |
| B20240214230257 | Meja Komputer - MKB 8001 | Tidak | NO_EXPLICIT_REFERENCE | - | Sonoma Hitam: UNVERIFIED | - |
| B20240214230935 | Rak Besi - RB 6180 | Ya | NO_EXPLICIT_REFERENCE | - | SONOMA: UNVERIFIED | e1270800-2c8f-481a-9d4a-a01de26b366a / RB 6180 |
| B20240214231407 | Rak Besi - RBCB 3S | Ya | NO_EXPLICIT_REFERENCE | - | PUTIH: UNVERIFIED; WALNUT: UNVERIFIED | e173097f-217a-47af-a951-a92e58ce3b29 / RBCB 3S |
| B20240214231724 | Rak Besi - RBCB 4S | Ya | NO_EXPLICIT_REFERENCE | - | Sonoma: UNVERIFIED; Putih: UNVERIFIED; Walnut: UNVERIFIED | - |
| B20240220120955 | Rak Sepatu - RS 6012 | Ya | NO_EXPLICIT_REFERENCE | - | Mahoni: UNVERIFIED | - |
| B20240221090432 | Lemari Dewasa - ALD 8115 L Blink | Ya | NO_EXPLICIT_REFERENCE | - | Walnut: UNVERIFIED; Winge: UNVERIFIED; Putih: UNVERIFIED | - |
| B20240221091447 | Kursi - Kursi Saemas 01 | Ya | NO_EXPLICIT_REFERENCE | - | HITAM: UNVERIFIED; HITAM OSCAR: UNVERIFIED; HIJAU: UNVERIFIED; ABU ABU: UNVERIFIED; BIRU OSCAR: UNVERIFIED; MERAH OSCAR: UNVERIFIED | - |
| B20240221091837 | Meja Rias - MR 815 | Ya | NO_EXPLICIT_REFERENCE | - | MARBLE: UNVERIFIED; PUTIH: UNVERIFIED | f28462e3-e719-4ec5-b228-35588e869026 / MR 815 |
| B20240221092110 | Meja Rias - MR 836 | Ya | NO_EXPLICIT_REFERENCE | - | PUTIH: UNVERIFIED; MARBLE: UNVERIFIED | 0659774a-8c84-43e3-997d-d612f6620e75 / MR 836 |
| B20240221092708 | Rak Serbaguna - RSD 6 | Ya | NO_EXPLICIT_REFERENCE | - | PUTIH: UNVERIFIED | 4abd78ae-da46-4ef1-bca7-02bb1867777d / RSD 6 |
| B20240221092912 | Rak Serbaguna - RSD 8 | Ya | NO_EXPLICIT_REFERENCE | - | PUTIH: UNVERIFIED | 2a48e2ac-c7ea-4201-9066-aae112c0fc95 / RSD 8 |
| B20240222131229 | Lemari Dewasa - ALD 8113 KP Andalan | Ya | NO_EXPLICIT_REFERENCE | - | Putih: UNVERIFIED | - |
| B20240227150713 | Rak Sepatu - RS 7020 | Ya | NO_EXPLICIT_REFERENCE | - | PUTIH: UNVERIFIED | 8709fc6e-7659-4392-b40d-d6831e53432f / RS 7020 |
| B20240301095146 | Lemari Dewasa - ALD 8112 KP Gamis Luna Marbel | Ya | NO_EXPLICIT_REFERENCE | - | Marble: UNVERIFIED | - |
| B20240301101631 | Lemari Dewasa - ALD 8111 1P | Ya | NO_EXPLICIT_REFERENCE | - | Winge Putih: UNVERIFIED; Putih: UNVERIFIED | - |
| B20240301103054 | Rak Sepatu - RS 8020 | Ya | NO_EXPLICIT_REFERENCE | - | PUTIH: UNVERIFIED | 3ec5e074-4fe0-4e24-b9f7-d2daf76ae6df / RS 8020 |
| B20240301104421 | Rak Serbaguna - RSD 10 | Ya | NO_EXPLICIT_REFERENCE | - | PUTIH: UNVERIFIED | 57619524-d076-4381-bedb-4de96b754a38 / RSD 10 |
| B20240305144133 | Meja Rias - MR 835 | Ya | NO_EXPLICIT_REFERENCE | - | PUTIH: UNVERIFIED; MARBLE: UNVERIFIED | 2ccb18cb-ccb6-4c2f-814c-0ebf28e5ba1e / MR 835 |
| B20240305150846 | Kursi - Kursi Bakso | Ya | NO_EXPLICIT_REFERENCE | - | Default: UNVERIFIED | 39d09383-3b31-4518-9e2a-8573f73b3b97 / KURSI BAKSO |
| B20240701102845 | Rak Sepatu - RSLP 120 | Ya | NO_EXPLICIT_REFERENCE | - | MAHONI: UNVERIFIED; MARBLE: UNVERIFIED; PUTIH: UNVERIFIED; JATI: UNVERIFIED | 840ca0b9-315a-4587-89e8-4164fcfed2fd / RSLP 120 |
| B20240703054007 | Rak Sepatu - RSS 8070 | Ya | NO_EXPLICIT_REFERENCE | - | PUTIH: UNVERIFIED; SONOMA: UNVERIFIED | b5a8f3ee-dc14-4680-990e-71aa035ac0b9 / RSS 8070 |
| B20241106112127 | Meja TV - DTV 151 | Ya | NO_EXPLICIT_REFERENCE | - | SONOMA: UNVERIFIED; MARBLE: UNVERIFIED | 36d2f8f9-ca75-4f42-90e5-505a56860fff / DTV 151 |
| B20241106113104 | Meja TV - DTV 160 | Ya | NO_EXPLICIT_REFERENCE | - | CHERRY PUTIH: UNVERIFIED | 1b821006-9d5c-4451-b13e-8c7221d4a187 / DTV 160 |
| B20241106114112 | Lemari Serbaguna - LSG 8170 | Ya | NO_EXPLICIT_REFERENCE | - | WINGE: UNVERIFIED; WALNUT: UNVERIFIED; PUTIH: UNVERIFIED | 84063a4c-b60e-4010-989b-544005ccb549 / LSG 8170 |
| B20241106114916 | Meja Belajar - MB 815 | Ya | NO_EXPLICIT_REFERENCE | - | BIRU: UNVERIFIED; PINK: UNVERIFIED | 925eeeb3-2e97-4ca5-968e-da6389d9cc38 / MB 815 |
| B20241106115522 | Meja Belajar - MB 825 | Ya | NO_EXPLICIT_REFERENCE | - | PINK: UNVERIFIED; BIRU: UNVERIFIED | 808bdbaa-919b-46e5-9f18-a5a97e7ddb71 / MB 825 |
| B20241106133158 | Meja Rias - MRH 800 | Ya | NO_EXPLICIT_REFERENCE | - | PUTIH: UNVERIFIED; MARBLE: UNVERIFIED | 25757812-01b4-4682-a799-866f46156b9f / MRH 800 |
| B20241106134320 | Meja Rias - MRH 805 | Ya | NO_EXPLICIT_REFERENCE | - | PUTIH: UNVERIFIED | 1192afb3-81f1-4c7c-8938-fce6d14a6fbc / MRH 805 |
| B20241114093849 | Lemari Serbaguna - LSG 8080 N | Ya | NO_EXPLICIT_REFERENCE | - | New Dark Brown: UNVERIFIED; Jati: UNVERIFIED | - |
| B20241114095511 | Meja Komputer - MC 08 | Ya | NO_EXPLICIT_REFERENCE | - | SONOMA: UNVERIFIED | 7190a977-9fd4-4fa2-aa6c-cbd3f1f8c18e / MC 08 |
| B20241114101012 | Rak Serbaguna - RSG 3.3P | Ya | NO_EXPLICIT_REFERENCE | - | ORANGE: UNVERIFIED; PINK: UNVERIFIED; BIRU: UNVERIFIED | 64e4c982-1e08-4924-b912-cb2812cf172b / RSG 3.3P |
| B20241114102115 | Rak Serbaguna - RSG 5.5P | Ya | NO_EXPLICIT_REFERENCE | - | BIRU: UNVERIFIED | 1a56b3c3-4056-4ea0-9a03-b8509aedc230 / RSG 5.5P |
| B20241210121113 | [Sweet Package] Lemari 2 pintu + Meja Rias / ALD 8112 KP + MRS 866 | Tidak | NO_EXPLICIT_REFERENCE | - | Default: UNVERIFIED | - |
| B20241210143544 | [Corner Bundling A] RAK SERBAGUNA RSG 3S | Ya | NO_EXPLICIT_REFERENCE | - | Menyesuaikan: UNVERIFIED | - |
| B20241210144549 | [Corner Bundling B] RAK SERBAGUNA / RSG 3S + RSG 4S | Ya | NO_EXPLICIT_REFERENCE | - | Menyesuaikan: UNVERIFIED | - |
| B20241210153028 | [Workspace Bundling] MEJA TULIS + KURSI / MT 205 + KURSI SAEMAS | Ya | NO_EXPLICIT_REFERENCE | - | Menyesuaikan: UNVERIFIED | - |
| B20241210154615 | [Workspace Bundling B] MEJA TULIS + KURSI / MT 570 + KURSI SAEMAS | Tidak | NO_EXPLICIT_REFERENCE | - | Default: UNVERIFIED | - |
| B20250609161143 | Meja Rias - MR 850 | Ya | NO_EXPLICIT_REFERENCE | - | Cermin Kotak: UNVERIFIED;  Cermin Bulat: UNVERIFIED | - |
| B20251110182815 | Lemari Rak Buku - LRB 8080 | Ya | NO_EXPLICIT_REFERENCE | - | WINGE: UNVERIFIED; PUTIH: UNVERIFIED | 5b2cdc81-5e41-416f-a301-47ad73e11ac1 / LRB 8080 |
| B20251110183414 | Lemari Rak Buku 8120 - LRB 8120 | Ya | NO_EXPLICIT_REFERENCE | - | PUTIH: UNVERIFIED; WINGE: UNVERIFIED | ab8e1608-3658-479b-9355-4b34c3ff8e94 / LRB 8120 |
| B20251110184550 | Meja Rias 880 - MR 880 | Ya | NO_EXPLICIT_REFERENCE | - | PUTIH: UNVERIFIED; MARBLE: UNVERIFIED | e44e747a-b4f7-4a24-9651-9a15e0cb4968 / MR 880 |
| B20251110194121 | Meja Rias - MR 832 | Ya | NO_EXPLICIT_REFERENCE | - | PUTIH: UNVERIFIED; MARBLE: UNVERIFIED | 5bf3e512-c587-4327-b9ea-9156e169f737 / MR 832 |
| B20251110194848 | Meja TV Cresenda 120 - CSD 120 | Ya | NO_EXPLICIT_REFERENCE | - | PUTIH: UNVERIFIED; MARBLE: UNVERIFIED | 062dd6c9-0567-441f-a4c4-62892091d7d4 / CSD 120 |
| B20260707155515 | LUNAREA FURNITURE - ALD 8112 ANDALAN LEMARI PAKAIAN 2 PINTU WARNA PUTIH | Ya | NO_EXPLICIT_REFERENCE | - | Putih: UNVERIFIED | - |
| B20260707155516 | LUNAREA FURNITURE - ALD 8112 ANDALAN LEMARI PAKAIAN 2 PINTU WARNA PUTIH | Ya | NO_EXPLICIT_REFERENCE | - | Putih: UNVERIFIED | - |
