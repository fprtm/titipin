# DESIGN TOKENS SPECIFICATION
## Titipin POS — Visual Design Tokens, Glassmorphism Recipes & Prominent Rounded Scale

| Metadata | Keterangan |
| :--- | :--- |
| **Dokumen ID** | `DS-TOKENS-001` |
| **Versi** | `1.2.0` |
| **Status** | APPROVED |
| **Styling Aesthetic** | Tactile Glassmorphism, Prominent Large Rounded (`rounded-2xl` / `rounded-3xl`), Generous Breathable Padding |
| **Guidance Standard** | Modern Web Guidance (`visual-effects`, CSS Layered Depth, OKLCH Color Spaces) |

---

## 1. PALET WARNA (COLOR SYSTEM IN OKLCH)

Sistem warna Titipin mengadopsi ruang warna **OKLCH** untuk menjaga persepsi kecerahan (*perceptual lightness*) dan saturasi murni tanpa degradasi warna abu-abu (*muddy gray*) saat diinterpolasi atau dicampur.

### 1.1 Brand Primary (Commerce Emerald / Teal)
Digunakan untuk aksi utama, tombol konfirmasi POS, status lunas, dan aksen navigasi aktif.

| Token CSS Variable | OKLCH Value | HEX / HSL Equivalent | Penggunaan Utama |
| :--- | :--- | :--- | :--- |
| `--primary` | `oklch(0.48 0.12 175)` | `#0F766E` / `hsl(175, 78%, 26%)` | Tombol utama, active tab, checkbox/radio |
| `--primary-hover` | `oklch(0.42 0.12 175)` | `#115E59` / `hsl(175, 84%, 20%)` | Hover state tombol utama |
| `--primary-active` | `oklch(0.36 0.11 175)` | `#134E4A` / `hsl(175, 88%, 16%)` | Active / pressed state |
| `--primary-light` | `oklch(0.96 0.03 160)` | `#ECFDF5` / `hsl(160, 84%, 95%)` | Background badge sukses, highlight baris tabel |
| `--primary-foreground`| `oklch(1.0 0 0)` | `#FFFFFF` | Teks di atas warna primary |

### 1.2 Neutral & Surface Palette (Clean Slate)
Memberikan kontras tinggi untuk teks kasir tanpa menyilaukan mata saat bekerja di bawah pencahayaan toko.

| Token | OKLCH Value | HEX Equivalent | Penggunaan |
| :--- | :--- | :--- | :--- |
| `--canvas-bg` | `oklch(0.98 0.005 240)` | `#F8FAFC` (slate-50) | Latar dasar seluruh aplikasi |
| `--surface-card` | `oklch(1.0 0 0)` | `#FFFFFF` | Latar modal, popover, dan kartu padat |
| `--text-main` | `oklch(0.18 0.02 240)` | `#0F172A` (slate-900) | Teks utama, nominal harga, judul |
| `--text-muted` | `oklch(0.52 0.02 240)` | `#64748B` (slate-500) | Label sekunder, SKU barcode, hint |
| `--border-subtle` | `oklch(0.90 0.01 240)` | `#E2E8F0` (slate-200) | Garis pemisah tabel, border input |
| `--border-strong` | `oklch(0.82 0.01 240)` | `#CBD5E1` (slate-300) | Border kartu aktif, divider |

### 1.3 Semantic Feedback Tokens (WCAG AA Compliant)
Memiliki rasio kontras WCAG AA $\ge 4.5:1$ terhadap latar belakangnya:

| Kategori | Token Text | Token BG Kaca | Penggunaan |
| :--- | :--- | :--- | :--- |
| **Success** | `oklch(0.55 0.18 142)` (`#16A34A`) | `rgba(240, 253, 244, 0.85)` | Transaksi sukses, stok aman ($>10$), akun aktif |
| **Warning** | `oklch(0.68 0.16 75)` (`#D97706`) | `rgba(255, 251, 235, 0.85)` | Stok menipis ($5–10$), transaksi tertahan (held) |
| **Destructive** | `oklch(0.58 0.22 25)` (`#DC2626`) | `rgba(254, 242, 242, 0.85)` | Stok kritis ($<5$), stok habis ($=0$), nonaktifkan staf |
| **Info** | `oklch(0.60 0.16 230)` (`#0284C7`) | `rgba(240, 249, 255, 0.85)` | Badge walk-in customer, role ADMIN, audit log |

---

## 2. RECIPE GLASSMORPHISM & DEPTH LAYERS

Untuk menghadirkan estetika premium yang organik dan bebas dari kesan "AI slop", Titipin menerapkan **Physical Frosted Glass Recipe** dengan kurva sudut lembut (*prominent rounded corners*) dan pencahayaan specular:

```css
/* ============================================================
   CANVAS TEXTURE (Micro Dot-Matrix via visual-effects guide)
   ============================================================ */
.bg-canvas-pattern {
  background-color: #F8FAFC;
  background-image: radial-gradient(circle, rgba(100, 116, 139, 0.14) 1px, transparent 1px);
  background-size: 24px 24px;
}

/* ============================================================
   GLASS PANEL (Container Utama, Modal, Sticky Drawer POS)
   Sudut kurva besar: rounded-3xl (24px) dengan padding lega (p-6 / p-8)
   ============================================================ */
.glass-panel {
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(16px) saturate(160%);
  -webkit-backdrop-filter: blur(16px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.70);
  border-radius: 1.5rem; /* 24px - rounded-3xl */
  box-shadow: 
    inset 0 1px 2px 0 rgba(255, 255, 255, 0.90),      /* Specular rim highlight */
    0 10px 25px -5px rgba(15, 23, 42, 0.04),          /* Soft ambient shadow */
    0 20px 25px -5px rgba(15, 23, 42, 0.02);
}

/* ============================================================
   GLASS CARD (Kartu Produk POS, Kartu KPI Dashboard)
   Sudut kurva sedang-besar: rounded-2xl (16px) dengan padding p-5
   ============================================================ */
.glass-card {
  background: rgba(255, 255, 255, 0.68);
  backdrop-filter: blur(12px) saturate(150%);
  -webkit-backdrop-filter: blur(12px) saturate(150%);
  border: 1px solid rgba(255, 255, 255, 0.65);
  border-radius: 1rem; /* 16px - rounded-2xl */
  box-shadow: 
    inset 0 1px 1px 0 rgba(255, 255, 255, 0.95),
    0 4px 6px -1px rgba(15, 23, 42, 0.03);
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.glass-card:hover {
  background: rgba(255, 255, 255, 0.94);
  border-color: rgba(15, 118, 110, 0.35); /* Emerald accent */
  transform: translateY(-3px) scale(1.01);
  box-shadow: 
    inset 0 1px 0 0 rgba(255, 255, 255, 1),
    0 12px 28px -6px rgba(15, 118, 110, 0.14),
    0 6px 10px -3px rgba(15, 23, 42, 0.04);
}

/* ============================================================
   GLASS INTERACTIVE (Tombol & Input Kaca)
   Sudut kurva: rounded-xl (12px)
   ============================================================ */
.glass-input {
  background: rgba(255, 255, 255, 0.70);
  backdrop-filter: blur(8px);
  border: 1.5px solid rgba(226, 232, 240, 0.85);
  border-radius: 0.75rem; /* 12px - rounded-xl */
  box-shadow: inset 0 1px 2px 0 rgba(15, 23, 42, 0.03);
  transition: all 0.2s ease;
}

.glass-input:focus {
  background: #FFFFFF;
  border-color: #0F766E;
  box-shadow: 0 0 0 4px rgba(15, 118, 110, 0.15);
}
```

---

## 3. PROMINENT ROUNDED SCALE (SKALA SUDUT KURVA)

Untuk memberikan identitas modern yang ramah dan taktis, Titipin menggunakan sudut melengkung yang tegas (*large organic curvature*):

| Kelas Tailwind | Nilai Radius (px) | Elemen Pengguna | Alasan Desain |
| :--- | :--- | :--- | :--- |
| **`rounded-3xl`** | **`1.5rem` (24px)** | Dialog Modal, Main Drawer POS, Panel Dashboard Utama, Container Luar | Memberikan kontur fisik kaca yang mengambang lembut di atas kanvas |
| **`rounded-2xl`** | **`1.0rem` (16px)** | Kartu Produk POS, Kartu Metrik Dashboard, Kotak Dialog Import Excel, Kartu Invoice Nota | Ukuran kartu yang cukup luas pas dengan lengkungan 16px tanpa memotong teks |
| **`rounded-xl`** | **`0.75rem` (12px)**| Tombol Aksi (`Button`), Input Text, Quantity Stepper Container, Search Bar | Tombol terasa taktil, empuk, dan nyaman diklik/ditekan |
| **`rounded-lg`** | **`0.5rem` (8px)** | Sub-elemen internal: Tombol minus/plus kuantitas, item baris dropdown | Menjaga proporsi elemen anak di dalam container `rounded-xl` |
| **`rounded-full`**| **`9999px`** | Badge Status, Switch Tab Periode, Avatar / User Profile Pill | Bentuk kapsul penuh untuk indikator status cepat |

---

## 4. SPACING, PADDING & MARGIN SCALE (BREATHABLE LAYOUT)

Karena menggunakan sudut kurva yang besar (`rounded-2xl` dan `rounded-3xl`), **padding default diperlebar secara proporsional** agar teks dan tombol tidak terjepit di area sudut lengkung:

```
┌────────────────────────────────────────────────────────┐
│  Panel Luar (glass-panel: rounded-3xl, p-8)            │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Kartu Internal (glass-card: rounded-2xl, p-6)    │  │
│  │                                                  │  │
│  │ [Tombol: rounded-xl, px-5 py-2.5]                │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

### 4.1 Padding Container & Kartu
* **App Shell Page Container:** `p-6 md:p-8 lg:p-10` (memberikan ruang bernafas yang lega dari tepi layar).
* **Modal Dialog & Drawer Body:** `p-6 sm:p-8`.
* **Glass Cards (Produk / Metrik):** `p-5 sm:p-6` (padding merata 20px–24px).
* **Tabel Header & Row Cell:** `px-5 py-3.5` (jarak vertikal lega untuk keterbacaan data kasir).

### 4.2 Spacing & Gap Grids
* **Grid Produk POS:** `gap-4 sm:gap-5 lg:gap-6`.
* **Dashboard Metrik Cards Grid:** `gap-5 sm:gap-6`.
* **Form Vertical Stack:** `space-y-5` (jarak antar input form tidak berdesakan).
* **Toolbar / Action Bar:** `gap-3 sm:gap-4`.

### 4.3 Ukuran Tombol & Input Ergonomis
* **Input Height:** `h-11 px-4 text-sm rounded-xl` (tinggi 44px ramah klik dan sentuhan).
* **Button Default:** `h-11 px-5 text-sm font-medium rounded-xl`.
* **Button Large (Checkout POS):** `h-13 px-8 text-base font-semibold rounded-2xl` (tinggi 52px untuk tombol utama "Bayar").
* **Button Small:** `h-9 px-3.5 text-xs font-medium rounded-lg`.

---

## 5. TIPOGRAFI & SISTEM NOMINAL KASIR

### 5.1 Skala Tipografi
* **Font UI:** `Geist Sans`, `Inter`, atau `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.
* **Font Tabular Monospace:** `JetBrains Mono` atau `ui-monospace`.
* **Aturan Keras (*Strict Rule*):** Seluruh nominal uang Rupiah, kuantitas stok, persentase tren, barcode SKU, dan nomor invoice wajib disajikan dengan utility class `tabular-nums font-mono font-bold tracking-tight`.

| Token Kelas | Ukuran / Line Height | Bobot | Penggunaan |
| :--- | :--- | :--- | :--- |
| `text-display` | `28px / 36px` (`text-2xl lg:text-3xl`) | `font-bold` | Total Belanja POS, Header Halaman Utama |
| `text-h1` | `22px / 30px` (`text-xl`) | `font-semibold` | Judul modal checkout, kartu omset |
| `text-h2` | `18px / 26px` (`text-lg`) | `font-semibold` | Header section, judul drawer keranjang |
| `text-body` | `14px / 20px` (`text-sm`) | `font-normal` | Konten tabel, label form, deskripsi |
| `text-caption`| `12px / 16px` (`text-xs`) | `font-medium` | Badge SKU, timestamp log, shortcut hint |
| `text-price` | `16px / 22px` (`text-base tabular-nums font-mono`) | `font-bold` | Harga satuan produk, subtotal kasir |
