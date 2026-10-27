# TICKET: SLICE 2 — MANAJEMEN PENGGUNA INTERNAL & RBAC GUARD
## Titipin POS — User Administration, Role Guards & Instant Session Revocation

| Metadata | Keterangan |
| :--- | :--- |
| **Ticket ID** | `TICKET-SLICE-2` |
| **Epic Terkait** | `EPIC-07: MANAJEMEN PENGGUNA INTERNAL (USER MANAGEMENT)` |
| **Target Branch** | `feature/slice-2-user-management` |
| **Aturan Bisnis** | [BR-010, BR-011, BR-015](../../product/PRD.md#L55-L65) |
| **Dokumen Acuan** | [ARCHITECTURE.md Section 3](../../architecture/ARCHITECTURE.md#L145-L158), [DATA-MODEL.md Section 3.1 & 4.1](../../architecture/DATA-MODEL.md#L133-L149), [openapi.yaml](../../api/openapi.yaml#L197-L270) |
| **Spesifikasi UI** | [06-users.md](../../design/pages/06-users.md), [COMPONENTS.md](../../design/COMPONENTS.md) |
| **Integration Tests** | [TEST-08 (Soft delete & revocation), TEST-09 (RBAC 403)](../../product/ACCEPTANCE-CRITERIA.md#L473-L474) |

---

## 1. DESKRIPSI & TUJUAN BISNIS
Menyediakan fitur administrasi pengguna bagi Admin toko untuk mendaftarkan akun kasir baru, mereset password staf tanpa SMTP (disertai instant session revocation di seluruh perangkat), serta menonaktifkan akun staf yang sudah tidak bekerja via soft-delete, diperkuat dengan RBAC Guard (`ADMIN` vs `CASHIER`) dan Self-Guard (Admin dilarang mereset/menonaktifkan dirinya sendiri).

---

## 2. DETAIL TUGAS TEKNIS (TASK BREAKDOWN)

### 2.1 Shared Contracts (`packages/shared`)
* [x] Buat Zod schema `createUserSchema` (`name`, `email`, `password` min 8, `role` enum `ADMIN`|`CASHIER`).
* [x] Buat Zod schema `resetPasswordSchema` (`new_password` min 8, `new_password_confirmation`).

### 2.2 Backend API (`apps/backend/src/modules/users/`)
* [x] Buat `RolesGuard` dan decorator `@Roles('ADMIN')`.
* [x] Implementasikan endpoint `GET /api/users`: listing seluruh pengguna (hanya bisa diakses role `ADMIN`).
* [x] Implementasikan endpoint `POST /api/users`: Admin membuat pengguna baru (`AC-USR-04`). Hash password dengan bcrypt.
* [x] Implementasikan endpoint `PATCH /api/users/:id/reset-password`:
  * Validasi Self-Guard: tolak jika target ID adalah ID akun Admin pemanggil (403 Forbidden).
  * Validasi status target: tolak jika target sudah dinonaktifkan (422 Unprocessable Entity).
  * Update hash password dan set `refresh_token_hash = NULL` secara atomik.
* [x] Implementasikan endpoint `DELETE /api/users/:id`:
  * Validasi Self-Guard: tolak jika target ID adalah diri sendiri (403 Forbidden).
  * Set `deleted_at = NOW()` dan `refresh_token_hash = NULL` secara atomik.
* [x] Catat seluruh mutasi data ke tabel `audit_logs` (`USER_CREATED`, `USER_RESET_PASSWORD`, `USER_DEACTIVATED`).

### 2.3 Frontend UI Mobile-First (`apps/frontend`)
* [x] Buat halaman `/users` mengacu pada `docs/design/pages/06-users.md`:
  * Di-guard oleh Edge Middleware Next.js: jika kasir mencoba membuka, redirect atau tampilkan halaman 403 Forbidden.
  * Header aksi: judul dan tombol `+ Tambah Pengguna` (`rounded-xl h-11 bg-emerald-700`).
  * Data Table Staf (`glass-panel rounded-2xl`): kolom Nama, Email, Badge Role (`ADMIN` biru / `CASHIER` hijau), Badge Status (`Aktif` / `Nonaktif`), Aksi.
  * Modal Tambah Pengguna (`rounded-3xl p-8`): form nama, email, password, role dropdown.
  * Modal Reset Password: form password baru dengan penegasan self-guard.
  * AlertDialog Konfirmasi Nonaktifkan: dialog bahaya merah dengan teks penjelasan audit log utuh.
  * Seluruh icon menggunakan `lucide-react` (`UserCog`, `KeyRound`, `UserX`, `Plus`).

---

## 3. DEFINITION OF DONE (DOD) CHECKLIST

- [x] Admin dapat melihat daftar seluruh staf dan mendaftarkan staf kasir baru (`POST /api/users`).
- [x] Admin dapat mereset password staf dan sesi staf tersebut langsung terputus (silent refresh ditolak).
- [x] Admin dapat menonaktifkan akun staf (soft delete), dan akun tersebut langsung diblokir dari login.
- [x] Self-Guard aktif: Admin tidak bisa mereset atau menonaktifkan akun miliknya sendiri (403 Forbidden).
- [x] Kasir diblokir dari endpoint `/api/users` dan halaman `/users` dengan respon 403 Forbidden.
- [x] Seluruh mutasi pengguna tercatat lengkap di tabel `audit_logs`.
- [x] Automated Test `TEST-08` dan `TEST-09` (bagian users) lulus 100%.
- [x] Branch `feature/slice-2-user-management` di-merge ke `develop` menggunakan flag `--no-ff`.
- [x] Branch fitur lokal dihapus setelah merge.
