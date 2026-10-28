# TICKET: SLICE 11 — ANALITIK PENJUALAN & BUSINESS INTELLIGENCE (BI)
## Titipin POS — Dual-Axis Trends, Market Basket Analysis & Customer Segmentation

| Metadata | Keterangan |
| :--- | :--- |
| **Ticket ID** | `TICKET-SLICE-11` |
| **Epic Terkait** | `EPIC-08: ANALITIK PENJUALAN & BUSINESS INTELLIGENCE LANJUTAN` |
| **Target Branch** | `feature/slice-11-sales-analytics-and-business-intelligence` |
| **Aturan Bisnis** | [BR-019, BR-020](../../product/PRD.md) |
| **Dokumen Acuan** | [ADR-007](../../architecture/ADR/ADR-007-sales-analytics-and-business-intelligence.md), [DATA-MODEL.md](../../architecture/DATA-MODEL.md), [openapi.yaml](../../api/openapi.yaml) |
| **Spesifikasi UI** | [11-analytics.md](../../design/pages/11-analytics.md), [02-app-shell.md](../../design/pages/02-app-shell.md) |
| **Status** | `Completed` |
| **Integration Test** | Analytics Controller & Service Tests, Frontend Vitest Suites, `pnpm audit:quality`, `pnpm audit:links` |

---

## 1. DESKRIPSI & TUJUAN BISNIS
Meningkatkan kapabilitas pengambilan keputusan strategis pemilik toko dan tim manajemen melalui modul Analitik Penjualan & Business Intelligence (`/analytics`). Fitur ini menyajikan visualisasi tren penjualan multi-axis (omset dan volume transaksi), rekomendasi paket kombo pintar berbasis Market Basket Analysis (*co-occurrence pair frequency*), analisis jam sibuk belanja toko 24 jam untuk perencanaan shift staf kasir, serta segmentasi kontribusi omset antara Pelanggan Terdaftar (Member) dan Pelanggan Umum (*Walk-in*).

---

## 2. DETAIL TUGAS TEKNIS (TASK BREAKDOWN)

### 2.1 Backend API & BI Analytics Engine (`apps/backend`)
* [x] Inisialisasi Modul `AnalyticsModule`:
  * Controller: `AnalyticsController` dengan proteksi `JwtAuthGuard` dan `RolesGuard(Role.ADMIN)`.
  * Service: `AnalyticsService` yang mengeksekusi agregasi SQL Drizzle efisien.
* [x] Endpoint `GET /api/analytics/overview`:
  * Menerima query parameter `period` (`daily`, `monthly`, `quarterly`, `yearly`) atau `from` & `to`.
  * Menghitung `totalRevenue`, `totalOrders`, `averageOrderValue` (AOV), dan `totalUnitsSold`.
  * Menghasilkan array tren multi-axis (`revenue`, `transactions`, `aov`) per interval waktu.
* [x] Endpoint `GET /api/analytics/basket-analysis`:
  * Query self-join pada `order_items` untuk mendeteksi pasangan produk yang dibeli bersamaan pada `order_id` yang sama.
  * Memfilter frekuensi kemunculan bersama minimal 2 kali (`pairCount >= 2`).
  * Mengkalkulasi estimasi harga kombo diskon 5% s/d 10% dan potensi peningkatan omset.
* [x] Endpoint `GET /api/analytics/peak-hours`:
  * Agregasi ekstrak jam (`EXTRACT(HOUR FROM order_date)`) dari jam 00:00 s.d. 23:00.
  * Memetakan volume order dan nominal omset per jam, serta mengidentifikasi rentang jam tersibuk.
* [x] Endpoint `GET /api/analytics/customer-segments`:
  * Agregasi data belanja berdasarkan `customer_id IS NOT NULL` (Member) vs `customer_id IS NULL` (Walk-in).
  * Menghitung persentase kontribusi omset (*revenue share*) dan persentase transaksi.

### 2.2 Frontend UI & Visualisasi Recharts (`apps/frontend`)
* [x] Halaman Khusus `/analytics` (`apps/frontend/src/app/(dashboard)/analytics/page.tsx`):
  * Guard sisi klien: hanya dapat diakses pengguna dengan role `ADMIN`.
  * Filter capsule rentang waktu: "Hari Ini", "Bulan Ini", "Kuartal Ini", "Tahun Ini".
  * 4 Kartu KPI Metrik kaca (`StatCard`): Total Omset, Total Transaksi, AOV, dan Total Barang Terjual.
  * Grafik Tren Dual-Axis Recharts (`ResponsiveContainer`):
    * Sumbu Y Kiri: Area gradient emerald untuk nominal omset (Rupiah).
    * Sumbu Y Kanan: Line kurva amber untuk volume transaksi.
    * Tooltip kaca kustom (`GlassChartTooltip`).
  * Bagian Rekomendasi Bundling (Market Basket Analysis) dengan kartu paket hemat kombo.
  * Bagian Distribusi Jam Belanja Sibuk (Peak Hours) 24 jam dengan penanda jam tersibuk.
  * Kartu Segmentasi Pelanggan (Member vs Walk-in) dengan progress bar kontribusi.
* [x] Pembersihan Shell & Navigasi:
  * Menghapus pill status terminal yang tidak diperlukan (`Terminal 01 • Aktif`) dari header top navbar.
  * Menambahkan tautan menu "Analitik Penjualan" (ikon `BarChart3`) pada Sidebar khusus role Admin.

---

## 3. DEFINITION OF DONE (DOD) CHECKLIST

- [x] Rute `/analytics` dan 4 sub-endpoint analitik berfungsi mulus dan aman di bawah otorisasi Admin.
- [x] Visualisasi dual-axis Recharts menampilkan Area omset dan Line transaksi secara proporsional.
- [x] Algoritma Market Basket Analysis menghasilkan rekomendasi bundling produk yang valid (frekuensi $\ge 2$).
- [x] Distribusi jam belanja sibuk memetakan data transaksi 24 jam secara akurat.
- [x] Status terminal di navbar telah dihapus dan menu analitik terintegrasi di sidebar.
- [x] Unit dan integration tests analitik lulus 100%.
- [x] `pnpm audit:quality` dan `pnpm audit:links` lulus 100%.
