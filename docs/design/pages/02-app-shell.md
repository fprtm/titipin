# PAGE SPECIFICATION: APP SHELL & NAVIGASI (`(dashboard)/layout.tsx`)
## Titipin POS — Master Dashboard Shell & Navigation Layout

| Metadata | Keterangan |
| :--- | :--- |
| **Route** | `/(dashboard)/*` |
| **Akses** | Authenticated Only (Di-guard oleh Edge Middleware + Client Mutex) |
| **Komponen Utama** | Sticky Glass Navbar, Responsive Glass Sidebar, Held Order Pill Badge, User Dropdown |

---

## 1. STRUKTUR ARSITEKTUR LAYOUT

```
┌────────────────────────────────────────────────────────────────────────┐
│ STICKY FROSTED NAVBAR (glass-panel rounded-2xl m-4 h-16 px-6)          │
│ [Titipin POS Logo] [Terminal 01 • Hijau]  [Held Badge!] [User Profile] │
├──────────────┬─────────────────────────────────────────────────────────┤
│ SIDEBAR      │ MAIN CONTENT VIEWPORT (bg-canvas-pattern p-6 lg:p-8)    │
│ (rounded-3xl)│                                                         │
│ • Dashboard  │ [ Page Container: rounded-3xl / rounded-2xl ]           │
│ • Kasir POS  │                                                         │
│ • Produk     │                                                         │
│ • Pelanggan  │                                                         │
│ • Riwayat    │                                                         │
│ ──────────── │                                                         │
│ • Pengguna*  │ (* Khusus Role ADMIN)                                   │
│ • Audit*     │ (* Khusus Role ADMIN)                                   │
└──────────────┴─────────────────────────────────────────────────────────┘
```

---

## 2. SPESIFIKASI NAVBAR ATAS (`components/layout/top-navbar.tsx`)

* **Gaya Visual:** `glass-panel sticky top-4 z-40 mx-4 sm:mx-6 lg:mx-8 h-16 px-6 rounded-2xl flex items-center justify-between shadow-md`.
* **Elemen Sisi Kiri:**
  * Logo Titipin: Icon belanja emerald dengan tipografi tebal `text-slate-900 font-bold`.
  * Status Terminal: Badge kapsul hijau lembut `Terminal 01 • Aktif`.
* **Elemen Sisi Tengah / Kanan (Held Transaction Quick Pill):**
  * Terhubung secara reaktif ke endpoint `GET /api/orders/held`.
  * Jika kasir memiliki transaksi tertahan:
    * Muncul pill menyala warna kuning amber (`bg-amber-100 border border-amber-300 text-amber-900 px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 animate-pulse cursor-pointer hover:bg-amber-200`).
    * Label: `1 Transaksi Tertahan (Klik untuk Memuat)`.
* **Elemen Sisi Kanan (User Menu Dropdown):**
  * Trigger: Avatar inisial nama + Nama Pengguna + Badge Role (`ADMIN` / `CASHIER`).
  * Isi Dropdown Menu (`glass-panel rounded-2xl p-2`):
    * Opsi: `Ubah Kata Sandi` (Membuka dialog modal change password).
    * Opsi: `Keluar (Logout)` (Memanggil `POST /api/auth/logout`, mencabut sesi, dan membersihkan in-memory token).

---

## 3. SPESIFIKASI SIDEBAR (`components/layout/sidebar.tsx`)

* **Gaya Visual:** `glass-panel m-4 sm:m-6 lg:m-8 w-64 p-6 rounded-3xl flex flex-col justify-between hidden md:flex`.
* **Menu Operasional Kasir (Untuk Semua Role):**
  * `Dashboard`: Icon `LayoutDashboard`, navigasi ke `/dashboard`.
  * `Kasir POS`: Icon `ShoppingCart`, navigasi ke `/pos`.
  * `Katalog Produk`: Icon `Package`, navigasi ke `/products`.
  * `Data Pelanggan`: Icon `Users2`, navigasi ke `/customers`.
  * `Riwayat Transaksi`: Icon `Receipt`, navigasi ke `/orders`.
* **Menu Khusus Admin (Dihilangkan jika `role === 'CASHIER'`):**
  * Garis pemisah label: `text-xs uppercase font-semibold text-slate-400 px-3 my-3`.
  * `Manajemen Pengguna`: Icon `UserCog`, navigasi ke `/users`.
  * `Audit Trail`: Icon `ShieldAlert`, navigasi ke `/audit-logs`.
* **Active State Link:**
  * Link aktif: `bg-emerald-700 text-white font-semibold rounded-xl shadow-sm`.
  * Link inaktif: `text-slate-600 hover:bg-white/80 hover:text-slate-900 rounded-xl transition-colors`.

---

## 4. RESPONSIVE BEHAVIOR (MOBILE & TABLET)
* Pada layar $< 768px$ (Mobile & Tablet Vertikal):
  * Sidebar disembunyikan.
  * Tombol hamburger icon muncul di Navbar Kiri.
  * Menekan hamburger membuka Sheet Drawer dari sisi kiri (`rounded-r-3xl glass-panel`).
