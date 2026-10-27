# DESIGN SYSTEM & UI/UX MASTER ARCHITECTURE
## Titipin — Sistem Point of Sale (POS) & Order Management

| Metadata | Keterangan |
| :--- | :--- |
| **Dokumen ID** | `DS-TITIPIN-MASTER` |
| **Versi** | `1.3.0` |
| **Status** | APPROVED FOR FRONTEND SCAFFOLDING & VERTICAL SLICES |
| **Guidance Standard** | Modern Web Guidance (`visual-effects`, CSS Layered Depth, OKLCH Color Spaces, WCAG 2.1 AA) |
| **Target Framework** | Next.js 15 App Router, React 19, Tailwind CSS, shadcn/ui (Radix UI), Lucide Icons |

---

## 1. STRUKTUR DOKUMENTASI DESAIN MODULAR

Sistem desain Titipin dipecah secara modular untuk memberikan acuan teknis yang presisi bagi tim developer:

```
docs/design/
├── DESIGN-SYSTEM.md         # Master Architecture & Filosofi Desain (Dokumen ini)
├── TOKENS.md                # Design Tokens: OKLCH Palette, Glassmorphism Recipes, Prominent Rounded, Spacing
├── COMPONENTS.md            # Reusable Components: Button, Badge, Input, Stepper, Table, Dialog, Sheet, dll.
└── pages/                   # Spesifikasi Presisi per Layar Aplikasi
    ├── 01-login.md          # Layar Autentikasi Pengguna & Form Zod
    ├── 02-app-shell.md       # Master Layout, Sticky Glass Navbar & Responsive Sidebar
    ├── 03-pos-checkout.md   # Dual-Pane POS Kasir, Sticky Cart, Hold Flow, & Modal Pembayaran
    ├── 04-products.md       # Katalog Produk, Inventaris, & Import/Export Excel Idempoten
    ├── 05-customers.md      # Manajemen Pelanggan & Form Pendaftaran Member
    ├── 06-users.md          # Manajemen Staf Kasir/Admin, Reset Password, & Soft Delete (Admin Only)
    ├── 07-orders-history.md # Riwayat Transaksi & Filter Multi-Kriteria
    ├── 08-order-detail.md   # Detail Nota Resmi, Price Snapshot Historis, & Order Activity Timeline
    ├── 09-audit-logs.md     # Audit Trail Mutasi Sistem & Modal Inspeksi Diff JSON (Admin Only)
    └── 10-dashboard.md      # Dashboard Analitik Finansial, Tren Harian, & Peringatan Stok Kritis
```

---

## 2. FILOSOFI DESAIN & IDENTITAS VISUAL

1. **Crafted Tactile Glassmorphism (Anti-"AI Slop"):**
   * Menolak desain generik tanpa kedalaman. Antarmuka menggunakan kaca buram (*frosted glass*) dengan pencahayaan specular tepi (`inset 0 1px 1px 0 rgba(255, 255, 255, 0.90)`), bayangan berlapis (*layered ambient & key shadows*), dan kanvas bertekstur titik halus (*CSS micro dot-matrix*).
2. **Prominent Large Rounded Scale:**
   * Elemen luar dan kontainer modal menggunakan kurva lengkung besar `rounded-3xl` (24px).
   * Kartu produk dan metrik menggunakan `rounded-2xl` (16px).
   * Tombol aksi dan form input menggunakan `rounded-xl` (12px).
3. **Breathable Spacing & Padding:**
   * Karena sudut kurva yang besar, padding kontainer diperlebar (`p-6` s/d `p-10`) agar tipografi dan kontrol tidak terjepit di sudut lengkung.
4. **Ergonomi Kasir Berkecepatan Tinggi:**
   * Tata letak POS Dual-Pane memungkinkan kasir menyelesaikan pesanan tanpa berpindah halaman: pencarian cepat keyboard `/`, penambahan kuantitas 1-klik, kalkulasi kembalian otomatis, dan nota siap cetak thermal.
5. **Integritas Moneter:**
   * Seluruh harga, stok, dan nomor nota disajikan dengan font monospace tabular (`tabular-nums font-mono text-slate-900`) untuk presisi pembacaan digit kasir.

---

## 3. INDEKS SPESIFIKASI & REFERENSI CEPAT

* **[TOKENS.md](file:///Users/yuma/Workspace/lab/titipin/docs/design/TOKENS.md):**
  * Palet warna OKLCH (`--primary`, neutral slate, feedback semantic).
  * Kelas CSS `.glass-panel`, `.glass-card`, `.glass-input`, `.bg-canvas-pattern`.
  * Skala kurva sudut `rounded-xl`, `rounded-2xl`, `rounded-3xl`.
  * Padding dan margin scale default.
* **[COMPONENTS.md](file:///Users/yuma/Workspace/lab/titipin/docs/design/COMPONENTS.md):**
  * 12 Komponen Primitives: Button, Badge, Input & SearchInput, QuantityStepper, DataTable, Dialog/AlertDialog, Sheet Drawer, Combobox Member, StatCard, Skeleton, SonnerToast, DropdownMenu.
  * Interactive States (Idle, Hover, Active, Focus Ring, Disabled, Loading Spinner).
* **[Pages Specifications](file:///Users/yuma/Workspace/lab/titipin/docs/design/pages):**
  * Detil wireframe ASCII, flow form, error handling, permission guards, dan endpoint integrasi untuk seluruh 10 rute aplikasi.
