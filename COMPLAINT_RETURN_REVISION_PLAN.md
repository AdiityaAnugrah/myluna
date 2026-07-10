# Rencana Revisi Flow Komplen, Retur, dan Pelunasan

Dokumen ini menjadi acuan sebelum mengubah kode produksi. Tujuannya adalah membuat flow Komplen dan Retur lebih jelas, step-by-step per halaman, serta aman terhadap data produksi yang sudah ada.

> Prinsip utama: revisi dilakukan secara additive. Jangan hapus status/kolom lama secara langsung. Data lama harus tetap bisa dibaca dan dipetakan ke flow baru.

---

## 1. Masalah Flow Saat Ini

Saat ini sistem sudah punya modul:

- Komplen: `complaints`
- Retur: `returns`
- Tiket Retur lama: `return-tickets` (tidak dipakai untuk flow baru, hanya kompatibilitas data lama)
- Settlement / Pelunasan
- Stock Movement
- Expense / Finance

Namun flow Komplen dan Retur masih bercampur di beberapa tempat, terutama:

1. Komplen hanya punya flow sederhana: buat -> TCP claim -> pengganti dikirim -> user selesai / follow up.
2. Komplen belum punya keputusan eksplisit seperti:
   - kena potongan marketplace,
   - kirim komponen,
   - wajib masuk retur.
3. Retur pernah memakai tiket diskusi, tetapi flow baru harus langsung step-by-step di halaman Retur agar tidak membingungkan.
4. Keputusan akhir retur perlu dibedakan lebih detail:
   - barang layak kembali stok,
   - barang hangus,
   - barang direvisi lalu kembali stok tetapi pendapatan tidak masuk.
5. Ada risiko data produksi kacau jika status lama diubah langsung.

---

## 2. Prinsip Migrasi Aman Produksi

### 2.1 Jangan Hapus Field Lama

Field/status lama tetap dipertahankan, minimal selama masa transisi.

Contoh status lama yang tetap harus aman:

- `PENDING_TCP_REVIEW`
- `ACCEPTED_BY_TCP`
- `WAITING_USER_CONFIRMATION`
- `FOLLOW_UP_REQUIRED`
- `COMPLETED`
- `CONVERTED_TO_RETURN`
- `PENDING_REVIEW`
- `WAITING_ITEM_RETURN`
- `ITEM_RECEIVED`
- `RESTOCKED`
- `DAMAGED`
- `RESENT`

### 2.2 Tambah Field Baru, Bukan Mengganti Langsung

Gunakan migration additive:

- tambah kolom nullable,
- tambah tabel baru jika perlu,
- tambah enum baru secara hati-hati,
- tidak melakukan bulk update data lama tanpa backup.

### 2.3 Data Lama Tetap Tampil

Data lama tetap ditampilkan di halaman baru dengan mapping label/status.

### 2.4 Eksekusi Bertahap

Implementasi dilakukan dalam beberapa tahap kecil, tiap tahap bisa dites sebelum lanjut.

---

## 3. Flow Komplen Baru

Komplen memiliki tiga kemungkinan keputusan utama:

1. Kena potongan / denda marketplace dan dicatat ke pelunasan.
2. Kirim komponen / pengganti oleh TCP.
3. Wajib masuk proses retur.

### 3.1 Flow A: Komplen Kena Potongan Marketplace

Contoh kasus:

- Customer komplain di Shopee/Tokopedia/platform lain.
- Marketplace mengenakan denda/potongan.
- User menerima hasil bersih yang sudah dipotong.

Flow:

```txt
Komplen dibuat
-> TCP/Admin review
-> Diputuskan: Kena Potongan Marketplace
-> Masuk Pelunasan
-> User input hasil bersih dan nominal potongan
-> Komplen selesai
```

Data yang perlu disimpan:

- `complaintId`
- `saleId`
- `settlementId` jika sudah terkait settlement
- `platformId` / platform name
- `deductionAmount`
- `netReceivedAmount`
- `deductionReason`
- `settlementDate`
- `recordedBy`
- `recordedAt`

Efek bisnis:

- Tidak mengubah stok.
- Mengubah/melengkapi data pelunasan.
- Finance report harus membaca nilai bersih dan potongan.

### 3.2 Flow B: Komplen Kirim Komponen

Flow:

```txt
Komplen dibuat
-> TCP/Admin review
-> Diputuskan: Kirim Komponen
-> TCP pilih komponen/produk + qty
-> Stok komponen berkurang
-> Ongkir/biaya dicatat jika ada
-> User konfirmasi selesai
-> Komplen selesai
```

Data yang perlu disimpan:

- `complaintId`
- `componentProductId`
- `componentVariantName`
- `quantity`
- `shippingService`
- `shippingCost`
- `notes`
- `processedBy`
- `processedAt`
- `confirmedBy`
- `confirmedAt`

Efek bisnis:

- Stock movement `OUT`.
- Product/variant stock berkurang.
- Expense shipping/other jika ada.
- Komplen selesai setelah user konfirmasi.

### 3.3 Flow C: Komplen Masuk Retur

Flow:

```txt
Komplen dibuat
-> TCP/Admin review
-> Diputuskan: Wajib Retur
-> Pilih item dan qty retur
-> Sistem membuat SaleReturn
-> Komplen ditandai CONVERTED_TO_RETURN
-> User diarahkan ke proses Retur
```

Efek bisnis:

- Komplen tidak diselesaikan sebagai pengiriman komponen.
- SaleReturn dibuat.
- ReturnTicket tidak dibuat pada flow baru. Proses lanjut langsung di halaman Retur step-by-step.
- Data komplen menyimpan referensi ke retur baru.

---

## 4. Flow Retur Baru

Retur memiliki proses bertahap:

```txt
Retur dibuat
-> Review
-> Barang diterima
-> Inspeksi
-> Keputusan akhir
-> Selesai
```

### 4.1 Retur Dibuat

Sumber retur bisa dari:

1. Retur langsung dari menu Retur.
2. Konversi dari Komplen.

Status awal tetap bisa menggunakan:

```txt
PENDING_REVIEW
```

### 4.2 Review Retur

```txt
PENDING_REVIEW
-> APPROVE -> WAITING_ITEM_RETURN
-> REJECT -> REJECTED
```

### 4.3 Barang Diterima

```txt
WAITING_ITEM_RETURN
-> ITEM_RECEIVED
```

Pada tahap ini TCP/Admin mengunggah foto barang diterima dan catatan penerimaan.

### 4.4 Inspeksi Barang

Setelah barang diterima, masuk halaman inspeksi.

Pilihan:

1. Barang layak pakai.
2. Barang tidak layak pakai.

#### A. Barang Layak Pakai

Flow:

```txt
ITEM_RECEIVED
-> Inspeksi: Layak Pakai
-> Kembali ke Stok
-> RESTOCKED
```

Efek:

- Product stock bertambah.
- Variant stock bertambah jika ada.
- StockMovement `IN`.
- Retur selesai.

#### B. Barang Tidak Layak Pakai

Jika barang tidak layak, ada dua outcome:

1. Hangus.
2. Revisi.

---

## 5. Outcome Barang Tidak Layak

### 5.1 Hangus

Definisi:

- Barang tidak bisa dijual lagi.
- Tidak masuk stok.
- Pendapatan dari transaksi terkait dianggap tidak masuk/berkurang.

Flow:

```txt
ITEM_RECEIVED
-> Inspeksi: Tidak Layak
-> Keputusan: Hangus
-> Catat nilai kerugian
-> WRITE_OFF
```

Efek:

- Tidak ada penambahan stok.
- Bisa membuat Expense kategori `OTHER` / loss.
- Pelunasan/finance perlu menandai pendapatan tidak masuk atau berkurang.

Data yang perlu dicatat:

- `lossAmount`
- `lossReason`
- `incomeLostAmount`
- `notes`
- `processedBy`
- `processedAt`

### 5.2 Revisi

Definisi:

- Barang awalnya tidak layak jual.
- Setelah direvisi/perbaiki masih bisa kembali menjadi stok.
- Pendapatan dari transaksi awal tetap tidak didapat.

Flow:

```txt
ITEM_RECEIVED
-> Inspeksi: Tidak Layak
-> Keputusan: Revisi
-> Catat biaya revisi jika ada
-> Setelah revisi masuk stok
-> REPAIR_AND_RESTOCK
```

Efek:

- Stok bertambah setelah revisi selesai.
- Bisa membuat Expense biaya revisi.
- Pendapatan awal tetap dianggap tidak masuk.
- StockMovement `IN` dengan reference khusus revisi retur.

Data yang perlu dicatat:

- `repairCost`
- `repairNotes`
- `qtyRestockedAfterRepair`
- `incomeLostAmount`
- `processedBy`
- `processedAt`

---

## 6. Field Baru yang Disarankan

### 6.1 Tabel `complaints`

Tambahan kolom aman:

```txt
resolutionType nullable
resolutionStatus nullable
settlementId nullable
linkedReturnId nullable
deductionAmount decimal nullable
netReceivedAmount decimal nullable
deductionReason text nullable
componentShipmentStatus nullable
componentShippingService nullable
componentShippingCost decimal nullable
resolutionNotes text nullable
resolvedBy nullable
resolvedAt nullable
```

Contoh nilai `resolutionType`:

```txt
SETTLEMENT_DEDUCTION
SEND_COMPONENT
CONVERT_TO_RETURN
NO_ACTION
```

Contoh nilai `resolutionStatus`:

```txt
PENDING_DECISION
IN_PROGRESS
WAITING_USER_CONFIRMATION
COMPLETED
```

### 6.2 Tabel Baru Opsional: `complaint_component_shipments`

Lebih rapi jika kirim komponen bisa lebih dari satu item.

Kolom:

```txt
id
complaintId
productId
variantName
quantity
stockMovementId
createdBy
createdAt
updatedAt
```

### 6.3 Tabel `sale_returns`

Tambahan kolom:

```txt
sourceType nullable
sourceComplaintId nullable
inspectionResult nullable
finalOutcome nullable
lossAmount decimal nullable
incomeLostAmount decimal nullable
repairCost decimal nullable
repairNotes text nullable
finalOutcomeNotes text nullable
inspectedBy nullable
inspectedAt nullable
finalizedBy nullable
finalizedAt nullable
```

Contoh `sourceType`:

```txt
DIRECT
COMPLAINT
```

Contoh `inspectionResult`:

```txt
GOOD
NOT_GOOD
```

Contoh `finalOutcome`:

```txt
RESTOCK
WRITE_OFF
REPAIR_AND_RESTOCK
RESEND_UNIT
SEND_COMPONENT
```

### 6.4 Tabel `sale_return_items`

Tambahan kolom jika perlu detail per item:

```txt
inspectionResult nullable
finalOutcome nullable
qtyWrittenOff nullable
qtyRepaired nullable
qtyRestocked nullable
itemNotes nullable
```

---

## 7. Endpoint Baru yang Disarankan

### 7.1 Komplen

```http
GET   /complaints/:id
PATCH /complaints/:id/decision
PATCH /complaints/:id/settlement-deduction
PATCH /complaints/:id/component-shipment
PATCH /complaints/:id/confirm-component-shipment
POST  /complaints/:id/convert-to-return
```

Keterangan:

- `decision`: memilih keputusan utama komplen.
- `settlement-deduction`: mencatat potongan/denda ke pelunasan.
- `component-shipment`: TCP memproses kirim komponen.
- `confirm-component-shipment`: user mengonfirmasi selesai.
- `convert-to-return`: membuat retur dari komplen.

### 7.2 Retur

```http
PATCH /returns/:id/receive
PATCH /returns/:id/inspection
PATCH /returns/:id/restock
PATCH /returns/:id/write-off
PATCH /returns/:id/repair-restock
```

Catatan:

- Endpoint lama `damaged` bisa tetap ada untuk backward compatibility.
- Flow baru sebaiknya menggunakan `write-off` dan `repair-restock` supaya makna bisnis jelas.

---

## 8. Struktur Halaman Frontend Baru

### 8.1 Komplen

```txt
/complaints
/complaints/new
/complaints/[id]
/complaints/[id]/decision
/complaints/[id]/settlement-deduction
/complaints/[id]/component-shipment
/complaints/[id]/convert-return
```

#### `/complaints`

Daftar komplen, filter, status, tombol detail.

#### `/complaints/new`

Form khusus buat komplen.

#### `/complaints/[id]`

Detail komplen:

- informasi sale,
- bukti foto,
- status,
- timeline,
- keputusan yang sudah dipilih,
- tombol lanjut step.

#### `/complaints/[id]/decision`

TCP/Admin memilih keputusan:

1. Kena potongan/denda marketplace.
2. Kirim komponen.
3. Masuk retur.
4. Tidak ada tindakan / selesai manual.

#### `/complaints/[id]/settlement-deduction`

Form potongan pelunasan:

- nilai potongan,
- hasil bersih,
- alasan potongan,
- referensi settlement.

#### `/complaints/[id]/component-shipment`

Form kirim komponen:

- pilih produk/komponen,
- varian,
- qty,
- jasa kirim,
- ongkir,
- catatan.

#### `/complaints/[id]/convert-return`

Form konversi ke retur:

- pilih item sale,
- qty retur,
- alasan,
- bukti,
- submit.

### 8.2 Retur

```txt
/returns
/returns/new
/returns/[id]
/returns/[id]/receive
/returns/[id]/inspection
/returns/[id]/restock
/returns/[id]/write-off
/returns/[id]/repair
```

#### `/returns/[id]/receive`

TCP/Admin menerima barang retur.

#### `/returns/[id]/inspection`

TCP/Admin menentukan:

- layak pakai,
- tidak layak pakai.

#### `/returns/[id]/restock`

Barang layak pakai masuk stok.

#### `/returns/[id]/write-off`

Barang hangus, tidak masuk stok, catat kerugian.

#### `/returns/[id]/repair`

Barang direvisi, setelah itu masuk stok, pendapatan awal tetap tidak masuk.

---

## 9. Mapping Data Lama ke UI Baru

### 9.1 Komplen Lama

| Status Lama | Tampilan Baru |
|---|---|
| `PENDING_TCP_REVIEW` | Menunggu Review TCP |
| `ACCEPTED_BY_TCP` | Sedang Diproses TCP |
| `WAITING_USER_CONFIRMATION` | Menunggu Konfirmasi User |
| `FOLLOW_UP_REQUIRED` | Perlu Tindak Lanjut |
| `COMPLETED` | Selesai |
| `CONVERTED_TO_RETURN` | Dialihkan ke Retur |

Jika `resolutionType` kosong, tampilkan sebagai flow legacy.

### 9.2 Retur Lama

| Status Lama | Tampilan Baru |
|---|---|
| `PENDING_REVIEW` | Menunggu Review |
| `WAITING_ITEM_RETURN` | Menunggu Barang Kembali |
| `ITEM_RECEIVED` | Menunggu Inspeksi |
| `RESTOCKED` | Kembali ke Stok |
| `DAMAGED` | Tidak Layak / Kerugian Legacy |
| `RESENT` | Pengganti Dikirim |
| `REJECTED` | Ditolak |

Jika `inspectionResult` dan `finalOutcome` kosong, tampilkan sebagai flow legacy.

---

## 10. Risiko dan Mitigasi

### Risiko 1: Enum MySQL sulit diubah

Mitigasi:

- Tambahkan kolom string baru untuk status baru, jangan memaksa ubah enum lama di tahap awal.
- Jika perlu enum, lakukan migration terpisah dan diuji di staging/local.

### Risiko 2: Settlement lama berubah salah

Mitigasi:

- Jangan update settlement lama otomatis.
- Buat relasi/catatan deduction baru yang eksplisit.
- Update settlement hanya dari action user yang jelas.

### Risiko 3: Stok dobel masuk/keluar

Mitigasi:

- Semua proses stok harus transactional.
- Simpan reference unik di StockMovement.
- Cek apakah action sudah pernah diproses sebelum membuat movement baru.

### Risiko 4: Flow lama dan baru bentrok

Mitigasi:

- Jika record punya `resolutionType`, pakai flow baru.
- Jika kosong, pakai tampilan legacy.
- Endpoint legacy tetap ada, tapi UI diarahkan ke endpoint baru.

---

## 11. Tahapan Implementasi yang Disarankan

### Tahap 1: Persiapan DB dan Type

- Tambah migration additive.
- Update model TypeScript.
- Update frontend types.
- Belum ubah UI besar.

### Tahap 2: Detail Page Komplen dan Retur

- Pisahkan detail page.
- Tambah route baru tapi belum hapus page lama.
- Data lama harus tampil benar.

### Tahap 3: Decision Flow Komplen

- Tambah endpoint `decision`.
- Tambah page `/complaints/[id]/decision`.

### Tahap 4: Settlement Deduction

- Tambah endpoint dan UI potongan pelunasan.
- Integrasi ke settlement/finance.

### Tahap 5: Component Shipment

- Tambah endpoint kirim komponen.
- Integrasi stok dan expense.

### Tahap 6: Convert Komplen ke Retur

- Tambah endpoint convert.
- Link `complaintId` ke `saleReturn`.

### Tahap 7: Retur Inspection Baru

- Tambah halaman receive/inspection/restock/write-off/repair.
- Tambah endpoint baru.

### Tahap 8: QA End-to-End

Test minimal:

1. Data komplen lama tetap bisa dibuka.
2. Data retur lama tetap bisa dibuka.
3. Komplen potongan masuk settlement.
4. Komplen kirim komponen mengurangi stok sekali saja.
5. Komplen convert retur membuat retur tanpa tiket baru.
6. Retur layak pakai menambah stok sekali saja.
7. Retur hangus tidak menambah stok dan mencatat kerugian.
8. Retur revisi menambah stok setelah revisi dan mencatat income lost.
9. Finance report tidak dobel hitung.
10. Role USER/TCP/ADMIN tetap sesuai.

---

## 12. Keputusan Teknis Awal

Rekomendasi awal:

1. Gunakan field baru string/decimal nullable untuk menghindari risiko enum.
2. UI dibuat per page agar operator tidak bingung.
3. Return Ticket tidak dipakai lagi untuk flow baru. Tabel/endpoint lama hanya dipertahankan sementara untuk kompatibilitas data lama.
4. Jangan hapus endpoint lama sampai flow baru stabil.
5. Semua mutasi stok/finance wajib pakai transaction.

---

## 13. Checklist Sebelum Coding

Sebelum mulai implementasi, pastikan sudah jelas:

- Apakah potongan marketplace masuk ke settlement existing atau tabel deduction baru?
- Apakah kirim komponen harus selalu mengurangi stok produk biasa atau ada master komponen tersendiri?
- Flow Retur baru dipastikan tidak memakai Return Ticket. Ticket lama hanya kompatibilitas data lama.
- Untuk kasus hangus, apakah dicatat sebagai Expense, pengurang revenue, atau dua-duanya?
- Untuk kasus revisi, kapan stok bertambah: saat keputusan revisi atau setelah revisi selesai?

Rekomendasi jawaban default:

- Potongan marketplace: tambah field/catatan di settlement dan simpan referensi complaint.
- Komponen: pakai produk/variant existing dulu.
- Retur: flow baru tidak membuat Return Ticket otomatis. Semua proses dilakukan langsung lewat halaman Retur step-by-step.
- Hangus: catat `incomeLostAmount` dan optional Expense jika ada biaya tambahan.
- Revisi: stok bertambah setelah revisi selesai.
