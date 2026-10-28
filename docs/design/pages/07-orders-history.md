# PAGE SPECIFICATION: RIWAYAT TRANSAKSI (`/orders`)
## Titipin POS — Sales Order History & Filtering Screen

| Metadata | Keterangan |
| :--- | :--- |
| **Route** | `/orders` |
| **Akses** | Kasir & Admin (`role: CASHIER` | `ADMIN`) |
| **Komponen Utama** | Data Table Riwayat, Filter Rentang Tanggal, Filter Pelanggan |
| **API Terkait** | `GET /api/orders` |

---

## 1. STRUKTUR VISUAL & WIREFRAME (ASCII)

```
┌────────────────────────────────────────────────────────────────────────┐
│ HEADER: Riwayat Transaksi Penjualan Toko                               │
│                                                                        │
│ ┌───────────────────────┐ ┌──────────────────────┐ ┌─────────────────┐ │
│ │ [Dari: 01/10/2026   ] │ │ [Sampai: 31/10/2026] │ │ [Semua Member ] │ │
│ └───────────────────────┘ └──────────────────────┘ └─────────────────┘ │
│                                                                        │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ TABEL RIWAYAT TRANSAKSI (glass-panel rounded-2xl)                  │ │
│ │ NO. ORDER          TANGGAL & WAKTU    PELANGGAN      TOTAL (RP)    │ │
│ │ ────────────────── ────────────────── ────────────── ──────────── │ │
│ │ INV-20261027-0001  27/10/26 14:35 WIB Budi Santoso   Rp 27.500     │ │
│ │ INV-20261027-0002  27/10/26 15:10 WIB [Umum - Info]  Rp 12.000     │ │
│ │ INV-20261026-0008  26/10/26 18:20 WIB Siti Aminah    Rp 68.000     │ │
│ │ ────────────────────────────────────────────────────────────────── │ │
│ │ Menampilkan 1 - 10 dari 84 transaksi      [Prev] [1] [2] [3] [Next]│ │
│ └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. SPESIFIKASI FILTER TOOLBAR

1. **Pencarian Cepat Debounced (`search`):**
   * Input teks pencarian nomor invoice (`INV-...`) atau nama pelanggan dengan debounce 300ms.
   * Query dipercepat oleh indeks GIN Trigram PostgreSQL `idx_orders_number_trgm`.
2. **Date Range Picker (`from` & `to`):**
   * Dua input tanggal kalender terintegrasi format Indonesia `YYYY-MM-DD`.
   * Memfilter transaksi berdasarkan `orders.order_date`.
3. **Combobox Filter Pelanggan (`customer_id`):**
   * Pilihan dropdown: "Semua Pelanggan (Default)", "Khusus Pelanggan Umum (Walk-in)", atau pilih member tertentu.
4. **Tombol "Ekspor Excel":**
   * Mengunduh rekap riwayat transaksi ke berkas `.xlsx` biner multi-sheet (Sheet 1: Rekap Transaksi & Sheet 2: Rincian Produk).
5. **Tombol "Buka Nota" (Action):**
   * Navigasi langsung ke `/orders/[id]` untuk memeriksa invoice detail dan timeline log aktivitas transaksi.
