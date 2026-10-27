# PAGE SPECIFICATION: DETAIL NOTA INVOICE (`/orders/[id]`)
## Titipin POS — Official Invoice & Order Activity Log Viewer

| Metadata | Keterangan |
| :--- | :--- |
| **Route** | `/orders/[id]` |
| **Akses** | Kasir & Admin (`role: CASHIER` | `ADMIN`) |
| **Komponen Utama** | Kartu Nota Kaca, Tabel Snapshot Harga, Timeline Order Activity Log |
| **API Terkait** | `GET /api/orders/:id` |

---

## 1. STRUKTUR VISUAL & WIREFRAME (ASCII)

```
┌────────────────────────────────────────────────────────────────────────┐
│ [← Kembali ke Riwayat]                    [ Tombol Cetak Nota (Print) ]│
│                                                                        │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ KARTU NOTA RESMI (glass-panel rounded-3xl p-8)                     │ │
│ │                                                                    │ │
│ │ TITIPIN RETAIL POS                  INVOICE: INV-20261027-0001     │ │
│ │ Status: [ Lunas - Success Badge ]   Tanggal: 27 Okt 2026, 14:35    │ │
│ │ Kasir:  Kasir Utama                 Pelanggan: Budi Santoso        │ │
│ │                                                                    │ │
│ │ ────────────────────────────────────────────────────────────────── │ │
│ │ RINCIAN ITEM BELANJA (PRICE SNAPSHOT):                             │ │
│ │ KODE   NAMA BARANG          QTY   HARGA SNAPSHOT     SUBTOTAL (RP) │ │
│ │ ────── ───────────────────  ────  ──────────────     ───────────── │ │
│ │ P0001  Hydrococo 150ml       2    Rp 12.000          Rp 24.000     │ │
│ │ P0002  Indomie Goreng        1    Rp  3.500          Rp  3.500     │ │
│ │ ────────────────────────────────────────────────────────────────── │ │
│ │ TOTAL PEMBAYARAN:                                    Rp 27.500     │ │
│ │                                                                    │ │
│ │ ────────────────────────────────────────────────────────────────── │ │
│ │ KRONOLOGI AKTIVITAS TRANSAKSI (order_activity_logs):               │ │
│ │ • 14:30 WIB - [Draft Dibuat] Transaksi diinisiasi oleh Kasir Utama │ │
│ │ • 14:31 WIB - [Held] Keranjang ditahan sementara (Customer nambah) │ │
│ │ • 14:34 WIB - [Resumed] Keranjang dilanjutkan kembali              │ │
│ │ • 14:35 WIB - [Finalized] Pembayaran lunas & stok terpotong        │ │
│ └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. INTEGRITAS DATA SNAPSHOT & TIMELINE
* **Integritas Moneter:** Angka harga satuan (`unit_price`) dibaca murni dari kolom tabel `order_items.unit_price`. Sekalipun harga di master produk telah diubah atau produk dihapus, angka di nota ini tidak pernah berubah (`BR-002`).
* **Timeline Aktivitas:** Menampilkan alur kejadian transaksi secara vertikal dengan ikon checklist dan timestamp rapi (`BR-017`).
