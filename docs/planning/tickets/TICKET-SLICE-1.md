# TICKET: SLICE 1 — AUTENTIKASI PENGGUNA, SILENT REFRESH & RESPONSIVE APP SHELL
## Titipin POS — Authentication Engine, Session Management & Glassmorphic Shell

| Metadata | Keterangan |
| :--- | :--- |
| **Ticket ID** | `TICKET-SLICE-1` |
| **Epic Terkait** | `EPIC-01: AUTENTIKASI DAN KEAMANAN SESI` |
| **Target Branch** | `feature/slice-1-auth-app-shell` |
| **Aturan Bisnis** | [BR-007, BR-008, BR-015](../../product/PRD.md#L45-L65) |
| **Dokumen Acuan** | [ARCHITECTURE.md Section 4.1](../../architecture/ARCHITECTURE.md#L157-L180), [DATA-MODEL.md Section 4.1](../../architecture/DATA-MODEL.md#L308-L327), [openapi.yaml](../../api/openapi.yaml#L56-L175) |
| **Spesifikasi UI** | [01-login.md](../../design/pages/01-login.md), [02-app-shell.md](../../design/pages/02-app-shell.md), [COMPONENTS.md](../../design/COMPONENTS.md) |
| **Integration Test** | [TEST-06 (Akses tanpa token ditolak 401)](../../product/ACCEPTANCE-CRITERIA.md#L471) |

---

## 1. DESKRIPSI & TUJUAN BISNIS
Mengimplementasikan modul autentikasi aman dengan arsitektur Dual-Token JWT (Access Token in-memory + Refresh Token HttpOnly Cookie), verifikasi hash refresh token di database untuk pencabutan sesi instan, Axios Mutex Queue Interceptor untuk auto-refresh token tanpa race condition pada request paralel, serta membangun shell aplikasi responsif (Top Navbar kaca, responsive sidebar, dan mobile sheet drawer).

---

## 2. DETAIL TUGAS TEKNIS (TASK BREAKDOWN)

### 2.1 Database & Skema Drizzle
* [x] Buat skema `src/database/schema/users.schema.ts` (id uuid PK, name varchar(100), email unique varchar(150), password varchar, role enum `ADMIN`|`CASHIER`, refresh_token_hash varchar, created_at, updated_at, deleted_at).
* [x] Jalankan migrasi Drizzle untuk membuat tabel `users`.

### 2.2 Shared Contracts (`packages/shared`)
* [x] Buat Zod schema `loginSchema` (email format, password min 1).
* [x] Buat interface DTO: `LoginInput`, `LoginResponse`, `RefreshResponse`, `UserItem`.

### 2.3 Backend API (`apps/backend/src/modules/auth/`)
* [x] Implementasikan endpoint `POST /api/auth/login`: validasi password bcrypt/argon2id, simpan hash refresh token di DB, kirim access token di body dan refresh token via HttpOnly Cookie.
* [x] Implementasikan endpoint `POST /api/auth/refresh`: baca cookie refresh token, cocokkan dengan hash di DB, terbitkan access token baru.
* [x] Implementasikan endpoint `POST /api/auth/logout`: kosongkan `refresh_token_hash = NULL` dan hapus cookie.
* [x] Implementasikan endpoint `GET /api/auth/me`, `PATCH /api/auth/me` (update nama), dan `POST /api/auth/change-password` (verifikasi password lama).
* [x] Implementasikan `JwtAuthGuard` untuk memproteksi endpoint authenticated.
* [x] Catat event `AUTH_LOGIN`, `AUTH_LOGOUT`, dan `AUTH_PASSWORD_CHANGED` ke `audit_logs`.

### 2.4 Frontend UI Mobile-First (`apps/frontend`)
* [x] Buat halaman `/login` mengacu pada `docs/design/pages/01-login.md`:
  * Centered card `glass-panel rounded-3xl p-8 max-w-md w-full`.
  * Form input email dan password dengan toggle Lucide `Eye` / `EyeOff`.
  * Tombol login dengan state loading Lucide `Loader2`.
  * Banner error merah kaca jika kredensial salah (401).
* [x] Buat Axios Client dengan **Mutex Queue Interceptor**:
  * Saat menerima 401, tahan request paralel di dalam antrean (`failedQueue`).
  * Panggil `POST /api/auth/refresh`.
  * Setelah token baru diperoleh, perbarui in-memory token dan ulangi seluruh request antrean tanpa me-reload browser kasir.
* [x] Buat Layout Shell `(dashboard)/layout.tsx` mengacu pada `docs/design/pages/02-app-shell.md`:
  * Top Navbar kaca (`glass-panel rounded-2xl h-16`): Logo Titipin, status terminal, Held Orders quick pill, dan avatar user dropdown (Lucide `LogOut`, `KeyRound`).
  * Responsive Sidebar: Muncul di desktop (`hidden md:flex rounded-3xl w-64 p-6 glass-panel`).
  * Mobile First Drawer: Pada mobile (`<768px`), tombol hamburger Lucide `Menu` membuka slide-over sheet drawer dari sisi kiri.

---

## 3. DEFINITION OF DONE (DOD) CHECKLIST

- [x] Pengguna dapat login dengan email dan password yang sah dan menerima cookie HttpOnly.
- [x] Percobaan login dengan akun nonaktif (`deleted_at IS NOT NULL`) atau password salah ditolak 401 Unauthorized.
- [x] Mutex refresh token bekerja mulus: saat access token kadaluarsa, 3 request paralel berhasil dieksekusi ulang otomatis setelah silent refresh.
- [x] Logout berhasil mengosongkan `refresh_token_hash` di database dan menghapus cookie di browser.
- [x] Halaman login dan dashboard shell responsif sempurna di layar mobile (375px), tablet (768px), dan desktop (1280px).
- [x] Tidak ada penggunaan icon hardcoded SVG/emoji — seluruh ikon menggunakan `lucide-react`.
- [x] Automated Test `TEST-06` (Akses endpoint tanpa token ditolak 401) lulus 100%.
- [x] Branch `feature/slice-1-auth-app-shell` di-merge ke `develop` menggunakan flag `--no-ff`.
- [x] Branch fitur lokal dihapus setelah merge.
