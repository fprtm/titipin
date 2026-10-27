# TICKET: SLICE 9 — SEEDER REALISTIS, FULL TEST SUITE 9/9 & PRODUCTION DOCKER
## Titipin POS — Comprehensive Seeding, Automated QA & Production Containerization

| Metadata | Keterangan |
| :--- | :--- |
| **Ticket ID** | `TICKET-SLICE-9` |
| **Epic Terkait** | `EPIC-00: RELEASE & DEPLOYMENT` |
| **Target Branch** | `feature/slice-9-seeder-prod-release` |
| **Aturan Bisnis** | [NFR-DEV-01, Seluruh Aturan Bisnis BR-001 s/d BR-019](../../product/PRD.md#L40-L85) |
| **Dokumen Acuan** | [ARCHITECTURE.md Section 6 & 7](../../architecture/ARCHITECTURE.md#L290-L341), [PRD.md Section 3.1 Item 8](../../product/PRD.md#L102-L107), [ACCEPTANCE-CRITERIA.md Section 9](../../product/ACCEPTANCE-CRITERIA.md#L446-L474) |
| **Integration Tests** | [Seluruh 9 Skenario Integrasi TEST-01 s/d TEST-09 Lolos 100%](../../product/ACCEPTANCE-CRITERIA.md#L466-L474) |

---

## 1. DESKRIPSI & TUJUAN BISNIS
Menyempurnakan database seeder dengan data yang kaya dan realistis (akun admin, kasir, 20+ produk, 15+ member, 30+ order historis), menjalankan dan memverifikasi kelulusan 100% seluruh 9 skenario automated integration test, menyusun berkas `docker-compose.prod.yml` multi-service siap jalan, serta melengkapi dokumentasi panduan setup di README agar siap dijalankan orang lain dalam $\le 6$ perintah CLI.

---

## 2. DETAIL TUGAS TEKNIS (TASK BREAKDOWN)

### 2.1 Database Seeder Realistis (`apps/backend/src/database/seed.ts`)
* [ ] Seeding Akun Pengguna:
  * 1 Akun Admin: `admin@titipin.id` / `password123` (`role = ADMIN`).
  * 1 Akun Kasir: `kasir@titipin.id` / `password123` (`role = CASHIER`).
* [ ] Seeding Master Produk:
  * Minimal **20 produk katalog aktif** dengan variasi kategori (Makanan, Minuman, Kebutuhan Rumah).
  * Variasi harga realistis (Rp 3.500 s/d Rp 150.000).
  * Beberapa produk dengan sisa stok aman ($>10$), stok menipis ($5-10$), stok kritis ($<5$), dan stok habis ($=0$).
* [ ] Seeding Pelanggan / Member:
  * Minimal **15 data member aktif** dengan variasi gender, alamat, dan tanggal lahir.
* [ ] Seeding Riwayat Transaksi Penjualan:
  * Minimal **30 data order transaksi historis** yang tersebar realistis dalam 30 hari terakhir.
  * Campuran antara transaksi Pelanggan Umum (Walk-in, `customer_id = null`) dan Member terdaftar.
  * Setiap transaksi memiliki rincian item di `order_items` (dengan snapshot `unit_price`) dan kronologi timeline di `order_activity_logs`.
* [ ] Seeding Audit Trail:
  * Record awal di tabel `audit_logs` yang mencerminkan aktivitas sistem.

### 2.2 Eksekusi Automated Integration Tests (`apps/backend/test/`)
* [ ] Jalankan dan pastikan 9 skenario integration test lulus 100%:
  * `[PASS] TEST-01`: Buat order member sukses (stok terpotong, invoice terbit, total valid).
  * `[PASS] TEST-02`: Buat order walk-in sukses (customer_id null, label Pelanggan Umum).
  * `[PASS] TEST-03`: Stok tidak cukup (seluruh transaksi rollback atomik, stok utuh).
  * `[PASS] TEST-04`: Hold transaksi ke `draft_orders` tanpa potong stok, lalu finalize draft sukses.
  * `[PASS] TEST-05`: Validasi input gagal (kuantitas negatif / payload korup ditolak 422).
  * `[PASS] TEST-06`: Akses endpoint terproteksi tanpa token ditolak 401 Unauthorized.
  * `[PASS] TEST-07`: Integritas soft delete produk (tidak bisa di-order, tetap ada di riwayat lama).
  * `[PASS] TEST-08`: Soft delete user — blokir login & silent refresh, audit order tetap utuh.
  * `[PASS] TEST-09`: RBAC Guard — Kasir mengakses endpoint Admin ditolak 403 Forbidden.

### 2.3 Production Orchestration & Dockerization
* [ ] Buat multi-stage `Dockerfile` untuk backend NestJS.
* [ ] Buat standalone build `Dockerfile` untuk frontend Next.js 15.
* [ ] Buat `docker-compose.prod.yml` yang menghubungkan service backend, frontend, dan database PostgreSQL.
* [ ] Verifikasi perintah `docker compose -f docker-compose.prod.yml up --build` berjalan lancar.

### 2.4 Master README Documentation
* [ ] Tulis `README.md` utama yang memuat:
  1. Penjelasan tech stack yang dipilih dan alasannya.
  2. Panduan setup dari *git clone* sampai aplikasi berjalan dalam maksimal 6 perintah CLI.
  3. Kredensial akun login seeder (Admin & Kasir).
  4. Penjelasan logika aplikasi, alur pembuatan order, dan penanganan stok concurrency.
  5. Cara menjalankan automated integration test (`pnpm test`).

---

## 3. DEFINITION OF DONE (DOD) CHECKLIST

- [x] Perintah `pnpm db:seed` mengisi minimal 2 akun user, 20 produk, 15 member, dan 30 order historis tanpa error.
- [x] Perintah `pnpm test` menghasilkan 9/9 skenario integration test PASS (100% green).
- [x] `docker-compose.prod.yml` dapat dijalankan dan seluruh fungsionalitas aplikasi dapat diakses.
- [x] Master README.md lengkap dan panduan setup $\le 6$ perintah CLI terbukti berhasil dijalankan dari database kosong.
- [x] Seluruh kode bebas dari hardcoded SVG/emoji dan seluruh halaman responsif mobile-first.
- [x] Branch `feature/slice-9-seeder-prod-release` di-merge ke `develop` menggunakan flag `--no-ff`.
- [x] Branch `develop` di-merge ke `main` dan ditandai Git Tag **`v1.0.0`**.
