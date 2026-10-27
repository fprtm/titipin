# ADR-004: Arsitektur Dual-Token Custom Authentication dengan Mutex Auto-Refresh

| Metadata | Keterangan |
| :--- | :--- |
| **Status** | ACCEPTED |
| **Tanggal** | 27 Oktober 2026 |
| **Pilihan yang Dipertimbangkan** | Robust Custom Dual-Token vs NextAuth.js vs Single Long-Lived Token |

---

## Konteks & Masalah
Sistem POS membutuhkan mekanisme keamanan sesi yang:
1. **Kebal terhadap Serangan XSS & CSRF (`BR-007`):** Kredensial tidak boleh disimpan di `localStorage` yang rentan diekstraksi oleh skrip pihak ketiga.
2. **Pengalaman Kasir Tanpa Putus (*Zero Disruption*):** Kasir yang sedang menginput transaksi tidak boleh tiba-tiba terlempar ke layar login hanya karena token kedaluwarsa.
3. **Pencegahan Race Condition saat Auto-Refresh:** Saat access token habis dan browser mengeksekusi 3 request konkuren (misal: fetch list produk, pelanggan, dan cart), hanya 1 request perpanjangan token yang boleh dikirimkan ke server.
4. **Pencabutan Sesi Seketika (*Stateful Revocation* `BR-008`, `BR-010`):** Logout atau penonaktifan akun oleh Admin wajib langsung membatalkan sesi kasir.

## Keputusan yang Diambil
Mengimplementasikan **Robust Custom Dual-Token Architecture**:
1. **Access Token (Short-lived, 15 menit):**
   - Disimpan murni in-memory (variabel state di memory client/Zustand), tidak pernah disimpan di `localStorage` atau `sessionStorage`.
   - Mengandung claims `{ sub: userId, email, role: 'ADMIN' | 'CASHIER' }`.
   - Dikirimkan via header `Authorization: Bearer <access_token>`.
2. **Refresh Token (Long-lived, 7 hari):**
   - Disimpan di cookie dengan flag: `HttpOnly`, `Secure` (di production), `SameSite=Strict`, dan `Path=/api/auth/refresh`. Skrip JavaScript di browser tidak memiliki akses baca terhadap cookie ini (100% XSS-proof).
   - Hash refresh token disimpan di kolom `users.refresh_token_hash`.
3. **Axios Interceptor dengan Mutex Request Queue:**
   - Ketika request API menerima HTTP 401:
     - Request pertama mengaktifkan flag `isRefreshing = true` dan memanggil `POST /api/auth/refresh`.
     - Request konkuren ke-2 dan ke-3 ditahan di dalam antrean `failedQueue`.
     - Setelah refresh token berhasil dan token baru diperoleh, antrean di-resolve dan seluruh request diulang secara transparan tanpa disadari oleh kasir.
4. **Stateful Logout & Soft-Delete Invalidation:**
   - Endpoint `POST /api/auth/logout` dan `DELETE /api/users/:id` menyetel `users.refresh_token_hash = NULL`. Percobaan refresh berikutnya langsung ditolak dengan HTTP 401.

## Mengapa Tidak Menggunakan NextAuth / Auth.js?
NextAuth dirancang untuk arsitektur fullstack Next.js monolitik yang mengelola sesi di dalam Next.js itu sendiri. Dalam arsitektur dua service terpisah di mana backend adalah NestJS mandiri, menggunakan NextAuth via `CredentialsProvider` justru menimbulkan kompleksitas lapisan abstraksi ganda, kesulitan mengelola HTTP-only cookie rotasi token secara langsung dari backend, dan sulit ditunjukkan transparansi arsitekturnya pada sesi wawancara teknis.
