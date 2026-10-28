# REUSABLE COMPONENT SPECIFICATIONS
## Titipin POS — UI Component Catalog & Interactive States

| Metadata | Keterangan |
| :--- | :--- |
| **Dokumen ID** | `DS-COMPONENTS-001` |
| **Versi** | `1.1.0` |
| **Status** | APPROVED FOR IMPLEMENTATION |
| **Styling Foundation** | Radix UI Headless, Tailwind CSS, Frosted Glass, Prominent Rounded (`rounded-xl` / `rounded-2xl` / `rounded-3xl`) |
| **Iconography Standard** | **STRICT: `lucide-react` ONLY** (Dilarang keras inline SVG hardcode atau emoji sebagai icon) |
| **Layout Standard** | **STRICT: Mobile-First Responsive** (Base mobile `<640px>`, Tablet `md:768px`, Desktop `lg:1024px`) |
| **Accessibility Target** | WCAG 2.1 AA (Keyboard Navigation, ARIA Attributes, Focus Visible) |

---

## 0. STANDAR KONSISTENSI & ATURAN KERAS (STRICT RULES)

1. **Aturan Ikonografi Resmi (`lucide-react`):**
   * **DILARANG KERAS** menggunakan inline raw SVG `<svg>...</svg>` yang di-hardcode dalam kode komponen atau emoji Unicode (seperti 🗑️, 🛒, 🔍) sebagai icon interface.
   * Seluruh ikon antarmuka wajib diimpor langsung dari paket resmi `lucide-react` (misal: `import { Search, ShoppingCart, Trash2, Plus, Minus, Eye, EyeOff, Loader2 } from 'lucide-react'`).
   * Ukuran default ikon: `w-4 h-4` (ukuran kompak) atau `w-5 h-5` (ukuran default), dengan `strokeWidth={2}`.
2. **Aturan Desain Mobile-First:**
   * Seluruh kelas Tailwind CSS ditulis dengan filosofi **Mobile-First**: kelas dasar (*base classes*) tanpa prefix berlaku untuk layar mobile ponsel (`< 640px`), kemudian ditingkatkan secara bertahap menggunakan prefix breakpoint `sm:` ($\ge 640px$), `md:` ($\ge 768px$), dan `lg:` ($\ge 1024px$).
   * Pada mobile, drawer keranjang belanja kasir ditampilkan sebagai bottom sheet geser ke atas (`Sheet` dari bawah/samping), sedangkan pada desktop tampil sebagai panel permanen di sebelah kanan (*dual-pane split view*).

---

## 1. KATALOG KOMPONEN REUSABLE

---

### 1.1 `Button` (`components/ui/button.tsx`)
Komponen tombol interaktif dengan kurva sudut `rounded-xl` (12px) dan padding horizontal lega.

* **Elemen Dasar:** `<button>` HTML native yang dibungkus oleh Radix Slot (`@radix-ui/react-slot`).
* **Variants:**
  * `default`: `bg-emerald-700 text-white hover:bg-emerald-800 shadow-sm active:scale-[0.98]`
  * `glass`: `glass-card text-slate-800 hover:bg-white/90 active:scale-[0.98]`
  * `secondary`: `bg-slate-100 text-slate-900 hover:bg-slate-200`
  * `outline`: `border-1.5 border-slate-200 bg-transparent text-slate-700 hover:bg-white/70`
  * `destructive`: `bg-rose-600 text-white hover:bg-rose-700 active:scale-[0.98]`
  * `ghost`: `bg-transparent text-slate-700 hover:bg-slate-100/70`
* **Sizes:**
  * `sm`: `h-9 px-3.5 text-xs rounded-lg gap-1.5`
  * `default`: `h-11 px-5 text-sm font-medium rounded-xl gap-2` (Tinggi 44px ramah klik)
  * `lg` (Checkout POS): `h-13 px-8 text-base font-semibold rounded-2xl gap-2.5` (Tinggi 52px)
  * `icon`: `h-11 w-11 rounded-xl`
* **Interactive States:**
  * *Hover:* Transisi halus `transition-all duration-200 ease-out`.
  * *Active:* Feedback taktil mikro `active:scale-[0.98]`.
  * *Focus-Visible:* Ring ganda `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2`.
  * *Loading (`isLoading: true`):* `disabled:opacity-75 disabled:pointer-events-none`, menampilkan icon Lucide `Loader2` berputar.

---

### 1.2 `Badge` (`components/ui/badge.tsx`)
Indikator visual berbentuk kapsul lonjong (`rounded-full`) untuk status stok, status akun, dan role pengguna.

* **Struktur:** `inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full border backdrop-blur-sm`.
* **Variants:**
  * `success`: `bg-emerald-50/80 border-emerald-300 text-emerald-800` (Stok aman $>10$, Akun Aktif, Order Berhasil).
  * `warning`: `bg-amber-50/80 border-amber-300 text-amber-800` (Stok menipis $5–10$, Transaksi Held).
  * `destructive`: `bg-rose-50/80 border-rose-300 text-rose-800 animate-pulse` (Stok kritis $<5$, Stok Habis, Akun Nonaktif).
  * `info`: `bg-sky-50/80 border-sky-300 text-sky-800` (Pelanggan Walk-in, Role ADMIN).
  * `neutral`: `bg-slate-100/80 border-slate-300 text-slate-700` (SKU Barcode, Role CASHIER).

---

### 1.3 `Input` & `SearchInput` (`components/ui/input.tsx`)
Elemen input form dengan kurva `rounded-xl`, latar kaca translusen, dan padding tinggi 44px.

* **Struktur `Input`:**
  * `glass-input w-full h-11 px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none`.
* **Struktur `SearchInput`:**
  * Container relatif dengan icon Lucide `Search` di sisi kiri (`pl-11`).
  * Badge keyboard shortcut di sisi kanan: `<kbd className="px-2 py-0.5 text-xs font-mono bg-slate-100 text-slate-500 rounded-md border border-slate-200">[/]</kbd>`.
* **States:**
  * *Default:* Border slate-200 translusen.
  * *Focus:* Border emerald-700 dengan glow ring 4px (`rgba(15, 118, 110, 0.15)`).
  * *Error (`aria-invalid="true"`):* Border rose-500 dengan ring merah dan pesan error di bawahnya.

---

### 1.4 `QuantityStepper` (`components/pos/quantity-stepper.tsx`)
Komponen spesifik kasir POS untuk mengatur kuantitas belanjaan secara cepat.

* **Layout Container:** `glass-card inline-flex items-center p-1 rounded-xl border border-slate-200 shadow-sm`.
* **Tombol Minus `[-]`:**
  * Ukuran `h-8 w-8 rounded-lg flex items-center justify-center bg-white hover:bg-slate-100 text-slate-700 active:scale-95 transition-all`.
* **Input Angka Tengah:**
  * `w-12 h-8 text-center font-mono font-bold text-sm bg-transparent border-0 focus:outline-none tabular-nums`.
* **Tombol Plus `[+]`:**
  * Ukuran `h-8 w-8 rounded-lg flex items-center justify-center bg-white hover:bg-emerald-50 text-emerald-800 active:scale-95 transition-all`.
* **Behavior:**
  * Menekan `[-]` saat kuantitas 1 memicu modal konfirmasi hapus item dari keranjang atau langsung menghapus jika dikonfigurasi.
  * Menekan `[+]` saat stok maksimal tercapai: menampilkan toast peringatan `Stok produk Hydrococo hanya tersisa 10`.

---

### 1.5 `DataTable` (`components/ui/data-table.tsx`)
Tabel data inventaris dan riwayat dengan sudut luar melengkung `rounded-2xl` dan header kaca lengket (*sticky glass header*).

* **Container Pembungkus:** `glass-panel rounded-2xl overflow-hidden border border-slate-200/80 shadow-sm`.
* **Header Baris:** `glass-table-header px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider`.
* **Baris Data (`TableRow`):**
  * Padding sel: `px-5 py-3.5 text-sm text-slate-700`.
  * Hover: `hover:bg-emerald-50/40 transition-colors`.
  * Pemisah baris: `border-b border-slate-100/80`.
* **Tabular Formatting:**
  * Kolom harga, stok, dan tanggal otomatis diformat dengan kelas `tabular-nums font-mono text-right` untuk kolom moneter.
* **Footer Paginasi:**
  * Terintegrasi di dasar tabel: info `Menampilkan 1-10 dari 57 data` + tombol navigasi `[Sebelumnya]` `[1]` `[2]` `[Selanjutnya]`.

---

### 1.6 `Dialog` & `AlertDialog` (`components/ui/dialog.tsx`)
Modal jendela dialog dengan kurva sudut besar `rounded-3xl` (24px) dan padding lega `p-8`.

* **Backdrop:** `fixed inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity animate-in fade-in`.
* **Panel Konten Modal:**
  * `glass-panel fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg p-8 rounded-3xl shadow-2xl border border-white/80 animate-in zoom-in-95 duration-200`.
* **Struktur:**
  * Header: Judul `text-xl font-semibold text-slate-900` + Tombol Tutup `[X]` (`rounded-full h-8 w-8`).
  * Body: `space-y-5 my-6 text-sm text-slate-600`.
  * Footer Aksi: `flex justify-end gap-3 pt-4 border-t border-slate-100`.

---

### 1.7 `Sheet` / Drawer POS (`components/ui/sheet.tsx`)
Layar geser samping (*slide-over drawer*) untuk keranjang kasir pada layar tablet / mobile.

* **Kurva:** Sudut sisi kiri melengkung besar `rounded-l-3xl` (24px).
* **Backdrop:** `bg-slate-900/40 backdrop-blur-sm`.
* **Surface:** `glass-panel w-full sm:max-w-md h-full p-6 sm:p-8 flex flex-col justify-between`.

---

### 1.8 `Combobox` Member Autocomplete (`components/ui/combobox.tsx`)
Dropdown pencarian pelanggan di kasir POS berbasis Popover Radix UI.

* **Trigger Button:** `glass-input w-full flex items-center justify-between px-4 h-11 text-sm rounded-xl`.
* **Menu Popover:** `glass-panel mt-2 p-2 rounded-2xl shadow-xl max-h-60 overflow-y-auto`.
* **Item Pencarian:**
  * Baris item: `px-3.5 py-2.5 rounded-xl text-sm flex items-center justify-between hover:bg-emerald-50 hover:text-emerald-900 cursor-pointer`.
  * Highlight nama pelanggan dan nomor telepon.

---

### 1.9 `StatCard` (`components/dashboard/stat-card.tsx`)
Kartu metrik performa toko di dashboard dengan efek kaca dan sudut `rounded-2xl`.

* **Container:** `glass-card p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between`.
* **Header Kartu:**
  * Label metrik `text-sm font-medium text-slate-500`.
  * Icon Container: `h-10 w-10 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-700`.
* **Angka Utama:** `text-2xl lg:text-3xl font-bold font-mono tabular-nums text-slate-900 mt-2`.
* **Sub-keterangan:** Indikator tren persentase atau perbandingan periode sebelumnya.

---

### 1.10 `Skeleton` (`components/ui/skeleton.tsx`)
Placeholder pemuatan tanpa pergeseran tata letak (*Zero Layout Shift*).

* **Styling:** `bg-slate-200/60 animate-pulse rounded-xl`.
* **Komposisi:**
  * Kartu Produk Skeleton: Kotak gambar `h-32 rounded-xl`, teks nama `h-4 w-3/4`, harga `h-6 w-1/2`.
  * Tabel Skeleton: 5 baris strip `h-12 w-full rounded-xl mb-2`.

---

### 1.11 `SonnerToast` (`components/ui/sonner.tsx`)
Notifikasi mengambang di pojok kanan bawah.

* **Surface:** `glass-panel rounded-2xl p-4 shadow-xl border border-white/80`.
* **Jenis:**
  * *Success:* Icon checklist hijau zamrud + pesan ringkas.
  * *Error Validasi:* Icon silang merah + daftar rincian error per-item.

---

### 1.12 `DropdownMenu` (`components/ui/dropdown-menu.tsx`)
Menu opsi pada user profil kasir atau menu aksi tabel.

* **Menu Container:** `glass-panel p-2 rounded-2xl shadow-xl min-w-[200px] border border-white/80 animate-in fade-in-80 zoom-in-95`.
* **Menu Item:** `flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-slate-700 rounded-xl hover:bg-emerald-50 hover:text-emerald-900 cursor-pointer transition-colors`.

---

### 1.13 `KeyboardShortcutBadge` (`kbd`)
Indikator tombol pintas keyboard kasir retail (`F2`, `F8`, `F9`, `Esc`).

* **Styling:** `inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded bg-slate-100 text-slate-600 border border-slate-300 shadow-xs`.
* **Penggunaan:** Dipasang di sisi dalam input pencarian (`F2`), tombol tahan keranjang (`F8`), dan tombol proses bayar (`F9`).

---

### 1.14 `DualAxisChart` (Recharts)
Visualisasi multi-axis pada modul `/analytics` untuk memetakan dinamika pendapatan dan volume pesanan.

* **Container:** `glass-panel p-6 rounded-3xl`.
* **Karakteristik:** Dual independent Y-axes (Kiri: Omset format Rupiah kompak, Kanan: Integer kuantitas transaksi), CartesianGrid dashed lembut, dan tooltip kaca mengambang.
