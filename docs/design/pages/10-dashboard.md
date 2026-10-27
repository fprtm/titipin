# PAGE SPECIFICATION: DASHBOARD & ANALITIK PENJUALAN (`/dashboard`)
## Titipin POS — Executive Dashboard & Store Monitoring Screen

| Metadata | Keterangan |
| :--- | :--- |
| **Route** | `/dashboard` |
| **Akses** | Kasir & Admin (`role: CASHIER` | `ADMIN`) |
| **Komponen Utama** | 4 Kartu KPI Kaca (`rounded-2xl`), Grafik Tren Harian, Panel Top 5 & Bottom 5 |
| **API Terkait** | `GET /api/dashboard/summary`, `GET /api/dashboard/trend` |

---

## 1. STRUKTUR VISUAL & WIREFRAME (ASCII)

```
┌────────────────────────────────────────────────────────────────────────┐
│ HEADER: Ringkasan Performa Finansial Toko                              │
│                                           [Pill: Harian | Bulanan | Q] │
│                                                                        │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────────────┐ │
│ │ TOTAL OMSET  │ │ TOTAL ORDER  │ │ PRODUK JUARA │ │ STOK KRITIS (<5)│ │
│ │ Rp 1.250.000 │ │ 35 Transaksi │ │ Hydrococo    │ │ 2 Produk! (Mer) │ │
│ │ [glass-card] │ │ [glass-card] │ │ (42 Terjual) │ │ [Klik Filter]   │ │
│ └──────────────┘ └──────────────┘ └──────────────┘ └─────────────────┘ │
│                                                                        │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ GRAFIK TREN PENJUALAN HARIAN (glass-panel rounded-3xl p-6)         │ │
│ │ Nominal Omset (Rp) & Volume Transaksi                              │ │
│ │  Rp │        ╭──╮                                                  │ │
│ │     │     ╭──╯  ╰─╮       ╭───                                     │ │
│ │     └───┬───┬───┬───┬───┬───┬───┬───                               │ │
│ │        01  05  10  15  20  25  30 Okt                              │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│ ┌──────────────────────────────────┐ ┌───────────────────────────────┐ │
│ │ TOP 5 PRODUK TERLARIS (glass-c)  │ │ BOTTOM 5 PRODUK LESU (glass-c)│ │
│ │ 1. Hydrococo 150ml (42x)         │ │ 1. Biskuit Kaleng (0 Terjual!)│ │
│ │ 2. Indomie Goreng (38x)          │ │ 2. Kopi Sachet A (0 Terjual!) │ │
│ │ 3. Teh Botol Sosro (25x)         │ │ 3. Sabun Batang B (1 Terjual) │ │
│ └──────────────────────────────────┘ └───────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. SPESIFIKASI KOMPONEN DASHBOARD

1. **Pill Tab Filter Periode (`PeriodSwitch`):**
   * Pilihan: `Hari Ini (daily)`, `Bulan Ini (monthly)`, `Kuartal Ini (quarterly)`.
   * Styling: Capsule `rounded-full p-1.5 glass-panel flex gap-1`.
   * Tab aktif: `bg-emerald-700 text-white font-semibold rounded-full px-4 py-1.5 shadow-sm transition-all`.
2. **4 Kartu Metrik KPI (`StatCard`):**
   * Container: `glass-card p-6 rounded-2xl flex flex-col justify-between`.
   * Nilai nominal diformat Rupiah tebal monospace `tabular-nums font-mono text-2xl font-bold text-slate-900`.
   * Kartu "Stok Kritis": Jika ada produk $<5$, badge berkedip merah. Mengklik kartu ini otomatis mengarahkan ke halaman `/products?filter=low_stock`.
3. **Grafik Tren Penjualan Harian (`SalesTrendChart`):**
   * Menggunakan Recharts ResponsiveContainer di dalam `glass-panel rounded-3xl p-8`.
   * Area Gradient Emerald translusen (`fill="url(#emeraldGradient)"`).
   * Tooltip kaca interaktif yang menampilkan tanggal, nominal omset Rp, dan jumlah transaksi.
4. **Panel Komparasi Produk Juara vs Lesu:**
   * Panel Kiri: 5 Produk terlaris berdasarkan total kuantitas unit terjual dalam periode (`BR-019`).
   * Panel Kanan: 5 Produk aktif dengan penjualan terendah dalam periode terpilih, dengan prioritas produk 0 transaksi ditaruh paling atas (`BR-018`, `BR-019`).
