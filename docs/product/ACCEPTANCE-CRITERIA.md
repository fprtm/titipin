# ACCEPTANCE CRITERIA & VERIFICATION MATRIX
## Titipin — Sistem Point of Sale (POS) & Order Management

| Metadata | Keterangan |
| :--- | :--- |
| **Dokumen ID** | `AC-TITIPIN-001` |
| **Versi** | `1.2.0` |
| **Tanggal Efektif** | 27 Oktober 2026 |
| **Status** | APPROVED FOR QA & DEVELOPMENT |
| **Dokumen Acuan** | `docs/product/PRD.md`, `docs/product/USER-STORIES.md` |

---

## 1. PENDAHULUAN & PRINSIP PENGUJIAN

Dokumen Kriteria Keberterimaan (*Acceptance Criteria*) ini mendefinisikan kondisi terukur yang wajib terpenuhi agar suatu fitur dianggap selesai (*Definition of Done*) dan siap lolos uji (*QA-Ready*).

Format pengujian mengadopsi standar **BDD (Behavior-Driven Development)**:
* **Given:** Kondisi awal sistem / data sebelum aksi dijalankan.
* **When:** Aksi, pemicu (*trigger*), atau payload yang dikirimkan.
* **Then:** Hasil teramati (*observable outcome*), status HTTP, mutasi database, dan format respon.

---

## 2. MODUL AUTENTIKASI & KEAMANAN SESI (`auth`)

### AC-ATH-01: Autentikasi Pengguna Sukses (Happy Path)
* **Terkait:** FR-ATH-01, US-ATH-01, BR-007, BR-015
* **Given:** Pengguna terdaftar di database dengan email `admin@titipin.id` dan password `password123`, akun aktif (`deleted_at IS NULL`), role `ADMIN`.
* **When:** Pengguna mengirimkan `POST /api/auth/login` dengan payload:
  ```json
  { "email": "admin@titipin.id", "password": "password123" }
  ```
* **Then:**
  1. Server mengembalikan status `200 OK`.
  2. Response body berformat standar:
     ```json
     {
       "success": true,
       "message": "Login berhasil",
       "data": {
         "access_token": "<jwt_string>",
         "user": {
           "id": "<uuid>",
           "name": "Admin Titipin",
           "email": "admin@titipin.id",
           "role": "ADMIN"
         }
       }
     }
     ```
  3. Payload token JWT memuat claims: `sub` (user id), `email`, dan `role`.
  4. Header response memuat `Set-Cookie` untuk `refresh_token` dengan flag: `HttpOnly`, `SameSite=Strict`, `Path=/api/auth/refresh`, masa berlaku 7 hari.
  5. Hash refresh token tersimpan pada kolom `users.refresh_token_hash`.

### AC-ATH-02: Kredensial Tidak Valid (Negative Path)
* **Terkait:** FR-ATH-01, US-ATH-01
* **Given:** Akun `admin@titipin.id` terdaftar.
* **When:** Pengguna mengirimkan password salah ke `POST /api/auth/login`.
* **Then:**
  1. Server mengembalikan status `401 Unauthorized`.
  2. Respon JSON: `{ "success": false, "message": "Email atau kata sandi tidak valid" }`.
  3. Tidak ada token maupun cookie yang diterbitkan.

### AC-ATH-03: Login Diblokir untuk Akun Nonaktif
* **Terkait:** FR-ATH-01, US-ATH-01, BR-010
* **Given:** Akun kasir `kasir@titipin.id` sudah dinonaktifkan (`deleted_at IS NOT NULL`), password-nya masih valid.
* **When:** Kasir mencoba login dengan email & password yang benar.
* **Then:**
  1. Server mengembalikan status `401 Unauthorized`.
  2. Respon JSON: `{ "success": false, "message": "Email atau kata sandi tidak valid" }` — tidak membocorkan status nonaktif akun.
  3. Tidak ada token maupun cookie yang diterbitkan.

### AC-ATH-04: Silent Token Refresh via Mutex Queue
* **Terkait:** FR-ATH-02, US-ATH-02, BR-007
* **Given:** Access token kadaluarsa, cookie `refresh_token` yang sah masih aktif di browser, dan hash di DB cocok.
* **When:** Klien mengirimkan request ke `POST /api/auth/refresh` membawa cookie tersebut.
* **Then:**
  1. Server mengembalikan status `200 OK` dengan `access_token` baru.
  2. Jika ada 3 request konkuren yang gagal bersamaan (401), request queue mutex menahan request ke-2 dan ke-3 hingga refresh selesai, lalu mengeksekusi ulang ketiganya tanpa error 401 bocor ke pengguna.

### AC-ATH-05: Akses Endpoint Terproteksi Tanpa Token
* **Terkait:** FR-ATH-04, NFR-SEC-01
* **Given:** Klien tidak menyertakan header `Authorization` atau token JWT rusak.
* **When:** Klien memanggil endpoint terproteksi (`GET /api/products`, `POST /api/orders`, dsb).
* **Then:**
  1. Server mengembalikan status `401 Unauthorized`.
  2. Respon JSON: `{ "success": false, "message": "Akses tidak diizinkan. Token tidak ditemukan atau telah kedaluwarsa." }`.

### AC-ATH-06: Logout Pengguna & Stateful Invalidation
* **Terkait:** FR-ATH-03, US-ATH-03, BR-008
* **Given:** Pengguna dalam kondisi login dengan hash refresh token aktif di DB.
* **When:** Klien memanggil `POST /api/auth/logout`.
* **Then:**
  1. Server mengembalikan status `200 OK`.
  2. Nilai `users.refresh_token_hash` di database diubah menjadi `NULL`.
  3. Cookie `refresh_token` dihapus (diberikan `Max-Age=0`).
  4. Panggilan ulang ke `POST /api/auth/refresh` setelah logout ditolak dengan `401 Unauthorized`.

### AC-ATH-07: Perubahan Kata Sandi Mandiri
* **Terkait:** FR-ATH-06, US-ATH-04, BR-007, BR-008
* **Given:** Pengguna terautentikasi dengan kata sandi aktif `password123`.
* **When (Happy Path):** Pengguna mengirimkan `PATCH /api/auth/change-password` dengan payload:
  ```json
  {
    "current_password": "password123",
    "new_password": "newSecurePassword2026",
    "new_password_confirmation": "newSecurePassword2026"
  }
  ```
* **Then (Happy Path):**
  1. Server memverifikasi kecocokan `current_password` via bcrypt/argon2.
  2. Server mengembalikan status `200 OK` dengan pesan `"Kata sandi berhasil diubah"`.
  3. Hash kata sandi baru tersimpan di database.
  4. Kolom `users.refresh_token_hash` di-reset menjadi `NULL` (session revocation di perangkat lain).
* **When (Negative Path):** Password lama salah, atau konfirmasi tidak cocok, atau password baru kurang dari 8 karakter.
* **Then (Negative Path):** Server mengembalikan `422 Unprocessable Entity` dengan pesan validasi spesifik per field.

### AC-ATH-08: Proteksi Akses Berbasis Peran (RBAC - Kasir Ditolak dari Endpoint Admin)
* **Terkait:** BR-011, BR-015
* **Given:** Pengguna terautentikasi dengan akun Kasir (`role = CASHIER`).
* **When:** Kasir mencoba memanggil endpoint admin:
  - `GET /api/users`
  - `PATCH /api/users/:id/reset-password`
  - `DELETE /api/users/:id`
  - `GET /api/audit-logs`
* **Then:**
  1. Server mengembalikan status `403 Forbidden`.
  2. Respon JSON berformat:
     ```json
     {
       "success": false,
       "message": "Akses ditolak. Peran Anda tidak memiliki izin untuk mengakses sumber daya ini."
     }
     ```
  3. Tidak ada aksi mutasi database yang dieksekusi.

---

## 3. MODUL KATALOG PRODUK (`products`)

### AC-PRD-01: List Produk dengan Paginasi, Filter & Sort
* **Terkait:** FR-PRD-01, US-PRD-01
* **Given:** Terdapat 25 produk aktif di database.
* **When:** Klien memanggil `GET /api/products?page=1&per_page=10&search=hydro&sort=price&order=asc`.
* **Then:**
  1. Server mengembalikan status `200 OK`.
  2. Data hanya menyaring produk yang `deleted_at IS NULL` dan memuat kata "hydro".
  3. Data terurut dari harga termurah ke termahal.
  4. Response menyertakan objek `meta`: `{ "page": 1, "per_page": 10, "total": 1, "total_pages": 1 }`.

### AC-PRD-02: Tambah Produk Baru dengan Validasi Input
* **Terkait:** FR-PRD-02, US-PRD-02, BR-001
* **When:** Pengguna mengirimkan `POST /api/products` dengan payload valid.
* **Then:** Server mengembalikan `201 Created`. Data tersimpan di DB dengan `deleted_at = NULL`.

### AC-PRD-03: Penolakan Validasi Produk (Negative Path)
* **Terkait:** FR-PRD-02, US-PRD-02
* **Given:** Kode produk `P0001` sudah terdaftar.
* **When:** Pengguna mengirimkan produk baru dengan `product_code: "P0001"`, `stock: -5`, atau `price: 0`.
* **Then:** Server mengembalikan `422 Unprocessable Entity` dengan rincian key error per field.

### AC-PRD-04: Soft Delete Produk & Proteksi Integritas Relasi
* **Terkait:** FR-PRD-04, US-PRD-04, BR-006
* **Given:** Produk ID 1 pernah ditransaksikan pada order `INV-20261021-0001`.
* **When:** Pengguna mengirimkan `DELETE /api/products/1`.
* **Then:**
  1. Server mengembalikan `200 OK` (atau `204 No Content`).
  2. Kolom `deleted_at` berisi timestamp saat ini (bukan hard delete).
  3. Produk ID 1 tidak muncul pada `GET /api/products`.
  4. Produk ID 1 ditolak jika dimasukkan ke transaksi baru `POST /api/orders` (HTTP 422).
  5. Produk ID 1 tetap muncul lengkap saat membuka `GET /api/orders/INV-20261021-0001`.

### AC-PRD-05: Ekspor Katalog Produk ke Format Excel (.xlsx)
* **Terkait:** FR-PRD-05, US-PRD-05, BR-006
* **When:** Pengguna mengirimkan request terautentikasi `GET /api/products/export`.
* **Then:**
  1. Server mengembalikan MIME type `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` dan header `Content-Disposition: attachment; filename=katalog_produk_YYYYMMDD.xlsx`.
  2. File memuat header baku: `product_code`, `product_name`, `stock`, `price`.
  3. Hanya produk aktif (`deleted_at IS NULL`) yang tercantum.

### AC-PRD-06: Impor Produk Idempoten (.xlsx & .csv) dengan Upsert Natural Key
* **Terkait:** FR-PRD-06, US-PRD-06, BR-001, BR-009
* **Given:** Database berisi Produk `P0001` (aktif) dan Produk `P0002` (soft-deleted).
* **When:** Pengguna mengunggah file yang berisi Row 1: Update `P0001`, Row 2: Restore `P0002`, Row 3: Insert `P0003` baru.
* **Then:**
  1. Server mengembalikan `200 OK` dengan: `{ "total_rows": 3, "inserted": 1, "updated": 2, "failed": 0 }`.
  2. `P0001` terupdate data & harga.
  3. `P0002` pulih aktif (`deleted_at = NULL`) dengan data terbaru.
  4. `P0003` ter-insert sebagai record baru.
  5. **Idempotensi:** Upload berkas yang sama kedua kalinya menghasilkan `inserted: 0, updated: 3` — tidak ada duplikasi.
* **When (Negative Path):** Baris memiliki `price <= 0` atau stok negatif.
* **Then (Negative Path):** Seluruh transaksi di-rollback atomik. Server mengembalikan `422` dengan rincian error per baris.

---

## 4. MODUL MANAJEMEN PELANGGAN / MEMBER (`customers`)

### AC-CST-01: CRUD Pelanggan dengan Validasi Enum Gender
* **Terkait:** FR-CST-01, FR-CST-02, US-CST-01, US-CST-02
* **When:** Pengguna mengirimkan `POST /api/customers` dengan data valid (termasuk `gender: "Pria"` atau `"Wanita"`).
* **Then:**
  1. Server mengembalikan `201 Created` beserta UUID pelanggan.
  2. Jika `gender` diisi selain `"Pria"` atau `"Wanita"`, server mengembalikan `422 Unprocessable Entity`.
* **When:** Pengguna melakukan `DELETE /api/customers/:id`.
* **Then:** Customer ditandai `deleted_at = NOW()` dan disembunyikan dari selector pelanggan baru.

---

## 5. ENGINE TRANSAKSI POS (`orders`)

### AC-ORD-01: Transaksi Member — Pembuatan Multi-Item Berhasil (Happy Path)
* **Terkait:** FR-ORD-01, US-ORD-01, BR-001, BR-002, BR-003, BR-004, BR-005, BR-013
* **Given:** Customer aktif dengan UUID `c001`. Produk ID 1 (Harga: Rp 12.000, Stok: 10). Produk ID 2 (Harga: Rp 20.000, Stok: 5).
* **When:** Klien mengirimkan:
  ```json
  POST /api/orders
  { "customer_id": "c001", "items": [{ "product_id": 1, "quantity": 2 }, { "product_id": 2, "quantity": 1 }] }
  ```
* **Then:**
  1. Server mengembalikan `201 Created`.
  2. Nomor order digenerate: `INV-YYYYMMDD-XXXX`.
  3. Total dihitung di backend: $2 \times 12.000 + 1 \times 20.000 = 44.000$.
  4. `order_items` mencatat `unit_price` snapshot: Item 1: `12000.00`, Item 2: `20000.00`.
  5. Stok terpotong atomik: Produk ID 1 menjadi 8, Produk ID 2 menjadi 4.

### AC-ORD-02: Transaksi Walk-in (Pelanggan Umum)
* **Terkait:** FR-ORD-01, US-ORD-02, BR-013
* **When:** Klien mengirimkan order **tanpa** `customer_id`:
  ```json
  POST /api/orders
  { "customer_id": null, "items": [{ "product_id": 1, "quantity": 1 }] }
  ```
* **Then:**
  1. Server mengembalikan `201 Created`.
  2. Order tersimpan dengan `customer_id = NULL`.
  3. `GET /api/orders/:id` menampilkan label "Pelanggan Umum" pada field pelanggan.
  4. Stok terpotong secara normal.

### AC-ORD-03: Penolakan Client Tampering pada Harga
* **Terkait:** BR-001
* **Given:** Produk ID 1 memiliki harga asli Rp 12.000 di master data.
* **When:** Client menyisipkan field harga palsu dalam payload: `{ "items": [{ "product_id": 1, "quantity": 1, "price": 1000 }] }`.
* **Then:**
  1. Server mengabaikan atau menolak field `price` dari client.
  2. Transaksi tetap dicatat dengan harga asli dari database (Rp 12.000).

### AC-ORD-04: Kegagalan Stok & Rollback Atomik Penuh (All-or-Nothing)
* **Terkait:** FR-ORD-01, US-ORD-05, BR-003, BR-004
* **Given:** Produk ID 1: Stok = 10. Produk ID 2: Stok = 3.
* **When:** Order meminta Produk ID 1: qty 2 dan Produk ID 2: qty 5 (melebihi stok 3).
* **Then:**
  1. Server mengembalikan `422 Unprocessable Entity`.
  2. Respon JSON memuat error spesifik: `{ "errors": { "items.1.quantity": ["Stok Produk ID 2 tersisa 3, diminta 5"] } }`.
  3. **Verifikasi Database:** Tidak ada record baru di `orders` maupun `order_items`. Stok Produk ID 1 tetap **10**, Stok Produk ID 2 tetap **3**.

### AC-ORD-05: Pencegahan Concurrency & Race Condition via Pessimistic Row Locking
* **Terkait:** BR-004, NFR-REL-01
* **Given:** Produk ID 3 hanya tersisa 1 unit.
* **When:** Dua request order (Order A & Order B) masing-masing meminta Produk ID 3 qty 1 masuk dalam milidetik yang sama.
* **Then:**
  1. Transaksi pertama yang memperoleh row lock berhasil: stok menjadi 0, HTTP 201.
  2. Transaksi kedua menunggu lock terbuka, membaca stok terkini (0), lalu ditolak dengan HTTP 422.
  3. Nilai stok akhir di database adalah **0** (tidak pernah menjadi $-1$).

### AC-ORD-06: Hold Transaksi — Disimpan ke `draft_orders` Tanpa Pemotongan Stok
* **Terkait:** FR-ORD-02, US-ORD-03, BR-012, BR-016
* **Given:** Kasir sedang menginput keranjang (customer `c001`, Produk ID 1 qty 3, Produk ID 1 stok = 10).
* **When:** Kasir mengirimkan `POST /api/orders/hold` dengan payload keranjang saat ini.
* **Then:**
  1. Server mengembalikan `200 OK` atau `201 Created` dengan data draft yang tersimpan.
  2. **Verifikasi Database:**
     - Data draft tersimpan pada tabel `draft_orders` dengan kolom `user_id` milik kasir pembuat, payload item, dan `customer_id`.
     - Tabel `orders` **tidak bertambah** (tidak ada transaksi baru).
     - Stok Produk ID 1 **tetap 10** (tidak berkurang sama sekali).
  3. Draft tersimpan dan dapat diambil melalui `GET /api/orders/held` oleh kasir yang sama.

### AC-ORD-07: Satu Kasir Hanya Boleh Satu Held Transaction di `draft_orders`
* **Terkait:** FR-ORD-02, US-ORD-03, BR-012, BR-016
* **Given:** Kasir sudah memiliki satu baris draft aktif di tabel `draft_orders`.
* **When:** Kasir mencoba mengirimkan `POST /api/orders/hold` untuk keranjang kedua.
* **Then:**
  1. Server mengembalikan `422 Unprocessable Entity`.
  2. Pesan error: "Anda sudah memiliki satu transaksi yang sedang di-hold. Selesaikan atau buang transaksi tersebut terlebih dahulu."
  3. Baris draft lama di `draft_orders` tidak tertimpa dan tidak bertambah.

### AC-ORD-08: Finalisasi Held Transaction — Mutasi dari `draft_orders` ke `orders`
* **Terkait:** FR-ORD-04, US-ORD-03, BR-003, BR-012, BR-016, BR-017
* **Given:** Kasir memiliki draft di `draft_orders` untuk Produk ID 1 qty 2 (stok saat ini = 10).
* **When:** Kasir mengirimkan `POST /api/orders/held/finalize`.
* **Then:**
  1. Server mengeksekusi transaksi database atomik: validasi ketersediaan stok & concurrency locking (`.for('update')`).
  2. Record order baru berstatus final masuk ke tabel `orders`.
  3. Record item masuk ke tabel `order_items` dengan unit price snapshot.
  4. Stok Produk ID 1 terpotong menjadi **8**.
  5. Baris draft milik kasir pada tabel `draft_orders` dihapus (*deleted*).
  6. Tabel `order_activity_logs` mencatat event `COMPLETED` untuk order tersebut.
  7. Server mengembalikan `201 Created` dengan nomor invoice `INV-YYYYMMDD-XXXX`.

### AC-ORD-09: Discard Held Transaction — Hapus dari `draft_orders`
* **Terkait:** FR-ORD-05, US-ORD-04, BR-012, BR-016
* **Given:** Kasir memiliki held transaction aktif di `draft_orders`.
* **When:** Kasir mengirimkan `DELETE /api/orders/held`.
* **Then:**
  1. Server mengembalikan `200 OK`.
  2. Baris draft milik kasir di tabel `draft_orders` dihapus.
  3. **Verifikasi:** Stok semua produk yang ada di draft tersebut tidak berubah sedikit pun, dan tabel `orders` tidak terpengaruh.

---

## 6. RIWAYAT TRANSAKSI, DETAIL & AUDIT TRAIL

### AC-HST-01: Filter Riwayat Order
* **Terkait:** FR-ORD-06, US-HST-01
* **Given:** Terdapat 30 transaksi historis (campuran member dan walk-in).
* **When:** Admin memanggil `GET /api/orders?from=2026-10-01&to=2026-10-15&customer_id=<uuid>&page=1`.
* **Then:**
  1. Server mengembalikan `200 OK`.
  2. Hanya order dalam rentang tanggal dan pelanggan yang diminta yang dikembalikan.
  3. Walk-in order (tanpa customer_id) tetap muncul di listing umum, namun tidak muncul jika filter `customer_id` digunakan.
  4. Response memuat `meta` paginasi.

### AC-HST-02: Integritas Snapshot Harga pada Riwayat
* **Terkait:** FR-ORD-07, US-HST-02, BR-002
* **Given:** Order `INV-20261021-0001` dibuat saat harga Produk ID 1 = Rp 12.000.
* **When:** Admin mengubah harga master Produk ID 1 menjadi Rp 18.000, lalu membuka detail order lama.
* **Then:**
  1. Detail order tetap menampilkan `unit_price: "12000.00"` dan `subtotal: "24000.00"`.
  2. Total nilai belanja order lampau tidak bergeser satu rupiah pun.

### AC-HST-03: Transaction Activity Log pada Detail Order
* **Terkait:** FR-ORD-07, FR-AUD-02, US-HST-02, BR-017
* **Given:** Order `INV-20261027-0001` dibuat melalui alur: dibuat/di-hold → dilanjutkan → diselesaikan.
* **When:** Pengguna membuka `GET /api/orders/INV-20261027-0001`.
* **Then:**
  1. Response menyertakan array `activity_log` yang bersumber dari tabel terpisah `order_activity_logs`.
  2. Setiap entri log memuat: `id`, `order_id`, `action` (contoh: `ORDER_CREATED`, `ORDER_HELD`, `ORDER_FINALIZED`), `performed_by` (nama staf/kasir pembuat), dan `created_at`.
  3. Data tersaji berurutan secara kronologis sesuai waktu kejadian.

### AC-AUD-01: Audit Trail — Pencatatan Aksi Write Otomatis
* **Terkait:** FR-AUD-01, US-AUD-01, BR-014, BR-017, NFR-AUD-01
* **Given:** Pengguna terautentikasi melakukan aksi write (misal: tambah produk, ubah harga, hapus pelanggan, ubah password, buat order, atau login).
* **When:** Aksi tersebut dieksekusi melalui endpoint terkait.
* **Then:**
  1. Interceptor/hook backend secara otomatis memasukkan 1 baris baru ke tabel terpisah `audit_logs`.
  2. Setiap record memuat: `user_id`, `action` (enum), `entity_type` (contoh: `PRODUCT`, `CUSTOMER`, `ORDER`, `USER`, `AUTH`), `entity_id`, `payload` (diff JSON data sebelum & sesudah), dan `created_at`.
  3. **Verifikasi Immutability:** Tidak tersedia endpoint `PUT` atau `DELETE` pada `audit_logs` (bersifat append-only). Update atau delete langsung ke tabel ditolak/ditiadakan.

### AC-AUD-02: Audit Trail — Filter & Listing Khusus Admin
* **Terkait:** FR-AUD-03, US-AUD-01, BR-014, BR-015
* **Given:** Terdapat beragam log aktivitas di tabel `audit_logs`.
* **When (Admin):** Admin (`role = ADMIN`) memanggil `GET /api/audit-logs?user_id=<uuid>&action=PRODUCT_DELETED&from=2026-10-01&page=1`.
* **Then (Admin):**
  1. Server mengembalikan `200 OK`.
  2. Hanya log yang cocok dengan filter yang dikembalikan, lengkap dengan metadata paginasi.
* **When (Kasir):** Kasir (`role = CASHIER`) memanggil `GET /api/audit-logs`.
* **Then (Kasir):** Server menolak dengan `403 Forbidden` sesuai BR-015.

---

## 7. DASHBOARD ANALITIK (`dashboard`)

### AC-DSH-01: Ringkasan Metrik dengan Filter Periode
* **Terkait:** FR-DSH-01, US-DSH-01, BR-019
* **Given:** Database telah terisi minimal 30 transaksi dari seeder.
* **When (Daily):** Klien memanggil `GET /api/dashboard/summary?period=daily`.
* **Then (Daily):** Server mengembalikan total transaksi dan omset khusus hari ini (00:00–23:59 waktu lokal).
* **When (Monthly):** Klien memanggil `GET /api/dashboard/summary?period=monthly`.
* **Then (Monthly):** Server mengembalikan total transaksi dan omset khusus bulan kalender berjalan (misal 1–31 Oktober).
* **When (Quarterly):** Klien memanggil `GET /api/dashboard/summary?period=quarterly`.
* **Then (Quarterly):** Server mengembalikan total transaksi dan omset khusus kuartal kalender berjalan (Q1: Jan–Mar, Q2: Apr–Jun, Q3: Jul–Sep, Q4: Okt–Des).
* **Format Response:**
  ```json
  {
    "success": true,
    "data": {
      "period": "monthly",
      "total_transactions": 25,
      "total_sales_amount": 1250000.00,
      "top_products": [...],
      "slow_products": [...],
      "low_stock_products": [...]
    }
  }
  ```

### AC-DSH-02: Data Tren Penjualan
* **Terkait:** FR-DSH-02, US-DSH-02, BR-019
* **When:** Klien memanggil `GET /api/dashboard/trend?period=monthly`.
* **Then:**
  1. Server mengembalikan `200 OK` dengan array data per hari: `[{ "date": "2026-10-01", "transactions": 3, "revenue": 150000 }, ...]`.
  2. Data mencakup seluruh hari dalam periode bulan yang diminta (termasuk hari dengan transaksi = 0).

### AC-DSH-03: Produk Terlaris & Produk Lesu
* **Terkait:** FR-DSH-03, FR-DSH-04, US-DSH-03, US-DSH-04, BR-018, BR-019
* **When:** Klien memanggil `GET /api/dashboard/summary?period=monthly`.
* **Then:**
  1. `top_products`: Maksimal 5 produk aktif, terurut dari total kuantitas terjual terbanyak dalam periode tersebut.
  2. `slow_products`: Tepat bottom 5 produk aktif dengan kuantitas penjualan paling sedikit dalam periode tersebut. Produk aktif yang memiliki 0 penjualan diprioritaskan paling atas.

### AC-DSH-04: Peringatan Stok Kritis
* **Terkait:** FR-DSH-05, US-DSH-05
* **Then:** `low_stock_products` menyaring semua produk aktif yang memiliki `stock < 5`, tidak terikat filter periode.

---

## 8. MANAJEMEN PENGGUNA INTERNAL (`users`)

### AC-USR-01: Listing Pengguna Sistem (Admin Only)
* **Terkait:** FR-USR-01, US-USR-01, BR-011, BR-015
* **Given:** Terdapat 3 akun: 1 Admin aktif (`role: ADMIN`), 1 Kasir aktif (`role: CASHIER`), 1 Kasir nonaktif (`deleted_at IS NOT NULL`).
* **When (Admin):** Admin memanggil `GET /api/users` dengan token Bearer.
* **Then (Admin):**
  1. Server mengembalikan `200 OK` dengan seluruh 3 user beserta field `role` dan status aktif/nonaktif dari `deleted_at`.
* **When (Kasir):** Kasir memanggil `GET /api/users`.
* **Then (Kasir):** Server menolak dengan `403 Forbidden`.

### AC-USR-02: Reset Password Staf/Kasir oleh Admin
* **Terkait:** FR-USR-02, US-USR-02, BR-010, BR-011, BR-015
* **Given:** User Kasir `kasir-uuid` aktif, memiliki sesi aktif (`refresh_token_hash` terisi).
* **When (Happy Path):** Admin mengirimkan `PATCH /api/users/kasir-uuid/reset-password` dengan `new_password` valid.
* **Then (Happy Path):**
  1. Server mengembalikan `200 OK`.
  2. Hash password baru tersimpan di `users.password`.
  3. `users.refresh_token_hash` pada akun target menjadi `NULL` — sesi kasir ter-revoke.
* **When (Negative — Self-Guard):** Admin menargetkan ID akun dirinya sendiri.
* **Then:** Server mengembalikan `403 Forbidden`.
* **When (Negative — Target Nonaktif):** Target user sudah soft-deleted.
* **Then:** Server mengembalikan `422 Unprocessable Entity`.

### AC-USR-03: Penonaktifan Akun Staf/Kasir (Soft Delete + Instant Session Revocation)
* **Terkait:** FR-USR-03, US-USR-03, BR-010, BR-011, BR-015
* **Given:** Kasir `kasir-uuid` aktif, memiliki `refresh_token_hash` terisi, dan pernah membuat order `INV-20261021-0001`.
* **When:** Admin mengirimkan `DELETE /api/users/kasir-uuid`.
* **Then:**
  1. Server mengembalikan `200 OK`.
  2. **Verifikasi Database (Atomik):** `users.deleted_at = NOW()` dan `users.refresh_token_hash = NULL`.
  3. `POST /api/auth/login` dengan email & password kasir tersebut ditolak `401 Unauthorized`.
  4. `POST /api/auth/refresh` dengan cookie refresh token kasir tersebut ditolak `401 Unauthorized`.
  5. `GET /api/orders/INV-20261021-0001` tetap menampilkan nama kasir sebagai pembuat order (audit trail utuh).
* **When (Negative — Self-Guard):** Admin menargetkan ID akun dirinya sendiri.
* **Then:** Server mengembalikan `403 Forbidden`.

### AC-USR-04: Menambahkan Pengguna Baru oleh Admin
* **Terkait:** FR-USR-04, US-USR-04, BR-011, BR-015
* **Given:** Admin aktif memanggil sistem dengan Bearer token yang sah.
* **When (Happy Path):** Admin mengirimkan `POST /api/users` dengan payload:
  ```json
  {
    "name": "Kasir Baru",
    "email": "kasirbaru@titipin.id",
    "password": "password123",
    "role": "CASHIER"
  }
  ```
* **Then (Happy Path):**
  1. Server mengembalikan status `201 Created`.
  2. Data user tersimpan di tabel `users` dengan hash password terenkripsi (`bcrypt`/`argon2id`).
  3. `deleted_at` bernilai `NULL` (status aktif).
  4. Response body mengembalikan detail user tanpa membocorkan hash password.
* **When (Negative — Duplicate Email):** Admin mengirimkan email yang sudah ada di database.
* **Then:** Server menolak dengan `422 Unprocessable Entity` ("Email sudah terdaftar").
* **When (Negative — Kasir Forbidden):** Kasir mencoba mengirimkan request ke `POST /api/users`.
* **Then:** Server menolak dengan `403 Forbidden`.

---

## 9. SEEDER & AUTOMATED INTEGRATION TESTS (DEFINITION OF DONE)

### AC-DEV-01: Database Seeding Lengkap
* **Terkait:** NFR-DEV-01, BR-015
* **Given:** Database PostgreSQL bersih/kosong.
* **When:** Perintah `pnpm seed` dijalankan.
* **Then:**
  1. Terbentuk minimal 2 akun user:
     - 1 Admin: `admin@titipin.id` / `password123` (`role = ADMIN`).
     - 1 Kasir: `kasir@titipin.id` / `password123` (`role = CASHIER`).
  2. Terbentuk minimal **20 produk** aktif dengan variasi harga dan stok (termasuk beberapa dengan stok $<5$).
  3. Terbentuk minimal **15 pelanggan** (member).
  4. Terbentuk minimal **30 order** transaksi realistis dalam 30 hari terakhir (campuran walk-in dan member).
  5. Terbentuk record `audit_logs` dan `order_activity_logs` yang mencerminkan aktivitas seeder.

### AC-DEV-02: Kelulusan Automated Integration Tests
* **Terkait:** QA Handover (G4)
* **Given:** Test environment dijalankan via Vitest / Jest.
* **When:** Script `pnpm test` dijalankan.
* **Then:** Minimal 9 skenario integrasi berikut wajib lulus 100%:
  - `[PASS]` TEST-01: Buat order member sukses (stok terpotong, invoice terbit, total valid).
  - `[PASS]` TEST-02: Buat order walk-in sukses (customer_id null, stok terpotong, label Pelanggan Umum).
  - `[PASS]` TEST-03: Stok tidak cukup (seluruh transaksi rollback, stok utuh).
  - `[PASS]` TEST-04: Hold transaksi ke `draft_orders` (stok utuh), lalu finalize ke `orders` (stok terpotong, draft terhapus).
  - `[PASS]` TEST-05: Validasi input gagal (kuantitas negatif / payload korup ditolak 422).
  - `[PASS]` TEST-06: Akses endpoint tanpa token (ditolak 401).
  - `[PASS]` TEST-07: Integritas soft delete produk (tidak bisa di-order, tetap tampil di riwayat lama).
  - `[PASS]` TEST-08: Soft delete user — blokir login & silent refresh ditolak, audit trail order tetap utuh.
  - `[PASS]` TEST-09: RBAC Guard — Kasir mengakses endpoint Admin (`/api/users`, `/api/audit-logs`) ditolak 403 Forbidden.

---

## 10. MODUL ANALITIK PENJUALAN & BUSINESS INTELLIGENCE (`analytics`)

### AC-ANL-01: Ringkasan Metrik Overview & Filter Periode
* **Terkait:** FR-ANL-01, BR-019
* **Given:** Pengguna dengan role `ADMIN` login ke sistem dan membuka `/analytics`.
* **When:** Memilih filter periode (`daily`, `monthly`, `quarterly`, `yearly`) atau kustom (`from`, `to`).
* **Then:**
  1. Server merespon `200 OK` via `GET /api/analytics/overview`.
  2. Data menyajikan: `totalRevenue`, `totalOrders`, `averageOrderValue` (AOV), dan `totalUnitsSold`.
  3. Menyertakan array tren multi-axis (`revenue` dan `orderCount` per titik waktu) untuk visualisasi dual-axis Recharts.
  4. Response dibatasi hanya untuk role `ADMIN` (role `CASHIER` menerima `403 Forbidden`).

### AC-ANL-02: Rekomendasi Bundling Kombo (Market Basket Analysis)
* **Terkait:** FR-ANL-02, BR-020
* **Given:** Terdapat minimal 2 transaksi di mana dua produk berbeda dibeli bersamaan dalam satu pesanan.
* **When:** Memanggil `GET /api/analytics/basket-analysis`.
* **Then:**
  1. Server merespon `200 OK` dengan daftar pasangan produk.
  2. Setiap pasangan menyajikan `productA`, `productB`, `pairCount` ($\ge 2$), dan estimasi `potentialDiscountRevenue`.
  3. Pasangan diurutkan secara menurun (*descending*) berdasarkan `pairCount`.

### AC-ANL-03: Distribusi Jam Belanja Sibuk (Peak Hours)
* **Terkait:** FR-ANL-03
* **Given:** Transaksi historis tercatat dengan timestamp `order_date` yang bervariasi.
* **When:** Memanggil `GET /api/analytics/peak-hours`.
* **Then:**
  1. Server mengembalikan array 24 elemen (jam 00:00 s.d. 23:00) yang memetakan `orderCount` dan `totalRevenue` per jam.
  2. Mengidentifikasi jam dengan transaksi tertinggi sebagai penanda jam sibuk toko (*peak shopping hour*).

### AC-ANL-04: Segmentasi Pelanggan (Member vs Walk-in)
* **Terkait:** FR-ANL-04, BR-013
* **When:** Memanggil `GET /api/analytics/customer-segments`.
* **Then:**
  1. Server mengembalikan komparasi antara kategori `Member` (`customer_id IS NOT NULL`) dan `Walk-in` (`customer_id IS NULL`).
  2. Menghitung persentase kontribusi omset (*revenue share*) dan persentase volume transaksi secara akurat.

---

## 11. ERGONOMI KASIR POS & PINTASAN KEYBOARD

### AC-POS-01: Navigasi Cepat Papan Ketik (Keyboard Shortcuts)
* **Terkait:** FR-POS-01, BR-021
* **Given:** Kasir membuka antarmuka terminal kasir `/pos`.
* **When:** Menekan tombol pintasan keyboard:
  - `F2`: Fokus kursor langsung beralih ke input pencarian produk katalog.
  - `F8`: Memicu fungsi tahan keranjang (*hold cart*) jika keranjang memiliki item.
  - `F9`: Membuka modal konfirmasi pembayaran / checkout jika keranjang memiliki item.
  - `Esc`: Menutup modal pembayaran atau modal hold tanpa memproses transaksi.
* **Then:** Antarmuka merespon seketika tanpa perlu kasir menggunakan mouse/trackpad, dan badge visual tombol (`kbd`) tampil di tombol terkait.

### AC-POS-02: Debounced Search Input
* **Terkait:** FR-POS-01, BR-022
* **Given:** Kasir mengetik kata kunci pencarian produk di `/pos` atau riwayat di `/orders`.
* **When:** Kasir mengetik karakter dengan cepat (interval $<300\text{ms}$).
* **Then:** Sistem menahan pengiriman query ke server hingga jeda pengetikan mencapai 300ms, mencegah *query flooding* ke database.

---

## 12. OBSERVABILITY, GIN TRIGRAM & STRESS BENCHMARK

### AC-MON-01: Prometheus Metrics Scraping
* **Terkait:** FR-MON-01, NFR-MON-01
* **When:** Scraper Prometheus atau penguji memanggil `GET /api/metrics`.
* **Then:**
  1. Server merespon status `200 OK` dengan `Content-Type: text/plain; version=0.0.4`.
  2. Menyertakan metrik CPU (`process_cpu_user_seconds_total`), heap memori V8, counter request `http_requests_total`, histogram `http_request_duration_seconds_bucket`, dan status connection pool PostgreSQL (`database_connections_active`, `idle`, `waiting`).

### AC-PRF-01: Akselerasi Indeks GIN Trigram
* **Terkait:** NFR-PRF-01
* **Given:** Ekstensi `pg_trgm` terpasang di PostgreSQL.
* **When:** Menjalankan query pencarian produk, pelanggan, atau invoice dengan pola substring `ILIKE '%keyword%'`.
* **Then:** Query planner PostgreSQL mengeksekusi *Bitmap Index Scan* via indeks `idx_products_name_trgm`, `idx_customers_name_trgm`, atau `idx_orders_number_trgm` tanpa melakukan sequential scan.

### AC-PRF-02: Benchmark Beban Konkuren Atomik
* **Terkait:** NFR-REL-01, NFR-PRF-01
* **Given:** Produk dengan sisa stok tepat 5 unit di database.
* **When:** Skrip `pnpm benchmark` dijalankan, mengirimkan **30 request checkout konkuren** secara serentak.
* **Then:**
  1. Tepat 5 transaksi berhasil (`201 Created`).
  2. Tepat 25 transaksi ditolak dengan bersih (`422 Unprocessable Entity`).
  3. Sisa stok produk di database adalah tepat 0 (*zero-overselling*).
  4. Durasi total eksekusi $< 500\text{ms}$ (throughput $> 200\text{ req/sec}$) tanpa *connection pool starvation* atau deadlock (40P01).
