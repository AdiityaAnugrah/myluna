# WMS Backend - Warehouse Management System

Backend API untuk sistem manajemen gudang (WMS) menggunakan Node.js, TypeScript, Express, dan Sequelize dengan MySQL.

## 📋 Status Implementasi

### ✅ Selesai
- ✅ Project setup (package.json, tsconfig.json, jest.config.js)
- ✅ Configuration (env, database, jwt)
- ✅ Utilities (logger, errors, response formatters)
- ✅ Type definitions (Express extensions)
- ✅ **12 Models** (Role, User, RefreshToken, AuditLog, Category, Supplier, Product, StockMovement, Purchase, PurchaseItem, Sale, SaleItem)
- ✅ Model associations
- ✅ **5 Middleware** (auth, RBAC, audit context, error handler, validator)
- ✅ Audit service
- ✅ Express app setup
- ✅ Server entry point

### 🔄 Perlu Dilengkapi
- ⏳ **5 Models tersisa** (Return, ReturnItem, Exchange, ExchangeItem, FinanceSource, FinanceTransaction)
- ⏳ **Migrations** untuk semua 17 tabel
- ⏳ **Seeders** untuk roles dan demo data
- ⏳ **Validators** (Zod schemas untuk semua endpoint)
- ⏳ **Services** (auth, product, purchase, sale, stock, finance, dll)
- ⏳ **Controllers** (auth, product, purchase, sale, stock, finance, dll)
- ⏳ **Routes** (semua endpoint API)
- ⏳ **Swagger documentation**

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd c:\xampp\htdocs\luna-sistem\backend
npm install
```

### 2. Setup Environment

Copy `.env.example` ke `.env` dan sesuaikan konfigurasi:

```bash
copy .env.example .env
```

Edit `.env`:
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=wms_db
DB_USER=root
DB_PASSWORD=your_password

JWT_ACCESS_SECRET=generate-random-32-char-string-here
JWT_REFRESH_SECRET=generate-random-32-char-string-here
```

### 3. Create Database

Buat database MySQL:
```sql
CREATE DATABASE wms_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. Run Migrations (Setelah dibuat)

```bash
npm run migrate
```

### 5. Run Seeders (Setelah dibuat)

```bash
npm run seed
```

### 6. Start Development Server

```bash
npm run dev
```

Server akan berjalan di `http://localhost:3000`

## 📁 Struktur Folder

```
backend/
├── src/
│   ├── config/           # ✅ Configuration files
│   │   ├── env.ts
│   │   ├── database.ts
│   │   └── jwt.ts
│   ├── models/           # ✅ 12/17 models (perlu 5 lagi)
│   │   ├── index.ts      # ✅ Associations
│   │   ├── Role.ts
│   │   ├── User.ts
│   │   ├── RefreshToken.ts
│   │   ├── AuditLog.ts
│   │   ├── Category.ts
│   │   ├── Supplier.ts
│   │   ├── Product.ts
│   │   ├── StockMovement.ts
│   │   ├── Purchase.ts
│   │   ├── PurchaseItem.ts
│   │   ├── Sale.ts
│   │   └── SaleItem.ts
│   ├── migrations/       # ⏳ Perlu dibuat
│   ├── seeders/          # ⏳ Perlu dibuat
│   ├── middlewares/      # ✅ Complete
│   │   ├── auth.ts
│   │   ├── rbac.ts
│   │   ├── auditContext.ts
│   │   ├── errorHandler.ts
│   │   └── validator.ts
│   ├── validators/       # ⏳ Perlu dibuat
│   ├── services/         # ⏳ 1/10 services (perlu 9 lagi)
│   │   └── audit.service.ts
│   ├── controllers/      # ⏳ Perlu dibuat
│   ├── routes/           # ⏳ Perlu dibuat
│   ├── utils/            # ✅ Complete
│   │   ├── logger.ts
│   │   ├── errors.ts
│   │   └── response.ts
│   ├── types/            # ✅ Complete
│   │   └── express.d.ts
│   ├── app.ts            # ✅ Express app
│   └── server.ts         # ✅ Server entry
├── tests/                # ⏳ Perlu dibuat
├── .env.example          # ✅ Complete
├── .gitignore            # ✅ Complete
├── package.json          # ✅ Complete
├── tsconfig.json         # ✅ Complete
└── jest.config.js        # ✅ Complete
```

## 📝 Langkah Selanjutnya

### Prioritas 1: Models Tersisa

Buat 5 models berikut di `src/models/`:

1. **Return.ts** - Model untuk customer returns
2. **ReturnItem.ts** - Detail items yang di-return
3. **Exchange.ts** - Model untuk product exchanges
4. **ExchangeItem.ts** - Detail items yang di-exchange
5. **FinanceSource.ts** - Sumber keuangan (TikTok, Shopee, dll)
6. **FinanceTransaction.ts** - Transaksi keuangan

Contoh struktur ada di dokumentasi: `05_implementation_guides.md`

Update `src/models/index.ts` untuk menambahkan associations.

### Prioritas 2: Migrations

Buat migrations untuk semua 17 tabel di `src/migrations/` menggunakan Sequelize CLI:

```bash
npx sequelize-cli migration:generate --name create-roles-table
npx sequelize-cli migration:generate --name create-users-table
# dst...
```

Urutan migrations (dependency order):
1. roles
2. users
3. refresh_tokens
4. audit_logs
5. categories
6. suppliers
7. products
8. stock_movements
9. purchases
10. purchase_items
11. sales
12. sales_items
13. returns
14. return_items
15. exchanges
16. exchange_items
17. finance_sources
18. finance_transactions

### Prioritas 3: Seeders

Buat seeder untuk roles:

```bash
npx sequelize-cli seed:generate --name seed-roles
```

Isi dengan 3 roles: SUPER_ADMIN, ADMIN, USER

### Prioritas 4: Services

Buat services di `src/services/`:
- auth.service.ts (login, refresh, logout)
- user.service.ts
- product.service.ts
- purchase.service.ts (dengan transaction + stock movements)
- sale.service.ts (dengan stock validation + transaction)
- stock.service.ts (getCurrentStock, getAllProductsStock)
- return.service.ts
- exchange.service.ts
- finance.service.ts (dengan reports)

Contoh implementasi ada di `04_code_examples.md`

### Prioritas 5: Controllers & Routes

Buat controllers dan routes untuk semua endpoint sesuai `03_api_specifications.md`

### Prioritas 6: Validators

Buat Zod schemas untuk validasi request di `src/validators/`

### Prioritas 7: Swagger Documentation

Setup Swagger untuk API documentation

## 📚 Dokumentasi Lengkap

Semua dokumentasi teknis ada di folder artifacts:

1. **01_architecture.md** - Arsitektur & folder structure
2. **02_database_design.md** - Database schema (17 tabel)
3. **03_api_specifications.md** - API endpoints (50+)
4. **04_code_examples.md** - Contoh kode production-ready
5. **05_implementation_guides.md** - Best practices & security

## 🔧 Commands

```bash
# Development
npm run dev              # Start dev server with hot reload

# Build
npm run build            # Compile TypeScript to JavaScript
npm start                # Run production build

# Database
npm run migrate          # Run migrations
npm run migrate:undo     # Rollback last migration
npm run seed             # Run seeders

# Testing
npm test                 # Run tests
npm run test:watch       # Run tests in watch mode

# Code Quality
npm run lint             # Run ESLint
npm run format           # Format code with Prettier
```

## 🔐 Security Features

- ✅ Helmet (security headers)
- ✅ CORS configuration
- ✅ Rate limiting
- ✅ JWT authentication (access + refresh tokens)
- ✅ Bcrypt password hashing
- ✅ RBAC (Role-Based Access Control)
- ✅ Input validation (Zod)
- ✅ Audit logging
- ✅ Error handling

## 📊 Database Schema

17 tabel:
- **Auth**: roles, users, refresh_tokens
- **Audit**: audit_logs
- **Master Data**: categories, suppliers, products
- **Stock**: stock_movements (ledger-based)
- **Transactions**: purchases, purchase_items, sales, sales_items
- **Returns**: returns, return_items
- **Exchanges**: exchanges, exchange_items
- **Finance**: finance_sources, finance_transactions

## 🎯 API Endpoints

50+ endpoints across 9 modules:
- Authentication (login, refresh, logout, me)
- Products (CRUD)
- Categories (CRUD)
- Suppliers (CRUD)
- Purchases (CRUD + receive + cancel)
- Sales (CRUD + ship + cancel)
- Returns (create, approve, reject)
- Exchanges (create, process)
- Stock (current stock, movements, adjust)
- Finance (sources, transactions, reports)

## 🤝 Contributing

Untuk melanjutkan implementasi, ikuti langkah-langkah di atas sesuai prioritas.

## 📄 License

MIT
