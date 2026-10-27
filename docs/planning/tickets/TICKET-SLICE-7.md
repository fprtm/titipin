# TICKET: SLICE 7 — RIWAYAT TRANSAKSI, DETAIL NOTA & AUDIT TRAIL TERPUSAT
## Titipin POS — Sales Order History, Price Snapshot Invoices & Security Audit Logs

| Metadata | Keterangan |
| :--- | :--- |
| **Ticket ID** | `TICKET-SLICE-7` |
| **Epic Terkait** | `EPIC-05: RIWAYAT, AUDIT DETAIL TRANSAKSI & AUDIT TRAIL` |
| **Target Branch** | `feature/slice-7-history-audit` |
| **Aturan Bisnis** | [BR-002, BR-006, BR-014, BR-015, BR-017](../../product/PRD.md#L45-L75) |
| **Dokumen Acuan** | [ADR-006](../../architecture/ADR/ADR-006-dual-logging-strategy.md), [DATA-MODEL.md Section 3.7 & 3.8](../../architecture/DATA-MODEL.md#L254-L289), [openapi.yaml](../../api/openapi.yaml#L509-L650) |
| **Spesifikasi UI** | [07-orders-history.md](../../design/pages/07-orders-history.md), [08-order-detail.md](../../design/pages/08-order-detail.md), [09-audit-logs.md](../../design/pages/09-audit-logs.md), [COMPONENTS.md](../../design/COMPONENTS.md) |
| **Integration Test** | [TEST-09 (Kasir ditolak 403 saat akses audit logs)](../../product/ACCEPTANCE-CRITERIA.md#L474) |

---

## 1. DESKRIPSI & TUJUAN BISNIS
Menyediakan fitur pencarian riwayat transaksi dengan filter rentang tanggal dan pelanggan, halaman rincian invoice nota resmi yang menampilkan snapshot harga historis dan timeline log aktivitas transaksi, serta modul Audit Trail terpusat khusus Admin untuk menyelidiki seluruh mutasi data write sistem lengkap dengan perbandingan payload JSON diff.

---

## 2. DETAIL TUGAS TEKNIS (TASK BREAKDOWN)

### 2.1 Backend API
* [ ] `GET /api/orders`:
  * Filter query: `from` (tanggal mulai), `to` (tanggal akhir), `customer_id` (uuid), `page`, `per_page`.
  * Join tabel `orders` dengan `customers` (LEFT JOIN untuk walk-in) dan `users`.
  * Kembalikan format standar `OrderListResponse`.
* [ ] `GET /api/orders/:id`:
  * Cari berdasarkan ID atau `order_number`.
  * Ambil detail invoice: header order, rincian barang dari `order_items` (`unit_price` historis), dan timeline kronologi dari `order_activity_logs`.
* [ ] `GET /api/audit-logs` (Admin Only):
  * Filter query: `user_id`, `action`, `entity_type`, `from`, `to`, `page`, `per_page`.
  * Di-guard oleh `RolesGuard` (`@Roles('ADMIN')`) — kasir ditolak 403 Forbidden.
  * Kembalikan entri log dengan detail user agent, IP address, dan payload diff.

### 2.2 Frontend UI Mobile-First (`apps/frontend`)
* [ ] Halaman Riwayat `/orders` mengacu pada `docs/design/pages/07-orders-history.md`:
  * Toolbar: Date range picker (`rounded-xl`), dropdown member, tombol reset filter.
  * Data Table Kaca: nomor nota, tanggal, pelanggan (badge "Pelanggan Umum" untuk walk-in), kasir, total Rp, tombol aksi "Lihat Nota".
* [ ] Halaman Detail Nota `/orders/[id]` mengacu pada `docs/design/pages/08-order-detail.md`:
  * Kartu Nota Kaca (`glass-panel rounded-3xl p-8`): header invoice resmi, tabel rincian item belanja (harga snapshot), total bayar.
  * Komponen Timeline Vertikal (`order_activity_logs`): menampilkan kronologi kejadian transaksi (`ORDER_CREATED`, `ORDER_HELD`, `ORDER_FINALIZED`) dengan icon Lucide `CheckCircle2`, `Clock`, `Play`.
  * Tombol Cetak Nota (Lucide `Printer`) dengan format siap cetak printer thermal.
* [ ] Halaman Audit Trail `/audit-logs` (Admin Only) mengacu pada `docs/design/pages/09-audit-logs.md`:
  * Filter multi-kriteria: staf, aksi, entitas, tanggal.
  * Tabel log audit: timestamp, aktor, kode aksi badge, entitas target, IP address.
  * Modal Inspeksi Diff Payload: menampilkan perbandingan JSON sebelum & sesudah mutasi (`font-mono text-xs rounded-2xl bg-slate-900 text-slate-100 p-5`).
  * Seluruh icon menggunakan `lucide-react` (`Receipt`, `ShieldAlert`, `Printer`, `ArrowLeft`, `Calendar`, `Filter`, `Eye`).

---

## 3. DEFINITION OF DONE (DOD) CHECKLIST

- [x] Pengguna dapat melihat daftar transaksi historis dan memfilter berdasarkan rentang tanggal dan pelanggan.
- [x] Detail transaksi menampilkan harga satuan snapshot historis yang tidak berubah meski harga master produk diubah.
- [x] Detail transaksi menyajikan kronologi kejadian lengkap dari `order_activity_logs`.
- [x] Halaman cetak nota thermal menghasilkan struk rapi tanpa elemen navigasi aplikasi.
- [x] Admin dapat melihat audit trail terpusat dan membuka modal perbandingan JSON diff.
- [x] Kasir diblokir dari endpoint `/api/audit-logs` dan halaman `/audit-logs` dengan respon 403 Forbidden (`TEST-09`).
- [x] Seluruh halaman responsif sempurna di perangkat mobile dan tablet.
- [x] Seluruh icon menggunakan `lucide-react`.
- [x] Branch `feature/slice-7-history-audit` di-merge ke `develop` menggunakan flag `--no-ff`.
- [x] Branch fitur lokal dihapus setelah merge.
