# TICKET: SLICE 0 — MONOREPO BASELINE & AUDIT INFRASTRUCTURE
## Titipin POS — Monorepo Setup, Shared Contracts & Infrastructure

| Metadata | Keterangan |
| :--- | :--- |
| **Ticket ID** | `TICKET-SLICE-0` |
| **Epic Terkait** | `EPIC-00: SYSTEM FOUNDATION` |
| **Target Branch** | `feature/slice-0-monorepo-baseline` |
| **Estimasi Beban** | Fondasi Utama (Infrastruktur & Monorepo Tooling) |
| **Dokumen Acuan** | [ARCHITECTURE.md](../../architecture/ARCHITECTURE.md), [DATA-MODEL.md](../../architecture/DATA-MODEL.md#L480-L505), [TOKENS.md](../../design/TOKENS.md), [COMPONENTS.md](../../design/COMPONENTS.md), [openapi.yaml](../../api/openapi.yaml#L32-L55) |
| **Standar UI** | Tailwind CSS v3/v4, `lucide-react`, Glassmorphism Tokens (`rounded-xl` / `rounded-2xl` / `rounded-3xl`) |

---

## 1. DESKRIPSI & TUJUAN BISNIS
Membangun fondasi monorepo berbasis **Turborepo** dan **pnpm workspaces** yang memisahkan backend (`apps/backend` - NestJS 11+ Node.js 24) dan frontend (`apps/frontend` - Next.js 15 App Router) sebagai dua service terpisah, paket kontrak bersama (`packages/shared`), orkestrasi Docker Compose PostgreSQL lokal, lapisan awal persistensi Drizzle ORM (`audit_logs`), endpoint healthcheck (`GET /api/health`), konfigurasi CORS, dan setup theme token Tailwind CSS.

---

## 2. DETAIL TUGAS TEKNIS (TASK BREAKDOWN)

### 2.1 Workspace Root & Tooling
* [x] Buat file root `pnpm-workspace.yaml` yang mendaftarkan `packages/*` dan `apps/*`:
  ```yaml
  packages:
    - 'apps/*'
    - 'packages/*'
  ```
* [x] Buat file root `turbo.json` dengan task pipeline: `build`, `dev`, `lint`, `test`, `db:generate`, `db:migrate`, `db:seed`.
* [x] Konfigurasi root `package.json` dengan script helper pnpm (`pnpm dev`, `pnpm build`, `pnpm test`, `pnpm db:migrate`, `pnpm db:seed`).

### 2.2 Paket Shared (`packages/shared`)
* [x] Setup package `@titipin/shared` dengan TypeScript composite / bundler `tsup`.
* [x] Ekspor enum sistem di `packages/shared/src/enums/`:
  * `Role`: `'ADMIN' | 'CASHIER'`
  * `Gender`: `'Pria' | 'Wanita'`
* [x] Ekspor interface standar API response di `packages/shared/src/types/`:
  * `ApiResponse<T> { success: true; message?: string; data: T; meta?: PaginationMeta }`
  * `ApiErrorResponse { success: false; message: string; errors?: Record<string, string[]> }`
  * `PaginationMeta { page: number; per_page: number; total: number; total_pages: number }`

### 2.3 Backend Bootstrap (`apps/backend`)
* [x] Inisialisasi NestJS 11+ dengan TypeScript strict mode (`tsconfig.json`).
* [x] Konfigurasi validasi variabel lingkungan menggunakan Zod (`apps/backend/src/config/env.config.ts`) mencakup 9 variabel wajib secara eksplisit tanpa asumsi:
  1. `NODE_ENV`: `'development' | 'production' | 'test'` (default `'development'`)
  2. `PORT`: number (default `3001`)
  3. `FRONTEND_URL`: string (default `'http://localhost:3000'`)
  4. `DATABASE_URL`: string (default `'postgresql://postgres:postgres@localhost:5432/titipin_db'`)
  5. `JWT_SECRET`: string (min 32 karakter)
  6. `JWT_EXPIRES_IN`: string (default `'15m'`)
  7. `JWT_REFRESH_SECRET`: string (min 32 karakter)
  8. `JWT_REFRESH_EXPIRES_IN`: string (default `'7d'`)
  9. `THROTTLE_TTL`: number (default `60`), `THROTTLE_LIMIT`: number (default `10`)
* [x] Buat file template `.env.example` di root dan di `apps/backend/`.
* [x] Setup Drizzle ORM provider dengan connection pool `node-postgres` (`pg`) di `apps/backend/src/database/`.
* [x] Buat skema Drizzle awal `src/database/schema/audit.schema.ts` (mengacu pada [DATA-MODEL.md Section 4.5](../../architecture/DATA-MODEL.md#L480-L505)) dan hook service internal `AuditService` (agar seluruh modul selanjutnya langsung dapat mencatat audit mutasi tanpa refactoring ulang).
* [x] Daftarkan Global Validation Pipe (Zod/class-validator), Global Exception Filter (mengembalikan format error nested), dan Global Response Transform Interceptor.
* [x] Buat endpoint `GET /api/health` (mengacu pada [openapi.yaml](../../api/openapi.yaml#L32-L55)) yang mengecek koneksi database PostgreSQL dan mengembalikan `{ status: 'ok', timestamp: '...', database: 'connected' }`.
* [x] Konfigurasi CORS pada `main.ts` dengan `origin: [config.FRONTEND_URL]`, `credentials: true`.

### 2.4 Frontend Skeleton (`apps/frontend`)
* [x] Inisialisasi Next.js 15 App Router dengan TypeScript dan React 19.
* [x] Setup Tailwind CSS v3/v4 dengan konfigurasi design tokens dari [TOKENS.md](../../design/TOKENS.md) (`oklch` colors, `rounded-xl`, `rounded-2xl`, `rounded-3xl`, `.glass-panel`, `.glass-card`, `.bg-canvas-pattern`).
* [x] Install `lucide-react` (wajib digunakan untuk seluruh icon UI tanpa hardcode raw SVG).
* [x] Konfigurasi `QueryClientProvider` (TanStack Query v5) pada root layout shell (`apps/frontend/src/app/layout.tsx`).
* [x] Siapkan file `apps/frontend/.env.example` berisi `NEXT_PUBLIC_API_URL=http://localhost:3001/api`.

### 2.5 Infrastruktur Database Lokal
* [x] Buat file `docker-compose.yml` untuk PostgreSQL 16 dengan port `5432`, image `postgres:16-alpine`, dan volume data persisten `pgdata`.

---

## 3. DEFINITION OF DONE (DOD) CHECKLIST

- [x] `pnpm install` di root berjalan sukses tanpa error resolusi dependensi.
- [x] `docker compose up -d db` sukses menyalakan kontainer PostgreSQL 16 dan dapat diakses dari backend.
- [x] Backend NestJS dapat dijalankan via `pnpm --filter @titipin/backend dev` di port 3001.
- [x] Endpoint `GET http://localhost:3001/api/health` mengembalikan `200 OK` dengan status koneksi database `connected`.
- [x] Frontend Next.js dapat dijalankan via `pnpm --filter @titipin/frontend dev` di port 3000.
- [x] Import package `@titipin/shared` berjalan type-safe baik di backend maupun frontend.
- [x] Script migrasi Drizzle `pnpm db:generate` dan `pnpm db:migrate` berhasil membuat tabel `audit_logs` di PostgreSQL.
- [x] Branch `feature/slice-0-monorepo-baseline` di-merge ke `develop` menggunakan flag `--no-ff`.
- [x] Branch fitur lokal dihapus (`git branch -d feature/slice-0-monorepo-baseline`) setelah sukses merge.
