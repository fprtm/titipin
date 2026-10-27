# TICKET: SLICE 4 — MANAJEMEN PELANGGAN (MEMBER TOKO)
## Titipin POS — Customer & Member Profile Management

| Metadata | Keterangan |
| :--- | :--- |
| **Ticket ID** | `TICKET-SLICE-4` |
| **Epic Terkait** | `EPIC-03: MANAJEMEN DATA PELANGGAN (MEMBER TOKO)` |
| **Target Branch** | `feature/slice-4-customer-management` |
| **Aturan Bisnis** | [BR-006](../../product/PRD.md#L50-L55) |
| **Dokumen Acuan** | [DATA-MODEL.md Section 3.3 & 4.3](../../architecture/DATA-MODEL.md#L172-L198), [openapi.yaml](../../api/openapi.yaml#L418-L514) |
| **Spesifikasi UI** | [05-customers.md](../../design/pages/05-customers.md), [COMPONENTS.md](../../design/COMPONENTS.md) |
| **Integration Test** | [ACCEPTANCE-CRITERIA.md Section 4 (AC-CST-01 s/d AC-CST-04)](../../product/ACCEPTANCE-CRITERIA.md#L180-L240) |

---

## 1. DESKRIPSI & TUJUAN BISNIS
Mengelola data pelanggan toko yang mendaftar sebagai member (nama, alamat, gender, tanggal lahir, nomor handphone), menyediakan pencarian cepat nama pelanggan untuk dipilih di kasir POS, serta mendukung soft-delete pelanggan.

---

## 2. DETAIL TUGAS TEKNIS (TASK BREAKDOWN)

### 2.1 Database & Skema Drizzle
* [ ] Buat skema `src/database/schema/customers.schema.ts`:
  * `id`: uuid primary key (default random).
  * `customer_name`: varchar(150) not null.
  * `customer_address`: varchar(255) not null.
  * `gender`: enum `Pria` | `Wanita` not null.
  * `birth_date`: date not null mode string.
  * `phone`: varchar(20) nullable.
  * `deleted_at`: timestamp with timezone nullable.
  * Index: `idx_customers_name` on `(customer_name)`.
* [ ] Jalankan migrasi Drizzle untuk membuat tabel `customers`.

### 2.2 Shared Contracts (`packages/shared`)
* [ ] Buat Zod schema `createCustomerSchema` dan `updateCustomerSchema`.
* [ ] Buat interface DTO `CustomerItem`, `CustomerListResponse`.

### 2.3 Backend API (`apps/backend/src/modules/customers/`)
* [ ] `GET /api/customers`: listing pelanggan aktif (`deleted_at IS NULL`) dengan filter pencarian nama (`search`) dan paginasi.
* [ ] `POST /api/customers`: pendaftaran pelanggan/member baru (Kasir & Admin).
* [ ] `GET /api/customers/:id`: detail profil pelanggan.
* [ ] `PUT /api/customers/:id`: update data pelanggan (Admin Only).
* [ ] `DELETE /api/customers/:id`: soft delete pelanggan (Admin Only).
* [ ] Catat seluruh mutasi data ke tabel `audit_logs` (`CUSTOMER_CREATED`, `CUSTOMER_UPDATED`, `CUSTOMER_DELETED`).

### 2.4 Frontend UI Mobile-First (`apps/frontend`)
* [ ] Buat halaman `/customers` mengacu pada `docs/design/pages/05-customers.md`:
  * Toolbar: Search input nama pelanggan instan (`rounded-xl`), tombol `+ Member Baru` (`rounded-xl h-11 bg-emerald-700`).
  * Data Table Member (`rounded-2xl glass-panel`): kolom ID Member, Nama, Gender, Tanggal Lahir, No. HP, Alamat, Aksi.
  * Modal Pendaftaran Member Baru (`rounded-3xl p-8`): form nama, alamat, radio gender pill, date picker, no HP.
  * AlertDialog konfirmasi soft delete pelanggan.
  * Seluruh icon menggunakan `lucide-react` (`Users2`, `Search`, `Plus`, `Phone`, `MapPin`, `Calendar`, `Edit3`, `Trash2`).

---

## 3. DEFINITION OF DONE (DOD) CHECKLIST

- [ ] Kasir dan Admin dapat melihat daftar pelanggan aktif dan mencari member berdasarkan nama.
- [ ] Kasir dan Admin dapat mendaftarkan member baru melalui modal dialog.
- [ ] Admin dapat mengedit dan menonaktifkan member (soft delete).
- [ ] Member yang dihapus tidak muncul di pencarian autocomplete kasir POS.
- [ ] Seluruh aksi mutasi tercatat di tabel `audit_logs`.
- [ ] Branch `feature/slice-4-customer-management` di-merge ke `develop` menggunakan flag `--no-ff`.
- [ ] Branch fitur lokal dihapus setelah merge.
