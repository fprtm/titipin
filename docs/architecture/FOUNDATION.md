# SYSTEM FOUNDATION & INFRASTRUCTURE SPECIFICATION
## Titipin POS — Monorepo Architecture, Tooling, CI/CD & Operational Blueprint

| Metadata | Keterangan |
| :--- | :--- |
| **Dokumen ID** | `SPEC-FOUNDATION-001` |
| **Versi** | `1.0.0` |
| **Tanggal Efektif** | 27 Oktober 2026 |
| **Status** | APPROVED FOR IMPLEMENTATION |
| **Monorepo Engine** | Turborepo + pnpm Workspaces |
| **Runtime Target** | Node.js 24 LTS |
| **Dokumen Acuan** | [ARCHITECTURE.md](./ARCHITECTURE.md), [DATA-MODEL.md](./DATA-MODEL.md), [openapi.yaml](../api/openapi.yaml), [TICKET-SLICE-0.md](../planning/tickets/TICKET-SLICE-0.md) |

---

## 1. STRUKTUR REPOSITORY & TOPOLOGI FOLDER

Titipin dibangun sebagai **pnpm Monorepo** yang dikelola oleh **Turborepo** untuk memastikan *caching*, paralelisasi eksekusi task, dan pemisahan tegas antara dua service independen (*NestJS Backend* dan *Next.js Frontend*) serta paket-paket bersama (*shared packages*).

### 1.1 Hierarki Folder Monorepo

```
titipin/
├── .github/
│   └── workflows/
│       └── ci.yml                         # GitHub Actions CI (Lint, Typecheck, Test, Build)
├── apps/
│   ├── backend/                           # Service 1: NestJS 11+ / Node.js 24 LTS REST API
│   │   ├── drizzle/                       # Generated SQL migration files (Drizzle Kit)
│   │   ├── src/
│   │   │   ├── common/                    # Filters, Interceptors, Guards, Decorators, Middleware
│   │   │   ├── config/                    # Zod runtime environment validation (env.config.ts)
│   │   │   ├── database/                  # Connection pool, Drizzle provider, Seeders
│   │   │   │   ├── schema/                # Modular Drizzle schemas per domain
│   │   │   │   ├── seeds/                 # Deterministic database seeders
│   │   │   │   └── database.module.ts
│   │   │   ├── modules/                   # Feature modules: auth, products, customers, orders, dashboard, audit
│   │   │   ├── app.module.ts
│   │   │   └── main.ts                    # Bootstrap entry point, CORS, Global Pipes/Filters
│   │   ├── test/                          # E2E & integration test suites (Supertest)
│   │   ├── .env.example
│   │   ├── docker-compose.yml             # Local PostgreSQL 16 container definition
│   │   ├── Dockerfile                     # Multi-stage production container
│   │   ├── drizzle.config.ts              # Drizzle Kit CLI configuration
│   │   ├── package.json                   # @titipin/backend
│   │   └── tsconfig.json
│   │
│   └── frontend/                          # Service 2: Next.js 15 App Router (React 19)
│       ├── public/                        # Static assets (favicons, manifest)
│       ├── src/
│       │   ├── app/                       # App Router routes, layouts, error boundaries
│       │   ├── components/                # UI components (shadcn/ui, glassmorphism, layouts)
│       │   ├── hooks/                     # Custom React hooks (useCart, useAuth, useDebounce)
│       │   ├── lib/                       # Axios instance, TanStack Query client, utils
│       │   ├── styles/                    # Tailwind CSS globals, OKLCH design tokens
│       │   ├── types/                     # Frontend-specific view model types
│       │   └── middleware.ts              # Next.js Edge SSR route protection & redirects
│       ├── .env.example
│       ├── Dockerfile                     # Multi-stage production container (standalone)
│       ├── next.config.ts                 # Next.js config (standalone output enabled)
│       ├── package.json                   # @titipin/frontend
│       ├── postcss.config.mjs
│       ├── tailwind.config.ts
│       └── tsconfig.json
│
├── packages/
│   ├── shared/                            # Shared domain contracts, enums, interfaces, Zod schemas
│   │   ├── src/
│   │   │   ├── enums/                     # Role, Gender, OrderActivityAction, AuditAction
│   │   │   ├── types/                     # ApiResponse, ApiErrorResponse, PaginationMeta, DTOs
│   │   │   └── index.ts
│   │   ├── package.json                   # @titipin/shared
│   │   ├── tsconfig.json
│   │   └── tsup.config.ts
│   │
│   ├── eslint-config/                     # Centralized ESLint 9 Flat Configs
│   │   ├── base.js
│   │   ├── nest.js
│   │   ├── next.js
│   │   └── package.json                   # @titipin/eslint-config
│   │
│   └── typescript-config/                 # Centralized TypeScript base configurations
│       ├── base.json
│       ├── nest.json
│       ├── next.json
│       └── package.json                   # @titipin/typescript-config
│
├── docs/                                  # Comprehensive System Documentation
│   ├── api/                               # openapi.yaml
│   ├── architecture/                      # Architecture blueprints, Data Model, ADRs
│   ├── design/                            # Design tokens, components, page specs
│   ├── planning/                          # Sprint plan, tickets, DoD
│   └── product/                           # PRD, user stories, acceptance criteria
│
├── .env.example                           # Root environment blueprint
├── .gitignore
├── .npmrc                                 # Strict peer dependencies & hoisting settings
├── .prettierignore
├── .prettierrc                            # Unified code formatting configuration
├── AGENTS.md                              # AI Agent monorepo guidelines & discovery
├── docker-compose.yml                     # Local development DB (Postgres 16)
├── docker-compose.prod.yml                # Production full-stack container orchestration
├── package.json                           # Root workspace orchestrator
├── pnpm-workspace.yaml                    # Workspace packages declaration
├── README.md                              # Project setup (<= 6 commands), architecture guide
└── turbo.json                             # Turborepo task pipeline configuration
```

### 1.2 Konfigurasi Workspace Root (`pnpm-workspace.yaml` & `turbo.json`)

**`pnpm-workspace.yaml`**:
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

**`turbo.json`** (Mengacu pada Turborepo standard 2026):
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", "test/**/*"]
    },
    "test:cov": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "db:generate": {
      "cache": false
    },
    "db:migrate": {
      "cache": false
    },
    "db:seed": {
      "cache": false
    }
  }
}
```

---

## 2. LINTING, FORMATTING & AUTOMATED TESTS

### 2.1 Linting & Code Style (ESLint 9 Flat Config + Prettier)
* **ESLint 9 Flat Config**: Menggunakan modular flat config format (`eslint.config.mjs`) di `@titipin/eslint-config` yang mengintegrasikan:
  * `@typescript-eslint/parser` & `@typescript-eslint/eslint-plugin` (Strict mode, no unused variables, explicit function return types pada core service).
  * `eslint-plugin-react` & `eslint-plugin-react-hooks` (Khusus `apps/frontend`).
  * `eslint-config-prettier` (Mencegah konflik antara linting dan formatting rules).
* **Prettier**: Konfigurasi terpadu di `.prettierrc` root:
  ```json
  {
    "singleQuote": true,
    "trailingComma": "all",
    "printWidth": 100,
    "tabWidth": 2,
    "semi": true,
    "plugins": ["prettier-plugin-tailwindcss"]
  }
  ```

### 2.2 Strategi Pengujian Otomatis (Automated Tests)
* **Backend Unit & Integration Testing**:
  * Tooling: **Vitest** (atau **Jest**) terintegrasi dengan **Supertest** untuk end-to-end HTTP endpoint verification.
  * 10 Critical Integration Test Suites (mengacu pada [ARCHITECTURE.md Section 7](./ARCHITECTURE.md#7-skenario-pengujian-kritis-critical-integration-test-matrix)):
    1. `TEST-01`: Login admin & kasir mengembalikan format token dan profil yang valid.
    2. `TEST-02`: Import katalog Excel memvalidasi format, deduplikasi SKU, dan menyisipkan item valid.
    3. `TEST-03`: Export katalog Excel menghasilkan file binary XLSX dengan header dan baris data yang tepat.
    4. `TEST-04`: Checkout order multi-item berhasil memotong stok secara atomik dan mencatat transaksi.
    5. `TEST-05`: Checkout order dengan stok barang tidak mencukupi gagal total (*rollback*) dengan status 400 Bad Request.
    6. `TEST-06`: Transaksi POS serentak (*concurrent race condition*) menangani stok terbatas secara deterministik tanpa *overselling*.
    7. `TEST-07`: Mekanisme Hold Order menyimpan draft transaksi dan dapat dipanggil kembali (*resume*).
    8. `TEST-08`: Perubahan harga master produk di masa depan tidak mengubah snapshot harga pada transaksi historis yang telah selesai.
    9. `TEST-09`: Kasir yang mencoba mengakses data audit log (`GET /api/audit-logs`) ditolak dengan respon 403 Forbidden.
    10. `TEST-10`: Dashboard metrics mengkalkulasi agregat penjualan, omzet, dan daftar slow-moving products secara akurat.
* **Frontend Component Testing**:
  * Tooling: **Vitest** + **React Testing Library** + **@testing-library/jest-dom**.
  * Pengujian: Rendering keranjang kasir POS, kalkulasi kembalian uang kasir otomatis, proteksi rute halaman kasir dari akses modul admin.

---

## 3. ENVIRONMENT VARIABLES & SECRETS MANAGEMENT

### 3.1 Skema Validasi Runtime Zod (Fail-Fast Engine)
Aplikasi **tidak pernah berasumsi** atau membiarkan proses *runtime* berjalan dengan variabel yang hilang. Backend memvalidasi seluruh environment variables pada saat *bootstrap* aplikasi melalui `apps/backend/src/config/env.config.ts`:

```typescript
import { z } from 'zod';

export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET minimal 32 karakter demi keamanan'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET minimal 32 karakter'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  THROTTLE_TTL: z.coerce.number().default(60),
  THROTTLE_LIMIT: z.coerce.number().default(10),
});

export type EnvConfig = z.infer<typeof EnvSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = EnvSchema.safeParse(config);
  if (!result.success) {
    console.error('❌ Environment Variable Validation Errors:', result.error.format());
    throw new Error('Konfigurasi environment variable tidak valid. Periksa file .env.');
  }
  return result.data;
}
```

### 3.2 File Blueprint Variabel Lingkungan

* **Root `.env.example` & `apps/backend/.env.example`**:
  ```env
  NODE_ENV=development
  PORT=3001
  FRONTEND_URL=http://localhost:3000
  DATABASE_URL=postgresql://postgres:postgres@localhost:5432/titipin_db
  JWT_SECRET=super_secret_jwt_key_must_be_at_least_32_characters_long
  JWT_EXPIRES_IN=15m
  JWT_REFRESH_SECRET=super_secret_refresh_key_must_be_at_least_32_characters_long
  JWT_REFRESH_EXPIRES_IN=7d
  THROTTLE_TTL=60
  THROTTLE_LIMIT=10
  ```

* **`apps/frontend/.env.example`**:
  ```env
  NEXT_PUBLIC_API_URL=http://localhost:3001/api
  ```

* **Kebijakan Keamanan Secrets**:
  - File `.env`, `.env.local`, `.env.production` **wajib diabaikan** oleh `.gitignore` dan dilarang keras di-commit ke Git.
  - Untuk lingkungan produksi/CI, secrets disuntikkan via GitHub Repository Secrets atau container environment injection.

---

## 4. DATABASE MIGRATIONS & SEEDER REPRODUCIBILITY

### 4.1 Arsitektur Drizzle ORM + Drizzle Kit
* **Drizzle Kit Config (`apps/backend/drizzle.config.ts`)**:
  ```typescript
  import { defineConfig } from 'drizzle-kit';

  export default defineConfig({
    schema: './src/database/schema/*.schema.ts',
    out: './drizzle',
    dialect: 'postgresql',
    dbCredentials: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/titipin_db',
    },
    verbose: true,
    strict: true,
  });
  ```

### 4.2 Siklus Migrasi & Seeder
1. **`pnpm db:generate`**:
   Menganalisis perbedaan (*diff*) antara skema TypeScript Drizzle (`src/database/schema/`) dan menghasilkan berkas migrasi SQL terurut di folder `apps/backend/drizzle/`.
2. **`pnpm db:migrate`**:
   Mengeksekusi runner migrasi programatik Drizzle untuk menerapkan seluruh file SQL migrasi yang belum terpasang ke database PostgreSQL secara transaksional.
3. **`pnpm db:seed`**:
   Menjalankan seeder deterministik (`apps/backend/src/database/seeds/index.ts`) yang memenuhi kualifikasi data minimum:
   - **1 Akun Admin Utama**: `admin@titipin.id` (password hash aman, role `ADMIN`).
   - **1 Akun Kasir Utama**: `kasir@titipin.id` (password hash aman, role `CASHIER`).
   - **20+ Produk Katalog**: Beragam kategori makanan/minuman/retail dengan SKU unik, harga realistis, dan variasi stok.
   - **15+ Data Pelanggan**: Data member terdaftar dengan nama, nomor telepon unik, email, dan gender.
   - **30+ Transaksi Historis**: Kombinasi transaksi selesai, held/draft, variasi pelanggan umum (*walk-in*) dan member, serta item snapshot.

### 4.3 Ekstensi Database & Akselerasi Indeks GIN Trigram (`pg_trgm`)
Untuk memastikan query pencarian katalog POS dan riwayat transaksi tidak mengalami degradasi saat data bertumbuh:
- **Ekstensi `pg_trgm`**: Diinisialisasi secara otomatis oleh `DatabaseModule` pada siklus bootstrap aplikasi:
  ```sql
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  ```
- **Indeks GIN Trigram (`gin_trgm_ops`)**: Diterapkan pada kolom teks bebas:
  - `idx_products_name_trgm` pada `products(product_name)`
  - `idx_products_code_trgm` pada `products(product_code)`
  - `idx_customers_name_trgm` pada `customers(customer_name)`
  - `idx_customers_phone_trgm` pada `customers(phone)`
  - `idx_orders_number_trgm` pada `orders(order_number)`
- **Efisiensi Eksekusi**: Mengubah pencarian parsial `ILIKE '%query%'` dari *Sequential Table Scan* ($O(N)$) menjadi *Bitmap Index Scan* ($O(\log N)$).

---

## 5. LOGGING, AUDITING & GLOBAL ERROR HANDLING

### 5.1 Structured Logging & Audit Trails
Sistem mengadopsi 2 tingkat pencatatan:
1. **Application Level Log**: Menggunakan format structured JSON pada NestJS Logger (mencatat bootstrap event, database connection status, incoming HTTP requests, error stack traces).
2. **Database Audit Trail**:
   - Tabel `audit_logs` (Append-only write log): Mencatat aktor (`user_id`), aksi (`CREATE`, `UPDATE`, `DELETE`), entitas (`products`, `customers`, `users`), payload sebelum & sesudah mutasi (`old_values`, `new_values` JSONB), alamat IP, dan User Agent.
   - Tabel `order_activity_logs` (Timeline status nota): Mencatat transisi siklus order (`ORDER_CREATED`, `ORDER_HELD`, `ORDER_FINALIZED`, `ORDER_CANCELLED`).

### 5.2 Standarisasi Response & Error Handling Global

* **Global Transform Interceptor (`TransformInterceptor`)**:
  Membungkus seluruh respon sukses controller ke dalam format seragam:
  ```json
  {
    "success": true,
    "message": "Operasi berhasil diselesaikan",
    "data": { ... },
    "meta": {
      "page": 1,
      "per_page": 10,
      "total": 45,
      "total_pages": 5
    }
  }
  ```

* **Global Exception Filter (`AllExceptionsFilter`)**:
  Menangkap seluruh HttpException, Zod/class-validator errors, dan unhandled exceptions. Menghasilkan format error terstandarisasi dengan pemetaan error nested:
  ```json
  {
    "success": false,
    "message": "Validasi input gagal",
    "errors": {
      "items.1.quantity": ["Kuantitas produk melebihi sisa stok yang tersedia (stok: 2)"],
      "customer_id": ["ID pelanggan tidak ditemukan"]
    }
  }
  ```

### 5.3 Monitoring, Observability & Latency Tracking

Sistem mengimplementasikan observability level produksi untuk memastikan kestabilan performa dan deteksi dini bottleneck:

1. **Latency Tracking Interceptor (`ResponseTimeInterceptor`)**:
   - Menghitung durasi eksekusi setiap HTTP request secara presisi via `process.hrtime()`.
   - Menginjeksi response header `X-Response-Time: <duration>ms` pada semua respons client.
   - Mengeluarkan peringatan log level WARN otomatis jika waktu pemrosesan melebihi ambang batas toleransi 100ms (`Slow Request Alert`).

2. **Prometheus Metrics Scraper Endpoint (`GET /api/metrics`)**:
   - Dikelola oleh `MetricsService` (`prom-client`) tanpa mengekspos data sensitif.
   - **Metrik Sistem**: Penggunaan CPU proses (`process_cpu_user_seconds_total`, `process_cpu_system_seconds_total`), alokasi memori heap V8 (`nodejs_heap_size_used_bytes`, `nodejs_heap_size_total_bytes`).
   - **Metrik HTTP**: Penghitung request per rute dan status code (`http_requests_total`), histogram latensi HTTP (`http_request_duration_seconds_bucket`).
   - **Metrik Connection Pool PostgreSQL**: Gauge pemantauan koneksi pool aktif (`database_connections_active`), koneksi menganggur (`database_connections_idle`), dan request menunggu slot antrean (`database_connections_waiting`).

3. **Production Health Check Endpoint (`GET /api/health`)**:
   - Mengembalikan status kesehatan service (`UP`), konektivitas aktif ke database PostgreSQL (via `SELECT 1`), rincian koneksi pool (`total`, `idle`, `waiting`), penggunaan RAM, dan uptime sistem.

---

## 6. CI/CD & DEPLOYMENT MINIMAL

### 6.1 GitHub Actions Workflow (`.github/workflows/ci.yml`)
Workflow otomatis dijalankan setiap kali ada *Push* atau *Pull Request* ke branch `develop` dan `main`:

```yaml
name: Titipin CI Pipeline

on:
  push:
    branches: [develop, main]
  pull_request:
    branches: [develop, main]

jobs:
  audit-and-test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Setup Node.js 24 LTS
        uses: actions/setup-node@v4
        with:
          node-version: 24

      - name: Setup pnpm
        uses: pnpm/action-setup@v3
        with:
          version: 9

      - name: Cache pnpm store
        uses: actions/cache@v4
        with:
          path: ~/.local/share/pnpm/store
          key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: |
            ${{ runner.os }}-pnpm-store-

      - name: Install Dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint Workspace
        run: pnpm turbo lint

      - name: Typecheck Workspace
        run: pnpm turbo typecheck

      - name: Run Test Suites
        run: pnpm turbo test
```

### 6.2 Deployment Minimal & Setup Cepat ($\le 6$ Perintah)
Menyediakan berkas `docker-compose.prod.yml` untuk menjalankan keseluruhan sistem di lingkungan server/VPS tanpa konfigurasi manual yang rumit:

```bash
# === PANDUAN RUNNING INSTAN SISTEM TITIPIN (<= 6 PERINTAH) ===
# 1. Clone repository
git clone https://github.com/fprtm/titipin.git && cd titipin

# 2. Inisialisasi berkas konfigurasi environment
cp .env.example .env && cp apps/backend/.env.example apps/backend/.env && cp apps/frontend/.env.example apps/frontend/.env

# 3. Pasang seluruh dependensi monorepo
pnpm install

# 4. Jalankan kontainer database PostgreSQL lokal
docker compose up -d db

# 5. Eksekusi migrasi database dan suntikkan data awal (seed)
pnpm db:migrate && pnpm db:seed

# 6. Nyalakan seluruh service monorepo (Backend :3001 & Frontend :3000)
pnpm dev
```

---

## 7. STRATEGI VERSIONING API & KONFIGURASI JARINGAN LOKAL

### 7.1 Strategi Versioning API
* **Global Route Prefix**: Seluruh endpoint backend NestJS dipasang di bawah prefix `/api`.
* **URI Versioning Ready**: Mendukung skema `/api/v1` dengan alias transparansi `/api/*` untuk memastikan integrasi kontrak OpenAPI (`docs/api/openapi.yaml`) berjalan mulus dan tetap siap untuk evolusi *breaking changes* di masa mendatang.
* **CORS Policy Strict**:
  - `origin`: Dibatasi secara eksplisit ke `http://localhost:3000` (atau `FRONTEND_URL` di env).
  - `credentials`: `true` (wajib untuk transfer HTTP-only refresh cookie).
  - `methods`: `GET, POST, PUT, PATCH, DELETE, OPTIONS`.
* **Rate Limiting Guard**:
  - `@nestjs/throttler` diaktifkan secara global (default: 60 detik / 10 request untuk endpoint mutasi dan autentikasi; dapat dikonfigurasi via env).

### 7.2 Dokumentasi Interaktif OpenAPI / Swagger UI
Backend NestJS mengekspos dokumentasi API interaktif menggunakan `@nestjs/swagger`:
- **Interactive UI**: Diakses di `/api/docs` dengan konfigurasi JWT Bearer Authentication (`bearerAuth`). Penguji dapat langsung mencoba endpoint dan menguji respons data secara real-time.
- **OpenAPI Schema JSON**: Diekspos di `/api/docs-json` untuk kebutuhan konsumsi tooling automated, code generation, atau inspeksi skema programmatic.
- **Koleksi Postman Siap Pakai**: Disediakan berkas `docs/api/titipin_postman_collection.json` untuk pengujian endpoint manual via aplikasi desktop Postman.

---

## 8. STANDAR DOKUMENTASI & DISCOVERABILITY (`README.md` & `AGENTS.md`)

### 8.1 Standar `README.md`
`README.md` di root repository dirancang ramah manusia (*human-friendly*) dan mencakup:
1. Deskripsi singkat produk Titipin POS.
2. Arsitektur sistem (diagram ringkas dua service terpisah).
3. Prasyarat sistem (Node.js 24 LTS, pnpm v9+, Docker).
4. Panduan *Quickstart* $\le 6$ langkah dari zero hingga running.
5. Kredensial akun uji coba default (`admin@titipin.id` & `kasir@titipin.id`).
6. Perintah pengujian (`pnpm test`, `pnpm test:cov`).
7. Tautan ke dokumentasi lengkap di folder `docs/`.

### 8.2 Standar `AGENTS.md` (Agent-Facing Discovery)
Sesuai rekomendasi standar Turborepo LLM indexability dan agentic pairing, `AGENTS.md` disediakan di root repository untuk memandu AI agent (termasuk subagents) dalam bekerja di dalam codebase ini:
1. **Repository Topology**: Struktur direktori, letak aplikasi backend, frontend, dan shared packages.
2. **Commands & Workflows**: Perintah standar build, lint, dev, migrate, dan test.
3. **Strict Constraints & Coding Guidelines**:
   - Dilarang keras meng-hardcode icon raw SVG / emoji; **wajib menggunakan `lucide-react`**.
   - Desain wajib responsive mobile-first dengan tema glassmorphism (`rounded-xl` / `rounded-2xl` / `rounded-3xl`).
   - Pola percabangan Git: Standar industri best-practice (branch `feature/...` dari `develop`, merge dengan `--no-ff`, lalu hapus branch lokal).
   - Penamaan entitas dan variabel wajib eksplisit, konsisten, dan terhubung dengan schema Drizzle.
4. **Contract Reference Index**: Tautan langsung ke `docs/api/openapi.yaml`, `docs/architecture/DATA-MODEL.md`, dan `docs/planning/TICKETS.md`.

---

## 9. KESIMPULAN & TAHAP BERIKUTNYA

Spesifikasi Fondasi ini melengkapi seluruh kriteria teknis yang diwajibkan:
1. Struktur monorepo Turborepo + pnpm workspaces yang bersih dan modular.
2. Linting (ESLint 9 Flat), formatting (Prettier), dan 10 test suite integrasi backend.
3. Validasi Zod fail-fast untuk variabel lingkungan.
4. Drizzle ORM migration runner & seeder lengkap (20+ produk, 15+ member, 30+ order).
5. Logging terstruktur, audit trail, serta error handling global dengan nested validation errors.
6. CI/CD GitHub Actions dan setup instan $\le 6$ perintah.
7. Prefix `/api` dengan CORS credentials & throttler.
8. Dokumentasi komprehensif `README.md` dan `AGENTS.md`.

Fondasi ini siap diwujudkan secara konkret pada implementasi `TICKET-SLICE-0` (`feature/slice-0-monorepo-baseline`).
