# Luna Sistem - Peta Struktur dan Fitur (Backend -> Frontend)

Dokumen ini merangkum arsitektur aktual project berdasarkan kode yang aktif saat ini.

> Acuan istilah bisnis resmi untuk label, status, toast, dan notifikasi ada di `BUSINESS_TERMS.md`.

## 1) Struktur Proyek

- `backend/`: API server Node.js + Express + TypeScript + Sequelize (MySQL).
- `frontend/`: Web app Next.js (App Router) + React Query + Zustand.
- `logs/`: log aplikasi.

## 2) Alur Runtime Singkat

- Frontend memanggil API ke `NEXT_PUBLIC_API_URL` (default `http://localhost:4000/api/v1`).
- Backend expose endpoint utama di prefix `env.API_PREFIX` (default `/api/v1`).
- Auth: JWT Bearer + refresh token.
- Realtime: Socket.IO, event notifikasi + `data:refresh` untuk invalidasi cache UI.

## 3) Layering Backend

- `src/app.ts`: setup security middleware (helmet, cors, rate limit), parser, static uploads, mount routes.
- `src/server.ts`: connect DB, start HTTP server, init socket.
- `src/routes/*.ts`: deklarasi endpoint.
- `src/controllers/*.ts`: logika request/response.
- `src/models/*.ts`: schema tabel + relasi Sequelize.
- `src/middlewares/*`: auth, rbac, validation, upload, error handler.

## 4) Mapping Route Backend (Mount Prefix)

Semua endpoint berikut berada di bawah `/api/v1`.

- `/auth` -> `auth.routes.ts`
- `/products` -> `product.routes.ts`
- `/categories` -> `category.routes.ts`
- `/suppliers` -> `supplier.routes.ts`
- `/purchases` -> `purchase.routes.ts`
- `/sales` -> `sale.routes.ts`
- `/stock` -> `stock.routes.ts`
- `/product-requests` -> `productRequest.routes.ts`
- `/sale-requests` -> `saleRequest.routes.ts`
- `/change-requests` -> `changeRequest.routes.ts`
- `/users` -> `user.routes.ts`
- `/platforms` -> `platform.routes.ts`
- `/audit-logs` -> `audit.routes.ts`
- `/settlements` -> `settlement.routes.ts`
- `/financial-summary` -> `financial.routes.ts`
- `/finance` -> `financial.routes.ts` (alias mount)
- `/expenses` -> `expense.routes.ts`
- `/shipping-services` -> `shipping.routes.ts`
- `/other-incomes` -> `otherIncome.routes.ts`
- `/search` -> `search.routes.ts`
- `/variant-options` -> `variantOption.routes.ts`
- `/complaints` -> `complaint.routes.ts`
- `/returns` -> `return.routes.ts`
- `/return-tickets` -> `returnTicket.routes.ts`
- `/upload` -> `upload.routes.ts`
- `/regions` -> `region.routes.ts`
- `/analytics` -> `analytics.routes.ts`
- `/display` -> `display.routes.ts`

## 5) Mapping Modul Fitur End-to-End

Format: `Backend endpoint -> Frontend API/Hook -> Halaman/Komponen`.

### A. Auth & Session

- `/auth/login`, `/auth/logout`, `/auth/me`, `/auth/change-password`, `/auth/heartbeat`
- `frontend/lib/api/auth.ts`, `frontend/lib/hooks/useAuth.ts`, `frontend/lib/hooks/useActivityTracker.ts`
- Dipakai di:
  - `app/(auth)/login/page.tsx`
  - `app/(dashboard)/profile/page.tsx`
  - `app/(dashboard)/layout.tsx` (heartbeat tracker)
  - `components/layout/Header.tsx` (logout)

### B. User & Role

- `/users`, `/users/:id`, `/users/roles`, `/users/settings`
- `frontend/lib/hooks/useUsers.ts`
- Dipakai di:
  - `app/(dashboard)/users/page.tsx`
  - `app/(dashboard)/users/components/UserForm.tsx`
  - `app/(dashboard)/settings/page.tsx` (settings user)

### C. Produk, Kategori, Supplier, Varian

- Produk:
  - `/products`, `/products/:id`, `/products/low-stock`, `/products/bulk/delete`, `/products/bulk/update`
  - `frontend/lib/api/products.ts` (`productApi`), `frontend/lib/hooks/useProducts.ts`
  - Halaman: `products`, `products/new`, `products/[id]`, dashboard, stock pages, sales form selector.
- Kategori:
  - `/categories`, `/categories/:id`
  - `frontend/lib/api/products.ts` (`categoryApi`), `frontend/lib/hooks/useCategories.ts`
  - Halaman: `categories`, `categories/new`, `categories/[id]`, product form.
- Supplier:
  - `/suppliers`, `/suppliers/:id`
  - `frontend/lib/api/suppliers.ts`, `frontend/lib/hooks/useSuppliers.ts`
  - Halaman: `suppliers`, `suppliers/new`, `suppliers/[id]`, purchase form.
- Varian Option:
  - `/variant-options`
  - `frontend/lib/hooks/useVariantOptions.ts`
  - Dipakai di `components/forms/ProductForm.tsx`.
- Upload Gambar Produk:
  - `/upload/image`
  - Dipakai langsung via `apiClient` di `components/forms/ProductForm.tsx`.

### D. Pembelian (Restock)

- `/purchases`, `/purchases/:id`
- `frontend/lib/api/purchases.ts`, `frontend/lib/hooks/usePurchases.ts`
- Halaman:
  - `purchases/page.tsx`
  - `purchases/new/page.tsx`
  - `purchases/[id]/page.tsx`
  - `purchases/[id]/edit/page.tsx`

### E. Penjualan

- Endpoint inti:
  - `/sales`, `/sales/:id`, `/sales/stats`
  - `/sales/:id/approve`, `/sales/:id/reject`, `/sales/:id/process`
  - `/sales/:id/request-cancel`
- API/hook:
  - `frontend/lib/api/sales.ts`
  - `frontend/lib/hooks/useSales.ts`
- Halaman/komponen:
  - `sales/page.tsx`, `sales/new/page.tsx`, `sales/[id]/page.tsx`, `sales/[id]/edit/page.tsx`
  - `sales/process/page.tsx` (workflow TCP/admin)
  - `components/sales/CancelSaleDialog.tsx`
- Catatan backend:
  - Create sale langsung mengurangi stok produk/varian.
  - Reject/cancel bisa restore stok melalui flow tertentu.
  - Event socket: `approval:pending`, `shipping:ready`, `data:refresh`.

### F. Stok & Movement

- `/stock/movements`, `/stock/adjustment`, `/stock/report`
- `frontend/lib/api/stock.ts`, `frontend/lib/hooks/useStock.ts`
- Halaman:
  - `stock/page.tsx`
  - `stock/adjustment/page.tsx`
  - `stock/all/page.tsx`
- Catatan:
  - Tersedia flow request penyesuaian stok via `/change-requests` untuk approval.

### G. Approval Workflow

- Generic change request:
  - `/change-requests/pending`, `/change-requests`, `/change-requests/:id/approve`, `/change-requests/:id/reject`
  - `frontend/lib/api/requests.ts` (`changeRequestsApi`), `frontend/lib/hooks/useRequests.ts`
- Product status request:
  - `/product-requests/...`
  - `requestsApi` + `useProductRequests`.
- Sale return/exchange request:
  - `/sale-requests/...`
  - `requestsApi` + `useSaleRequests`.
- UI:
  - `app/(dashboard)/approvals/page.tsx`
  - `components/products/ProductApprovals.tsx`
  - `components/sales/SaleApprovals.tsx`
  - dialog request di modul produk/penjualan.

### H. Pelunasan (Settlement) & Pendapatan Lain

- Settlement:
  - `/settlements`, `/settlements/:id`, `/settlements/stats`, `/settlements/:id/request-cancel`
  - `frontend/lib/api/settlements.ts`, `frontend/lib/hooks/useSettlements.ts`
  - UI: `settlements/page.tsx`, `settlements/[id]/page.tsx`, `components/settlements/SettlementFormDialog.tsx`
- Other income:
  - `/other-incomes`, `/other-incomes/:id` (multipart proof optional)
  - `frontend/lib/api/otherIncome.ts`, `frontend/lib/hooks/useOtherIncome.ts`
  - UI:
    - `components/settlements/OtherIncomeDialog.tsx`
    - `components/settlements/OtherIncomeListDialog.tsx`
- Upload bukti:
  - file served dari `/uploads/proofs/...`

### I. Keuangan / Financial Summary / Finance Ops

- Summary endpoint:
  - `/financial-summary` (+ alias `/finance`)
  - `/financial-summary/omset-breakdown`
- API/hook:
  - `frontend/lib/api/financial.ts`
  - `frontend/lib/hooks/useFinancial.ts`
- Halaman:
  - `finance/page.tsx`
  - `financial-summary/page.tsx`
  - `finance/global-report/page.tsx`
- Operasi khusus SUPER_ADMIN (dipanggil direct di komponen):
  - `/finance/initial-receivable` -> `SetInitialBalanceModal`
  - `/finance/import-settlements` -> `ImportSettlementsModal`
  - `/finance/import-other-incomes` -> `ImportSettlementsModal` (tab other income)
  - `/finance/historical-settlements` + create/update/delete historical settlement -> `HistoricalSettlementModal`

### J. Platform & Shipping Service

- Platform:
  - `/platforms`
  - `frontend/lib/api/platforms.ts`, `frontend/lib/hooks/usePlatforms.ts`
  - halaman `platforms/page.tsx`.
- Shipping service:
  - `/shipping-services`
  - `frontend/lib/api/shipping.ts`, `frontend/lib/hooks/useShipping.ts`
  - halaman `shipping/page.tsx`.

### K. Audit & Aktivitas

- `/audit-logs`, `/audit-logs/stats/daily`
- `frontend/lib/api/audit.ts`, `frontend/lib/hooks/useAudit.ts`
- UI:
  - `activities/page.tsx`
  - dashboard card aktivitas
  - `users/components/UserActivityModal.tsx`.

### L. Global Search

- `/search?q=...`
- Dipakai langsung di `components/ui/global-search.tsx`
- Trigger keyboard: `/` untuk fokus search.

### M. Analisa dan Wilayah

- `/analytics/sales`
  - `frontend/lib/api/analytics.ts`, `frontend/lib/hooks/useAnalytics.ts`
  - halaman `analytics/page.tsx`
- `/regions/provinces`, `/regions/regencies`, `/regions/districts`, `/regions/villages`
  - `frontend/lib/api/regions.ts`, `frontend/lib/hooks/useRegions.ts`
  - komponen `components/sales/RegionAddressFields.tsx`
- Form penjualan baru menyimpan ID provinsi, kabupaten/kota, kecamatan, kelurahan/desa, kode pos, dan detail alamat.
- Data penjualan lama tanpa ID wilayah tetap tampil, tetapi tidak dihitung dalam peringkat wilayah.



### Update Komplen 2026-07-07

Alur Komplen aktif sekarang:

`PENDING_TCP_REVIEW` -> `ACCEPTED_BY_TCP` -> `WAITING_USER_CONFIRMATION` -> `COMPLETED`

Jika user memilih **Belum Selesai** dari `WAITING_USER_CONFIRMATION`, status menjadi `FOLLOW_UP_REQUIRED`, lalu TCP/Admin dapat **Tangani Lagi** ke `ACCEPTED_BY_TCP`. Komplen selesai masuk tab **Riwayat Komplen** dan tidak dihitung sebagai badge aktif.

Status aktif badge: `PENDING_TCP_REVIEW`, `ACCEPTED_BY_TCP`, `REPLACEMENT_SHIPPED`, `WAITING_USER_CONFIRMATION`, `FOLLOW_UP_REQUIRED`. Status riwayat/final: `COMPLETED`, `REJECTED_BY_TCP`, `CONVERTED_TO_RETURN`.

Endpoint tambahan: `/complaints/:id/request-follow-up`. Endpoint `/complaints/:id/complete` sekarang untuk konfirmasi selesai oleh USER pembuat atau ADMIN/SUPER_ADMIN.


### N. Retur

- `/returns/eligible-sales`, `/returns/summary`, `/returns`, `/returns/:id`
- `/returns/:id/review`, `/returns/:id/receive`, `/returns/:id/restock`, `/returns/:id/damaged`, `/returns/:id/resend`
- `frontend/lib/api/returns.ts`, `frontend/lib/hooks/useReturns.ts`
- Halaman:
  - `returns/page.tsx`
  - `returns/new/page.tsx`
  - `returns/[id]/page.tsx`
- Status resmi Retur:
  - `PENDING_REVIEW` -> Menunggu Review
  - `WAITING_ITEM_RETURN` -> Menunggu Barang Kembali
  - `ITEM_RECEIVED` -> Barang Sudah Diterima
  - `REJECTED` -> Ditolak
  - `RESTOCKED` -> Masuk Stok
  - `DAMAGED` -> Tidak Layak Pakai
  - `RESENT` -> Barang Pengganti Dikirim
  - `COMPLETED` -> Selesai
- Catatan alur:
  - Retur dibuat dari penjualan eligible dengan item yang dipilih dan foto bukti.
  - Review menyetujui pengajuan ke tahap menunggu barang kembali atau menolak.
  - Setelah barang diterima, Retur dapat difinalisasi langsung atau dilanjutkan ke Tiket Retur.

### O. Tiket Retur

- `/return-tickets`, `/return-tickets/summary`, `/return-tickets/:id`
- `/return-tickets/:id/read`, `/return-tickets/:id/messages`, `/return-tickets/:id/deadline`
- `/return-tickets/:id/finalize-decision`, `/return-tickets/:id/start-execution`, `/return-tickets/:id/complete-execution`
- `frontend/lib/api/returnTickets.ts`, `frontend/lib/hooks/useReturnTickets.ts`
- Halaman:
  - `return-tickets/page.tsx`
  - `return-tickets/[id]/page.tsx`
- Status resmi Tiket Retur:
  - `OPEN` -> Baru Dibuka
  - `IN_DISCUSSION` -> Dalam Diskusi
  - `DECISION_FINALIZED` -> Keputusan Sudah Final
  - `WAITING_TCP_EXECUTION` -> Menunggu Eksekusi TCP
  - `TCP_EXECUTING` -> Sedang Dieksekusi TCP
  - `COMPLETED` -> Selesai
  - `REJECTED` -> Ditolak
  - `OVERDUE` -> Melewati Deadline
- Catatan alur:
  - Tiket Retur adalah ruang diskusi/finalisasi keputusan internal untuk Retur.
  - Admin/super admin mengatur Batas Waktu dan Finalisasi Keputusan.
  - TCP melakukan Mulai Eksekusi dan Selesaikan Eksekusi.
  - Eksekusi dapat membuat penyesuaian stok dan biaya terkait keputusan akhir.


### P. Sistem Display

- Backend endpoint mount: `/display` -> `backend/src/routes/display.routes.ts`
- Controller: `backend/src/controllers/display.controller.ts`
- Model/tabel khusus display:
  - `DisplayCategory` -> `display_categories`
  - `DisplaySupplier` -> `display_suppliers`
  - `DisplayProduct` -> `display_products`
  - `DisplayStockMovement` -> `display_stock_movements`
  - `DisplayStockRequest` -> `display_stock_requests`
- Migration: `backend/src/migrations/20260707000002-create-display-system.ts`
- Frontend:
  - `frontend/lib/api/display.ts`
  - `frontend/lib/hooks/useDisplay.ts`
  - `frontend/app/(dashboard)/display/page.tsx`
  - Sidebar menu: `Inventaris > Sistem Display`

Endpoint utama:

- `/display/summary`
- `/display/categories`
- `/display/suppliers`
- `/display/products`
- `/display/products/:id/adjust-stock`
- `/display/movements`
- `/display/requests`
- `/display/requests/:id/review`

Catatan isolasi bisnis:

- Sistem Display berdiri sendiri dan tidak boleh memengaruhi `products`, `stock_movements`, `sales`, `settlements`, atau finance.
- Stok display hanya berubah lewat `display_stock_movements`.
- Pengajuan display hanya mengubah `display_products` saat disetujui admin/super admin.

Role:

- `ADMIN`/`SUPER_ADMIN`: kelola produk/kategori/supplier display, adjust stok, approve/reject pengajuan.
- `USER`: melihat data display dan membuat pengajuan stok display; hanya melihat pengajuannya sendiri.
- `TCP`: tidak mendapat akses `/display`.

UI `/display` memakai navigasi internal sendiri: Produk Display, Stok Display, Pengajuan Display, Kategori Display, Supplier Display, Riwayat Stok. Badge sidebar Sistem Display berasal dari jumlah pengajuan pending sesuai role.


## 6) Realtime & Sinkronisasi Data

- Backend `socket.service.ts`:
  - room per user (`user:{id}`)
  - room `admins`, room `tcp`
  - event utama: `notification:new`, `approval:pending`, `shipping:ready`, `data:refresh`
- Frontend `SocketContext.tsx`:
  - konek pakai access token
  - saat `data:refresh`, `queryClient.invalidateQueries()` (semua query direfresh)
  - notifikasi toast per event.

## 7) Role Matrix (UI + API Inti)

- `SUPER_ADMIN`:
  - akses penuh, termasuk user management, finance ops (saldo awal/import/historical), delete expense tertentu.
- `ADMIN`:
  - operasional penuh tanpa beberapa aksi eksklusif super admin.
- `USER`:
  - akses terbatas; beberapa operasi jadi request approval.
- `TCP`:
  - fokus proses penjualan/pengiriman, akses dashboard khusus proses.

## 8) Halaman Frontend yang Aktif

- Auth:
  - `/login`
- Dashboard:
  - `/`
  - `/activities`
  - `/analytics`
  - `/approvals`
  - `/categories`, `/categories/new`, `/categories/[id]`
  - `/display`
  - `/expenses`
  - `/finance`, `/finance/global-report`
  - `/financial-summary`
  - `/platforms`
  - `/products`, `/products/new`, `/products/[id]`
  - `/profile`
  - `/purchases`, `/purchases/new`, `/purchases/[id]`, `/purchases/[id]/edit`
  - `/sales`, `/sales/new`, `/sales/process`, `/sales/[id]`, `/sales/[id]/edit`
  - `/returns`, `/returns/new`, `/returns/[id]`
  - `/return-tickets`, `/return-tickets/[id]`
  - `/settings`
  - `/settlements`, `/settlements/[id]`
  - `/shipping`
  - `/stock`, `/stock/adjustment`, `/stock/all`
  - `/suppliers`, `/suppliers/new`, `/suppliers/[id]`
  - `/users`

## 9) Temuan Penting

- `backend/IMPLEMENTATION_STATUS.md` adalah arsip lama dan tidak mencerminkan kondisi aktual. Gunakan dokumen ini, `AI_PROJECT_HANDOFF.md`, `backend/README.md`, dan `frontend/README.md` sebagai acuan utama.
- Struktur saat ini sudah produksi-oriented: auth, RBAC, audit, approval workflow, settlement ledger, dan realtime sync sudah terhubung end-to-end.

## 10) Status Verifikasi Terakhir

Diverifikasi pada 2026-07-07:

- `backend npm run build`: berhasil.
- `frontend npm run build`: berhasil.
- `frontend npm run lint`: berhasil.
- `frontend npx tsc --noEmit`: berhasil.
- `backend npm run lint`: berhasil.
- `backend npm test`: belum siap karena `backend/tests` belum ada sesuai `jest.config.js`.
