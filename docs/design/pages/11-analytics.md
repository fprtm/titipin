# PAGE SPECIFICATION: ANALITIK PENJUALAN & BI (`/analytics`)
## Titipin POS — Sales Analytics & Business Intelligence Dashboard

| Metadata | Keterangan |
| :--- | :--- |
| **Route** | `/analytics` |
| **Akses** | Khusus Admin (`role: ADMIN`) — di-guard oleh client check & JWT role guard |
| **Komponen Utama** | 4 Kartu KPI Utama, Grafik Dual-Axis Recharts, Market Basket Recommendations, Peak Hours Bar, Customer Segmentation Cards |
| **API Terkait** | `GET /api/analytics/overview`, `GET /api/analytics/basket-analysis`, `GET /api/analytics/peak-hours`, `GET /api/analytics/customer-segments` |

---

## 1. STRUKTUR VISUAL & WIREFRAME (ASCII)

```
┌────────────────────────────────────────────────────────────────────────┐
│ HEADER: Analitik & Wawasan Penjualan Toko                              │
│ Subjudul: Metrik mendalam pertumbuhan omset, basket size & peak hours  │
│                                      [Pill: Hari | Bulan | Q | Tahun ] │
│                                                                        │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────────────┐ │
│ │ TOTAL OMSET  │ │ TOTAL ORDER  │ │ RATA KERANJANG││ BARANG TERJUAL  │ │
│ │ Rp 5.420.000 │ │ 70 Transaksi │ │ Rp 77.428    │ │ 184 Unit        │ │
│ │ [glass-card] │ │ [glass-card] │ │ (AOV)        │ │ [glass-card]    │ │
│ └──────────────┘ └──────────────┘ └──────────────┘ └─────────────────┘ │
│                                                                        │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ TREN PENJUALAN & VOLUME TRANSAKSI DUAL-AXIS (glass-panel p-6)      │ │
│ │ Y1 (Kiri): Omset (Rp) [Area Hijau]  | Y2 (Kanan): Transaksi [Garis]│ │
│ │  Rp │       ╭───╮                                          │ Trans │ │
│ │     │    ╭──╯   ╰──╮      ╭────╮                           │       │ │
│ │     └────┴──────┴──┴──────┴────┴───────────                │       │ │
│ │        01  05   10  15   20   25   30 Okt                  │       │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│ ┌──────────────────────────────────┐ ┌───────────────────────────────┐ │
│ │ REKOMENDASI BUNDLING KOMBO       │ │ DISTRIBUSI JAM SIBUK (24 JAM) │ │
│ │ (Market Basket Analysis)         │ │ Peak Hours Analysis           │ │
│ │ • Aqua 600ml + Roti Cokelat (8x) │ │ 11:00 - 13:00 (Makan Siang)   │ │
│ │   Paket Kombo Hemat Rp 7.500     │ │ 17:00 - 19:00 (Pulang Kantor) │ │
│ │ • Indomie + Telur Ayam (5x)      │ │                               │ │
│ └──────────────────────────────────┘ └───────────────────────────────┘ │
│                                                                        │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ SEGMENTASI KONTRIBUSI PELANGGAN (MEMBER VS WALK-IN)                │ │
│ │ • Member Terdaftar: Rp 3.800.000 (70.1% Omset) | 48 Transaksi      │ │
│ │ • Pelanggan Umum:   Rp 1.620.000 (29.9% Omset) | 22 Transaksi      │ │
│ └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. SPESIFIKASI KOMPONEN ANALITIK

### 2.1 Filter Rentang Waktu (`PeriodSwitch`)
* **Pilihan Periode:**
  - `Hari Ini` (`daily`): Menampilkan tren per jam untuk hari berjalan.
  - `Bulan Ini` (`monthly`): Menampilkan tren harian sepanjang bulan berjalan.
  - `Kuartal Ini` (`quarterly`): Menampilkan tren mingguan dalam kuartal berjalan.
  - `Tahun Ini` (`yearly`): Menampilkan tren per bulan sepanjang tahun kalender.
* **Styling:** Pill tab frosted glass `glass-panel rounded-full p-1.5 flex gap-1`.

### 2.2 4 Kartu KPI Utama (`StatCards`)
1. **Total Omset Penjualan:** Akumulasi pendapatan kotor toko dalam format Rupiah lengkap (`formatCurrency`).
2. **Total Transaksi:** Total nota order berstatus *COMPLETED* dalam periode terpilih.
3. **Rata-rata Keranjang (Average Order Value / AOV):** $\frac{\text{Total Omset}}{\text{Total Transaksi}}$, mengukur seberapa besar belanja rata-rata per pelanggan.
4. **Total Barang Terjual:** Akumulasi seluruh kuantitas unit produk fisik yang berpindah ke tangan pelanggan.

### 2.3 Visualisasi Dual-Axis Recharts (`DualAxisSalesChart`)
* **Sumbu Y Kiri (`yAxisId="revenue"`):** Skala omset moneter dengan format kompak (`formatCompactRupiah`, contoh `Rp 2.5jt`, `Rp 800rb`).
* **Sumbu Y Kanan (`yAxisId="orders"`):** Skala jumlah transaksi (integer).
* **Elemen Grafik:**
  - `<Area />` Omset: Gradient emerald translusen tebal (`#059669`).
  - `<Line />` Transaksi: Garis kurva amber tegas (`#d97706`, `strokeWidth={2.5}`) dengan dot indikator.
* **Interaktivitas:** `<GlassChartTooltip />` melayang menampilkan label titik waktu, rincian omset, transaksi, dan AOV.

### 2.4 Rekomendasi Bundling Produk (Market Basket Analysis)
* **Algoritma Afinitas:** Menghitung kemunculan bersama (*co-occurrence*) dua item berbeda dalam satu invoice belanja (`order_id`) dengan frekuensi minimum 2 kali (`pairCount >= 2`).
* **Informasi Rekomendasi:**
  - Pasangan produk (Produk A + Produk B).
  - Frekuensi beli bersama (`X kali dibeli bersama`).
  - Harga normal terpisah vs rekomendasi harga paket kombo hemat (diskon 5% - 10%).
  - Potensi peningkatan pendapatan (*upsell opportunity*).

### 2.5 Analisis Jam Sibuk Toko (Peak Shopping Hours)
* **Visualisasi 24 Jam:** Bar/histogram frekuensi transaksi dari jam 00:00 s.d. 23:00.
* **Highlight Jam Sibuk:** Memberikan penanda visual warna emerald menyala pada jam dengan traffic tertinggi untuk membantu manajemen menyusun jadwal staf kasir.

### 2.6 Kartu Segmentasi Pelanggan (Member vs Walk-in)
* **Kategori:**
  - **Member Terdaftar:** Transaksi dengan relasi `customer_id IS NOT NULL`.
  - **Pelanggan Umum (Walk-in):** Transaksi tanpa relasi member (`customer_id IS NULL`).
* **Metrik Komparasi:** Total nominal omset, persentase pangsa pendapatan (*revenue share*), dan total frekuensi transaksi.
