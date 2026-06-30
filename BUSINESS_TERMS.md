# Kamus Istilah Bisnis Resmi

Dokumen ini menjadi acuan utama untuk istilah bisnis di seluruh sistem:

- backend response message
- frontend label
- toast
- notifikasi socket
- dashboard summary
- modal / dialog / helper text
- dokumentasi internal

Tujuannya supaya istilah tidak berubah-ubah antar halaman, antar role, atau antar modul.

---

## 1. Istilah utama yang wajib dipakai

### 1.1 Komplen
Gunakan istilah:

- **Komplen**

Arti:

- pintu awal ketika customer melaporkan masalah pesanan
- fokus ke masalah customer
- belum otomatis berarti barang akan kembali

Jangan ganti-ganti dengan:

- komplain
- complaint
- laporan masalah

> Di sistem ini istilah bakunya adalah **Komplen**.

---

### 1.2 Retur
Gunakan istilah:

- **Retur**
- **Pengajuan retur**

Arti:

- proses pengembalian barang dari penjualan
- dipakai jika kasus memang masuk ke alur barang kembali / pemeriksaan barang / penggantian

Gunakan:

- **Setujui pengajuan**
- **Tolak pengajuan**
- **Barang sudah diterima**
- **Masuk stok**
- **Tidak layak pakai**
- **Barang pengganti dikirim**

Jangan campur dengan istilah:

- retur rusak
- kirim ulang retur
- proses barang balik

> Jika perlu menjelaskan hasil akhir, pakai status resmi, bukan istilah bebas.

---

### 1.3 Tiket Retur
Gunakan istilah:

- **Tiket Retur**

Arti:

- forum diskusi dan keputusan internal untuk kasus retur
- tempat komunikasi user, admin, dan TCP
- pusat finalisasi keputusan dan eksekusi

Jangan diganti menjadi:

- forum retur
- room retur
- thread retur
- tiket diskusi

> Kalau konteksnya modul itu sendiri, istilah bakunya tetap **Tiket Retur**.

---

### 1.4 TCP
Gunakan istilah:

- **TCP**

Kalau menjelaskan aktivitasnya:

- **ditangani TCP**
- **masuk tahap eksekusi TCP**
- **sedang dieksekusi TCP**

Hindari:

- dikerjakan TCP
- diproses TCP
- diurus TCP

> Untuk workflow resmi, kata yang dipilih adalah **ditangani** atau **dieksekusi**, sesuai tahapnya.

---

## 2. Status resmi per modul

### 2.1 Status Komplen

| Kode | Label resmi |
|---|---|
| `PENDING_TCP_REVIEW` | Menunggu Review TCP |
| `ACCEPTED_BY_TCP` | Sedang Ditangani TCP |
| `REJECTED_BY_TCP` | Ditolak TCP |
| `REPLACEMENT_SHIPPED` | Pengganti Sudah Dikirim |
| `COMPLETED` | Selesai |
| `CONVERTED_TO_RETURN` | Dialihkan ke Retur |

Catatan:

- gunakan **ditangani**, bukan “diproses TCP”
- gunakan **pengganti sudah dikirim**, bukan “sudah diurus”

---

### 2.2 Status Retur

| Kode | Label resmi |
|---|---|
| `PENDING_REVIEW` | Menunggu Review |
| `WAITING_ITEM_RETURN` | Menunggu Barang Kembali |
| `ITEM_RECEIVED` | Barang Sudah Diterima |
| `REJECTED` | Ditolak |
| `RESTOCKED` | Masuk Stok |
| `DAMAGED` | Tidak Layak Pakai |
| `RESENT` | Barang Pengganti Dikirim |
| `COMPLETED` | Selesai |

Catatan:

- gunakan **barang sudah diterima**, bukan “barang diterima tim” untuk label utama
- gunakan **tidak layak pakai**, bukan “retur rusak” sebagai istilah utama UI
- gunakan **barang pengganti dikirim**, bukan “kirim ulang retur” sebagai label bisnis utama

---

### 2.3 Status Tiket Retur

| Kode | Label resmi |
|---|---|
| `OPEN` | Baru Dibuka |
| `IN_DISCUSSION` | Dalam Diskusi |
| `DECISION_FINALIZED` | Keputusan Sudah Final |
| `WAITING_TCP_EXECUTION` | Menunggu Eksekusi TCP |
| `TCP_EXECUTING` | Sedang Dieksekusi TCP |
| `COMPLETED` | Selesai |
| `REJECTED` | Ditolak |
| `OVERDUE` | Melewati Deadline |

Catatan:

- gunakan **finalisasi**, bukan “finalkan”
- gunakan **dieksekusi**, bukan “dikerjakan”
- gunakan **melewati deadline**, bukan “lewat batas waktu”, kalau merujuk label status resmi

---

## 3. Istilah aksi resmi

### 3.1 Aksi Komplen
Gunakan:

- **Terima untuk Diproses**
- **Tandai Pengganti Dikirim**
- **Selesai**

Jangan gunakan:

- Terima Komplen
- Sudah Diurus

---

### 3.2 Aksi Retur
Gunakan:

- **Setujui Pengajuan**
- **Tolak Pengajuan**
- **Tandai Barang Sudah Diterima**
- **Lanjut ke Tiket Retur**

Jangan gunakan:

- Setujui Retur
- Tolak Retur
- Konfirmasi Barang Diterima

---

### 3.3 Aksi Tiket Retur
Gunakan:

- **Kirim Pesan**
- **Finalisasi Keputusan**
- **Mulai Eksekusi**
- **Selesaikan Eksekusi**
- **Atur Batas Waktu**
- **Simpan Batas Waktu**

Jangan gunakan:

- Kirim Balasan
- Finalkan Keputusan
- Mulai Kerjakan
- Tandai Selesai
- Atur Deadline
- Simpan Deadline

---

## 4. Pilihan kata resmi per konteks

### 4.1 Untuk status proses
Gunakan urutan kata berikut:

- **menunggu**
- **ditangani**
- **difinalisasi**
- **dieksekusi**
- **selesai**
- **ditolak**

Hindari mencampur dengan:

- diurus
- dikerjakan
- diproses

kecuali kalau konteks kalimat memang umum dan bukan label workflow.

---

### 4.2 Untuk waktu
Gunakan:

- **Batas Waktu**
- **Melewati Deadline**

Jangan campur bebas dengan:

- deadline tiket
- jatuh tempo tiket
- lewat batas waktu

> `Deadline` masih boleh dipakai sebagai istilah pendamping, tetapi label UI utamanya adalah **Batas Waktu**.

---

### 4.3 Untuk hasil penggantian
Gunakan:

- **Pengganti Sudah Dikirim**
- **Barang Pengganti Dikirim**
- **Pengiriman pengganti**

Jangan gunakan:

- sudah diurus
- kirim ulang retur
- pengiriman ulang retur

---

## 5. Mapping istilah lama → istilah baru

| Istilah lama | Ganti menjadi |
|---|---|
| Terima Komplen | Terima untuk Diproses |
| Sudah Diurus | Tandai Pengganti Dikirim |
| Sedang Diproses TCP | Sedang Ditangani TCP |
| Sudah Diurus TCP | Pengganti Sudah Dikirim |
| Setujui Retur | Setujui Pengajuan |
| Tolak Retur | Tolak Pengajuan |
| Konfirmasi Barang Diterima | Tandai Barang Sudah Diterima |
| Kirim Balasan | Kirim Pesan |
| Finalkan Keputusan | Finalisasi Keputusan |
| Mulai Kerjakan | Mulai Eksekusi |
| Tandai Selesai | Selesaikan Eksekusi |
| Deadline | Batas Waktu |
| Lewat Batas Waktu | Melewati Deadline |
| Dikerjakan TCP | Dieksekusi TCP |
| Retur Rusak | Tidak Layak Pakai |
| Kirim Ulang Retur | Pengiriman Pengganti / Barang Pengganti Dikirim |

---

## 6. Aturan penulisan untuk developer

Saat menambah fitur baru:

1. **Cek dokumen ini dulu** sebelum membuat label atau response message baru.
2. Jika butuh istilah baru:
   - pilih istilah yang paling singkat
   - jelas secara bisnis
   - tidak bentrok dengan istilah modul lain
3. Untuk **label status**, harus mengikuti tabel status resmi.
4. Untuk **CTA tombol**, gunakan bentuk kata kerja yang konsisten.
5. Untuk **toast / response**, gunakan bahasa hasil tindakan, misalnya:
   - “berhasil diterima untuk diproses”
   - “berhasil ditandai barang sudah diterima”
   - “berhasil difinalisasi”
   - “berhasil diselesaikan”

---

## 7. Checklist saat menambah atau mengubah workflow

Kalau ada perubahan workflow baru, cek semua ini:

- [ ] label status di UI
- [ ] warna badge
- [ ] tombol aksi
- [ ] toast frontend
- [ ] response backend
- [ ] socket notification
- [ ] dashboard summary
- [ ] export / PDF / print text
- [ ] dokumentasi internal

Kalau satu saja beda istilah, rapikan sebelum merge.

---

## 8. Prinsip umum

Sistem ini harus memakai **satu bahasa bisnis yang konsisten**:

- user tidak bingung
- admin tidak salah baca status
- TCP tidak salah tafsir tindakan
- developer berikutnya tidak bikin istilah baru seenaknya

Kalau ragu, pilih istilah yang **paling konsisten dengan dokumen ini**, bukan yang terasa paling spontan.
