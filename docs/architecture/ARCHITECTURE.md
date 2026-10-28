# SYSTEM ARCHITECTURE & TECHNICAL SPECIFICATION
## Titipin — Sistem Point of Sale (POS) & Order Management

| Metadata | Keterangan |
| :--- | :--- |
| **Dokumen ID** | `ARCH-TITIPIN-001` |
| **Versi** | `1.0.0` |
| **Tanggal Efektif** | 27 Oktober 2026 |
| **Status** | APPROVED FOR IMPLEMENTATION |
| **Pola Arsitektur** | Modular Monolith (Backend) + Feature-Driven Colocation (Frontend) |
| **Monorepo Engine** | pnpm Workspaces |
| **Dokumen Acuan** | `docs/product/PRD.md`, `docs/architecture/DATA-MODEL.md`, `docs/architecture/ADR/` |

---

## 1. GAMBARAN UMUM SISTEM (HIGH-LEVEL ARCHITECTURE)

Titipin POS dirancang dengan arsitektur **dua service terpisah** yang terorganisir di dalam sebuah **pnpm Monorepo**:

```mermaid
graph TD
    subgraph Browser ["Web Browser Client (Desktop / Tablet / Mobile)"]
        UI["Next.js 15 App Router (Port 3000)"]
        TQ["TanStack Query v5 (Server State Manager)"]
        AX["Axios Client + Mutex Queue (Transport Engine)"]
        UI --> TQ
        TQ --> AX
    end

    subgraph Edge ["Next.js Edge Runtime"]
        MW["middleware.ts (SSR Route Guard & Redirect)"]
    end

    subgraph BackendService ["Backend Service: NestJS Modular Monolith (Port 3001)"]
        direction TB
        GW["Global Filters / Interceptors (ResponseTime, Transform) / Guards"]
        AUTH["Auth & Users Module (Passport JWT + RBAC)"]
        PRD["Products Module (Catalog, GIN Trigram Search, Excel)"]
        CST["Customers Module (Member Directory, Trigram Search)"]
        ORD["Orders Module (POS Engine, Concurrency Locking, Draft Hold)"]
        DSH["Dashboard Module (Metrics, Trends, Low Stock)"]
        ANL["Analytics Module (BI, Recharts Dual-Axis, Basket Intelligence)"]
        AUD["Audit Module (Append-Only Write Audit Trail)"]
        HLT["Health & Metrics Module (Prometheus prom-client)"]
        SWG["OpenAPI / Swagger Engine (/api/docs)"]

        GW --> AUTH
        GW --> PRD
        GW --> CST
        GW --> ORD
        GW --> DSH
        GW --> ANL
        GW --> AUD
        GW --> HLT
        GW --> SWG
    end

    subgraph DataStore ["Persistence Layer"]
        PG[("PostgreSQL 16 Database + pg_trgm Extension")]
        DRZ["Drizzle ORM Engine (node-postgres / pg pool max:20)"]
    end

    AX -- "REST API / Bearer JWT + HttpOnly Cookie" --> GW
    AUTH --> DRZ
    PRD --> DRZ
    CST --> DRZ
    ORD --> DRZ
    DSH --> DRZ
    ANL --> DRZ
    AUD --> DRZ
    HLT --> DRZ
    DRZ --> PG
```

---

## 2. STRUKTUR WORKSPACE MONOREPO (`pnpm-workspaces`)

```
titipin/
├── apps/
│   ├── backend/                     # Service 1: NestJS 11+ / Node.js 24 LTS REST API
│   │   ├── src/
│   │   │   ├── common/              # Decorators, Filters, Guards, Interceptors
│   │   │   ├── config/              # Environment config validation (Zod)
│   │   │   ├── database/            # Drizzle connection pool provider & schema definitions
│   │   │   │   ├── schema/          # Modular Drizzle Schema per domain
│   │   │   │   │   ├── users.schema.ts
│   │   │   │   │   ├── products.schema.ts
│   │   │   │   │   ├── customers.schema.ts
│   │   │   │   │   ├── orders.schema.ts
│   │   │   │   │   ├── audit.schema.ts
│   │   │   │   │   └── index.ts     # Central schema barrel file
│   │   │   │   ├── migrate.ts       # Programmatic migration runner
│   │   │   │   └── seed.ts          # Database seeder (Admin, Cashier, Products, Orders)
│   │   │   ├── modules/             # Modular Monolith Bounded Contexts
│   │   │   │   ├── auth/            # Login, Refresh, Logout, Change Password
│   │   │   │   ├── users/           # User listing, Admin Reset Password, Soft Delete
│   │   │   │   ├── products/        # Product CRUD, Soft Delete, GIN Trigram Search, Excel Export
│   │   │   │   ├── customers/       # Customer/Member CRUD & Soft Delete, Trigram Search
│   │   │   │   ├── orders/          # POS Engine, Row Locking, Hold Draft, History, Atomic Audit
│   │   │   │   ├── dashboard/       # Daily/Monthly/Quarterly Summary, Trends, Low Stock
│   │   │   │   ├── analytics/       # Business Intelligence, Recharts Dual-Axis, Basket Affinity
│   │   │   │   ├── audit/           # Write Audit Trail Interceptor & Admin Query
│   │   │   │   └── health/          # Health Check (/api/health) & Prometheus (/api/metrics)
│   │   │   ├── scripts/             # CLI Scripts (benchmark-concurrency, generate-openapi)
│   │   │   ├── app.module.ts        # Root Module
│   │   │   └── main.ts              # Entry point bootstrap (Swagger UI, ResponseTimeInterceptor)
│   │   ├── test/                    # Automated Integration Tests (Vitest + Supertest)
│   │   ├── drizzle.config.ts        # Drizzle Kit configuration
│   │   ├── Dockerfile               # Multi-stage Docker build backend
│   │   └── package.json
│   │
│   └── frontend/                    # Service 2: Next.js 15 App Router / React 19 Client
│       ├── src/
│       │   ├── app/                 # Thin Layout & Routing Shell
│       │   │   ├── (auth)/login/    # Page login
│       │   │   ├── (dashboard)/     # Authenticated shell layout (Navbar, Sidebar)
│       │   │   │   ├── dashboard/   # Dashboard analytics view
│       │   │   │   ├── analytics/   # Full-page Sales BI Analytics (Admin only)
│       │   │   │   ├── pos/         # Cashier POS Interface & Keyboard Shortcuts
│       │   │   │   ├── products/    # Product catalog, import, export
│       │   │   │   ├── customers/   # Member management
│       │   │   │   ├── orders/      # POS Transaction history & detail
│       │   │   │   ├── users/       # User management (Admin only)
│       │   │   │   └── audit-logs/  # Audit trail viewer (Admin only)
│       │   │   └── layout.tsx       # Root layout (QueryClientProvider + Toasters)
│       │   ├── features/            # Feature-Driven Colocated Modules
│       │   │   ├── auth/            # api, hooks, components
│       │   │   ├── products/        # api, hooks, components, import-dialog
│       │   │   ├── customers/       # api, hooks, components
│       │   │   ├── orders/          # api, hooks, pos-cart, hold-modal, invoice
│       │   │   ├── dashboard/       # api, hooks, trend-chart, metric-cards
│       │   │   ├── users/           # api, hooks, reset-modal
│       │   │   └── audit/           # api, hooks, audit-table
│       │   ├── components/ui/       # Dumb presentational components (shadcn/ui primitives)
│       │   ├── lib/                 # Axios client instance, formatters, utilities
│       │   └── middleware.ts        # Next.js Edge SSR Route Guard
│       ├── Dockerfile               # Standalone Next.js Docker build
│       └── package.json
│
├── packages/
│   └── shared/                      # Shared Contracts & Enums
│       ├── src/
│       │   ├── enums/               # Role ('ADMIN' | 'CASHIER'), Gender ('Pria' | 'Wanita')
│       │   ├── types/               # User, Product, Customer, Order, ApiResponse interfaces
│       │   └── schemas/             # Shared Zod validation schemas
│       └── package.json
│
├── docker-compose.yml               # Local Development (PostgreSQL DB)
├── docker-compose.prod.yml          # Production Orchestration (Backend + Frontend + DB)
├── pnpm-workspace.yaml              # pnpm workspace definition
└── README.md                        # Master Documentation & Setup Guide
```

---

## 3. DATA BOUNDARIES & MODULAR MONOLITH DESIGN

Setiap modul di `apps/backend/src/modules/` mengisolasi tanggung jawabnya secara tegas:

| Modul Domain | Tabel yang Dikelola | Hak Akses (*Role Permission*) | Tanggung Jawab Utama |
| :--- | :--- | :--- | :--- |
| **`auth`** | `users` (baca/update hash) | Public (`login`, `refresh`), Authenticated (`logout`, `me`, `change-password`) | Verifikasi kredensial, penerbitan JWT, pencabutan token. |
| **`users`** | `users` (CRUD) | `ADMIN` Only (`BR-011`, `BR-015`) | Listing user, reset password kasir, penonaktifan akun (soft delete). |
| **`products`** | `products` | Read: Kasir & Admin; Write: Admin Only | Katalog produk, validasi harga/stok, ekspor/impor Excel idempoten. |
| **`customers`** | `customers` | Read & Create: Kasir & Admin; Update/Delete: Admin | Profil pelanggan/member toko. |
| **`orders`** | `orders`, `order_items`, `draft_orders`, `order_activity_logs` | Kasir & Admin | Engine POS, row locking concurrency, hold draft, invoice detail. |
| **`dashboard`** | Agregasi `orders`, `order_items`, `products` | Kasir & Admin | Metrik omset harian/bulanan/kuartalan, grafik tren, produk terlaris & lesu. |
| **`analytics`** | Agregasi `orders`, `order_items`, `customers` | `ADMIN` Only | Business Intelligence, Recharts multi-axis, Market Basket Analysis, dan rekomendasi kombo bundling. |
| **`audit`** | `audit_logs` | Write: System Hook; Read: `ADMIN` Only | Pencatatan append-only seluruh mutasi data write sistem. |
| **`health`** | Status DB connection pool & Node process | Public & Prometheus Scraper | Health check probe (`/api/health`) dan eksposisi metrik standar (`/api/metrics`). |

### 3.1 Aturan Batas Antarmodul & Integritas Transaksi (*Encapsulation Rules*)

Untuk mencegah modular monolith terdegradasi menjadi "spaghetti code", sistem memberlakukan aturan keras (*strict rules*):
1. **Dilarang Mutasi Lintas Tabel Langsung**: Modul `orders` dilarang mengimpor tabel `products` untuk melakukan update langsung (`UPDATE products SET stock = ...`).
2. **Delegasi Melalui Exported Service**: Operasi yang melintasi domain bisnis wajib didelegasikan ke NestJS Service resmi milik modul terkait (misal: `OrdersService` memanggil `ProductsService.lockAndDeductStock(tx, items)`).
3. **Penerusan Context Transaksi (`tx`)**: Seluruh interaksi lintas-service dalam satu atomic operation wajib menerima instance transaksi Drizzle (`tx`) yang sama, memastikan prinsip ACID (All-or-Nothing).
4. **Isolasi Schema**: Meskipun tabel didefinisikan secara modular di `database/schema/*.schema.ts` untuk keperluan migration engine Drizzle Kit dan relasi foreign key DB, hak mutasi tabel berada 100% di bawah wewenang modul domain pemiliknya.

---

## 4. SEQUENCE DIAGRAMS (ALUR BISNIS UTAMA)

### 4.1 Autentikasi & Silent Mutex Auto-Refresh Token
Menunjukkan bagaimana sistem kebal dari serangan XSS dan kebal terhadap *race condition* saat token kadaluarsa di tengah request paralel:

```mermaid
sequenceDiagram
    autonumber
    actor Kasir as Kasir / Browser
    participant Interceptor as Axios Interceptor (Client)
    participant AuthAPI as NestJS Auth Module
    participant DB as PostgreSQL Database

    Kasir->>Interceptor: Akses dashboard (3 request paralel: summary, trend, stock)
    Interceptor->>AuthAPI: 3 Request membawa Bearer Token (sudah expired)
    AuthAPI-->>Interceptor: 401 Unauthorized (Token Expired)
    
    rect rgb(240, 248, 255)
        note over Interceptor: Request 1 mengaktifkan Mutex Lock.<br/>Request 2 & 3 dimasukkan ke failedQueue.
        Interceptor->>AuthAPI: POST /api/auth/refresh (membawa HttpOnly Cookie)
        AuthAPI->>DB: Validasi hash refresh_token di tabel users
        DB-->>AuthAPI: Cocok & user deleted_at IS NULL
        AuthAPI-->>Interceptor: Return new Access Token (Set-Cookie perpanjangan)
        note over Interceptor: Simpan Access Token baru in-memory.<br/>Eksekusi ulang seluruh request di failedQueue!
    end

    Interceptor->>AuthAPI: Retry Request 1, 2, dan 3 dengan Access Token baru
    AuthAPI-->>Kasir: 200 OK (Data dashboard tersaji mulus tanpa logout mendadak)
```

---

### 4.2 Pembuatan Order POS Bebas Race Condition via Pessimistic Row Locking
Menunjukkan bagaimana transaksi atomik (*All-or-Nothing*) dan penguncian baris mencegah *overselling*:

```mermaid
sequenceDiagram
    autonumber
    actor Kasir as Kasir POS
    participant OrdersService as OrdersService
    participant DB as PostgreSQL (Drizzle db.transaction)

    Kasir->>OrdersService: POST /api/orders { customer_id: "uuid" | null, items: [{ product_id: 1, quantity: 2 }] }
    
    activate OrdersService
    OrdersService->>DB: BEGIN TRANSACTION (Read Committed)
    
    alt Jika customer_id terisi
        OrdersService->>DB: Query customer WHERE id = customer_id AND deleted_at IS NULL
    end

    rect rgb(255, 245, 238)
        note over OrdersService, DB: PESSIMISTIC ROW LOCKING (BR-004)
        OrdersService->>DB: SELECT * FROM products WHERE id IN (1) FOR UPDATE
        DB-->>OrdersService: Return locked row (Stok: 10, Harga: 12000.00)
    end

    note over OrdersService: Server-Side Calculation (BR-001):<br/>Subtotal = 2 * 12000 = 24000.00.<br/>Validasi Stok: 10 >= 2 (OK).

    OrdersService->>DB: UPDATE products SET stock = stock - 2 WHERE id = 1
    OrdersService->>DB: Generate Order Number INV-YYYYMMDD-XXXX
    OrdersService->>DB: INSERT INTO orders (order_number, customer_id, created_by, total_amount)
    OrdersService->>DB: INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal)
    OrdersService->>DB: INSERT INTO order_activity_logs (order_id, action: 'ORDER_FINALIZED')
    OrdersService->>DB: COMMIT TRANSACTION
    deactivate OrdersService

    DB-->>OrdersService: Transaction Committed
    OrdersService-->>Kasir: 201 Created (Invoice lengkap beserta price snapshot)
```

---

### 4.3 Alur Hold Transaksi POS (`draft_orders`)
Menunjukkan bagaimana kasir menahan antrean pelanggan tanpa memotong stok barang fisik:

```mermaid
sequenceDiagram
    autonumber
    actor Kasir as Kasir POS
    participant POS as Orders Module
    participant DB as PostgreSQL

    Kasir->>POS: Pelanggan A belum siap bayar -> Klik "Hold Transaksi"
    POS->>DB: INSERT INTO draft_orders (user_id, customer_id, items) VALUES (...)
    note over DB: Constraint UNIQUE(user_id) menjamin<br/>1 kasir hanya memiliki 1 draft aktif (BR-012).<br/>STOK TIDAK BERKURANG!
    DB-->>POS: 201 Created (Draft Tersimpan)
    POS-->>Kasir: Cart kasir bersih, siap melayani Pelanggan B
    
    note over Kasir: Selesai melayani Pelanggan B...<br/>Kasir klik "Lanjutkan Transaksi Tertahan"
    Kasir->>POS: GET /api/orders/held
    POS->>DB: SELECT * FROM draft_orders WHERE user_id = kasir_id
    DB-->>Kasir: Tampilkan kembali keranjang belanja Pelanggan A

    Kasir->>POS: POST /api/orders/held/finalize
    note over POS, DB: Jalankan db.transaction atomik: Lock stok, potong stok,<br/>insert orders & order_items, HAPUS baris dari draft_orders!
    POS-->>Kasir: 201 Created (Order Selesai)
```

---

## 5. ARSITEKTUR KEAMANAN & AUTHORIZATION (RBAC)

1. **Dual Token Lifecycle (`BR-007`):**
   - **Access Token:** Berumur 15 menit, disimpan *in-memory* di frontend.
   - **Refresh Token:** Berumur 7 hari, disimpan di cookie dengan atribut: `HttpOnly; SameSite=Strict; Path=/api/auth/refresh`. Di lingkungan production, flag `Secure` otomatis aktif.
2. **Role-Based Access Control (`BR-015`):**
   - Token JWT memuat claim `role` (`'ADMIN'` atau `'CASHIER'`).
   - Handler controller backend menggunakan decorator `@Roles('ADMIN')` yang dievaluasi oleh `RolesGuard`.
   - Endpoint terproteksi Admin:
     - `/api/users/*` (User Management)
     - `/api/audit-logs/*` (Audit Trail)
     - `POST/PUT/DELETE /api/products/*` (Katalog Write)
     - `DELETE /api/customers/*` (Customer Deletion)
   - Percobaan akses oleh user dengan role `CASHIER` langsung ditolak dengan **HTTP 403 Forbidden**.
3. **SSR Protection via Next.js Edge Middleware:**
   - Middleware mengecek keberadaan session cookie sebelum merender halaman `/dashboard/*`.
   - Jika belum login, request diarahkan langsung ke `/login` di level SSR tanpa *flash of unauthenticated content* (zero-FOUC).
4. **Cross-Origin Resource Sharing (CORS) Policy:**
   - Karena backend (`:3001`) dan frontend (`:3000`) merupakan dua service terpisah, NestJS mengonfigurasi CORS dengan `credentials: true` dan origin eksplisit (`http://localhost:3000` atau domain production). Nilai wildcard `*` dilarang keras agar browser mengizinkan pengiriman cookie `refresh_token`.
5. **Rate Limiting & Proteksi Brute-Force:**
   - Modul `auth` diproteksi oleh `@nestjs/throttler` dengan batas maksimal 10 request per menit per alamat IP pada rute `POST /api/auth/login`. Pelanggaran batas memicu respon **HTTP 429 Too Many Requests**.
6. **Layanan Pemantauan & Healthcheck Kontainer (`GET /api/health`):**
   - Menyediakan endpoint non-terproteksi untuk pemantauan ketersediaan sistem dan konektivitas pool database oleh Docker Compose (`healthcheck.test`). Mengembalikan status `200 OK` jika DB terhubung, atau `503 Service Unavailable` jika koneksi DB terputus.

---

## 6. SIKLUS PERUBAHAN DATABASE & MIGRATION STRATEGY

Pengelolaan skema database dikendalikan sepenuhnya oleh **Drizzle Kit**:
1. **Deklarasi Kode:** Skema diperbarui di `packages/database/src/schema.ts` atau `apps/backend/src/database/schema.ts`.
2. **Generasi Migrasi SQL:** Developer menjalankan `pnpm db:generate`. Drizzle Kit membaca perbedaan TypeScript schema terhadap histori migrasi dan menghasilkan berkas migrasi SQL berurutan di `drizzle/XXXX_migration_name.sql`.
3. **Eksekusi Migrasi Terprogram:**
   - Script runner `migrate.ts` menggunakan method `migrate(db, { migrationsFolder: './drizzle' })`.
   - Script ini dipanggil otomatis sebelum aplikasi dijalankan (`pnpm db:migrate`) dan di dalam setup docker-compose.
4. **Seeder Data Awal (`pnpm db:seed`):**
   - Menghasilkan 1 Admin (`admin@titipin.id`), 1 Kasir (`kasir@titipin.id`).
   - Minimal 20 produk bervariasi (termasuk beberapa produk dengan stok $<5$).
   - Minimal 15 pelanggan terdaftar (member).
   - Minimal 30 order transaksi historis yang tersebar realistis dalam 30 hari terakhir.

---

## 7. ORKESTRASI SETUP LOKAL & PRODUCTION (MAKSIMAL 6 PERINTAH)

Sistem memenuhi **NFR-DEV-01** (dapat dijalankan dari database kosong hingga berjalan penuh dalam $\le 6$ perintah CLI):

### 7.1 Setup Lingkungan Lokal (Development)
```bash
# 1. Masuk ke direktori proyek
cd titipin

# 2. Siapkan berkas environment
cp .env.example .env

# 3. Jalankan container PostgreSQL
docker compose up -d db

# 4. Install seluruh dependensi monorepo
pnpm install

# 5. Jalankan migrasi skema dan seeder database awal
pnpm db:migrate && pnpm db:seed

# 6. Jalankan aplikasi secara bersamaan (Backend: 3001, Frontend: 3000)
pnpm dev
```

### 7.2 Menjalankan Automated Integration Test Suite
```bash
pnpm test
```
*Mengeksekusi 9 skenario integrasi wajib (`TEST-01` s/d `TEST-09`) menggunakan Vitest/Jest + Supertest pada database PostgreSQL uji.*

### 7.3 Setup Lingkungan Production (Docker Compose Full Stack)
```bash
docker compose -f docker-compose.prod.yml up -d --build
```
*Mengompilasi multi-stage build backend Node.js dan standalone Next.js frontend, menghubungkannya ke jaringan internal PostgreSQL.*
