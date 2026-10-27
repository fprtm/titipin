# TICKET: SLICE 0 — MONOREPO BASELINE & AUDIT INFRASTRUCTURE
## Titipin POS — Monorepo Setup, Shared Contracts & Infrastructure

| Metadata | Keterangan |
| :--- | :--- |
| **Ticket ID** | `TICKET-SLICE-0` |
| **Epic Terkait** | `EPIC-00: SYSTEM FOUNDATION` |
| **Target Branch** | `feature/slice-0-monorepo-baseline` |
| **Estimasi Beban** | Fondasi Utama (Infrastruktur & Monorepo Tooling) |
| **Standar UI** | Tailwind CSS v3/v4, `lucide-react`, Glassmorphism Tokens (`rounded-xl` / `rounded-2xl` / `rounded-3xl`) |

---

## 1. DESKRIPSI & TUJUAN BISNIS
Membangun fondasi monorepo berbasis **Turborepo** dan **pnpm workspaces** yang memisahkan backend (NestJS 11+ Node.js 24) dan frontend (Next.js 15 App Router) sebagai dua service terpisah, paket kontrak bersama (`packages/shared`), orkestrasi Docker Compose PostgreSQL lokal, dan lapisan awal persistensi Drizzle ORM serta infrastruktur audit trail global.

---

## 2. DETAIL TUGAS TEKNIS (TASK BREAKDOWN)

### 2.1 Workspace Root & Tooling
* [ ] Buat file root `pnpm-workspace.yaml` yang mendaftarkan `apps/*` dan `packages/*`.
* [ ] Buat file root `turbo.json` dengan task pipeline: `build`, `dev`, `lint`, `test`, `db:migrate`, `db:seed`.
* [ ] Konfigurasi root `package.json` dengan script helper pnpm.

### 2.2 Paket Shared (`packages/shared`)
* [ ] Setup package `@titipin/shared` dengan TypeScript composite / bundler `tsup`.
* [ ] Ekspor enum sistem: `Role` (`ADMIN`, `CASHIER`), `Gender` (`Pria`, `Wanita`).
* [ ] Ekspor interface standar API response: `ApiResponse<T>`, `ApiErrorResponse`, `PaginationMeta`.

### 2.3 Backend Bootstrap (`apps/backend`)
* [ ] Inisialisasi NestJS 11+ dengan TypeScript strict mode.
* [ ] Konfigurasi validasi variabel lingkungan menggunakan Zod (`DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, dll).
* [ ] Setup Drizzle ORM provider dengan connection pool `node-postgres` (`pg`).
* [ ] Buat skema Drizzle awal `src/database/schema/audit.schema.ts` dan service `AuditService` internal (agar seluruh modul selanjutnya langsung dapat mencatat audit mutasi tanpa refactoring ulang).
* [ ] Daftarkan Global Validation Pipe (Zod/class-validator), Global Exception Filter (mengembalikan format error nested), dan Global Response Transform Interceptor.

### 2.4 Frontend Skeleton (`apps/frontend`)
* [ ] Inisialisasi Next.js 15 App Router dengan TypeScript dan React 19.
* [ ] Setup Tailwind CSS v3/v4 dengan konfigurasi design tokens dari `docs/design/TOKENS.md` (`oklch` colors, `rounded-xl`, `rounded-2xl`, `rounded-3xl`, `.glass-panel`, `.glass-card`, `.bg-canvas-pattern`).
* [ ] Install `lucide-react` (wajib digunakan untuk seluruh icon UI tanpa hardcode raw SVG).
* [ ] Konfigurasi `QueryClientProvider` (TanStack Query v5) pada root layout shell.

### 2.5 Infrastruktur Database Lokal
* [ ] Buat file `docker-compose.yml` untuk PostgreSQL 16 dengan port `5432` dan volume data persisten.

---

## 3. DEFINITION OF DONE (DOD) CHECKLIST

- [ ] `pnpm install` di root berjalan sukses tanpa error resolusi dependensi.
- [ ] `docker compose up -d` sukses menyalakan kontainer PostgreSQL 16 dan dapat diakses dari backend.
- [ ] Backend NestJS dapat dijalankan via `pnpm --filter @titipin/backend dev` di port 3001.
- [ ] Frontend Next.js dapat dijalankan via `pnpm --filter @titipin/frontend dev` di port 3000.
- [ ] Import package `@titipin/shared` berjalan type-safe baik di backend maupun frontend.
- [ ] Script migrasi Drizzle `pnpm db:generate` dan `pnpm db:migrate` berhasil membuat tabel `audit_logs` di PostgreSQL.
- [ ] Branch `feature/slice-0-monorepo-baseline` di-merge ke `develop` menggunakan flag `--no-ff`.
- [ ] Branch fitur lokal dihapus (`git branch -d feature/slice-0-monorepo-baseline`) setelah sukses merge.
