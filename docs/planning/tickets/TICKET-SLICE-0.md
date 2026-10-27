# TICKET: SLICE 0 — MONOREPO BASELINE & AUDIT INFRASTRUCTURE
## Titipin POS — Monorepo Setup, Shared Contracts & Infrastructure

| Metadata | Keterangan |
| :--- | :--- |
| **Ticket ID** | `TICKET-SLICE-0` |
| **Epic Terkait** | `EPIC-00: SYSTEM FOUNDATION` |
| **Target Branch** | `feature/slice-0-monorepo-baseline` |
| **Estimasi Beban** | Fondasi Utama (Infrastruktur & Monorepo Tooling) |
| **Dokumen Acuan** | [ARCHITECTURE.md](file:///Users/yuma/Workspace/lab/titipin/docs/architecture/ARCHITECTURE.md), [DATA-MODEL.md](file:///Users/yuma/Workspace/lab/titipin/docs/architecture/DATA-MODEL.md#L480-L505), [TOKENS.md](file:///Users/yuma/Workspace/lab/titipin/docs/design/TOKENS.md), [COMPONENTS.md](file:///Users/yuma/Workspace/lab/titipin/docs/design/COMPONENTS.md), [openapi.yaml](file:///Users/yuma/Workspace/lab/titipin/docs/api/openapi.yaml#L32-L55) |
| **Standar UI** | Tailwind CSS v3/v4, `lucide-react`, Glassmorphism Tokens (`rounded-xl` / `rounded-2xl` / `rounded-3xl`) |

---

## 1. DESKRIPSI & TUJUAN BISNIS
Membangun fondasi monorepo berbasis **Turborepo** dan **pnpm workspaces** yang memisahkan backend (`apps/backend` - NestJS 11+ Node.js 24) dan frontend (`apps/frontend` - Next.js 15 App Router) sebagai dua service terpisah, paket kontrak bersama (`packages/shared`), orkestrasi Docker Compose PostgreSQL lokal, lapisan awal persistensi Drizzle ORM (`audit_logs`), endpoint healthcheck (`GET /api/health`), konfigurasi CORS, dan setup theme token Tailwind CSS.

---

## 2. DETAIL TUGAS TEKNIS (TASK BREAKDOWN)

### 2.1 Workspace Root & Tooling
* [ ] Buat file root `pnpm-workspace.yaml` yang mendaftarkan `packages/*` dan `apps/*`:
  ```yaml
  packages:
    - 'apps/*'
    - 'packages/*'
  ```
* [ ] Buat file root `turbo.json` dengan task pipeline: `build`, `dev`, `lint`, `test`, `db:generate`, `db:migrate`, `db:seed`.
* [ ] Konfigurasi root `package.json` dengan script helper pnpm (`pnpm dev`, `pnpm build`, `pnpm test`, `pnpm db:migrate`, `pnpm db:seed`).

### 2.2 Paket Shared (`packages/shared`)
* [ ] Setup package `@titipin/shared` dengan TypeScript composite / bundler `tsup`.
* [ ] Ekspor enum sistem di `packages/shared/src/enums/`:
  * `Role`: `'ADMIN' | 'CASHIER'`
  * `Gender`: `'Pria' | 'Wanita'`
* [ ] Ekspor interface standar API response di `packages/shared/src/types/`:
  * `ApiResponse<T> { success: true; message?: string; data: T; meta?: PaginationMeta }`
  * `ApiErrorResponse { success: false; message: string; errors?: Record<string, string[]> }`
  * `PaginationMeta { page: number; per_page: number; total: number; total_pages: number }`

### 2.3 Backend Bootstrap (`apps/backend`)
* [ ] Inisialisasi NestJS 11+ dengan TypeScript strict mode (`tsconfig.json`).
* [ ] Konfigurasi validasi variabel lingkungan menggunakan Zod (`apps/backend/src/config/env.config.ts`) mencakup 9 variabel wajib secara eksplisit tanpa asumsi:
  1. `NODE_ENV`: `'development' | 'production' | 'test'` (default `'development'`)
  2. `PORT`: number (default `3001`)
  3. `FRONTEND_URL`: string (default `'http://localhost:3000'`)
  4. `DATABASE_URL`: string (default `'postgresql://postgres:postgres@localhost:5432/titipin_db'`)
  5. `JWT_SECRET`: string (min 32 karakter)
  6. `JWT_EXPIRES_IN`: string (default `'15m'`)
  7. `JWT_REFRESH_SECRET`: string (min 32 karakter)
  8. `JWT_REFRESH_EXPIRES_IN`: string (default `'7d'`)
  9. `THROTTLE_TTL`: number (default `60`), `THROTTLE_LIMIT`: number (default `10`)
* [ ] Buat file template `.env.example` di root dan di `apps/backend/`.
* [ ] Setup Drizzle ORM provider dengan connection pool `node-postgres` (`pg`) di `apps/backend/src/database/`.
* [ ] Buat skema Drizzle awal `src/database/schema/audit.schema.ts` (mengacu pada [DATA-MODEL.md Section 4.5](file:///Users/yuma/Workspace/lab/titipin/docs/architecture/DATA-MODEL.md#L480-L505)) dan hook service internal `AuditService` (agar seluruh modul selanjutnya langsung dapat mencatat audit mutasi tanpa refactoring ulang).
* [ ] Daftarkan Global Validation Pipe (Zod/class-validator), Global Exception Filter (mengembalikan format error nested), dan Global Response Transform Interceptor.
* [ ] Buat endpoint `GET /api/health` (mengacu pada [openapi.yaml](file:///Users/yuma/Workspace/lab/titipin/docs/api/openapi.yaml#L32-L55)) yang mengecek koneksi database PostgreSQL dan mengembalikan `{ status: 'ok', timestamp: '...', database: 'connected' }`.
* [ ] Konfigurasi CORS pada `main.ts` dengan `origin: [config.FRONTEND_URL]`, `credentials: true`.

### 2.4 Frontend Skeleton (`apps/frontend`)
* [ ] Inisialisasi Next.js 15 App Router dengan TypeScript dan React 19.
* [ ] Setup Tailwind CSS v3/v4 dengan konfigurasi design tokens dari [TOKENS.md](file:///Users/yuma/Workspace/lab/titipin/docs/design/TOKENS.md) (`oklch` colors, `rounded-xl`, `rounded-2xl`, `rounded-3xl`, `.glass-panel`, `.glass-card`, `.bg-canvas-pattern`).
* [ ] Install `lucide-react` (wajib digunakan untuk seluruh icon UI tanpa hardcode raw SVG).
* [ ] Konfigurasi `QueryClientProvider` (TanStack Query v5) pada root layout shell (`apps/frontend/src/app/layout.tsx`).
* [ ] Siapkan file `apps/frontend/.env.example` berisi `NEXT_PUBLIC_API_URL=http://localhost:3001/api`.

### 2.5 Infrastruktur Database Lokal
* [ ] Buat file `docker-compose.yml` untuk PostgreSQL 16 dengan port `5432`, image `postgres:16-alpine`, dan volume data persisten `pgdata`.

---

## 3. DEFINITION OF DONE (DOD) CHECKLIST

- [ ] `pnpm install` di root berjalan sukses tanpa error resolusi dependensi.
- [ ] `docker compose up -d db` sukses menyalakan kontainer PostgreSQL 16 dan dapat diakses dari backend.
- [ ] Backend NestJS dapat dijalankan via `pnpm --filter @titipin/backend dev` di port 3001.
- [ ] Endpoint `GET http://localhost:3001/api/health` mengembalikan `200 OK` dengan status koneksi database `connected`.
- [ ] Frontend Next.js dapat dijalankan via `pnpm --filter @titipin/frontend dev` di port 3000.
- [ ] Import package `@titipin/shared` berjalan type-safe baik di backend maupun frontend.
- [ ] Script migrasi Drizzle `pnpm db:generate` dan `pnpm db:migrate` berhasil membuat tabel `audit_logs` di PostgreSQL.
- [ ] Branch `feature/slice-0-monorepo-baseline` di-merge ke `develop` menggunakan flag `--no-ff`.
- [ ] Branch fitur lokal dihapus (`git branch -d feature/slice-0-monorepo-baseline`) setelah sukses merge.
