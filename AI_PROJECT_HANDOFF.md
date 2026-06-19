# Luna Sistem - AI Project Handoff

Dokumen ini dibuat sebagai konteks cepat untuk AI/developer di session baru. Baca file ini lebih dulu sebelum membuat revisi atau menambah fitur.

## Ringkasan

Luna Sistem adalah aplikasi operasional inventaris dan penjualan untuk Lunarea. Project ini terdiri dari:

- `backend/`: Node.js, Express, TypeScript, Sequelize, MySQL, JWT auth, Socket.IO.
- `frontend/`: Next.js App Router, React, TypeScript, React Query, Zustand, Tailwind CSS, Radix UI.
- `logs/`: log runtime aplikasi.

Backend expose API di prefix default `/api/v1`. Frontend default memanggil `http://localhost:4000/api/v1`.

## Cara Jalan Lokal

Backend:

```bash
cd backend
npm install
npm run migrate
npm run seed
npm run dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Default URL:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:4000/api/v1`
- Health check: `http://localhost:4000/health`

Pastikan `backend/.env` dan `frontend/.env.local` sinkron, terutama `PORT`, `API_PREFIX`, `CORS_ORIGIN`, dan `NEXT_PUBLIC_API_URL`.

## Stack dan Entry Point

Backend:

- App setup: `backend/src/app.ts`
- Server bootstrap: `backend/src/server.ts`
- Env validation: `backend/src/config/env.ts`
- DB connection: `backend/src/config/database.ts`
- Route mount utama: `backend/src/routes/index.ts`
- Model association: `backend/src/models/index.ts`
- Socket service: `backend/src/services/socket.service.ts`
- Auth service: `backend/src/services/auth.service.ts`

Frontend:

- Root layout: `frontend/app/layout.tsx`
- Dashboard layout: `frontend/app/(dashboard)/layout.tsx`
- Login: `frontend/app/(auth)/login/page.tsx`
- API client: `frontend/lib/api/client.ts`
- Global providers: `frontend/lib/providers.tsx`
- Auth store: `frontend/lib/stores/auth.ts`
- Settings store: `frontend/lib/stores/settings.ts`
- Socket provider: `frontend/lib/contexts/SocketContext.tsx`
- Sidebar/menu: `frontend/components/layout/Sidebar.tsx`
- Route guard: `frontend/components/layout/ProtectedRoute.tsx`

## Backend Layering

Pola umum backend:

- `routes/*.ts`: deklarasi endpoint dan middleware auth/RBAC/upload.
- `controllers/*.ts`: logika request, transaksi DB, audit, response.
- `models/*.ts`: Sequelize model dan enum.
- `middlewares/*`: auth, RBAC, upload, validation, error handler.
- `services/*`: auth, audit, socket.
- `utils/*`: logger, response helper, errors, media processor.
- `migrations/*`: migrasi DB tambahan.
- `seeders/*`: seed role/user/master awal.

Semua endpoint utama berada di bawah `/api/v1`.

Route group aktif:

- `/auth`
- `/products`
- `/categories`
- `/suppliers`
- `/purchases`
- `/sales`
- `/stock`
- `/product-requests`
- `/sale-requests`
- `/change-requests`
- `/users`
- `/platforms`
- `/audit-logs`
- `/settlements`
- `/financial-summary`
- `/finance` alias untuk financial routes
- `/expenses`
- `/shipping-services`
- `/other-incomes`
- `/search`
- `/variant-options`
- `/complaints`
- `/upload`
- `/regions`
- `/analytics`

## Frontend Layering

Pola umum frontend:

- `app/(dashboard)/*/page.tsx`: halaman protected.
- `components/ui/*`: komponen UI shared.
- `components/forms/*`: form master data.
- `components/products/*`, `components/sales/*`, `components/settlements/*`: komponen domain.
- `lib/api/*`: wrapper axios per domain.
- `lib/hooks/*`: React Query hooks per domain.
- `lib/stores/*`: Zustand client state.
- `lib/utils/*`: formatter/export/url/html helper.
- `types/index.ts`: tipe utama frontend.

Saat menambah fitur baru, ikuti pola:

1. Tambah/ubah backend model, migration, route, controller.
2. Tambah API wrapper di `frontend/lib/api`.
3. Tambah React Query hook di `frontend/lib/hooks`.
4. Tambah halaman/komponen di `frontend/app/(dashboard)` atau `frontend/components`.
5. Update sidebar/guard kalau fitur perlu menu atau batas role.

## UI Theme dan Warna

- Default tema terang memakai palet warm umber dari HEX `#956818`, `#966c47`, `#ded2c7`, `#4e3322`, `#dcb47b`, `#775842`, `#b49d87`. Token utama dikonversi ke OKLCH di `frontend/app/globals.css`.
- Default `primaryColor` adalah `umber` di frontend store, provider, dan backend user model/controller.
- Nilai legacy `red` dan `sage` dinormalisasi ke `umber` saat settings frontend/backend dibaca atau diupdate.
- Opsi warna ada di `frontend/app/(dashboard)/settings/page.tsx`; opsi `Merah` sengaja tidak ditampilkan.
- Hindari warna aksen RGB/terlalu mencolok untuk default baru. Pakai token OKLCH yang sudah ada dan jaga kontras tetap nyaman untuk mode siang.

## Auth, Role, dan Testing Mode

Backend auth:

- Login menerima credential email atau username.
- Access token ditandatangani dengan payload `{ userId }`.
- Refresh token disimpan dalam bentuk hash di tabel refresh token.
- Middleware `auth` mengisi `req.user` dengan `id`, `email`, `username`, `roleId`, `roleName`, dan `isTestingMode`.
- Role `TESTING` akan mensimulasikan semua write method (`POST`, `PUT`, `PATCH`, `DELETE`) tanpa mengubah data produksi.

Frontend auth:

- `useAuthStore` menyimpan user, access token, refresh token, dan hydration flag.
- Token juga disimpan di `localStorage` untuk axios interceptor.
- Role `TESTING` dinormalisasi sebagai `SUPER_ADMIN` di UI dengan `isTestingMode: true`.
- `ProtectedRoute` melakukan guard untuk beberapa URL sensitif.
- `Sidebar` memfilter menu berdasarkan role.

Role utama:

- `SUPER_ADMIN`: akses penuh, termasuk user management dan finance sensitif.
- `ADMIN`: akses operasional luas, tanpa beberapa menu sistem sensitif.
- `USER`: akses terbatas dan beberapa aksi masuk approval/request.
- `TCP`: fokus proses penjualan dan komplen.
- `TESTING`: mode simulasi.

## Realtime

Backend Socket.IO berjalan di HTTP server yang sama dengan Express. Frontend connect dari `SocketContext.tsx` memakai access token.

Event penting:

- `notification:new`
- `approval:pending`
- `shipping:ready`
- `data:refresh`

Frontend akan `queryClient.invalidateQueries()` saat menerima `data:refresh`, sehingga data UI refresh otomatis.

Catatan penting: per 2026-06-09, ada potensi mismatch di `backend/src/services/socket.service.ts`. JWT access token dibuat dengan payload `{ userId }`, tetapi socket service membaca `decoded.id` dan `decoded.role`. Jika notifikasi role/user tidak masuk, cek bagian ini dulu.

## Modul Bisnis Utama

### Auth dan User

Endpoint:

- `/auth/login`
- `/auth/refresh`
- `/auth/logout`
- `/auth/me`
- `/auth/change-password`
- `/auth/heartbeat`
- `/users`
- `/users/roles`
- `/users/settings`

Frontend:

- `frontend/lib/api/auth.ts`
- `frontend/lib/hooks/useAuth.ts`
- `frontend/lib/hooks/useActivityTracker.ts`
- `frontend/lib/hooks/useUsers.ts`
- `frontend/app/(dashboard)/users`
- `frontend/app/(dashboard)/settings`
- `frontend/app/(dashboard)/profile`

Heartbeat dipakai untuk tracking aktivitas dan durasi user.

### Master Data Produk

Domain:

- Products
- Categories, termasuk parent/children
- Suppliers
- Platforms
- Shipping services
- Variant options
- Product variants

Endpoint utama:

- `/products`
- `/categories`
- `/suppliers`
- `/platforms`
- `/shipping-services`
- `/variant-options`
- `/upload/image`

Frontend:

- `frontend/lib/api/products.ts`
- `frontend/lib/api/suppliers.ts`
- `frontend/lib/api/platforms.ts`
- `frontend/lib/api/shipping.ts`
- `frontend/lib/hooks/useProducts.ts`
- `frontend/lib/hooks/useCategories.ts`
- `frontend/lib/hooks/useSuppliers.ts`
- `frontend/lib/hooks/usePlatforms.ts`
- `frontend/lib/hooks/useShipping.ts`
- `frontend/lib/hooks/useVariantOptions.ts`

### Pembelian / Restock

Endpoint:

- `/purchases`
- `/purchases/:id`

Frontend:

- `frontend/lib/api/purchases.ts`
- `frontend/lib/hooks/usePurchases.ts`
- `frontend/app/(dashboard)/purchases`

Pembelian memiliki item dan supplier. Status utama di model: `PENDING`, `COMPLETED`, `CANCELLED`.

### Penjualan

Endpoint:

- `/sales`
- `/sales/stats`
- `/sales/:id`
- `/sales/:id/approve`
- `/sales/:id/reject`
- `/sales/:id/process`
- `/sales/:id/request-cancel`

Frontend:

- `frontend/lib/api/sales.ts`
- `frontend/lib/hooks/useSales.ts`
- `frontend/app/(dashboard)/sales`
- `frontend/app/(dashboard)/sales/process`
- `frontend/components/sales/*`

Status sale:

- `PENDING`
- `WAITING_APPROVAL`
- `APPROVED`
- `REJECTED`
- `PROCESSED`
- `SETTLED`
- `COMPLETED`
- `CANCELLED`

Alur penting:

1. Create sale membuat sale `WAITING_APPROVAL`.
2. Create sale langsung mengurangi stok product dan variant.
3. Create sale membuat `StockMovement OUT`.
4. Reject sale mengembalikan stok dan membuat `StockMovement IN`.
5. Process sale bisa dilakukan dari `WAITING_APPROVAL` atau `APPROVED`; jika masih waiting, backend auto-approve.
6. Process sale mengubah status ke `PROCESSED` dan mengisi `processedAt`.
7. Settlement mengubah sale menjadi `SETTLED`.

Alamat pengiriman penjualan baru memakai pilihan wilayah berjenjang:

- `shippingProvinceId`
- `shippingRegencyId`
- `shippingDistrictId`
- `shippingVillageId`
- `shippingPostalCode`
- `shippingAddressDetail`

Backend memvalidasi hierarki wilayah aktif dan tetap membentuk `shippingAddress` lengkap untuk kompatibilitas tampilan/resi lama. Data lama tetap dapat dibaca dan dapat dipetakan ulang dengan rekonsiliasi v2.

### Analisa Penjualan

Endpoint:

- `/analytics/sales`
- `/analytics/unmapped-sales`
- `/regions/provinces`
- `/regions/regencies?provinceId=...`
- `/regions/districts?regencyId=...`
- `/regions/villages?districtId=...`

Frontend:

- `frontend/lib/api/analytics.ts`
- `frontend/lib/hooks/useAnalytics.ts`
- `frontend/lib/api/regions.ts`
- `frontend/lib/hooks/useRegions.ts`
- `frontend/components/sales/RegionAddressFields.tsx`
- `frontend/app/(dashboard)/analytics/page.tsx`

Analisa menampilkan produk terlaris, kontribusi penjualan per platform, dan wilayah pembeli terbanyak berdasarkan periode. Data platform lama seperti `OFFLINE_STORE`/`TOKO OFFLINE` digabung ke nama master aktif `Website`. Wilayah dapat ditelusuri dari provinsi sampai kelurahan/desa. Angka penjualan belum terpetakan membuka diagnosis alamat, kode pos, alasan kegagalan, dan kandidat wilayah. Akses halaman dibatasi untuk `SUPER_ADMIN` dan `ADMIN`.

Master aktif berasal dari CSV `datawilayah/v2` pada commit sumber yang dipin di `SOURCE.md`, lalu dimuat oleh `20260620000001-seed-regions-v2-from-csv.js`. Jumlah aktif: 38 provinsi, 514 kabupaten/kota, 7.285 kecamatan, dan 83.762 desa/kelurahan. Data lama tidak dihapus, tetapi wilayah yang tidak ada di sumber v2 ditandai nonaktif.

Pasangan label kabupaten/kota yang identik dinormalisasi oleh migration `20260619000002-normalize-duplicate-regency-labels.ts`, misalnya `Kabupaten Semarang` dan `Kota Semarang`. Seeder menjalankan normalisasi yang sama untuk instalasi database baru.

Rekonsiliasi alamat penjualan lama:

```bash
cd backend
npm run reconcile:regions:v2
npm run reconcile:regions:v2:apply
```

Command pertama adalah dry-run. Rekonsiliasi memprioritaskan kode pos aktif, lalu nama wilayah eksplisit pada `shippingAddress`. Teks alamat asli tidak diubah. CI/CD hanya menjalankan dry-run; penerapan produksi dilakukan melalui workflow manual `Rekonsiliasi Wilayah Penjualan`.

### Stok

Endpoint:

- `/stock/movements`
- `/stock/adjustment`
- `/stock/report`

Frontend:

- `frontend/lib/api/stock.ts`
- `frontend/lib/hooks/useStock.ts`
- `frontend/app/(dashboard)/stock`
- `frontend/app/(dashboard)/stock/adjustment`
- `frontend/app/(dashboard)/stock/all`

`StockMovement` memiliki tipe `IN`, `OUT`, `ADJUSTMENT` dan menyimpan `stockBefore`/`stockAfter`.

### Approval / Request

Ada beberapa approval flow:

- Generic `ChangeRequest`
- Product status request
- Sale return/exchange request
- Sale cancellation request
- Settlement cancellation request

Endpoint:

- `/change-requests`
- `/product-requests`
- `/sale-requests`

Frontend:

- `frontend/lib/api/requests.ts`
- `frontend/lib/hooks/useRequests.ts`
- `frontend/app/(dashboard)/approvals`
- `frontend/components/products/ProductApprovals.tsx`
- `frontend/components/sales/SaleApprovals.tsx`
- `frontend/components/approvals/DiffViewer.tsx`

Generic `ChangeRequest` entity type:

- `PRODUCT`
- `CATEGORY`
- `SUPPLIER`
- `STOCK`
- `SETTLEMENT`
- `SALE`

Request type:

- `CREATE`
- `UPDATE`
- `DELETE`

Status:

- `PENDING`
- `APPROVED`
- `REJECTED`

### Settlement / Pelunasan

Endpoint:

- `/settlements`
- `/settlements/stats`
- `/settlements/:id`
- `/settlements/:id/request-cancel`

Frontend:

- `frontend/lib/api/settlements.ts`
- `frontend/lib/hooks/useSettlements.ts`
- `frontend/app/(dashboard)/settlements`
- `frontend/components/settlements/*`

Alur penting:

1. Pending settlement dihitung dari sale `PROCESSED` tanpa settlement.
2. Create settlement hanya boleh untuk sale `PROCESSED`.
3. `netAmount` tidak boleh lebih besar dari `sale.totalAmount`.
4. Create settlement membuat sale menjadi `SETTLED`.
5. Update settlement hanya untuk `SUPER_ADMIN` di controller.

### Finance

Endpoint:

- `/financial-summary`
- `/financial-summary/omset-breakdown`
- `/finance/initial-receivable`
- `/finance/import-settlements`
- `/finance/import-other-incomes`
- `/finance/historical-settlement`
- `/finance/historical-settlements`

Frontend:

- `frontend/lib/api/financial.ts`
- `frontend/lib/hooks/useFinancial.ts`
- `frontend/app/(dashboard)/financial-summary`
- `frontend/app/(dashboard)/finance`
- `frontend/app/(dashboard)/finance/global-report`
- `frontend/components/SetInitialBalanceModal.tsx`
- `frontend/components/ImportSettlementsModal.tsx`
- `frontend/components/HistoricalSettlementModal.tsx`
- `frontend/components/OmsetBreakdownModal.tsx`

Finance menghitung:

- Omset/gross sale.
- Net settlement.
- Selisih/platform fee.
- Pending receivable.
- Initial balance.
- Historical settlement.
- Other income.

### Expense dan Other Income

Endpoint:

- `/expenses`
- `/other-incomes`

Frontend:

- `frontend/lib/api/expense.ts`
- `frontend/lib/hooks/useExpense.ts`
- `frontend/lib/api/otherIncome.ts`
- `frontend/lib/hooks/useOtherIncome.ts`
- `frontend/app/(dashboard)/expenses`
- `frontend/components/settlements/OtherIncomeDialog.tsx`
- `frontend/components/settlements/OtherIncomeListDialog.tsx`

Other income mendukung upload proof document.

### Complaint / Komplen

Endpoint:

- `/complaints/eligible-sales`
- `/complaints`
- `/complaints/:id/claim`
- `/complaints/:id/mark-handled`

Frontend:

- `frontend/lib/api/complaints.ts`
- `frontend/lib/hooks/useComplaints.ts`
- `frontend/app/(dashboard)/complaints`

Status complaint:

- `PENDING_TCP_REVIEW`
- `REJECTED_BY_TCP`
- `ACCEPTED_BY_TCP`
- `REPLACEMENT_SHIPPED`

Alur penting:

1. Complaint hanya bisa dibuat untuk sale `PROCESSED`, `COMPLETED`, atau `SETTLED`.
2. User/admin membuat complaint dengan foto bukti dan informasi penjualan. Upload video dan upload PDF manual sudah dihapus dari UI.
3. Create complaint wajib menyimpan detail penerima pengganti: `recipientName`, `recipientPhone`, `recipientAddress`, dan opsional `recipientAddressNote`.
4. Frontend selalu membuat PDF resi otomatis dari informasi penjualan dan mengirimnya sebagai `complaintReceiptPdf` dengan `receiptSource=GENERATED`.
5. TCP/admin menekan `Terima`, melihat popup detail lengkap, lalu konfirmasi agar status menjadi `ACCEPTED_BY_TCP`.
6. Tombol `Print` di TCP disabled saat status masih `PENDING_TCP_REVIEW`; setelah diterima tombol aktif dan membuka PDF resi untuk diproses/cetak.
7. Backend upload middleware complaint hanya menerima `complaintPhotos` dan PDF resi hasil generate. Kolom video lama tetap ada di database/model untuk histori, tapi tidak dipakai untuk data baru.

### Audit dan Aktivitas

Endpoint:

- `/audit-logs`
- `/audit-logs/stats/daily`

Frontend:

- `frontend/lib/api/audit.ts`
- `frontend/lib/hooks/useAudit.ts`
- `frontend/app/(dashboard)/activities`
- `frontend/app/(dashboard)/users/components/UserActivityModal.tsx`

Audit service dipakai di banyak controller untuk log create/update/delete/login/logout/heartbeat resume.

### Global Search

Endpoint:

- `/search?q=...`

Frontend:

- `frontend/components/ui/global-search.tsx`

Shortcut `/` digunakan untuk fokus search.

## Uploads

Backend menyajikan file statis dari `/uploads`.

Folder upload yang terlihat:

- `backend/uploads/products`
- `backend/uploads/proofs`
- `backend/uploads/documents`
- `backend/uploads/complaints`

PDF di `/uploads` diberi header inline dan cache dasar di `app.ts`.

## Pola Response dan Error

Backend umumnya memakai:

- `successResponse` dari `backend/src/utils/response.ts`
- `AppError` dan error custom dari `backend/src/utils/errors.ts`
- `errorHandler` sebagai middleware terakhir

Frontend API wrapper biasanya mengembalikan `response.data` dengan bentuk:

```ts
{
  success: boolean;
  message: string;
  data: ...
}
```

List paginated biasanya berisi:

```ts
{
  data: {
    itemsOrDomainKey: [],
    pagination: {
      total,
      page,
      limit,
      totalPages
    }
  }
}
```

Nama key list berbeda per domain, misalnya `products`, `sales`, `settlements`, `users`, `movements`.

## Catatan Kualitas dan Risiko

Hal yang perlu diperhatikan sebelum revisi besar:

- Jangan ubah file upload/runtime kecuali memang diminta.
- `PROJECT_MODULE_MAP.md` sudah ada dan berisi peta fitur end-to-end yang cukup detail.
- Beberapa file debug/temp ada di repo root/backend; cek dulu sebelum menjalankan script yang menyentuh database.
- Ada beberapa file lokal belum tracked pada 2026-06-09: `.vscode/`, `PROJECT_MODULE_MAP.md`, `backend/check_excel.js`, `backend/check_maret.js`, `backend/query_test.js`, `frontend/eslint-report.json`.
- Socket.IO payload JWT kemungkinan mismatch seperti dijelaskan di bagian Realtime.
- Beberapa komentar/teks frontend terlihat hasil encoding rusak, misalnya karakter panah/emoji di beberapa file. Jika menyentuh file tersebut, hati-hati jangan memperluas churn.
- Backend Sequelize config memakai `freezeTableName: true`, tetapi beberapa raw SQL memakai nama tabel kapital seperti `Sales`/`Settlements`. MySQL Windows biasanya case-insensitive, tetapi server Linux bisa sensitif tergantung konfigurasi.
- Role guard ada di backend dan frontend. Saat menambah fitur, update keduanya.
- React Query key harus konsisten agar invalidation/mutation refresh tidak salah.
- Testing mode mencegat write request di middleware auth dan mengembalikan response simulasi. Fitur frontend perlu siap menerima `data.simulated`.

## Commands Verifikasi

Backend:

```bash
cd backend
npm run build
npm test
npm run lint
```

Frontend:

```bash
cd frontend
npm run build
npm run lint
```

Jika hanya mengubah satu modul, minimal jalankan build/typecheck terkait bila memungkinkan. Project ini tidak memiliki root-level package manager; backend dan frontend dijalankan terpisah.

## Panduan Saat Menambah Fitur

Checklist praktis:

1. Cari pola domain paling mirip di backend controller/route/model.
2. Tambah migration jika ada perubahan schema.
3. Tambah/ubah model dan association jika diperlukan.
4. Tambah route dengan middleware auth/RBAC yang sesuai.
5. Pakai transaksi DB untuk operasi yang mengubah banyak tabel.
6. Tambahkan audit log untuk aksi penting.
7. Broadcast `data:refresh` untuk entity yang datanya berubah.
8. Tambah API wrapper frontend.
9. Tambah React Query hook dan invalidate query setelah mutation.
10. Tambah UI dengan pola komponen existing.
11. Update sidebar/route guard jika ada halaman baru.
12. Update type di `frontend/types/index.ts` bila shape data dipakai lintas modul.
13. Jalankan build/lint/test yang relevan.

## File Referensi Cepat

Dokumentasi:

- `PROJECT_MODULE_MAP.md`
- `backend/README.md`
- `frontend/README.md`

Backend inti:

- `backend/src/app.ts`
- `backend/src/server.ts`
- `backend/src/routes/index.ts`
- `backend/src/models/index.ts`
- `backend/src/middlewares/auth.ts`
- `backend/src/middlewares/rbac.ts`
- `backend/src/services/socket.service.ts`

Frontend inti:

- `frontend/lib/api/client.ts`
- `frontend/lib/providers.tsx`
- `frontend/lib/stores/auth.ts`
- `frontend/lib/contexts/SocketContext.tsx`
- `frontend/components/layout/Sidebar.tsx`
- `frontend/components/layout/ProtectedRoute.tsx`
- `frontend/types/index.ts`
