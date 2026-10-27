# PAGE SPECIFICATION: MANAJEMEN PENGGUNA (`/users`) — KHUSUS ADMIN
## Titipin POS — User Management & RBAC Administration

| Metadata | Keterangan |
| :--- | :--- |
| **Route** | `/users` |
| **Akses** | **ADMIN ONLY** (`role: ADMIN`). Kasir diblokir 403 oleh Middleware. |
| **Komponen Utama** | Data Table Staf, Modal Tambah Pengguna, Modal Reset Password, Dialog Nonaktifkan |
| **API Terkait** | `GET /api/users`, `POST /api/users`, `PATCH /api/users/:id/reset-password`, `DELETE /api/users/:id` |

---

## 1. STRUKTUR VISUAL & WIREFRAME (ASCII)

```
┌────────────────────────────────────────────────────────────────────────┐
│ HEADER: Manajemen Pengguna Sistem & Staf Kasir                         │
│                                                                        │
│ ┌────────────────────────────────────────┐            ┌──────────────┐ │
│ │ Daftar seluruh akun operator internal  │            │ + Tambah User│ │
│ └────────────────────────────────────────┘            └──────────────┘ │
│                                                                        │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ TABEL PENGGUNA (glass-panel rounded-2xl)                           │ │
│ │ NAMA              EMAIL             ROLE        STATUS     AKSI    │ │
│ │ ───────────────── ───────────────── ─────────── ────────── ─────── │ │
│ │ Admin Titipin     admin@titipin.id  [ADMIN Blu] [Aktif Gr] [Reset] │ │
│ │ Kasir 1           kasir1@titipin.id [CASHIER Gr][Aktif Gr] [•••]   │ │
│ │ Mantan Kasir      ex@titipin.id     [CASHIER Gr][Nonaktif] [Buka]  │ │
│ │ ────────────────────────────────────────────────────────────────── │ │
│ │ Menampilkan 1 - 3 dari 3 pengguna                                  │ │
│ └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. MODAL TAMBAH PENGGUNA BARU (`CreateUserModal`)

* **Trigger:** Tombol `+ Tambah User` (`rounded-xl h-11 bg-emerald-700 text-white font-medium`).
* **Container:** `<Dialog />` (`rounded-3xl p-8 max-w-lg glass-panel`).
* **Form Input:**
  1. `Nama Lengkap (name)`: Text input (`rounded-xl h-11`), maksimal 100 karakter.
  2. `Alamat Email (email)`: Text input email (`rounded-xl h-11`), wajib unik.
  3. `Kata Sandi Awal (password)`: Password input (`rounded-xl h-11`), minimal 8 karakter.
  4. `Pilihan Role (role)`: Dropdown select (`rounded-xl h-11`): `CASHIER (Kasir)` atau `ADMIN (Administrator)`.
* **Aksi Simpan:** Memanggil `POST /api/users`. Jika email duplikat, server mengembalikan 422 ("Email sudah terdaftar").

---

## 3. MODAL RESET PASSWORD KASIR (`ResetPasswordModal`)

* **Trigger:** Menu aksi baris `Reset Kata Sandi`.
* **Proteksi Diri (Self-Guard):** Jika akun target adalah akun Admin yang sedang login, tombol di-disable atau menampilkan error 403 ("Admin tidak dapat mereset kata sandi sendiri melalui menu ini" / `BR-011`).
* **Form:** Input `Kata Sandi Baru` (min 8 karakter) dan `Konfirmasi Kata Sandi`.
* **Efek Samping (Instant Session Revocation):**
  * Server meng-hash password baru dan mengosongkan `refresh_token_hash = NULL`.
  * Toast konfirmasi: `"Kata sandi staf berhasil diubah. Seluruh sesi aktif staf tersebut telah dicabut."`

---

## 4. DIALOG NONAKTIFKAN AKUN (SOFT DELETE)

* **Trigger:** Menu aksi baris `Nonaktifkan Akun`.
* **Proteksi Diri (Self-Guard):** Admin dilarang menonaktifkan akunnya sendiri (`BR-011`).
* **Konfirmasi Bahaya (`AlertDialog`):**
  * "Yakin ingin menonaktifkan akun staf ini? Pengguna akan langsung dikeluarkan dari sistem dan tidak dapat login kembali. Histori penjualan yang pernah dibuatnya tetap tersimpan utuh."
  * Tombol Aksi: `<Button variant="destructive" className="rounded-xl">Ya, Nonaktifkan Akun</Button>`.
  * Memanggil `DELETE /api/users/:id` (menyimpan `deleted_at = NOW()` dan `refresh_token_hash = NULL`).
