# Titipin — Point of Sale (POS) & Order Management System

Sistem Point of Sale (POS) dan Order Management modern berbasis **Turborepo** dan **pnpm workspaces** yang memisahkan aplikasi menjadi dua service terpisah: Backend REST API (NestJS 11+ & Drizzle ORM) dan Frontend Web Client (Next.js 15 App Router & React 19).

---

## ⚡ Panduan Quickstart ($\le 6$ Perintah)

Jalankan seluruh sistem dari kondisi nol (fresh database) dengan maksimal 6 langkah berikut:

```bash
# 1. Clone repository
git clone https://github.com/fprtm/titipin.git && cd titipin

# 2. Inisialisasi berkas konfigurasi environment
cp .env.example .env && cp apps/backend/.env.example apps/backend/.env && cp apps/frontend/.env.example apps/frontend/.env

# 3. Pasang seluruh dependensi monorepo
pnpm install

# 4. Jalankan kontainer database PostgreSQL 16 lokal
docker compose up -d db

# 5. Jalankan migrasi skema dan suntikkan data seeder deterministik
pnpm db:migrate && pnpm db:seed

# 6. Jalankan service Backend (:3001) dan Frontend (:3000) secara serentak
pnpm dev
```

Aplikasi web dapat diakses di:

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:3001/api](http://localhost:3001/api)
- **Healthcheck**: [http://localhost:3001/api/health](http://localhost:3001/api/health)

---

## 🔑 Kredensial Akun Default (Seeder)

Setelah menjalankan `pnpm db:seed`, akun uji coba berikut siap digunakan:

| Peran (Role) | Email              | Password    | Hak Akses                                                              |
| :----------- | :----------------- | :---------- | :--------------------------------------------------------------------- |
| **Admin**    | `admin@titipin.id` | `Admin123!` | Akses penuh seluruh modul (Katalog, Pengguna, Audit Trail, Dashboard)  |
| **Kasir**    | `kasir@titipin.id` | `Kasir123!` | Akses terminal POS, hold order, riwayat transaksi, katalog & pelanggan |

---

## 🏗️ Arsitektur Monorepo

```
titipin/
├── apps/
│   ├── backend/             # Service 1: NestJS 11+, Drizzle ORM, Node.js 24 LTS REST API (:3001)
│   └── frontend/            # Service 2: Next.js 15 App Router, React 19, Tailwind CSS (:3000)
├── packages/
│   ├── shared/              # Shared contracts, enums, DTOs (@titipin/shared)
│   ├── eslint-config/       # Centralized ESLint 9 Flat Configs (@titipin/eslint-config)
│   └── typescript-config/   # Shared TypeScript configurations (@titipin/typescript-config)
├── .agents/                 # Workspace Agent Customizations & Skills (titipin-dev)
├── docs/                    # Dokumentasi lengkap: api, architecture, design, planning, product
├── AGENTS.md                # AI Agent Playbook & discoverability
├── docker-compose.yml       # Local PostgreSQL 16 container definition
└── turbo.json               # Turborepo task pipeline
```

---

## 🧪 Perintah Pengujian & Tooling

```bash
# Menjalankan seluruh test suite otomatis (Vitest / Supertest)
pnpm test

# Menjalankan test coverage report
pnpm test:cov

# Menjalankan linter di seluruh workspace
pnpm lint

# Menjalankan static typecheck TypeScript
pnpm typecheck

# Membuka Drizzle Studio Web GUI
pnpm db:studio

# Audit otomatis kualitas kode & zero-hardcoded icon
pnpm audit:quality

# Menjalankan orkestrasi produksi via Docker Compose
docker compose -f docker-compose.prod.yml up --build
```

---

## 🏛️ Pola Desain & Clean Architecture (Repositories & Use-Cases)

Sistem mengadopsi prinsip pemisahan tanggung jawab yang ketat:
- **Dedicated Repositories (`repositories/*.repository.ts`)**: Seluruh interaksi database Drizzle ORM, query, transaksi atomik, dan lock concurrency terisolasi penuh di lapisan repositori (`UsersRepository`, `ProductsRepository`, `CustomersRepository`, `OrdersRepository`, `AuditRepository`, `DashboardRepository`). Tidak ada pemanggilan query Drizzle langsung dari controller atau use-case.
- **Single-Responsibility Use-Cases (`use-cases/*.use-case.ts`)**: Logika bisnis domain dipecah menjadi kelas use-case terfokus (misal: `ProcessCheckoutUseCase`, `HoldDraftOrderUseCase`, `ResumeDraftOrderUseCase`, `FindOrdersUseCase`, `RecordAuditLogUseCase`).
- **Pessimistic Concurrency & Stock Locking**: Checkout kasir mengunci baris stok produk (`SELECT ... FOR UPDATE`) secara terurut untuk mencegah race condition, deadlocks, dan overselling (`TEST-01` s/d `TEST-03`).
- **Isolated Cart Holding (ADR-005)**: Penahanan keranjang POS dialokasikan ke tabel khusus `draft_orders` dengan penegakan unik per kasir (`UNIQUE user_id`), sehingga stok fisik tidak terpotong dan tabel `orders` tetap murni mencatat transaksi final lunas (`TEST-04`).

---

## 📚 Tautan Dokumentasi Terkait

- [Spesifikasi Fondasi Sistem](docs/architecture/FOUNDATION.md)
- [Arsitektur Sistem Lengkap](docs/architecture/ARCHITECTURE.md)
- [Model Data Relasional](docs/architecture/DATA-MODEL.md)
- [Kontrak OpenAPI 3.1](docs/api/openapi.yaml)
- [Design Tokens & Glassmorphism](docs/design/TOKENS.md)
- [Sprint Plan & Tickets](docs/planning/SPRINT-PLAN.md)
