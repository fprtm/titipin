# TICKET: SLICE 8 — DASHBOARD ANALITIK PENJUALAN & MONITORING INVENTARIS
## Titipin POS — Financial KPIs, Sales Trend Charts & Stock Alerts

| Metadata | Keterangan |
| :--- | :--- |
| **Ticket ID** | `TICKET-SLICE-8` |
| **Epic Terkait** | `EPIC-06: DASHBOARD ANALITIK & MONITORING` |
| **Target Branch** | `feature/slice-8-dashboard-analytics` |
| **Aturan Bisnis** | [BR-018, BR-019](../../product/PRD.md#L75-L85) |
| **Dokumen Acuan** | [PRD.md Section 3.1 Item 7](../../product/PRD.md#L95-L101), [openapi.yaml](../../api/openapi.yaml#L650-L730) |
| **Spesifikasi UI** | [10-dashboard.md](../../design/pages/10-dashboard.md), [COMPONENTS.md](../../design/COMPONENTS.md) |
| **Integration Test** | [TEST-10 (Kalkulasi metrik dashboard & slow-moving products)](../../product/ACCEPTANCE-CRITERIA.md#L475) |

---

## 1. DESKRIPSI & TUJUAN BISNIS
Menyajikan ringkasan metrik performa finansial toko (akumulasi total omset dan jumlah transaksi) dengan switch filter periode Harian, Bulanan, dan Kuartalan, grafik tren penjualan interaktif, panel 5 produk terlaris (*best sellers*), panel 5 produk penjualan lesu (*slow performers* dengan prioritas produk 0 penjualan ditaruh paling atas), serta peringatan stok kritis ($<5$) untuk mencegah kehabisan stok fisik di toko.

---

## 2. DETAIL TUGAS TEKNIS (TASK BREAKDOWN)

### 2.1 Backend API (`apps/backend/src/modules/dashboard/`)
* [x] `GET /api/dashboard/summary?period=daily|monthly|quarterly`:
  * Tentukan rentang waktu server:
    * `daily`: 00:00:00 s/d 23:59:59 hari ini.
    * `monthly`: tanggal 1 s/d akhir bulan kalender saat ini.
    * `quarterly`: kuartal kalender berjalan (Q1: Jan-Mar, Q2: Apr-Jun, Q3: Jul-Sep, Q4: Okt-Des).
  * Hitung agregasi: `total_transactions` (count orders) dan `total_sales_amount` (sum `total_amount`).
  * Top 5 Best Sellers: query 5 produk aktif dengan total kuantitas unit terjual tertinggi di `order_items` dalam periode.
  * Bottom 5 Slow Movers: query 5 produk aktif dengan total unit terjual terendah dalam periode, prioritaskan produk dengan 0 transaksi di posisi teratas (`BR-018`).
  * Peringatan Stok Kritis: query produk aktif yang memiliki `stock < 5` (tidak terikat filter periode).
* [x] `GET /api/dashboard/trend?period=daily|monthly|quarterly`:
  * Return array data harian: `{ date, transactions, revenue }` untuk periode terpilih.

### 2.2 Frontend UI Mobile-First (`apps/frontend`)
* [x] Bangun halaman `/dashboard` mengacu pada `docs/design/pages/10-dashboard.md`:
  * Header & Period Switch: Pill capsule (`rounded-full p-1.5 glass-panel`) dengan pilihan `Hari Ini`, `Bulan Ini`, `Kuartal Ini`.
  * Baris 1: 4 Kartu KPI Kaca (`glass-card rounded-2xl p-6`):
    * Total Omset Penjualan (format Rupiah tebal monospace `text-2xl lg:text-3xl font-bold font-mono`).
    * Total Transaksi.
    * Produk Terlaris Periode.
    * Peringatan Stok Kritis (badge berkedip merah jika ada produk $<5$, klik kartu memfilter produk).
  * Baris 2: Grafik Tren Penjualan Harian:
    * Menggunakan Recharts ResponsiveContainer di dalam `glass-panel rounded-3xl p-6 lg:p-8`.
    * Area gradient emerald translusen dengan tooltip interaktif.
  * Baris 3: Dua Panel Komparasi Kaca (`glass-card rounded-2xl p-6`):
    * Panel Kiri: Top 5 Produk Terlaris (nama, kuantitas terjual, kontribusi nominal omset).
    * Panel Kanan: Bottom 5 Produk Lesu (prioritas produk 0 penjualan).
  * Seluruh icon menggunakan `lucide-react` (`LayoutDashboard`, `TrendingUp`, `Receipt`, `AlertTriangle`, `Award`, `ArrowDownRight`).

---

## 3. DEFINITION OF DONE (DOD) CHECKLIST

- [x] Filter periode (Harian, Bulanan, Kuartalan) mengubah metrik kartu dan grafik tren secara real-time.
- [x] Kalkulasi omset dan total transaksi akurat sesuai data di tabel `orders`.
- [x] Top 5 Produk Terlaris dan Bottom 5 Produk Lesu ter-render dengan benar (produk 0 penjualan muncul di urutan pertama pada panel lesu).
- [x] Kartu peringatan stok kritis menampilkan jumlah produk dengan stok $<5$.
- [x] Grafik tren Recharts responsif sempurna di perangkat mobile ponsel, tablet, dan desktop.
- [x] Seluruh icon menggunakan `lucide-react`.
- [x] Branch `feature/slice-8-dashboard-analytics` di-merge ke `develop` menggunakan flag `--no-ff`.
- [x] Branch fitur lokal dihapus setelah merge.
