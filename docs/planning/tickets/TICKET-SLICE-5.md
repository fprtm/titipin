# TICKET: SLICE 5 — CORE POS ENGINE & ATOMIC CONCURRENCY STOCK LOCKING
## Titipin POS — POS Engine, Row-Level Locking, Checkout & Invoice Generation

| Metadata | Keterangan |
| :--- | :--- |
| **Ticket ID** | `TICKET-SLICE-5` |
| **Epic Terkait** | `EPIC-04: TRANSAKSI PENJUALAN KASIR (POINT OF SALE)` |
| **Target Branch** | `feature/slice-5-core-pos-engine` |
| **Aturan Bisnis** | [BR-001, BR-002, BR-003, BR-004, BR-005, BR-013, BR-017](../../product/PRD.md#L45-L75) |
| **Dokumen Acuan** | [ARCHITECTURE.md Section 4.2](../../architecture/ARCHITECTURE.md#L182-L238), [DATA-MODEL.md Section 4.4](../../architecture/DATA-MODEL.md#L384-L437), [openapi.yaml](../../api/openapi.yaml#L516-L540) |
| **Spesifikasi UI** | [03-pos-checkout.md](../../design/pages/03-pos-checkout.md), [COMPONENTS.md](../../design/COMPONENTS.md) |
| **Integration Tests** | [TEST-01, TEST-02, TEST-03, TEST-05](../../product/ACCEPTANCE-CRITERIA.md#L466-L470) |

---

## 1. DESKRIPSI & TUJUAN BISNIS
Mengimplementasikan **jantung operasional POS Titipin**: pemrosesan transaksi penjualan secara atomik di dalam satu database transaction, mengunci baris stok produk (`SELECT ... FOR UPDATE`) untuk mencegah *race condition / overselling*, menghitung harga dan total mutlak di backend, mencatat snapshot harga satuan ke `order_items`, mendukung pelanggan Walk-in (`customer_id = null`) maupun Member, menerbitkan nomor invoice unik (`INV-YYYYMMDD-XXXX`), serta menyediakan antarmuka kasir *split-view* yang cepat dan ergonomis.

---

## 2. DETAIL TUGAS TEKNIS (TASK BREAKDOWN)

### 2.1 Database & Skema Drizzle
* [ ] Buat skema `src/database/schema/orders.schema.ts`:
  * Tabel `orders`: id bigint PK identity, order_number unique varchar(30), customer_id uuid nullable FK ke customers (RESTRICT), created_by uuid FK ke users (RESTRICT), order_date timestamptz, total_amount numeric(14,2).
  * Tabel `order_items`: id bigint PK identity, order_id bigint FK ke orders (CASCADE), product_id bigint FK ke products (RESTRICT), quantity int check (>0), unit_price numeric(12,2) snapshot, subtotal numeric(14,2).
  * Tabel `order_activity_logs`: id bigint PK identity, order_id bigint FK ke orders (CASCADE), action varchar(50), performed_by uuid FK ke users, details jsonb, created_at timestamptz.
* [ ] Jalankan migrasi Drizzle untuk membuat tabel `orders`, `order_items`, dan `order_activity_logs`.

### 2.2 Shared Contracts (`packages/shared`)
* [ ] Buat Zod schema `createOrderSchema`:
  * `customer_id`: string uuid nullable opsional (null = Walk-in).
  * `items`: array non-kosong dari `{ product_id: number, quantity: number (min 1) }`.
* [ ] Buat interface DTO `OrderDetailResponse`, `OrderItemDetail`.

### 2.3 Backend Engine (`apps/backend/src/modules/orders/`)
* [ ] Implementasikan `POST /api/orders` di dalam `db.transaction`:
  1. Panggil `ProductsService.lockAndDeductStock(tx, items)`:
     * Lakukan query `db.select().from(products).where(inArray(products.id, productIds)).for('update')`.
     * Validasi: jika ada produk yang stoknya kurang dari diminta, lemparkan `UnprocessableEntityException` dengan payload error nested standar: `errors["items.X.quantity"] = ["Stok Hydrococo tersisa 3, diminta 5"]`.
  2. Hitung harga satuan dan total tagihan murni dari harga master produk di database (jangan pernah menerima price dari client).
  3. Lakukan pemotongan stok fisik di tabel `products`.
  4. Generate nomor invoice unik berurutan `INV-YYYYMMDD-XXXX`.
  5. Simpan record utama ke tabel `orders`.
  6. Simpan rincian item ke tabel `order_items` dengan mencatat `unit_price` saat ini sebagai snapshot permanen.
  7. Simpan event awal ke tabel `order_activity_logs` (`action = 'ORDER_CREATED'`).
  8. Hook ke `audit_logs` (`ORDER_CREATED`).
  9. Kembalikan detail transaksi lengkap beserta invoice number.

### 2.4 Frontend UI Mobile-First (`apps/frontend/src/app/(dashboard)/pos/`)
* [ ] Bangun layout kasir mengacu pada `docs/design/pages/03-pos-checkout.md`:
  * **Mobile-First Layout:**
    * Di mobile (`<1024px`): Katalog produk tampil penuh; tombol floating bar di bawah menampilkan total keranjang belanja dan icon Lucide `ShoppingCart`; menekan bar membuka keranjang via slide-over `<Sheet />` (`rounded-l-3xl`).
    * Di desktop (`lg:` $\ge 1024px$): Tampil dalam bentuk **Dual-Pane Split Screen** (Katalog 65% + Sticky Cart Drawer 35%).
  * **Quick Catalog:**
    * Search bar otomatis fokus dengan shortcut keyboard `/`.
    * Grid kartu produk kaca (`glass-card rounded-2xl p-5`): nama barang, harga besar, badge stok cerdas (hijau $>10$, kuning $5-10$, merah $<5$, abu-abu habis).
    * Klik kartu langsung memasukkan barang ke keranjang kasir.
  * **Sticky Cart Panel:**
    * Radio toggle pelanggan: "Pelanggan Umum (Walk-in)" (default) vs "Member Terdaftar" (menampilkan combobox autocomplete member).
    * Daftar item keranjang: harga snapshot, `<QuantityStepper />` (`rounded-xl`), tombol hapus Lucide `Trash2`.
    * Total Akhir format Rupiah tebal `text-2xl font-bold font-mono text-emerald-800`.
    * Tombol "Bayar Sekarang (Enter)" (`rounded-2xl h-13 bg-emerald-700 text-white font-bold`).
  * **Modal Pembayaran Tunai:**
    * Tombol pecahan cepat: `[Uang Pas]`, `[Rp 20.000]`, `[Rp 50.000]`, `[Rp 100.000]`, kalkulasi uang kembalian instan.
    * Feedback error stok: jika server merespon 422, modal memunculkan highlight merah pada item yang stoknya kurang.
  * **Modal Struk Nota Berhasil:**
    * Nomor invoice unik, rincian barang, total bayar, tombol "Cetak Struk" Lucide `Printer` dan tombol "Transaksi Baru".

---

## 3. DEFINITION OF DONE (DOD) CHECKLIST

- [x] Transaksi member sukses memotong stok, menyimpan snapshot harga, dan menghasilkan nota (`TEST-01`).
- [x] Transaksi walk-in sukses dengan `customer_id = null` dan label "Pelanggan Umum" (`TEST-02`).
- [x] Concurrency test: jika stok produk 3 dan ada dua kasir meminta 2 unit secara paralel, kasir pertama sukses dan kasir kedua ditolak 422 tanpa ada stok minus (`TEST-03`).
- [x] Transaksi gagal memotong stok sama sekali jika salah satu item melebihi kuantitas yang tersedia (Rollback total).
- [x] Validasi input korup atau kuantitas negatif ditolak dengan status HTTP 422 (`TEST-05`).
- [x] Harga dan total dihitung murni di server — manipulasi payload harga dari client diabaikan.
- [x] Tampilan kasir responsif: dual-pane di desktop, floating sheet drawer di mobile/tablet.
- [x] Seluruh icon menggunakan `lucide-react` (`ShoppingCart`, `Search`, `Plus`, `Minus`, `Trash2`, `Printer`, `CheckCircle2`).
- [x] Branch `feature/slice-5-core-pos-engine` di-merge ke `develop` menggunakan flag `--no-ff`.
- [x] Branch fitur lokal dihapus setelah merge.
