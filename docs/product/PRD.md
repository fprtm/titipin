# PRODUCT REQUIREMENTS DOCUMENT (PRD)
## Titipin — Sistem Point of Sale (POS) & Order Management

| Metadata | Keterangan |
| :--- | :--- |
| **Dokumen ID** | `PRD-TITIPIN-001` |
| **Versi** | `1.1.0` |
| **Tanggal Efektif** | 27 Oktober 2026 |
| **Status** | APPROVED FOR ARCHITECTURE & DEVELOPMENT |
| **Track Terpilih** | Track A (Node.js 24 LTS / TypeScript Strict, Drizzle ORM, Next.js App Router) |

---

## 1. PENDAHULUAN & LATAR BELAKANG

### 1.1 Konteks Produk
**Titipin** adalah sistem *Point of Sale* (POS) berbasis web untuk operasional penjualan internal toko. Sistem dirancang untuk digunakan kasir di lingkungan toko fisik — bukan sebagai platform e-commerce publik. Karakteristik POS ini memengaruhi desain secara menyeluruh: transaksi dimulai dan diselesaikan oleh kasir di hadapan pelanggan, tidak ada self-checkout, dan responsivitas antarmuka adalah kunci efisiensi layanan.

### 1.2 Masalah Bisnis (Problem Statement)
Operasional penjualan membutuhkan sistem POS yang tangguh, akurat, dan dapat diandalkan. Beberapa masalah operasional kritis yang diselesaikan oleh sistem ini:
1. **Risiko Ketidakkonsistenan Stok (*Overselling*):** Kegagalan stok pada salah satu produk sering kali menyebabkan pemotongan stok parsial yang tidak atomik, atau terjadi *race condition* saat dua kasir memproses produk yang sama secara bersamaan.
2. **Manipulasi & Ketidakakuratan Harga:** Kerentanan pada sistem yang mempercayai perhitungan kalkulasi harga atau total belanja yang dikirimkan dari sisi klien (*client-side tampering*).
3. **Penyimpangan Data Historis (*Price Drift*):** Perubahan harga produk di masa depan dapat merusak rekapitulasi laba rugi transaksi masa lalu jika sistem tidak mengimplementasikan *price snapshotting* pada tingkat baris transaksi.
4. **Kehilangan Rekam Jejak Audit Akibat *Hard Delete*:** Penghapusan data master produk atau pelanggan dapat merusak integritas relasi foreign key riwayat transaksi.
5. **Tidak Ada Mekanisme Hold Transaksi:** Kasir tidak dapat menangani antrean pelanggan secara bersamaan — transaksi yang sedang berjalan harus diselesaikan atau dibatalkan sebelum melayani pelanggan berikutnya.
6. **Visibilitas Inventaris & Performa Bisnis Rendah:** Ketiadaan monitoring terpusat untuk produk menipis, tren penjualan harian/bulanan/kuartalan, dan produk yang penjualannya lesu.

### 1.3 Tujuan Produk (Product Goals)
* **Integritas Transaksi Finansial 100%:** Setiap transaksi bersifat atomik (*All-or-Nothing*), bebas *race condition* via *pessimistic row locking*, dan kalkulasi harga murni di server.
* **Efisiensi Operasional POS:** Kasir dapat melayani lebih dari satu antrean pelanggan secara bergilir melalui mekanisme *Transaction Hold*. Transaksi dapat dibuat untuk pelanggan terdaftar (member) maupun pelanggan umum (*walk-in*) tanpa hambatan.
* **Auditability & Data Preservation:** Riwayat transaksi lampau tetap utuh via *price snapshotting* dan *soft delete*. Seluruh aktivitas write dari pengguna tercatat di *audit trail* terpusat.
* **Visibilitas Bisnis Real-Time:** Dashboard menyajikan metrik performa harian, bulanan, dan kuartalan beserta tren penjualan dan deteksi produk lesu.
* **Keamanan Standar Industri:** Dual-Token JWT (Access Token + Refresh Token via HTTP-only Cookie) dengan proteksi SSR Edge Middleware.

---

## 2. TARGET PENGGUNA (TARGET USERS & PERSONAS)

| Persona / Peran | Deskripsi | Kebutuhan Utama | Batasan Hak Akses |
| :--- | :--- | :--- | :--- |
| **Kasir / Sales Officer** | Staf operasional yang melayani transaksi penjualan di toko. | - Input order multi-item dengan cepat.<br>- Hold transaksi saat melayani pelanggan antri.<br>- Feedback instan jika stok tidak mencukupi.<br>- Melihat riwayat transaksi. | Dapat membuat & meng-hold transaksi, melihat produk & pelanggan, melihat riwayat transaksi. Dibatasi dari konfigurasi sistem. |
| **Admin Operasional / Store Manager** | Penanggung jawab katalog barang, data pelanggan, dan analisis performa toko. | - Manajemen katalog produk.<br>- Manajemen pelanggan & pengguna.<br>- Dashboard performa bisnis lengkap.<br>- Akses audit trail. | Hak akses penuh terhadap seluruh modul CRUD, audit log, dan dashboard analitik. |

---

## 3. RUANG LINGKUP PRODUK (PRODUCT SCOPE)

### 3.1 Ruang Lingkup MVP (In-Scope)

1. **Modul Autentikasi & Keamanan Sesi (`auth`):**
   - Login dengan validasi kredensial (email & password terenkripsi bcrypt/argon2).
   - Dual Token Lifecycle: Access Token (15 menit, in-memory) + Refresh Token di HTTP-only cookie (7 hari).
   - Endpoint profil diri (`GET /api/auth/me`).
   - Pembaruan nama profil pengguna (`PATCH /api/auth/me`).
   - Perubahan kata sandi mandiri (`PATCH /api/auth/change-password`) dengan verifikasi password lama dan pencabutan sesi aktif.
   - Logout stateful dengan pembatalan hash refresh token di database.
   - Proteksi rute SSR via Next.js Edge Middleware dan proteksi API via NestJS JWT Guard.

2. **Modul Manajemen Produk (`products`):**
   - CRUD Produk dengan validasi: `product_code` unik, `price > 0`, `stock >= 0`.
   - Listing dengan paginasi, pencarian (`product_name` / `product_code`), dan sorting.
   - Penghapusan menggunakan *soft delete* (`deleted_at`). Produk yang di-soft-delete tidak muncul di katalog POS baru, namun tetap tampil pada riwayat transaksi lama.
   - **Export Produk (Excel):** Mengunduh seluruh katalog produk aktif ke format `.xlsx`.
   - **Import Produk Idempoten (Excel & CSV):** Mengunggah data produk massal dari `.xlsx` maupun `.csv` dengan mekanisme *Idempotent Upsert* berbasis `product_code`.

3. **Modul Manajemen Pelanggan / Member (`customers`):**
   - CRUD Pelanggan (Nama, Alamat, Gender Enum Pria/Wanita, Tanggal Lahir, Nomor HP).
   - Pelanggan terdaftar diperlakukan sebagai **member** — dapat diidentifikasi pada transaksi untuk pelacakan riwayat pembelian.
   - Listing dengan paginasi dan pencarian berdasarkan nama pelanggan.
   - Penghapusan menggunakan *soft delete* (`deleted_at`).

4. **Modul Transaksi POS (`orders`):**
   - **Walk-in Support:** Kasir dapat memproses transaksi tanpa memilih pelanggan terdaftar. Order tanpa pelanggan disimpan dengan `customer_id = NULL` dan ditampilkan sebagai "Pelanggan Umum" di riwayat.
   - **Member Transaction:** Kasir dapat memilih pelanggan terdaftar (member) agar transaksi terkait dengan profil pelanggan tersebut.
   - **Transaction Hold:** Kasir dapat mem-*hold* satu transaksi yang sedang berjalan untuk melayani pelanggan antrean berikutnya. Transaksi yang di-hold disimpan sebagai draft di tabel `draft_orders` (terpisah dari tabel `orders`) secara per kasir (session-based), tidak memotong stok, dan dapat dilanjutkan kapan saja tanpa timeout otomatis. Setiap kasir hanya dapat memiliki satu held transaction aktif pada satu waktu.
   - Pembuatan order final multi-item dalam satu transaksi database atomik.
   - Verifikasi ketersediaan stok; rollback total jika salah satu item gagal.
   - Penanganan concurrency via *pessimistic row locking* (`SELECT ... FOR UPDATE`).
   - Kalkulasi subtotal per item dan total order mutlak di sisi server.
   - *Price snapshotting*: mencatat `unit_price` saat transaksi dibuat ke tabel `order_items`.
   - Pemotongan stok otomatis secara atomik setelah transaksi berhasil.
   - Penomoran order unik dengan format `INV-YYYYMMDD-XXXX`.
   - Metode pembayaran: **Lunas** saja (tunai / direct settlement). Sistem kredit/cicilan di luar ruang lingkup MVP.

5. **Modul Riwayat & Detail Order (`orders`):**
   - Listing riwayat transaksi dengan filter rentang tanggal (`from`, `to`), filter pelanggan (`customer_id`), dan paginasi.
   - Tampilan rincian order: data pelanggan (atau label "Pelanggan Umum"), kasir pembuat, tanggal, daftar item, harga snapshot, subtotal, dan total.
   - **Transaction Activity Log:** Setiap transaksi memiliki log aktivitas di tabel `order_activity_logs` yang mencatat kejadian penting dalam lifecycle order (dibuat, di-hold, dilanjutkan, selesai). Data ini disertakan dalam response detail order.

6. **Modul Audit Trail (`audit_logs`):**
   - Tabel `audit_logs` mencatat seluruh aksi *write* yang dilakukan oleh pengguna: login, logout, create/update/delete produk, create/update/delete pelanggan, create order, reset password user, dan deactivate user.
   - Setiap log entry menyimpan: `user_id`, `action` (enum), `entity_type`, `entity_id`, `payload` (data sebelum/sesudah perubahan, JSON), dan `created_at`.
   - Admin dapat mengakses dan memfilter audit trail melalui endpoint khusus.

7. **Modul Dashboard & Analitik (`dashboard`):**
   - **Kartu Metrik Ringkasan:** Total transaksi dan total omset penjualan (Rp) dengan filter periode: Harian, Bulanan, Kuartalan.
   - **Tren Penjualan:** Grafik tren omset dan jumlah transaksi harian dalam periode yang dipilih.
   - **Top 5 Produk Terlaris:** Daftar 5 produk dengan kuantitas terjual tertinggi.
   - **Produk Penjualan Lesu:** Daftar produk aktif dengan penjualan rendah dalam periode yang ditentukan (bottom performers).
   - **Peringatan Stok Kritis:** Daftar produk aktif dengan sisa stok $< 5$.

8. **Database Seeder & Initial State:**
   - 1 akun admin default (`admin@titipin.id`).
   - Minimal 20 produk katalog dengan variasi harga dan stok (termasuk beberapa dengan stok $< 5$).
   - Minimal 15 data pelanggan aktif (member).
   - Minimal 30 data order transaksi historis yang tersebar realistis dalam 30 hari terakhir (campuran walk-in dan member).

9. **Modul Manajemen Pengguna Internal (`users`):**
   - Listing pengguna sistem beserta status aktif/nonaktif dan role (`GET /api/users`).
   - Pendaftaran pengguna baru oleh Admin (`POST /api/users`): Admin dapat membuat akun staf baru (Kasir atau Admin) dengan validasi email unik dan password minimal 8 karakter (`BR-011`, `BR-015`).
   - Reset kata sandi staf/kasir oleh Admin (`PATCH /api/users/:id/reset-password`): Server meng-hash password baru, menyimpannya, dan mengosongkan `refresh_token_hash = NULL` pada akun target (instant session revocation di semua perangkat), tanpa ketergantungan SMTP.
   - Penonaktifan akun staf/kasir via *soft delete* (`DELETE /api/users/:id`): menyetel `deleted_at = NOW()` sekaligus mengosongkan `refresh_token_hash = NULL` secara atomik. Akun yang dinonaktifkan langsung diblokir dari login — pencegahan terjadi saat silent refresh berikutnya. Jejak transaksi lampau (`orders.created_by`) tetap utuh.
   - *Role pada Users:* Setiap user memiliki field `role` enum (`ADMIN` | `CASHIER`). Endpoint User Management dan Audit Trail hanya dapat diakses role `ADMIN`.
   - *Proteksi Diri (Self-Guard):* Admin tidak dapat menonaktifkan atau mereset password akun miliknya sendiri.
   - *Catatan Entitas:* Pelanggan (`customers`) adalah pembeli eksternal tanpa akun login, sedangkan `users` adalah operator internal dengan hak login. Keduanya memiliki `deleted_at` namun hanya `users` yang memiliki mekanisme autentikasi.

### 3.2 Di Luar Ruang Lingkup MVP (Out-of-Scope / Future Enhancements)
* Sistem Kredit & Cicilan: pembayaran parsial, tracking piutang, aging report.
* Sistem Loyalty Points / Reward Member (pengembangan di atas fondasi member MVP).
* Granular RBAC (penambahan permission rule yang lebih granular per endpoint di luar ADMIN/CASHIER dasar).
* Integrasi Payment Gateway pihak ketiga (Midtrans/Xendit).
* Sistem pengiriman ekspedisi / tracking kurir logistik.
* Multi-outlet / multi-warehouse inventory distribution.
* Sistem diskon voucher belanja atau promo bertingkat.

---

## 4. ATURAN BISNIS INTI (BUSINESS RULES & INVARIANTS)

* **BR-001 (Server-Side Pricing & Zero-Trust Client):** Klien dilarang mengirimkan data harga atau total. Server wajib mengambil harga dari tabel `products` dan melakukan seluruh perhitungan aritmatika moneter di backend.
* **BR-002 (Immutable Historical Price Snapshot):** Nilai `order_items.unit_price` mencatat harga saat transaksi terjadi. Perubahan harga produk di masa depan tidak boleh mengubah nilai transaksi historis.
* **BR-003 (All-or-Nothing Atomic Transaction):** Jika dalam keranjang terdapat item yang stoknya kurang dari kuantitas yang diminta, transaksi langsung digagalkan (rollback penuh), tanpa ada produk yang stoknya terpotong.
* **BR-004 (Concurrency Safety via Row Locking):** Pemrosesan order wajib mengunci baris produk (`FOR UPDATE`) di dalam transaksi database agar terhindar dari *race condition* dan *overselling*.
* **BR-005 (Standardized Order Number Sequencing):** Nomor order digenerate otomatis di backend dengan format `INV-YYYYMMDD-XXXX` (XXXX adalah nomor urut 4 digit harian, zero-padded).
* **BR-006 (Soft-Delete Historical Integrity):** Produk dan pelanggan yang dihapus berstatus *soft-deleted*. Produk tersebut dilarang untuk transaksi baru, namun wajib tetap terbaca pada detail transaksi lama.
* **BR-007 (XSS-Proof Dual-Token Authentication):** Access token disimpan in-memory berumur 15 menit; Refresh token disimpan di HTTP-only cookie berumur 7 hari. Interceptor HTTP di klien menampung antrean request konkuren saat auto-refresh berjalan.
* **BR-008 (Stateful Revocation on Logout):** Hash refresh token di database dikosongkan (`NULL`) saat logout sehingga sesi tidak dapat diremajakan kembali.
* **BR-009 (Idempotent Product Upsert via Natural Key):** Pada import produk massal, `product_code` berfungsi sebagai natural key. Jika aktif → update; jika soft-deleted → restore & update; jika baru → insert. Import berulang dengan berkas yang sama menghasilkan kondisi database identik (idempoten).
* **BR-010 (Soft-Delete User = Instant Session Revocation):** Penghapusan akun staf/kasir bersifat *soft delete* (`deleted_at = NOW()`). Pada saat yang sama, `refresh_token_hash` dikosongkan (`NULL`) secara atomik. `POST /api/auth/login` wajib memfilter `WHERE deleted_at IS NULL`. Jejak transaksi historis (`orders.created_by`) tetap utuh.
* **BR-011 (Admin-Only User Management with Self-Guard):** Hanya Admin yang dapat menjalankan reset password dan soft delete terhadap akun staf/kasir lain. Admin dilarang menargetkan ID akun miliknya sendiri — server mengembalikan HTTP 403 Forbidden.
* **BR-012 (Transaction Hold — No Stock Deduction on Draft):** Transaksi yang berstatus *held* (draft) tidak memotong stok. Stok hanya dipotong secara atomik saat transaksi di-*finalize* (status berubah dari HELD ke COMPLETED). Setiap kasir hanya boleh memiliki satu held transaction aktif pada satu waktu.
* **BR-013 (Walk-in Order Allowed):** Transaksi dapat dibuat tanpa memilih pelanggan terdaftar (`customer_id = NULL`). Order tersebut disimpan dan ditampilkan dengan label "Pelanggan Umum" di seluruh antarmuka dan riwayat.
* **BR-014 (Audit Trail — Write Actions):** Seluruh aksi write yang dilakukan pengguna wajib dicatat di tabel `audit_logs`: login, logout, create/update/delete produk, create/update/delete pelanggan, create order, finalize held order, discard held order, reset password user, dan deactivate user. Setiap record menyimpan `user_id`, `action` (enum), `entity_type`, `entity_id`, `payload` (diff JSON sebelum & sesudah), dan `created_at`.
* **BR-015 (Role-Based Access Control via JWT Claim):** Setiap user memiliki kolom `role` dengan nilai enum `ADMIN` atau `CASHIER`. Role disertakan sebagai claim dalam JWT payload saat login. Endpoint-endpoint tertentu (User Management, Audit Trail) hanya dapat diakses oleh `role = ADMIN` — backend guard menolak role `CASHIER` dengan HTTP 403 Forbidden. Seeder menyediakan minimal 1 akun `ADMIN` dan 1 akun `CASHIER` sebagai data awal.
* **BR-016 (Draft Order Table Isolation):** Held/draft transaction disimpan di tabel terpisah `draft_orders`, bukan di tabel `orders`. Tabel `orders` hanya berisi transaksi yang telah **COMPLETED** (terfinalisasi). Setiap kasir (berdasarkan `user_id`) hanya dapat memiliki maksimal satu baris aktif di `draft_orders` pada satu waktu. Draft tidak dihitung dalam laporan, dashboard, atau analitik apa pun.
* **BR-017 (Dual Logging — Audit vs Order Activity):** Sistem menggunakan DUA jenis log yang terpisah: (1) `audit_logs` — log system-wide untuk seluruh aksi write pengguna, bersifat immutable dan dapat diakses Admin; (2) `order_activity_logs` — log khusus per transaksi yang mencatat lifecycle kejadian sebuah order (dibuat, di-hold, dilanjutkan, selesai). Data `order_activity_logs` disertakan dalam response detail order (`GET /api/orders/:id`).
* **BR-018 (Slow Product Definition):** Produk lesu (*slow products*) didefinisikan sebagai **bottom 5 produk aktif** berdasarkan total kuantitas terjual dalam periode yang dipilih. Produk aktif yang tidak memiliki satu pun transaksi dalam periode tersebut diprioritaskan paling atas dalam daftar. Jika terdapat kurang dari 5 produk aktif, seluruhnya ditampilkan.
* **BR-019 (Dashboard Period Definitions):** Filter periode `period` pada dashboard mengacu pada: `daily` = hari ini (00:00–23:59 waktu lokal server), `monthly` = bulan kalender berjalan (misal Oktober 2026: 1–31 Oktober), `quarterly` = kuartal kalender berjalan berdasarkan tanggal server (Q1: Jan–Mar, Q2: Apr–Jun, Q3: Jul–Sep, Q4: Okt–Des).

---

## 5. PERSYARATAN NON-FUNGSIONAL (NFR)

* **NFR-REL-01 (ACID Compliance):** Menggunakan PostgreSQL transaction isolation level `READ COMMITTED` yang diperkuat dengan explicit row-level locking.
* **NFR-ACC-01 (Financial Accuracy):** Penggunaan tipe data SQL `numeric(12,2)` untuk harga satuan dan `numeric(14,2)` untuk total uang guna menghindari pembulatan biner IEEE-754.
* **NFR-SEC-01 (API Authentication & Authorization):** Seluruh rute API selain `POST /api/auth/login` dan `POST /api/auth/refresh` wajib memvalidasi token JWT Bearer yang sah.
* **NFR-UX-01 (Responsiveness & Localization):** Tampilan responsif (desktop, tablet, mobile), format mata uang standar Indonesia (`Rp 12.000`), dan format tanggal terstandarisasi waktu lokal Indonesia.
* **NFR-DEV-01 (Developer Experience & Setup):** Aplikasi dapat dijalankan dari *scratch* (database kosong) hingga siap digunakan dalam maksimal 6 perintah CLI menggunakan Docker Compose.
* **NFR-AUD-01 (Audit Log Immutability):** Record di tabel `audit_logs` bersifat append-only — tidak ada mekanisme update atau delete pada tabel ini.

---

## 6. MATRIKS KEBUTUHAN FUNGSIONAL (FUNCTIONAL REQUIREMENTS TRACEABILITY)

| FR ID | Modul | Deskripsi Kebutuhan Fungsional | Aturan Terkait | Endpoint / Komponen |
| :--- | :--- | :--- | :--- | :--- |
| **FR-ATH-01** | Auth | Login user dan pengembalian access token serta set cookie refresh token | BR-007 | `POST /api/auth/login` |
| **FR-ATH-02** | Auth | Refresh access token menggunakan cookie HTTP-only | BR-007 | `POST /api/auth/refresh` |
| **FR-ATH-03** | Auth | Logout pengguna dan pencabutan sesi di server | BR-008 | `POST /api/auth/logout` |
| **FR-ATH-04** | Auth | Mengambil profil user yang sedang aktif | BR-007 | `GET /api/auth/me` |
| **FR-ATH-05** | Auth | Mengubah nama profil pengguna yang sedang login | BR-007 | `PATCH /api/auth/me` |
| **FR-ATH-06** | Auth | Mengubah kata sandi mandiri dengan verifikasi password lama & pencabutan sesi | BR-007, BR-008 | `PATCH /api/auth/change-password` |
| **FR-PRD-01** | Products | Menampilkan katalog produk dengan paginasi, pencarian nama/kode, dan sort | BR-006 | `GET /api/products` |
| **FR-PRD-02** | Products | Menambahkan produk baru dengan validasi kode unik, harga $>0$, stok $\ge 0$ | BR-001 | `POST /api/products` |
| **FR-PRD-03** | Products | Mengubah data produk yang ada | BR-001 | `PUT /api/products/:id` |
| **FR-PRD-04** | Products | Melakukan soft delete terhadap produk | BR-006 | `DELETE /api/products/:id` |
| **FR-PRD-05** | Products | Mengunduh (export) data katalog produk ke format Excel (.xlsx) | BR-006 | `GET /api/products/export` |
| **FR-PRD-06** | Products | Mengunggah (import) data produk massal idempoten (.xlsx & .csv) | BR-001, BR-009 | `POST /api/products/import` |
| **FR-CST-01** | Customers | Menampilkan daftar pelanggan/member dengan paginasi dan pencarian nama | BR-006 | `GET /api/customers` |
| **FR-CST-02** | Customers | Mendaftarkan pelanggan/member baru | - | `POST /api/customers` |
| **FR-CST-03** | Customers | Mengubah data pelanggan/member | - | `PUT /api/customers/:id` |
| **FR-CST-04** | Customers | Melakukan soft delete terhadap pelanggan/member | BR-006 | `DELETE /api/customers/:id` |
| **FR-ORD-01** | Orders | Memproses pembuatan transaksi POS baru (walk-in atau member) secara atomik | BR-001, BR-002, BR-003, BR-004, BR-005, BR-013 | `POST /api/orders` |
| **FR-ORD-02** | Orders | Menyimpan transaksi sebagai draft ke `draft_orders` per kasir tanpa memotong stok | BR-012, BR-016 | `POST /api/orders/hold` |
| **FR-ORD-03** | Orders | Mengambil detail held transaction milik kasir yang sedang login | BR-012, BR-016 | `GET /api/orders/held` |
| **FR-ORD-04** | Orders | Melanjutkan dan memfinalisasi held transaction menjadi order selesai | BR-003, BR-004, BR-012, BR-016 | `POST /api/orders/held/finalize` |
| **FR-ORD-05** | Orders | Membuang (discard) held transaction tanpa menyimpan order | BR-012, BR-016 | `DELETE /api/orders/held` |
| **FR-ORD-06** | Orders | Menampilkan daftar riwayat transaksi dengan filter tanggal dan pelanggan | - | `GET /api/orders` |
| **FR-ORD-07** | Orders | Menampilkan rincian transaksi beserta item, histori harga, dan `order_activity_logs` | BR-002, BR-006, BR-017 | `GET /api/orders/:id` |
| **FR-AUD-01** | Audit | Mencatat setiap aksi write pengguna ke tabel `audit_logs` secara otomatis | BR-014, BR-017, NFR-AUD-01 | `(Interceptor / Service Hook)` |
| **FR-AUD-02** | Audit | Mencatat lifecycle event per transaksi ke tabel `order_activity_logs` | BR-017 | `(Service Hook)` |
| **FR-AUD-03** | Audit | Menampilkan daftar audit log dengan filter user, action, entity, dan tanggal (Admin only) | BR-014, BR-015 | `GET /api/audit-logs` |
| **FR-DSH-01** | Dashboard | Kartu ringkasan metrik (total transaksi & omset) dengan filter periode Harian/Bulanan/Kuartalan | BR-019 | `GET /api/dashboard/summary?period=` |
| **FR-DSH-02** | Dashboard | Data tren penjualan (omset & jumlah transaksi per hari) dalam periode yang dipilih | BR-019 | `GET /api/dashboard/trend?period=` |
| **FR-DSH-03** | Dashboard | Daftar top 5 produk terlaris berdasarkan kuantitas terjual dalam periode | BR-019 | `GET /api/dashboard/summary` |
| **FR-DSH-04** | Dashboard | Daftar bottom 5 produk penjualan lesu dalam periode (produk 0 transaksi diprioritaskan) | BR-018, BR-019 | `GET /api/dashboard/summary` |
| **FR-DSH-05** | Dashboard | Daftar produk aktif dengan stok kritis ($< 5$) | - | `GET /api/dashboard/summary` |
| **FR-USR-01** | Users | Menampilkan daftar pengguna sistem beserta role dan status aktif/nonaktif (Admin only) | BR-011, BR-015 | `GET /api/users` |
| **FR-USR-02** | Users | Mereset kata sandi staf/kasir oleh Admin beserta instant session revocation (Admin only) | BR-010, BR-011, BR-015 | `PATCH /api/users/:id/reset-password` |
| **FR-USR-03** | Users | Menonaktifkan akun staf/kasir (soft delete + instant session revocation) (Admin only) | BR-010, BR-011, BR-015 | `DELETE /api/users/:id` |
| **FR-USR-04** | Users | Menambahkan akun pengguna staf/kasir baru ke dalam sistem (Admin only) | BR-011, BR-015 | `POST /api/users` |
