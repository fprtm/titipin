# PAGE SPECIFICATION: KASIR POS & ORDER CHECKOUT (`/pos`)
## Titipin POS — Core Cashier POS Screen & Checkout Engine

| Metadata | Keterangan |
| :--- | :--- |
| **Route** | `/pos` atau `/orders/new` |
| **Akses** | Kasir & Admin (`role: CASHIER` | `ADMIN`) |
| **Layout Pattern** | Dual-Pane Split Screen (Katalog Kiri 65% + Keranjang Kasir Kanan 35%) |
| **API Terkait** | `GET /api/products`, `POST /api/orders`, `POST /api/orders/hold`, `GET /api/orders/held`, `POST /api/orders/held/finalize`, `DELETE /api/orders/held` |

---

## 1. STRUKTUR VISUAL & WIREFRAME (ASCII)

```
┌───────────────────────────────────────────────┬───────────────────────────────┐
│ KATALOG PRODUK CEPAT (65% Layar)              │ KERANJANG KASIR STICKY (35%)  │
│                                               │                               │
│ [ Input Cari Produk / Barcode ( / )         ] │ Pelanggan:                    │
│ [Filter: Semua | Makanan | Minuman | Stok <5] │ (o) Walk-in   ( ) Member      │
│                                               │ [ Cari Member: Budi Santoso ] │
│ ┌──────────────┐ ┌──────────────┐ ┌─────────┐ │ ───────────────────────────── │
│ │ P0001 (Kaca) │ │ P0002        │ │ P0003   │ │ Item Belanjaan:               │
│ │ Hydrococo    │ │ Indomie      │ │ Teh Botol│ │ 1. Hydrococo 150ml           │
│ │ Rp 12.000    │ │ Rp 3.500     │ │ Rp 4.000│ │    Rp 12.000 x [-][ 2 ][+]   │
│ │ [Stok: 10]   │ │ [Stok: 2! Rd]│ │ [Stok:0]│ │    Subtotal: Rp 24.000 [🗑️]  │
│ └──────────────┘ └──────────────┘ └─────────┘ │                               │
│                                               │ 2. Indomie Goreng             │
│                                               │    Rp 3.500 x [-][ 1 ][+]    │
│                                               │    Subtotal: Rp 3.500  [🗑️]  │
│                                               │ ───────────────────────────── │
│                                               │ Total Barang:         3 Unit  │
│                                               │ TOTAL AKHIR:      Rp 27.500   │
│                                               │                               │
│                                               │ ┌───────────┐ ┌─────────────┐ │
│                                               │ │ Tahan Ker │ │ PROSES BAYAR│ │
│                                               │ │ (Hold)    │ │ (Enter)     │ │
│                                               │ └───────────┘ └─────────────┘ │
└───────────────────────────────────────────────┴───────────────────────────────┘
```

---

## 2. PANE KIRI: KATALOG & PENCARIAN CEPAT

### 2.1 Toolbar Pencarian
* **Komponen:** `<SearchInput />` (`rounded-xl h-12`).
* **Shortcut:** Menekan tombol keyboard `F2` (atau `/`) otomatis memindahkan kursor ke kolom pencarian, dilengkapi badge visual `<kbd>F2</kbd>`.
* **Debounced Query:** Pencarian nama atau barcode SKU dengan debounce 300ms ke `GET /api/products?search=...`.

### 2.2 Grid Kartu Produk (`glass-card`)
* **Spesifikasi Kartu:** `p-5 rounded-2xl glass-card flex flex-col justify-between cursor-pointer`.
* **Elemen:**
  * SKU Barcode: `text-xs font-mono text-slate-500 bg-slate-100/80 px-2 py-0.5 rounded-md w-fit`.
  * Nama Produk: `text-sm font-semibold text-slate-800 line-clamp-2 mt-1`.
  * Harga: `text-lg font-bold font-mono text-emerald-800 mt-2`.
  * Badge Stok Cerdas:
    * Stok $> 10$: `<Badge variant="success">Stok: 24</Badge>`
    * Stok $5 - 10$: `<Badge variant="warning">Stok: 7</Badge>`
    * Stok $< 5$: `<Badge variant="destructive">Stok Kritis: 2!</Badge>`
    * Stok $= 0$: Badge abu-abu `Habis`, kartu opacity 50%, unclickable.
* **Aksi Klik:** Mengklik kartu produk otomatis menambahkan 1 kuantitas ke keranjang belanja (atau menambah $+1$ jika barang sudah ada di keranjang).

---

## 3. PANE KANAN: KERANJANG KASIR STICKY

### 3.1 Pemilih Pelanggan (`CustomerSelector`)
* **Radio Pill Switcher:**
  * `Pelanggan Umum (Walk-in)`: `customer_id = null` (pilihan bawaan / default).
  * `Member Terdaftar`: Memunculkan combobox autocomplete pelanggan.
* **Combobox Member:** Mengetik nama member mencari ke `GET /api/customers?search=...`, memilih member menyetel `customer_id = "<uuid>"`.

### 3.2 Daftar Item Keranjang
* Menampilkan daftar produk yang dipilih kasir.
* Setiap baris memuat:
  * Nama barang & kode produk.
  * Harga satuan historis (`unit_price`).
  * `<QuantityStepper />` (`[-] [ kuantitas ] [+]`) dengan kurva `rounded-xl`.
  * Tombol Hapus Baris (`[TrashIcon]` merah lembut).
  * Subtotal baris ($quantity \times unit\_price$).

### 3.3 Baris Tombol Aksi Kasir & Pintasan Keyboard Retail
1. **Tombol "Tahan Keranjang [F8]":**
   * Varian: `<Button variant="outline" className="rounded-xl h-13 flex-1 font-semibold border-amber-300 text-amber-900 bg-amber-50/70 hover:bg-amber-100">`.
   * Dilengkapi badge visual `<kbd>F8</kbd>`.
   * Memanggil `POST /api/orders/hold`.
   * Jika kasir sudah memiliki 1 transaksi tertahan: tombol otomatis `disabled` dengan tooltip "Anda sudah memiliki 1 transaksi tertahan. Selesaikan atau buang draft tersebut terlebih dahulu."
2. **Tombol "Proses Bayar [F9]":**
   * Varian: `<Button variant="default" size="lg" className="rounded-2xl h-13 flex-[2] font-bold text-base bg-emerald-700 hover:bg-emerald-800 text-white shadow-lg shadow-emerald-900/20">`.
   * Dilengkapi badge visual `<kbd>F9</kbd>`.
   * Membuka Modal Konfirmasi Pembayaran.
3. **Pintasan Pembatalan [Esc]:**
   * Menekan tombol `Esc` secara global menutup dialog konfirmasi pembayaran atau dialog struk tanpa mengeksekusi mutasi.

---

## 4. MODAL KONFIRMASI PEMBAYARAN TUNAI

* **Spesifikasi:** `<Dialog />` (`rounded-3xl p-8 max-w-lg glass-panel`).
* **Konten:**
  * Judul: "Konfirmasi Pembayaran Kasir".
  * Ringkasan Total Tagihan: `text-3xl font-bold font-mono text-emerald-800`.
  * Input "Nominal Uang Tunai Diterima":
    * Tombol Cepat Pecahan: `[Uang Pas]`, `[Rp 50.000]`, `[Rp 100.000]`, `[Rp 200.000]`.
    * Input manual: jika kasir menerima pecahan uang lain.
  * Tampilan Kembalian: Otomatis menghitung $Uang\,Diterima - Total\,Tagihan$ secara instan.
* **Penanganan Error Validasi Stok Server (HTTP 422):**
  * Jika server merespon stok kurang (`errors["items.X.quantity"]`):
    * Modal tidak tertutup, melainkan memunculkan peringatan merah menyala di atas tombol:
    * `"Gagal memproses transaksi: Stok Hydrococo 150ml tersisa 3, diminta 5"`.
    * Baris item terkait di keranjang kasir diberi border merah berkedip.

---

## 5. MODAL STRUK NOTA BERHASIL (RECEIPT MODAL)

* **Konten Nota Siap Cetak:**
  * Header Toko: `TITIPIN RETAIL POS — Cabang Utama`.
  * Nomor Invoice: `INV-20261027-0001`.
  * Tanggal: `27 Okt 2026, 14:35 WIB`.
  * Kasir: `Kasir Utama`.
  * Pelanggan: `Budi Santoso (Member)` atau `Pelanggan Umum`.
  * Tabel Rincian Belanja (Nama, Qty, Harga Snapshot, Subtotal).
  * Total Bayar, Uang Diterima, Uang Kembalian.
* **Tombol Aksi:**
  * `<Button variant="outline">Cetak Struk (Thermal)</Button>` (Memicu window.print dengan CSS print thermal).
  * `<Button variant="default">Transaksi Baru</Button>` (Mengosongkan keranjang dan kembali ke state awal).

### 5.1 Spesifikasi Styling Struk Cetak Thermal (`@media print`)
Untuk memastikan cetakan nota kasir rapi pada printer struk thermal (lebar 58mm atau 80mm):
```css
@media print {
  body * {
    visibility: hidden;
  }
  #printable-receipt, #printable-receipt * {
    visibility: visible;
  }
  #printable-receipt {
    position: absolute;
    left: 0;
    top: 0;
    width: 80mm;
    margin: 0;
    padding: 2mm;
    font-family: monospace;
    font-size: 11px;
    line-height: 1.3;
    color: #000000;
    background: #FFFFFF;
  }
}
```
