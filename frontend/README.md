# Luna Sistem Frontend

Frontend web app untuk Luna Sistem. Aplikasi dibangun dengan Next.js App Router, React, TypeScript, React Query, Zustand, Tailwind CSS, Radix UI, dan Socket.IO client.

## Stack

- Next.js 16 App Router
- React 19 + TypeScript
- Tailwind CSS 4
- React Query untuk server state
- Zustand untuk auth, settings, dan UI state
- Axios API client
- Socket.IO client untuk realtime sync
- Radix UI + komponen lokal di `components/ui`
- Recharts, ExcelJS, xlsx, jsPDF untuk laporan/export

## Runtime

- App root: `app/layout.tsx`
- Dashboard layout: `app/(dashboard)/layout.tsx`
- Auth route group: `app/(auth)`
- API client: `lib/api/client.ts`
- Global providers: `lib/providers.tsx`
- Socket context: `lib/contexts/SocketContext.tsx`

Default API URL:

```text
http://localhost:4000/api/v1
```

Set `NEXT_PUBLIC_API_URL` di `.env.local` jika backend memakai host/port berbeda.

## Quick Start

```bash
cd C:\xampp\htdocs\luna-sistem\frontend
npm install
npm run dev
```

Buka:

```text
http://localhost:3000
```

Contoh `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

## Commands

```bash
npm run dev      # Start Next.js dev server
npm run build    # Production build
npm start        # Start production server
npm run lint     # Run ESLint
```

## Struktur

```text
frontend/
  app/
    (auth)/                 login flow
    (dashboard)/            protected dashboard pages
    globals.css             global styles and theme tokens
    layout.tsx              root app layout
  components/
    layout/                 header, sidebar, protected route, mobile nav
    forms/                  product/category/supplier forms
    products/               product detail and approval UI
    sales/                  sale selector, dialogs, approvals
    settlements/            settlement and other income dialogs
    settings/               printer/settings UI
    ui/                     shared UI primitives
  lib/
    api/                    typed API wrappers around axios
    contexts/               Socket context
    hooks/                  React Query and app hooks
    stores/                 Zustand stores
    utils/                  formatting/export/url helpers
    validations/            frontend schemas
  public/                   static assets
  types/                    shared frontend types
```

## Halaman Aktif

- `/login`
- `/`
- `/activities`
- `/approvals`
- `/categories`, `/categories/new`, `/categories/[id]`
- `/complaints`
- `/expenses`
- `/finance`, `/finance/global-report`
- `/financial-summary`
- `/platforms`
- `/products`, `/products/new`, `/products/[id]`
- `/profile`
- `/purchases`, `/purchases/new`, `/purchases/[id]`, `/purchases/[id]/edit`
- `/sales`, `/sales/new`, `/sales/process`, `/sales/[id]`, `/sales/[id]/edit`
- `/settings`
- `/settlements`, `/settlements/[id]`
- `/shipping`
- `/stock`, `/stock/adjustment`, `/stock/all`
- `/suppliers`, `/suppliers/new`, `/suppliers/[id]`
- `/users`

## State dan Data Flow

- Auth disimpan di Zustand persist store `lib/stores/auth.ts`.
- Token juga disimpan di `localStorage` untuk interceptor Axios.
- API client menambahkan `Authorization: Bearer <token>` otomatis.
- Jika response `401`, client mencoba refresh token lewat `/auth/refresh`.
- React Query menjadi sumber utama data server per modul.
- Socket.IO menerima event `data:refresh` dan menginvalidasi semua query.

## Role-Based UI

Sidebar dan beberapa halaman memfilter akses berdasarkan role:

- `SUPER_ADMIN`: semua menu.
- `ADMIN`: menu operasional luas, tanpa beberapa menu sistem sensitif.
- `USER`: menu terbatas, beberapa aksi masuk approval.
- `TCP`: fokus proses penjualan dan komplen.
- `TESTING`: dinormalisasi di frontend sebagai `SUPER_ADMIN` dengan flag mode testing.

## Modul Frontend

- Auth/session: `lib/api/auth.ts`, `lib/hooks/useAuth.ts`.
- Products/categories/suppliers: `lib/api/products.ts`, `lib/api/suppliers.ts`, hook terkait.
- Purchases: `lib/api/purchases.ts`, `lib/hooks/usePurchases.ts`.
- Sales: `lib/api/sales.ts`, `lib/hooks/useSales.ts`.
- Stock: `lib/api/stock.ts`, `lib/hooks/useStock.ts`.
- Approvals: `lib/api/requests.ts`, `lib/hooks/useRequests.ts`.
- Settlements: `lib/api/settlements.ts`, `lib/hooks/useSettlements.ts`.
- Finance: `lib/api/financial.ts`, `lib/hooks/useFinancial.ts`.
- Complaints: `lib/api/complaints.ts`, `lib/hooks/useComplaints.ts`.
- Audit: `lib/api/audit.ts`, `lib/hooks/useAudit.ts`.
- Notifications: `lib/hooks/useNotifications.ts`.

## Catatan Maintenance

- Komponen UI shared ada di `components/ui`; ikuti pola komponen yang sudah ada sebelum menambah style baru.
- Page dashboard adalah client-heavy dan bergantung pada auth hydration; cek `hasHydrated` di auth store saat menyentuh protected layout.
- Pastikan `NEXT_PUBLIC_API_URL` sinkron dengan `PORT` backend.
- `eslint-report.json`, `build_err.log`, dan `build_output.log` adalah output lokal, bukan dokumentasi utama.

## License

MIT
