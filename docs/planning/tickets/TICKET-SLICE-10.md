# TICKET: SLICE 10 — PENINGKATAN PERFORMA, STANDAR ARSITEKTUR & KUALITAS SISTEM
## Titipin POS — POS Hardware Shortcuts, Multi-Sheet Excel Export, Global Toast & Audit Diff Viewer

| Metadata | Keterangan |
| :--- | :--- |
| **Ticket ID** | `TICKET-SLICE-10` |
| **Epic Terkait** | `EPIC-06: SISTEM QUALITY, PERFORMANCE & HARDWARE EXCELLENCE` |
| **Target Branch** | `feature/slice-10-quality-and-performance-upgrade` |
| **Aturan Bisnis** | [BR-002, BR-014, BR-015, BR-017, BR-019](../../product/PRD.md) |
| **Dokumen Acuan** | [ADR-006](../../architecture/ADR/ADR-006-dual-logging-strategy.md), [DATA-MODEL.md](../../architecture/DATA-MODEL.md), [openapi.yaml](../../api/openapi.yaml) |
| **Spesifikasi UI** | [03-pos-checkout.md](../../design/pages/03-pos-checkout.md), [07-orders-history.md](../../design/pages/07-orders-history.md), [09-audit-logs.md](../../design/pages/09-audit-logs.md) |
| **Status** | `Completed` |
| **Integration Test** | Frontend & Backend Vitest Suites, `pnpm audit:quality`, `pnpm audit:links` |

---

## 1. DESKRIPSI & TUJUAN BISNIS
Meningkatkan produktivitas kasir melalui akselerasi shortcut keyboard operasional (`F1` s/d `F4`, `Esc`), fleksibilitas cetak struk thermal untuk printer portable 58mm maupun desktop 80mm, kapabilitas pelaporan manajerial melalui ekspor Excel multi-sheet (`.xlsx`), standardisasi sistem notifikasi modern dengan `ToastProvider` terpusat, serta peningkatan transparansi tata kelola data dengan *Side-by-Side Visual Diff Viewer* pada modul Audit Trail.

---

## 2. DETAIL TUGAS TEKNIS (TASK BREAKDOWN)

### 2.1 Backend API & Excel Multi-Sheet Engine (`apps/backend`)
* [x] Implementasi Use Case `ExportOrdersUseCase`:
  * Menggunakan `exceljs` untuk menghasilkan file `.xlsx` biner.
  * Menerima parameter filter yang sama dengan `GET /api/orders` (`from`, `to`, `customer_id`, `search`).
  * **Sheet 1 ("Rekap Transaksi & Omset")**:
    * Metadata Toko, rentang tanggal laporan, waktu ekspor, total omset IDR, total transaksi, total diskon.
    * Tabel transaksi: No, No. Order, Tanggal/Waktu, Kasir, Nama Pelanggan, Status Member, Subtotal, Diskon, Total Bayar, Metode Bayar.
  * **Sheet 2 ("Rincian Produk Terjual")**:
    * Tabel breakdown per item: No. Order, Tanggal, Kode Produk, Nama Produk, Kategori, Harga Satuan, Qty Terjual, Subtotal.
* [x] Endpoint `GET /api/orders/export`:
  * Controller `OrdersController` & Service `OrdersService`.
  * Set Response Header:
    * `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
    * `Content-Disposition: attachment; filename="Laporan_Penjualan_Titipin_[timestamp].xlsx"`
  * Otorisasi `JwtAuthGuard`.

### 2.2 Frontend UI & UX Enhancements (`apps/frontend`)
* [x] **Shortcut Keyboard Kasir & Hardware Integration** (`/pos`):
  * Listener event keyboard `keydown` pada halaman POS:
    * `F1` / `Space` (di luar input teks): Membuka dialog pembayaran / Checkout.
    * `F2` / `/`: Memfokuskan kursor ke input pencarian / scan barcode produk.
    * `F3`: Membuka modal pemilihan pelanggan (member).
    * `F4`: Memicu konfirmasi penahanan transaksi (*Hold Cart*).
    * `Esc`: Menutup modal aktif / membatalkan dialog.
  * Badge visual shortcut pada tombol UI kasir (misal: `[F1]`, `[F2]`).
* [x] **Pilihan Ukuran Struk Thermal** (`ReceiptModal`):
  * Segmented control toggle ukuran kertas: `58mm (Portable)` dan `80mm (Desktop)`.
  * Menyesuaikan lebar container pratinjau struk dan CSS `@media print` secara dinamis.
  * Mempertahankan preferensi di `localStorage`.
* [x] **Ekspor Laporan Excel** (`/orders`):
  * Tombol "Ekspor Excel" (ikon `FileSpreadsheet` / `Download`) di samping tombol Segarkan.
  * Mengirim request ke `/api/orders/export` dengan filter aktif dan memicu unduhan file `.xlsx`.
* [x] **Global Glass Toast Notification System**:
  * Komponen `ToastProvider` & hook `useToast()` di `apps/frontend/src/providers/toast-provider.tsx`.
  * Animasi floating glassmorphism di pojok kanan atas, auto-dismiss 4 detik, tombol tutup manual, ikon `CheckCircle2`, `AlertCircle`, `Info`, `AlertTriangle`.
  * Integrasi di root layout `apps/frontend/src/app/(dashboard)/layout.tsx`.
* [x] **Skeleton Loading States**:
  * Komponen `Skeleton` (`apps/frontend/src/components/ui/skeleton.tsx`).
  * Menggantikan layout shift saat data pertama kali dimuat.
* [x] **Side-by-Side Visual Diff Viewer** (`/audit-logs`):
  * Modal detail inspeksi log aktivitas `AuditDetailModal`:
    * Tab 1: Tabel 2 kolom (Sebelum vs Sesudah) dengan penyorotan warna hijau (penambahan) dan merah (perubahan).
    * Tab 2: Raw JSON viewer terformat dengan tombol salin.

---

## 3. DEFINITION OF DONE (DOD) CHECKLIST

- [x] Shortcut keyboard `F1` s/d `F4` dan `Esc` berfungsi mulus di halaman POS tanpa memicu default browser hotkeys.
- [x] Struk thermal kasir dapat dialihkan antara format 58mm dan 80mm dengan pratinjau dan cetak yang rapi.
- [x] Tombol "Ekspor Excel" di `/orders` menghasilkan file `.xlsx` multi-sheet dengan format angka IDR yang valid.
- [x] Sistem Global Toast Notifications dapat dipanggil dari mana saja menggunakan `useToast()`.
- [x] Modal Audit Trail Diff Viewer menyajikan perbandingan data Sebelum vs Sesudah secara akurat.
- [x] Seluruh automated test suites lulus 100% tanpa regresi (183 backend tests, 83 frontend tests).
- [x] `pnpm audit:quality` (0 raw SVG, 0 lint, 0 typecheck) dan `pnpm audit:links` lulus 100%.
- [x] Dokumentasi `docs/api/openapi.yaml` dan Master Tickets diperbarui.
