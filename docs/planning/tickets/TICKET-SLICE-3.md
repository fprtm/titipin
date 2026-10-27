# TICKET: SLICE 3 — KATALOG PRODUK, INVENTARIS & IMPORT/EXPORT EXCEL
## Titipin POS — Product Inventory, Soft Delete & Idempotent Excel Engine

| Metadata | Keterangan |
| :--- | :--- |
| **Ticket ID** | `TICKET-SLICE-3` |
| **Epic Terkait** | `EPIC-02: MANAJEMEN KATALOG PRODUK (INVENTARIS)` |
| **Target Branch** | `feature/slice-3-product-catalog` |
| **Aturan Bisnis** | [BR-001, BR-006, BR-009](../../product/PRD.md#L45-L60) |
| **Dokumen Acuan** | [DATA-MODEL.md Section 3.2 & 4.2](../../architecture/DATA-MODEL.md#L152-L170), [openapi.yaml](../../api/openapi.yaml#L275-L417) |
| **Spesifikasi UI** | [04-products.md](../../design/pages/04-products.md), [COMPONENTS.md](../../design/COMPONENTS.md) |
| **Integration Test** | [TEST-07 (Soft delete produk & import idempoten)](../../product/ACCEPTANCE-CRITERIA.md#L472) |

---

## 1. DESKRIPSI & TUJUAN BISNIS
Mengelola katalog produk barang dagangan toko (kode produk unik, harga satuan, sisa stok $\ge 0$), penonaktifan barang via soft-delete agar tidak merusak histori transaksi lampau, pengunduhan katalog ke format Excel (`.xlsx`), serta pengunggahan data massal idempoten (`.xlsx` / `.csv`) berbasis `product_code` untuk efisiensi update stok dan harga barang.

---

## 2. DETAIL TUGAS TEKNIS (TASK BREAKDOWN)

### 2.1 Database & Skema Drizzle
* [ ] Buat skema `src/database/schema/products.schema.ts`:
  * `id`: bigint identity (mode number).
  * `product_code`: varchar(20) unique not null.
  * `product_name`: varchar(150) not null.
  * `stock`: integer not null default 0 (check constraint `stock >= 0`).
  * `price`: numeric(12,2) not null (check constraint `price > 0`).
  * `deleted_at`: timestamp with timezone nullable (soft delete).
  * Index: `idx_products_search` on `(product_name, product_code)`.
* [ ] Jalankan migrasi Drizzle untuk membuat tabel `products`.

### 2.2 Shared Contracts (`packages/shared`)
* [ ] Buat Zod schema `createProductSchema` dan `updateProductSchema`.
* [ ] Buat interface DTO `ProductItem`, `ProductListResponse`, `ImportSummaryResponse`.

### 2.3 Backend API (`apps/backend/src/modules/products/`)
* [ ] `GET /api/products`: listing produk aktif (`deleted_at IS NULL`) dengan query `search` (nama/kode), `sort` (name/price/stock), `order` (asc/desc), dan paginasi.
* [ ] `POST /api/products`: tambah produk baru (Admin Only), tolak 422 jika kode produk sudah ada.
* [ ] `GET /api/products/:id`: detail satu produk.
* [ ] `PUT /api/products/:id`: ubah produk (Admin Only).
* [ ] `DELETE /api/products/:id`: soft delete `deleted_at = NOW()` (Admin Only).
* [ ] `GET /api/products/export`: generate file Excel `.xlsx` menggunakan `exceljs` dan stream ke response.
* [ ] `POST /api/products/import`: terima multipart file spreadsheet, parse baris, eksekusi upsert idempoten di PostgreSQL (jika `product_code` ada: update nama, harga, stok; jika belum ada: insert baru). Kembalikan ringkasan baris.
* [ ] Catat seluruh aksi mutasi ke `audit_logs` (`PRODUCT_CREATED`, `PRODUCT_UPDATED`, `PRODUCT_DELETED`).

### 2.4 Frontend UI Mobile-First (`apps/frontend`)
* [ ] Buat halaman `/products` mengacu pada `docs/design/pages/04-products.md`:
  * Toolbar: Search input (`rounded-xl`), dropdown urutan, tombol Export Excel, tombol Import Excel (Admin), tombol Tambah Produk (Admin).
  * Data Table Kaca (`rounded-2xl`): kolom Kode, Nama, Harga (Rupiah tabular), Sisa Stok (badge hijau/kuning/merah), Tanggal, Aksi.
  * Modal Tambah/Edit Produk (`rounded-3xl p-8`).
  * Modal Import Spreadsheet: area drag-and-drop file bergelombang (`border-dashed border-emerald-300 rounded-2xl`), link download template sampel, dan kartu ringkasan hasil (*Total, Inserted, Updated, Failed*).
  * AlertDialog konfirmasi soft delete produk.
  * Seluruh icon menggunakan `lucide-react` (`Package`, `Search`, `FileSpreadsheet`, `UploadCloud`, `Download`, `Plus`, `Trash2`, `Edit3`).

---

## 3. DEFINITION OF DONE (DOD) CHECKLIST

- [ ] Pengguna (Kasir & Admin) dapat melihat, mencari, dan mengurutkan katalog produk.
- [ ] Admin dapat menambah, mengedit, dan menghapus (soft-delete) produk.
- [ ] Produk yang di-soft-delete tidak muncul lagi di katalog kasir POS maupun API listing normal.
- [ ] Tombol Export berhasil mengunduh file `.xlsx` yang valid dan dapat dibuka di Microsoft Excel.
- [ ] Import Excel bersifat idempoten: mengunggah file yang sama dua kali tidak menghasilkan duplikasi produk (`inserted: 0, updated: N`).
- [ ] Automated Test `TEST-07` lulus 100%.
- [ ] Tampilan halaman responsif di layar mobile (tabel dapat di-scroll horizontal secara halus di layar sempit).
- [ ] Branch `feature/slice-3-product-catalog` di-merge ke `develop` menggunakan flag `--no-ff`.
- [ ] Branch fitur lokal dihapus setelah merge.
