# AGENTS.md — TITIPIN POS MONOREPO AI AGENT PLAYBOOK
## Multi-Agent Guidelines, Architectural Standards & Operational Playbook

> **PANDUAN UTAMA AGEN AI & PENGEMBANG OTOMATIS**
> Berkas ini adalah instruksi operasional resmi bagi seluruh AI Agent, pair programmer, dan subagent yang membaca, memodifikasi, atau mengeksekusi kode di dalam repositori **Titipin POS**.

---

## 1. IKHTISAR SISTEM & TOPOLOGI MONOREPO

Titipin adalah sistem *Point of Sale* (POS) dan *Order Management* berbasis **Turborepo** dan **pnpm workspaces** yang memisahkan aplikasi menjadi dua service independen dan paket-paket kontrak bersama:

```
titipin/
├── apps/
│   ├── backend/             # Service 1: NestJS 11+ / Node.js 24 LTS REST API (:3001)
│   └── frontend/            # Service 2: Next.js 15 App Router / React 19 (:3000)
├── packages/
│   ├── shared/              # Shared contracts, enums, DTOs (@titipin/shared)
│   ├── eslint-config/       # Shared ESLint 9 Flat Configs (@titipin/eslint-config)
│   └── typescript-config/   # Shared tsconfig bases (@titipin/typescript-config)
├── .agents/                 # Workspace Agent Customizations & Skills
│   └── skills/
│       └── titipin-dev/     # Skill panduan arsitektur & verifikasi kode Titipin
├── docs/                    # Dokumentasi lengkap: api, architecture, design, planning, product
├── AGENTS.md                # Berkas panduan ini
├── README.md                # Setup guide (<= 6 perintah)
├── docker-compose.yml       # PostgreSQL 16 container lokal (:5432)
├── pnpm-workspace.yaml      # Deklarasi pnpm workspaces
└── turbo.json               # Pipeline build/test/lint/db Turborepo
```

---

## 2. ATURAN KERAS SISTEM (CORE SYSTEM RULES)

Setiap agen yang menggenerasi atau mengedit kode **WAJIB** mematuhi aturan-aturan berikut:

### ❌ ATURAN 1: ZERO HARDCODED ICONS (MUTLAK)
* **DILARANG KERAS** menyisipkan icon raw SVG (seperti `<svg ...>...</svg>`), string SVG inline, atau karakter emoji (seperti 🛒, 👤, 📦) di seluruh komponen React/Next.js.
* **WAJIB HANYA MENGGUNAKAN `lucide-react`**:
  ```tsx
  // ❌ SALAH (DILARANG KERAS)
  <svg className="w-5 h-5"><path d="..." /></svg>
  <span>🛒 Keranjang</span>

  // ✅ BENAR (WAJIB)
  import { ShoppingCart, LogOut, CheckCircle2, ShieldAlert } from 'lucide-react';
  <ShoppingCart className="w-5 h-5 text-primary" />
  ```

### 🏷️ ATURAN 2: STANDAR PENAMAAN FILE & VARIABEL (DESKRIPTIF & EKSPLISIT)
* **Penamaan File**:
  - Wajib menggunakan **kebab-case** untuk seluruh file dan folder multi-kata (mencegah *case-sensitivity collision* antara macOS dan Linux):
    - Backend: `<domain>.module.ts`, `<domain>.controller.ts`, `<domain>.service.ts`, `<action>-<entity>.dto.ts`, `<entity>.schema.ts`, `<name>.guard.ts`.
    - Frontend: `kebab-case.tsx` untuk komponen (`product-card.tsx`, `cart-drawer.tsx`, `receipt-modal.tsx`), `use-<name>.ts` untuk hooks.
    - Packages: `<name>.enum.ts`, `<name>.interface.ts`.
* **Penamaan Variabel & Identifiers**:
  - **DILARANG singkatan samar/kriptik**: dilarang menggunakan `p`, `c`, `o`, `val`, `temp`, `cb`, `res1`, `el`.
  - **Variabel/Field**: Wajib kata benda deskriptif (`products`, `customerRecords`, `orderItems`).
  - **Boolean**: Wajib diawali prefix predikat (`isSubmitting`, `hasSufficientStock`, `isAuditTrailEnabled`).
  - **Fungsi/Method**: Wajib diawali kata kerja + objek (`calculateTotalAmount()`, `validateStockAvailability()`, `fetchCustomerOrderHistory()`).
  - **Database Columns**: Wajib `snake_case` (`order_number`, `unit_price`, `customer_id`, `created_at`, `deleted_at`).
  - **TypeScript Interfaces/Types**: Wajib `PascalCase` (`CreateProductDto`, `OrderResponse`, `ApiResponse<T>`).

### 🌿 ATURAN 3: STANDAR PERCABANGAN GIT (BRANCHING BEST PRACTICES)
* Mengadopsi alur standar industri (**Git Flow / GitHub Flow**):
  - `main`: Branch produksi yang selalu stabil dan siap deploy.
  - `develop`: Branch integrasi aktif untuk fitur-fitur yang sedang dikembangkan.
  - `feature/<nama-fitur>`: Branch kerja untuk fitur baru, dicabangkan dari `develop`.
  - `fix/<nama-bug>`: Branch perbaikan bug, dicabangkan dari `develop` (atau `main` jika hotfix).
* **Alur Kerja**:
  1. Buat branch fitur dari `develop`: `git checkout -b feature/<nama-fitur>`
  2. Gunakan konvensi **Conventional Commits** (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`).
  3. Merge kembali ke `develop` menggunakan flag `--no-ff` (non-fast-forward) untuk mempertahankan riwayat percabangan yang jelas:
     ```bash
     git checkout develop
     git merge --no-ff feature/<nama-fitur> -m "merge: feature/<nama-fitur> into develop"
     ```
  4. Hapus branch fitur lokal setelah sukses merge: `git branch -d feature/<nama-fitur>`.

### 🎯 ATURAN 4: ZERO AMBIGUITY & ZERO HALLUCINATION
* Seluruh tipe data, response structure, dan parameter query **wajib 100% konsisten** dengan:
  - Kontrak OpenAPI di [docs/api/openapi.yaml](./docs/api/openapi.yaml)
  - Data Model Drizzle di [docs/architecture/DATA-MODEL.md](./docs/architecture/DATA-MODEL.md)
  - Tipe bersama di `@titipin/shared`
* Dilarang menciptakan field database fiktif atau mengubah skema tanpa persetujuan arsitektural.

### 📱 ATURAN 5: DESAIN RESPONSIVE MOBILE-FIRST & GLASSMORPHISM
* Seluruh komponen UI **wajib mobile-first**: mulai dari layar compact (`w-full`), lalu scale up menggunakan breakpoint `md:`, `lg:`, `xl:`.
* Wajib menerapkan token tema kaca (*tactile glassmorphism*) sesuai [docs/design/TOKENS.md](./docs/design/TOKENS.md):
  - `.glass-panel`, `.glass-card`, `.glass-button`
  - Radius modern: `rounded-xl` (12px), `rounded-2xl` (16px), `rounded-3xl` (24px)
  - Breathing room: padding lega (`p-6` s/d `p-8`) dan gap proporsional (`gap-4` s/d `gap-6`).
  - Struk kasir: Wajib menyertakan utility print thermal `@media print { ... }`.

### 🛡️ ATURAN 6: ZERO FORBIDDEN STRINGS
* Nama produk resmi adalah **Titipin**.
* Dilarang keras memunculkan nama agensi lama, nama teknikal test lama, atau referensi berkas untracked.

### ⚡ ATURAN 7: PANDUAN RUNNING INSTAN ($\le 6$ PERINTAH)
Repositori harus selalu dapat dijalankan dari kondisi nol (fresh database) dalam maksimal 6 perintah:
```bash
git clone https://github.com/fprtm/titipin.git && cd titipin
cp .env.example .env && cp apps/backend/.env.example apps/backend/.env && cp apps/frontend/.env.example apps/frontend/.env
pnpm install
docker compose up -d db
pnpm db:migrate && pnpm db:seed
pnpm dev
```

---

## 3. CHEATSHEET PERINTAH TURBOREPO & PNPM

Semua perintah dijalankan dari root direktori monorepo:

| Perintah | Deskripsi |
| :--- | :--- |
| `pnpm dev` | Menjalankan Backend (:3001) dan Frontend (:3000) secara serentak via Turborepo |
| `pnpm build` | Membangun shared packages, Next.js standalone build, dan NestJS dist |
| `pnpm lint` | Menjalankan validasi ESLint 9 Flat Config di seluruh workspace |
| `pnpm typecheck` | Menjalankan `tsc --noEmit` untuk validasi tipe TypeScript strict |
| `pnpm test` | Menjalankan seluruh test suite Vitest / Jest di seluruh workspace |
| `pnpm test:cov` | Menjalankan test coverage report |
| `pnpm db:generate` | Menghasilkan berkas migrasi SQL Drizzle dari skema TypeScript |
| `pnpm db:migrate` | Mengeksekusi migrasi SQL yang belum terpasang ke database PostgreSQL |
| `pnpm db:seed` | Mengisi data awal seeder (1 admin, 1 kasir, 20+ produk, 15+ member, 30+ order) |
| `pnpm db:studio` | Membuka Drizzle Studio web GUI untuk inspeksi data database |

---

## 4. SKILL KHUSUS & PANDUAN LENGKAP CODEBASE

Repositori ini dilengkapi dengan Skill agen terdedikasi:
- **Nama Skill**: `titipin-dev`
- **Lokasi Utama**: [.agents/skills/titipin-dev/SKILL.md](./.agents/skills/titipin-dev/SKILL.md)
- **Modul Referensi Terperinci**:
  1. [rules-and-constraints.md](./.agents/skills/titipin-dev/references/rules-and-constraints.md) — Aturan ketat, ban icon raw/emoji, standar penamaan file/variabel, dan standard branching.
  2. [backend-guide.md](./.agents/skills/titipin-dev/references/backend-guide.md) — Arsitektur NestJS, Controller/Service/Drizzle pattern, konvensi penamaan backend, concurrency locking, dan audit logging.
  3. [frontend-guide.md](./.agents/skills/titipin-dev/references/frontend-guide.md) — Next.js 15 App Router, TanStack Query, Axios mutex, Tailwind glassmorphism, dan Lucide icons.
  4. [packages-guide.md](./.agents/skills/titipin-dev/references/packages-guide.md) — Setup `@titipin/shared`, TypeScript configs, ESLint flat config, dan build boundary.
  5. [testing-guide.md](./.agents/skills/titipin-dev/references/testing-guide.md) — Panduan penulisan & eksekusi Supertest (10 critical suites) dan Vitest frontend testing.
  6. [cheatsheet-commands.md](./.agents/skills/titipin-dev/references/cheatsheet-commands.md) — Daftar perintah operasional harian.

Aktifkan skill `titipin-dev` saat merencanakan, mengimplementasikan, atau mereview kode pada repositori ini.
