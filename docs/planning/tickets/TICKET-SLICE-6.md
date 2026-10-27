# TICKET: SLICE 6 — POS HOLD & RESUME DRAFT ORDERS (ISOLATED DRAFTS)
## Titipin POS — Cart Suspension, Isolated Drafts & Resume Flow

| Metadata | Keterangan |
| :--- | :--- |
| **Ticket ID** | `TICKET-SLICE-6` |
| **Epic Terkait** | `EPIC-04: TRANSAKSI PENJUALAN KASIR (POINT OF SALE)` |
| **Target Branch** | `feature/slice-6-pos-hold-orders` |
| **Aturan Bisnis** | [BR-012, BR-016, BR-017](../../product/PRD.md#L60-L75) |
| **Dokumen Acuan** | [ARCHITECTURE.md Section 4.3](../../architecture/ARCHITECTURE.md#L241-L267), [ADR-005](../../architecture/ADR/ADR-005-pos-draft-orders-isolation.md), [DATA-MODEL.md Section 3.6 & 4.4](../../architecture/DATA-MODEL.md#L238-L252), [openapi.yaml](../../api/openapi.yaml#L564-L633) |
| **Spesifikasi UI** | [03-pos-checkout.md](../../design/pages/03-pos-checkout.md), [02-app-shell.md](../../design/pages/02-app-shell.md), [COMPONENTS.md](../../design/COMPONENTS.md) |
| **Integration Test** | [TEST-04 (Hold draft & finalize atomik)](../../product/ACCEPTANCE-CRITERIA.md#L470) |

---

## 1. DESKRIPSI & TUJUAN BISNIS
Mengizinkan kasir menahan (*hold*) keranjang belanja yang sedang aktif saat pelanggan belum siap membayar (misal mengambil barang tambahan atau mencari uang tunai) tanpa memotong stok barang fisik dan tanpa mencemari tabel `orders` utama, serta memungkinkan kasir memuat ulang keranjang tersebut untuk diselesaikan atau dibuang secara aman.

---

## 2. DETAIL TUGAS TEKNIS (TASK BREAKDOWN)

### 2.1 Database & Skema Drizzle
* [x] Tambahkan skema tabel `draft_orders` di `src/database/schema/orders.schema.ts`:
  * `id`: bigint identity primary key.
  * `user_id`: uuid not null unique references ke `users.id` (ON DELETE CASCADE) — menjamin constraint 1 kasir maksimal 1 draft aktif (`BR-012`).
  * `customer_id`: uuid nullable references ke `customers.id` (ON DELETE SET NULL).
  * `items`: jsonb not null (`Array<{ product_id: number; quantity: number }>`).
  * `created_at`, `updated_at`: timestamptz not null default now.
* [x] Jalankan migrasi Drizzle untuk membuat tabel `draft_orders`.

### 2.2 Backend API (`apps/backend/src/modules/orders/`)
* [x] `POST /api/orders/hold`:
  * Ambil `user_id` dari access token kasir yang sedang login.
  * Cek apakah sudah ada record di `draft_orders` untuk `user_id` tersebut. Jika sudah ada, tolak dengan status `422 Unprocessable Entity` ("Kasir sudah memiliki 1 transaksi aktif yang tertahan").
  * Simpan keranjang ke `draft_orders` (tanpa memotong stok).
* [x] `GET /api/orders/held`:
  * Ambil data held transaction milik kasir yang sedang login (jika tidak ada, kembalikan 404).
* [x] `DELETE /api/orders/held`:
  * Hapus draft aktif milik kasir dari `draft_orders` (discard draft).
* [x] `POST /api/orders/held/finalize`:
  * Terima body keranjang terbaru (jika ada perubahan item saat di-resume) atau gunakan data draft yang tersimpan.
  * Jalankan transaksi atomik `db.transaction`:
    1. Lock stok produk `FOR UPDATE` dan validasi kuantitas.
    2. Potong stok di `products`.
    3. Simpan ke `orders` dan `order_items`.
    4. Hapus draft dari `draft_orders`.
    5. Catat log `ORDER_HELD` dan `ORDER_FINALIZED` ke `order_activity_logs`.
    6. Hook ke `audit_logs`.

### 2.3 Frontend UI Mobile-First (`apps/frontend`)
* [x] Integrasikan tombol "Tahan Keranjang (Hold)" pada panel keranjang kasir (`/pos`):
  * Tombol `<Button variant="outline">` dengan icon Lucide `Clock`.
  * Tombol otomatis ter-disable jika kasir sudah memiliki 1 draft aktif.
* [x] Buat **Held Order Pill Indicator** di Top Navbar (`top-navbar.tsx`):
  * Jika kasir memiliki transaksi tertahan, muncul pill kuning berkedip: `"1 Transaksi Tertahan (Klik untuk Melanjutkan)"`.
  * Menekan pill membuka modal konfirmasi: "Lanjutkan Transaksi" (muat keranjang ke kasir) atau "Buang Draft" (icon Lucide `Trash2`).
* [x] Alur Resume: saat keranjang di-resume, kasir dapat mengubah jumlah barang, menambah item, lalu menekan tombol "Bayar Sekarang" seperti transaksi normal.

---

## 3. DEFINITION OF DONE (DOD) CHECKLIST

- [x] Kasir dapat menahan transaksi aktif ke tabel `draft_orders` dan stok fisik tidak terpotong sama sekali.
- [x] Database menolak jika kasir mencoba hold transaksi kedua tanpa menyelesaikan/membuang draft pertama (`UNIQUE user_id`).
- [x] Kasir dapat memuat kembali transaksi tertahan ke keranjang belanja POS.
- [x] Kasir dapat membuang (discard) transaksi tertahan dan draft terhapus dari server.
- [x] Finalisasi transaksi held sukses memotong stok secara atomik, menerbitkan invoice di `orders`, menghapus draft, dan mencatat kronologi di `order_activity_logs`.
- [x] Tabel `orders` tetap 100% bersih dan hanya berisi transaksi yang sudah final lunas.
- [x] Automated Test `TEST-04` lulus 100%.
- [x] Seluruh icon menggunakan `lucide-react` (`Clock`, `Play`, `Trash2`, `AlertCircle`).
- [x] Branch `feature/slice-6-pos-hold-orders` di-merge ke `develop` menggunakan flag `--no-ff`.
- [x] Branch fitur lokal dihapus setelah merge.
