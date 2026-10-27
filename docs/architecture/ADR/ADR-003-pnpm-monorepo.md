# ADR-003: Arsitektur Monorepo Menggunakan pnpm Workspaces

| Metadata | Keterangan |
| :--- | :--- |
| **Status** | ACCEPTED |
| **Tanggal** | 27 Oktober 2026 |
| **Pilihan yang Dipertimbangkan** | pnpm Workspaces vs Multi-Repo Terpisah vs Turborepo |

---

## Konteks & Masalah
Persyaratan teknis menyatakan:
* Backend dan frontend adalah **dua service terpisah** (dapat dijalankan secara independen).
* Repositori GitHub diserahkan sebagai satu unit kerja yang mudah di-clone dan di-setup dalam $\le 6$ perintah CLI (`NFR-DEV-01`).
* Tipe data DTO, skema validasi Zod, dan konstanta enum (`Role`, `Gender`, format error kontrak) perlu disinkronkan antara backend dan frontend agar tidak terjadi duplikasi kode (*DRY*).

## Keputusan yang Diambil
Mengadopsi **pnpm workspaces** dalam struktur monorepo terpadu:
```
titipin/
├── apps/
│   ├── backend/         # NestJS REST API Service (Port 3001)
│   └── frontend/        # Next.js 15 App Router Service (Port 3000)
├── packages/
│   └── shared/          # Shared DTOs, Zod Contracts, TypeScript Types & Enums
├── docker-compose.yml   # Multi-container orchestration (PostgreSQL DB)
└── pnpm-workspace.yaml  # Workspace mapping
```

## Konsekuensi & Justifikasi
1. **Pemisahan Service Murni Terjamin:** `apps/backend` dan `apps/frontend` memiliki `package.json` masing-masing, script build mandiri, dan dapat dijalankan terpisah via `pnpm --filter backend dev` atau `pnpm --filter frontend dev`.
2. **Kontrak Type-Safe Bersama (*Single Source of Truth*):** Perubahan tipe data DTO di `packages/shared` langsung terdeteksi oleh compiler TypeScript di frontend maupun backend, mencegah ketidakcocokan payload saat integrasi.
3. **Efisiensi Disk & Instalasi Ekstrim:** pnpm menggunakan *content-addressable hard links*, menghemat kapasitas penyimpanan dan mempercepat instalasi dependensi hingga 3x dibandingkan npm/yarn standar.
4. **Setup Satu Langkah:** Reviewer cukup menjalankan `pnpm install` di root repositori untuk menginstal seluruh workspace secara bersamaan.
