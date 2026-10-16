# Order website: review → TCP → resi

Order WEBSITE paid dapat diimpor tanpa resi setelah review admin website. TCP tetap perlu konfirmasi hasil cetak/current shipping snapshot untuk menandai PROCESSED. Tidak ada barcode AWB ketika resi belum tersedia.

Setelah commit PROCESSED, `websiteFulfillment.service` mengirim POST ke endpoint website `/integrations/luna-order-status`. Gunakan token `LUNA_WEB_ORDER_TOKEN` existing. URL opsional `LUNA_WEB_ORDER_STATUS_URL`; bila kosong gunakan URL retur existing dengan suffix yang sesuai, kemudian fallback domain produksi Lunarea. Staging wajib memakai URL staging eksplisit.

Callback berisi order_id, sale_id, stage=processed, processed_at. Website hanya mencatat kemajuan pusat, bukan mengganti status pembayaran/pengiriman. Status tetap Proses sampai admin website mengisi resi dan memilih Dalam Pengiriman.

Gagal callback tidak membatalkan pekerjaan TCP. Worker server mencoba ulang setiap menit, batch 25 dan cursor rotasi. Pengakuan sukses disimpan sebagai penanda notes di bawah row lock, sehingga perubahan resi bersamaan tidak tertimpa. Receiver idempotent menghadapi retry/multi-worker. Ulang kirim order dari website juga mengembalikan fulfillment aktual sebagai jalur pemulihan. Log tidak menyertakan token/alamat pelanggan.

Sesudah TCP processed, resi pertama dapat ditambahkan oleh website sepanjang kurir/layanan tetap sama. Koreksi resi yang sudah terisi setelah proses tetap memerlukan penanganan terpisah; tidak diam-diam mengganti dokumen yang sudah dicetak. Update pengiriman hanya mengubah notes, tidak mengulang Sale/StockMovement/nominal.

Deploy website penerima callback lebih dahulu, kemudian backend (build/restart) dan frontend MyLuna. Tunda penerusan order selama jeda versi. Tidak ada SQL/migration/package baru. Rollback harus terkoordinasi kedua project, tanpa menghapus order yang sudah masuk; versi lama kembali mewajibkan resi sebelum proses.
