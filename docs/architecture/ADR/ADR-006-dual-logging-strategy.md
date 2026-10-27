# ADR-006: Strategi Pemisahan System Audit Trail dan Order Activity Log

| Metadata | Keterangan |
| :--- | :--- |
| **Status** | ACCEPTED |
| **Tanggal** | 27 Oktober 2026 |
| **Pilihan yang Dipertimbangkan** | Dual Table Logging (`audit_logs` + `order_activity_logs`) vs Single Centralized Log Table |

---

## Konteks & Masalah
Sistem Titipin POS memiliki dua kebutuhan rekam jejak yang berbeda secara fundamental dari segi persona pengguna, siklus hidup, dan konsumsi data:
1. **System-Wide Security & Compliance Audit Trail (`BR-014`):** Dibutuhkan oleh Admin/Auditor untuk memantau siapa melakukan aksi *write* apa (login, logout, modifikasi katalog produk, reset password kasir, penonaktifan akun, manipulasi data member). Karakteristiknya: berskala global, menyangkut multi-entitas, dan append-only.
2. **Transaction Lifecycle Activity Log (`BR-017`):** Dibutuhkan oleh Kasir dan Toko pada tampilan rincian order (`GET /api/orders/:id`). Menunjukkan kronologi spesifik dari satu nota transaksi: kapan draft dibuat, kapan di-hold, kapan dilanjutkan, dan kapan diselesaikan menjadi invoice.

## Keputusan yang Diambil
Memisahkan kedua kebutuhan tersebut ke dalam **dua tabel terpisah**:

1. **Tabel `audit_logs` (System Security & Compliance Log):**
   - Menampung seluruh event mutasi data pengguna sistem (`AUTH`, `PRODUCT`, `CUSTOMER`, `USER`, `ORDER`).
   - Menyimpan payload diff JSON (nilai sebelum dan sesudah perubahan), alamat IP, dan user agent.
   - Dilindungi hak akses ketat: hanya pengguna dengan `role = ADMIN` yang dapat membaca tabel ini.
   - Tidak memiliki relasi `CASCADE` ke entitas bisnis (jika user dihapus, `user_id` di-set `NULL` agar histori audit tetap abadi / `NFR-AUD-01`).
2. **Tabel `order_activity_logs` (Order-Scoped Lifecycle Log):**
   - Memiliki foreign key langsung ke `orders.id` (`ON DELETE CASCADE`).
   - Berisi timeline sederhana: `action` (`ORDER_CREATED`, `ORDER_HELD`, `ORDER_FINALIZED`), `performed_by`, dan `created_at`.
   - Di-query secara otomatis saat memuat detail transaksi (`GET /api/orders/:id`) untuk disajikan langsung di antarmuka invoice kasir.

## Justifikasi
* **Performa Query:** Halaman detail order tidak perlu melakukan query filter berat ke tabel `audit_logs` raksasa yang menampung ribuan log sistem.
* **Separation of Concerns:** Data operasional kasir (timeline belanja) tidak bercampur baur dengan data audit kepatuhan keamanan internal (password reset, security events).
