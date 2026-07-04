# Luna Sistem Backend

Backend API untuk Luna Sistem, aplikasi operasional inventaris, penjualan, pelunasan, piutang, approval, audit, dan komplen. Server dibangun dengan Node.js, Express, TypeScript, Sequelize, MySQL, JWT auth, dan Socket.IO.

## Stack

- Node.js + Express + TypeScript
- Sequelize ORM + MySQL
- JWT access token + refresh token
- Socket.IO untuk notifikasi dan sinkronisasi data realtime
- Multer, Sharp, dan ffmpeg-static untuk upload/compress media
- Zod, Helmet, CORS, rate limit, Winston
- Jest + Supertest untuk test backend

## Runtime

- Entry app: `src/app.ts`
- Entry server: `src/server.ts`
- Default API prefix: `/api/v1`
- Health check: `GET /health`
- Static upload: `/uploads`
- Socket.IO berjalan di HTTP server yang sama dengan Express.

Alur start server:

1. Load env dari `.env`.
2. Validasi env di `src/config/env.ts`.
3. Connect ke MySQL via Sequelize.
4. Start Express HTTP server.
5. Inisialisasi Socket.IO.
6. Jalankan audit cleanup harian.

## Quick Start

```bash
cd C:\xampp\htdocs\luna-sistem\backend
npm install
copy .env.example .env
npm run migrate
npm run seed
npm run dev
```

Default `.env.example` memakai `PORT=3000`, tetapi frontend project ini default memanggil API ke `http://localhost:4000/api/v1`. Pastikan `PORT` backend dan `NEXT_PUBLIC_API_URL` frontend konsisten di environment lokal.

## Environment

Minimal konfigurasi:

```env
NODE_ENV=development
PORT=4000
API_PREFIX=/api/v1

DB_HOST=localhost
DB_PORT=3306
DB_NAME=wms_db
DB_USER=root
DB_PASSWORD=
DB_DIALECT=mysql

JWT_ACCESS_SECRET=change-this-minimum-32-characters
JWT_REFRESH_SECRET=change-this-minimum-32-characters
CORS_ORIGIN=http://localhost:3000
```

## Commands

```bash
npm run dev             # Start development server with ts-node-dev
npm run build           # Compile TypeScript to dist/
npm start               # Run dist/server.js
npm run migrate         # Run Sequelize migrations
npm run migrate:undo    # Undo latest migration
npm run seed            # Run seeders
npm test                # Run Jest with coverage
npm run test:watch      # Run Jest watch mode
npm run lint            # ESLint src/**/*.ts
npm run format          # Prettier src/**/*.ts
```

## Struktur

```text
backend/
  src/
    app.ts                  Express app, middleware, route mounting
    server.ts               DB connection, HTTP server, Socket.IO bootstrap
    config/                 env, database, jwt config
    controllers/            request handlers per module
    middlewares/            auth, RBAC, validation, upload, error handling
    migrations/             Sequelize migrations
    models/                 Sequelize models and associations
    routes/                 Express routes mounted under /api/v1
    scripts/                local maintenance/debug/import scripts
    seeders/                Sequelize seeders
    services/               audit, auth, socket services
    utils/                  logger, response, errors, media processing
    validations/            shared schemas
    validators/             request validators
  dist/                     compiled output from npm run build
  uploads/                  runtime uploaded files
```

## Modul Aktif

- Auth: login, refresh, logout, profile, change password, heartbeat.
- User & role: user CRUD, role list, user settings.
- Master data: products, categories, suppliers, platforms, shipping services, variant options.
- Inventory: stock movement, adjustment, stock report, low stock.
- Purchase/restock: purchase CRUD dan item pembelian.
- Sales: create sale, approval, reject, process, cancel request, stats.
- Approval: generic change request, product status request, sale return/exchange request.
- Settlements: pending/settled list, create/update settlement, stats, cancel request.
- Finance: financial summary, omset breakdown, initial receivable, import settlements, import other incomes, historical settlements.
- Expenses and other incomes.
- Complaints: eligible sales, create complaint, TCP claim, mark handled, complete.
- Retur: eligible sales, create Retur, review, receive item, restock, damaged, resend.
- Tiket Retur: diskusi, read marker, Batas Waktu, Finalisasi Keputusan, Mulai Eksekusi, Selesaikan Eksekusi.
- Audit logs and global search.

## Endpoint Groups

Semua endpoint di bawah `API_PREFIX`, default `/api/v1`.

```text
/auth
/products
/categories
/suppliers
/purchases
/sales
/stock
/product-requests
/sale-requests
/change-requests
/users
/platforms
/audit-logs
/settlements
/financial-summary
/finance
/expenses
/shipping-services
/other-incomes
/search
/variant-options
/complaints
/returns
/return-tickets
/upload
```

`/finance` adalah alias untuk route financial yang sama dengan `/financial-summary`.

## Role

- `SUPER_ADMIN`: akses penuh, termasuk user management dan operasi finance sensitif.
- `ADMIN`: akses operasional luas tanpa beberapa aksi khusus super admin.
- `USER`: akses operasional terbatas dan beberapa aksi masuk approval/request.
- `TCP`: fokus proses penjualan, pengiriman, pelunasan tertentu, dan komplen.
- `TESTING`: role khusus yang di frontend diperlakukan sebagai mode testing/simulasi.

## Workflow Penting

- Create sale langsung mengurangi stok product dan variant, lalu mencatat `StockMovement OUT`.
- Reject/delete/cancel sale pada flow tertentu mengembalikan stok dan mencatat `StockMovement IN`.
- Sale baru masuk status `WAITING_APPROVAL`.
- TCP/admin dapat process sale; status menjadi `PROCESSED`.
- Settlement hanya bisa dibuat untuk sale `PROCESSED`; setelah settlement dibuat, sale menjadi `SETTLED`.
- Finance summary menghitung piutang, pelunasan, selisih/platform fee, saldo awal piutang, historical settlement, dan other income.
- Complaint dibuat untuk sale yang sudah `PROCESSED`, `COMPLETED`, atau `SETTLED`; TCP dapat claim, mark handled, dan complete.
- Retur dibuat untuk sale eligible dengan item dan foto bukti; review bisa menyetujui pengajuan ke tahap menunggu barang kembali atau menolak.
- Setelah barang Retur diterima, alur bisa dilanjutkan lewat inspeksi langsung atau Tiket Retur.
- Tiket Retur dipakai untuk diskusi/finalisasi keputusan internal; admin/super admin melakukan Finalisasi Keputusan, TCP melakukan eksekusi.

## Realtime

Socket.IO memakai JWT access token dari handshake auth.

Room yang dipakai:

- `user:{id}` untuk notifikasi user spesifik.
- `admins` untuk `ADMIN` dan `SUPER_ADMIN`.
- `tcp` untuk role `TCP`.

Event umum:

- `notification:new`
- `approval:pending`
- `shipping:ready`
- `data:refresh`

Frontend mendengar `data:refresh` dan melakukan invalidasi React Query cache agar UI otomatis mengambil data terbaru.

## Uploads

File upload disajikan dari `/uploads`.

- Product image: `/uploads/products/...`
- Proof document: `/uploads/proofs/...`
- Shipping document: sesuai middleware upload dokumen.
- Complaint photos/receipts/videos: `/uploads/complaints/...`
- Return evidence/received photos: `/uploads/returns/...`

PDF di `/uploads` disajikan inline dengan header cache dasar.

## Status Verifikasi dan Tooling

Diverifikasi pada 2026-07-04:

- `npm run build`: berhasil.
- `npm run lint`: berhasil.
- `npm test`: belum siap karena `jest.config.js` menunjuk ke folder `tests` yang belum ada.

Catatan: `IMPLEMENTATION_STATUS.md` adalah arsip lama dari fase awal dan tidak boleh dijadikan acuan progres saat ini.

## Catatan Maintenance

- `dist/` adalah output build dari TypeScript.
- `node_modules/`, file temp/debug, dan upload runtime tidak seharusnya dijadikan sumber kebenaran.
- `PROJECT_MODULE_MAP.md` di root berisi peta end-to-end backend ke frontend yang lebih detail.
- Beberapa script di root backend adalah utilitas lokal/debug/import; cek isinya sebelum menjalankan terhadap database produksi.

## License

MIT
