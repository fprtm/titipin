# PAGE SPECIFICATION: KATALOG & INVENTARIS PRODUK (`/products`)
## Titipin POS — Product Catalog, Inventory & Excel Management

| Metadata | Keterangan |
| :--- | :--- |
| **Route** | `/products` |
| **Akses** | Read: Kasir & Admin; Write: Admin Only (`role: ADMIN`) |
| **Komponen Utama** | Data Table Kaca, Modal Tambah/Edit Produk, Modal Import Excel, Tombol Export |
| **API Terkait** | `GET /api/products`, `POST /api/products`, `PUT /api/products/:id`, `DELETE /api/products/:id`, `GET /api/products/export`, `POST /api/products/import` |

---

## 1. STRUKTUR VISUAL & WIREFRAME (ASCII)

```
┌────────────────────────────────────────────────────────────────────────┐
│ HEADER: Katalog Produk & Inventaris Toko                               │
│                                                                        │
│ ┌───────────────────────────┐ ┌─────────────┐ ┌────────┐ ┌───────────┐ │
│ │ [Cari nama / kode...]     │ │ [Urut: Nama]│ │ Export │ │ Import*   │ │
│ └───────────────────────────┘ └─────────────┘ └────────┘ └───────────┘ │
│                                                          ┌───────────┐ │
│                                                          │ + Produk* │ │
│                                                          └───────────┘ │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ TABEL PRODUK (glass-panel rounded-2xl)                             │ │
│ │ KODE   NAMA PRODUK         HARGA (RP)   STOK     TANGGAL   AKSI    │ │
│ │ ────── ─────────────────── ─────────── ──────── ───────── ──────── │ │
│ │ P0001  Hydrococo 150ml     Rp 12.000   [ 10 Hij] 21/10/26  [Edit]🗑│ │
│ │ P0002  Indomie Goreng      Rp  3.500   [ 2! Mer] 21/10/26  [Edit]🗑│ │
│ │ P0003  Susu Ultra 250ml    Rp  7.000   [ 0 Abu ] 21/10/26  [Edit]🗑│ │
│ │ ────────────────────────────────────────────────────────────────── │ │
│ │ Menampilkan 1 - 10 dari 57 data          [Prev] [1] [2] [3] [Next] │ │
│ └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. SPESIFIKASI MODAL TAMBAH / UBAH PRODUK (ADMIN ONLY)

* **Trigger:** Tombol `+ Tambah Produk Baru` (`rounded-xl h-11 bg-emerald-700 text-white font-medium`).
* **Container:** `<Dialog />` (`rounded-3xl p-8 max-w-lg glass-panel`).
* **Form Field:**
  1. `Kode Produk (product_code)`: Text input (`rounded-xl h-11`), uppercase, wajib unik (contoh: `P0025`).
  2. `Nama Produk (product_name)`: Text input (`rounded-xl h-11`), maksimal 150 karakter.
  3. `Harga Satuan (price)`: Numeric input dengan prefix `Rp`, wajib $> 0$.
  4. `Stok Fisik Awal (stock)`: Number input, wajib $\ge 0$.
* **Validasi Client:** Zod Schema `CreateProductInput`.
* **Feedback:** Toast hijau melayang `Produk Hydrococo berhasil ditambahkan`.

---

## 3. SPESIFIKASI MODAL IMPORT EXCEL / CSV (IDEMPOTEN)

* **Trigger:** Tombol `Import Excel` (`rounded-xl h-11 variant="outline"`).
* **Container:** `<Dialog />` (`rounded-3xl p-8 max-w-xl glass-panel`).
* **Komponen:**
  1. Area Drag & Drop File:
     * Area batas putus-putus bergelombang `border-2 border-dashed border-emerald-300 rounded-2xl p-8 text-center bg-emerald-50/30 hover:bg-emerald-50/60 transition-all cursor-pointer`.
     * Icon Lucide `FileSpreadsheet` emerald besar.
     * Teks panduan: `Tarik & lepas file .xlsx atau .csv ke sini, atau klik untuk memilih file`.
  2. Link Unduh Template Contoh:
     * Teks bantuan: `<a href="...">Unduh Template Format Produk (.xlsx)</a>`.
  3. Kartu Ringkasan Hasil Import (`ImportSummaryCard`):
     * Muncul setelah upload berhasil diproses server:
     * Grid 4 Kolom: *Total Baris, Ditambahkan (Baru), Diperbarui (Update), Gagal*.
     * Menjelaskan prinsip idempoten: produk dengan `product_code` yang sudah ada diperbarui harganya/stoknya tanpa membuat duplikat (`BR-009`).

---

## 4. AKSI HAPUS PRODUK (SOFT DELETE)
* Mengklik icon sampah merah pada baris produk membuka dialog konfirmasi bahaya:
  * "Yakin ingin menghapus produk ini? Produk tidak akan bisa dipilih lagi untuk transaksi baru, namun histori penjualan masa lalu tetap aman."
  * Tombol Konfirmasi: `<Button variant="destructive" className="rounded-xl">Ya, Hapus Produk</Button>`.
  * Memanggil `DELETE /api/products/:id` (menyimpan timestamp `deleted_at = NOW()`).
