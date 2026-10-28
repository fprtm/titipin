# ADR-007: Sales Analytics & Business Intelligence Engine

| Metadata | Keterangan |
| :--- | :--- |
| **Status** | ACCEPTED |
| **Tanggal** | 28 Oktober 2026 |
| **Pengambil Keputusan** | Fullstack Architecture Team |
| **Konteks** | Kebutuhan fitur Business Intelligence (BI) dan visualisasi tren omset mendalam untuk pemilik toko (Admin) tanpa membebani performa kasir harian |

---

## 1. Konteks & Permasalahan

Halaman dashboard operasional (`/dashboard`) dirancang untuk memuat ringkasan transaksi harian kasir secara cepat (omset, produk terlaris, dan produk stok menipis). Namun, manajemen toko membutuhkan analitik yang jauh lebih mendalam untuk:
1. Memvisualisasikan hubungan korelasi antara nominal omset kotor (*Gross Revenue*) dan volume transaksi kasir secara berkesinambungan.
2. Mengidentifikasi jam-jam tersibuk (*Peak Traffic Hours*) sepanjang 24 jam dan pola hari belanja mingguan (Minggu–Sabtu) untuk optimasi jadwal staf kasir.
3. Melakukan *Market Basket Analysis* (analisis pasangan produk yang sering dibeli bersamaan dalam satu struk) untuk menghasilkan rekomendasi kombo *bundling* hemat guna menaikkan *Average Order Value* (AOV).
4. Menganalisis segmentasi pelanggan (*Member vs Walk-in*) serta efektivitas privilege diskon ulang tahun 5%.

---

## 2. Keputusan yang Diambil

1. **Pemisahan Rute `/analytics` (Admin Only)**:
   - Dibuat modul mandiri `AnalyticsModule` di backend dan rute `/analytics` di frontend dengan proteksi ketat `Role.ADMIN` (`403 Forbidden` untuk Kasir). Hal ini menjaga rute `/dashboard` tetap ringan untuk operasional harian kasir.

2. **Visualisasi Dual-Axis Berkesinambungan dengan Recharts**:
   - Menggunakan library `recharts` (`AreaChart` + `Line`) untuk memadukan area gradien omset (Rp) pada sumbu Y kiri dan garis volume transaksi pada sumbu Y kanan.
   - Komponen chart dibungkus dalam JSX wrapper tanpa menggunakan raw inline `<svg>` pada kode sumber, menjaga kepatuhan 100% audit kualitas monorepo.
   - Disediakan *Custom Glass Tooltip* yang menampilkan rincian omset, transaksi, dan AOV per titik waktu.

3. **Query Efisien Market Basket Analysis**:
   - Query self-join pada tabel `order_items` (`oi1.order_id = oi2.order_id AND oi1.product_id < oi2.product_id`) untuk menghitung frekuensi pembelian bersama (*co-occurrence count*) dan total omset gabungan.
   - Sistem secara otomatis menghitung rekomendasi diskon kombo (10%) untuk mendorong kenaikan unit barang per struk.

4. **Dynamic Actionable Insights Cards**:
   - Backend service menghasilkan kartu rekomendasi cerdas otomatis berdasarkan data riil:
     - *Bundling Promotion Insight* (Kombo produk teratas)
     - *Staffing & Rush Hours Optimization* (Antisipasi antrean kasir pada jam tersibuk)
     - *Customer Loyalty Conversion* (Perbandingan daya beli member vs umum)

---

## 3. Konsekuensi & Dampak

- **Positif**:
  - Pemilik toko memiliki visibilitas penuh atas tren pendapatan dan peluang cross-selling.
  - Pengambilan keputusan berbasis data riil (*data-driven inventory & promotional strategy*).
  - Kasir tidak terdampak beban komputasi analitik berat saat melayani transaksi di POS.
- **Mitigasi**:
  - Query agregasi analitik dioptimalkan dengan filter rentang tanggal (`gte(order_date, startDate)`) dan indeks database pada `order_date` dan `customer_id`.
