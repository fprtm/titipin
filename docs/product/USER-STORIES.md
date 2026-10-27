# USER STORIES & SCENARIOS
## Titipin — Sistem Point of Sale (POS) & Order Management

| Metadata | Keterangan |
| :--- | :--- |
| **Dokumen ID** | `US-TITIPIN-001` |
| **Versi** | `1.1.0` |
| **Status** | APPROVED FOR ARCHITECTURE & DEVELOPMENT |
| **Dokumen Induk** | `docs/product/PRD.md` |

---

## DAFTAR EPIC

* **EPIC-01: Autentikasi, Keamanan Sesi & Hak Akses**
* **EPIC-02: Manajemen Katalog Produk (Inventaris)**
* **EPIC-03: Manajemen Pelanggan / Member**
* **EPIC-04: Engine Transaksi POS (Order Processing & Hold)**
* **EPIC-05: Riwayat, Audit Detail Transaksi & Audit Trail**
* **EPIC-06: Dashboard Analitik & Monitoring**
* **EPIC-07: Manajemen Pengguna Internal (User Management)**

---

## EPIC-01: AUTENTIKASI, KEAMANAN SESI & HAK AKSES

### US-ATH-01: Login Pengguna
* **Sebagai:** Admin / Kasir
* **Saya ingin:** Masuk ke dalam sistem menggunakan email dan password yang terdaftar
* **Agar:** Saya dapat mengakses fitur operasional toko dengan aman sesuai hak akses saya.
* **Prioritas:** `MUST HAVE` (P0)
* **Aturan Terkait:** BR-007, BR-015
* **Alur Utama (Happy Path):**
  1. Pengguna membuka URL `/login`.
  2. Pengguna mengisi email dan password.
  3. Pengguna menekan tombol "Masuk".
  4. Sistem memverifikasi kredensial dan status akun (tidak soft-deleted).
  5. Sistem menerbitkan Access Token (in-memory, memuat claim `role`: `ADMIN` atau `CASHIER`) dan menyetel cookie Refresh Token `HttpOnly, Secure, SameSite=Strict`.
  6. Pengguna diarahkan ke halaman `/dashboard`. Antarmuka menyesuaikan menu navigasi berdasarkan peran pengguna.
* **Alur Alternatif / Pengecualian:**
  - Kredensial tidak cocok: Pesan error "Email atau password tidak valid" (HTTP 401).
  - Akun dinonaktifkan: Pesan error yang sama — tidak membocorkan status akun (HTTP 401).
  - Format input tidak valid: Validasi form mencegah submit dengan highlight merah pada field yang salah.

### US-ATH-02: Silent Token Auto-Refresh dengan Queue Mutex
* **Sebagai:** Pengguna Aktif
* **Saya ingin:** Sesi saya diperpanjang secara otomatis di latar belakang saat Access Token kadaluarsa
* **Agar:** Pekerjaan operasional saya tidak terputus secara mendadak.
* **Prioritas:** `MUST HAVE` (P0)
* **Aturan Terkait:** BR-007
* **Alur Skenario:**
  1. Access token (15 menit) habis masa berlakunya.
  2. Pengguna mengeksekusi beberapa permintaan API bersamaan.
  3. Request pertama yang menerima HTTP 401 mengaktifkan Mutex Refresh Lock. Request lainnya ditampung dalam antrean.
  4. Klien memanggil `POST /api/auth/refresh` membawa cookie refresh token.
  5. Server memvalidasi cookie, mencocokkan hash dengan database, dan menerbitkan access token baru.
  6. Klien mengeksekusi kembali seluruh request di antrean dengan token baru — transparan ke pengguna.

### US-ATH-03: Logout & Stateful Revocation
* **Sebagai:** Pengguna
* **Saya ingin:** Keluar dari akun saya dan mencabut sesi yang sedang aktif
* **Agar:** Akun saya tidak dapat disalahgunakan oleh pihak lain pada perangkat yang sama.
* **Prioritas:** `MUST HAVE` (P0)
* **Aturan Terkait:** BR-008
* **Alur Skenario:**
  1. Pengguna menekan tombol "Logout" pada menu profil.
  2. Klien memanggil `POST /api/auth/logout`.
  3. Server menghapus hash refresh token di database (`refresh_token_hash = NULL`) dan menghapus cookie.
  4. Klien mengosongkan state in-memory token dan mengarahkan pengguna ke `/login`.

### US-ATH-04: Mengubah Kata Sandi Mandiri (Change Password)
* **Sebagai:** Pengguna yang sedang login (Admin / Kasir)
* **Saya ingin:** Mengubah kata sandi akun saya sendiri dengan memverifikasi kata sandi saat ini
* **Agar:** Keamanan akun saya tetap terjaga secara berkala tanpa intervensi pihak luar.
* **Prioritas:** `SHOULD HAVE` (P1)
* **Aturan Terkait:** BR-007, BR-008
* **Alur Skenario:**
  1. Pengguna membuka modal "Ganti Password" di menu profil.
  2. Pengguna mengisi Kata Sandi Saat Ini, Kata Sandi Baru (min. 8 karakter), dan Konfirmasi.
  3. Server memverifikasi kecocokan password lama via bcrypt/argon2.
  4. Server menyimpan hash password baru dan me-reset `refresh_token_hash = NULL` (mencabut sesi di perangkat lain).
  5. Sistem memberikan notifikasi sukses.
* **Kasus Pengecualian:**
  - Password saat ini salah: HTTP 422 dengan pesan "Kata sandi saat ini tidak cocok".
  - Konfirmasi tidak sesuai: Form validasi di client memblokir submit.

### US-ATH-05: Memperbarui Nama Profil (Update Profile)
* **Sebagai:** Pengguna yang sedang login
* **Saya ingin:** Memperbarui nama tampilan profil saya
* **Agar:** Identitas saya yang tercantum pada nota transaksi selalu aktual.
* **Prioritas:** `SHOULD HAVE` (P1)
* **Aturan Terkait:** BR-007
* **Alur Skenario:**
  1. Pengguna membuka modal profil di navbar.
  2. Pengguna mengubah nama tampilan (maks 100 karakter).
  3. Server memvalidasi dan memperbarui kolom `users.name`.
  4. Antarmuka langsung memperbarui nama yang ditampilkan di avatar/navbar.

---

## EPIC-02: MANAJEMEN KATALOG PRODUK (INVENTARIS)

### US-PRD-01: Melihat Katalog Produk dengan Pencarian & Urutan
* **Sebagai:** Admin / Kasir
* **Saya ingin:** Melihat daftar produk dengan informasi kode, nama, harga, dan sisa stok lengkap dengan paginasi, pencarian, dan pengurutan
* **Agar:** Saya dapat dengan cepat menemukan produk atau memonitor ketersediaan stok.
* **Prioritas:** `MUST HAVE` (P0)
* **Aturan Terkait:** BR-006
* **Alur Skenario:**
  1. Pengguna membuka menu "Produk" (`/products`).
  2. Sistem menampilkan tabel produk aktif: Kode, Nama Produk, Stok, Harga, dan Aksi.
  3. Pengguna mengetikkan kata kunci pada kotak pencarian (kode atau nama produk).
  4. Pengguna mengklik header kolom untuk mengubah urutan (ASC / DESC).
  5. Pengguna berpindah halaman melalui navigasi paginasi.

### US-PRD-02: Menambah Produk Baru
* **Sebagai:** Admin Toko
* **Saya ingin:** Mendaftarkan produk baru ke dalam katalog sistem
* **Agar:** Produk tersebut dapat mulai dijual kepada pelanggan.
* **Prioritas:** `MUST HAVE` (P0)
* **Aturan Terkait:** BR-001
* **Alur Skenario:**
  1. Pengguna menekan tombol "Tambah Produk".
  2. Pengguna mengisi: Kode Produk, Nama Produk, Stok ($\ge 0$), dan Harga Satuan ($> 0$).
  3. Sistem memvalidasi keunikan kode produk dan format angka.
  4. Data berhasil disimpan dan tabel produk otomatis ter-refresh.
* **Kasus Pengecualian:**
  - Kode produk sudah ada: HTTP 422 dengan pesan "Kode produk telah digunakan".

### US-PRD-03: Mengubah Data Produk
* **Sebagai:** Admin Toko
* **Saya ingin:** Mengubah nama, harga, atau stok dari produk yang sudah ada
* **Agar:** Informasi produk selalu merefleksikan kondisi aktual di gudang.
* **Prioritas:** `MUST HAVE` (P0)
* **Aturan Terkait:** BR-001, BR-002

### US-PRD-04: Menghapus Produk (Soft Delete)
* **Sebagai:** Admin Toko
* **Saya ingin:** Menghapus produk yang sudah tidak dipasarkan secara aman
* **Agar:** Produk tidak dapat dipilih lagi untuk transaksi baru tanpa merusak data riwayat penjualan.
* **Prioritas:** `MUST HAVE` (P0)
* **Aturan Terkait:** BR-006

### US-PRD-05: Mengekspor Katalog Produk ke Berkas Excel (.xlsx)
* **Sebagai:** Admin Toko
* **Saya ingin:** Mengunduh seluruh daftar produk aktif ke dalam format Excel (.xlsx)
* **Agar:** Saya dapat melakukan rekap offline atau menggunakannya sebagai template pembaruan stok massal.
* **Prioritas:** `SHOULD HAVE` (P1)
* **Aturan Terkait:** BR-006

### US-PRD-06: Mengimpor Data Produk Massal Idempoten (.xlsx & .csv)
* **Sebagai:** Admin Toko
* **Saya ingin:** Mengunggah file spreadsheet untuk memperbarui stok/harga atau menambah produk baru sekaligus secara idempoten
* **Agar:** Pengelolaan inventaris skala besar dapat dilakukan dalam hitungan detik tanpa risiko duplikasi.
* **Prioritas:** `SHOULD HAVE` (P1)
* **Aturan Terkait:** BR-001, BR-009

---

## EPIC-03: MANAJEMEN PELANGGAN / MEMBER

### US-CST-01: Melihat Daftar Pelanggan & Pencarian
* **Sebagai:** Admin / Kasir
* **Saya ingin:** Melihat daftar pelanggan terdaftar (member) dengan fitur pencarian nama dan paginasi
* **Agar:** Saya dapat memverifikasi profil pelanggan sebelum memilihnya di transaksi POS.
* **Prioritas:** `MUST HAVE` (P0)
* **Alur Skenario:**
  1. Pengguna membuka menu "Pelanggan" (`/customers`).
  2. Sistem menyajikan data: Nama, Alamat, Gender, Tanggal Lahir, dan Nomor HP.
  3. Pengguna mengetikkan nama di kolom pencarian untuk menyaring daftar.

### US-CST-02: Mendaftarkan Pelanggan Baru (Member)
* **Sebagai:** Admin / Kasir
* **Saya ingin:** Menambahkan pelanggan baru sebagai member terdaftar dengan data identitas lengkap
* **Agar:** Transaksi pelanggan tersebut dapat diatribusikan ke profilnya untuk pelacakan riwayat pembelian.
* **Prioritas:** `MUST HAVE` (P0)
* **Alur Skenario:**
  1. Pengguna membuka modal "Tambah Pelanggan".
  2. Pengguna mengisi Nama (maks 150 kar), Alamat (maks 255 kar), Gender (Pria/Wanita), Tanggal Lahir (YYYY-MM-DD), dan Nomor HP (opsional).
  3. Sistem memvalidasi data dan mengembalikan profil pelanggan baru dengan UUID.

### US-CST-03: Mengubah Data Pelanggan
* **Sebagai:** Admin / Kasir
* **Saya ingin:** Memperbarui data profil pelanggan yang sudah terdaftar
* **Agar:** Informasi kontak pelanggan selalu akurat.
* **Prioritas:** `MUST HAVE` (P0)

### US-CST-04: Menonaktifkan Pelanggan (Soft Delete)
* **Sebagai:** Admin
* **Saya ingin:** Menonaktifkan profil pelanggan yang sudah tidak relevan
* **Agar:** Pelanggan tidak muncul di selector transaksi baru, namun riwayat transaksinya tetap terjaga.
* **Prioritas:** `MUST HAVE` (P0)
* **Aturan Terkait:** BR-006

> **Catatan Roadmap (Post-MVP):**
> * **US-CST-ROADMAP-01 (Loyalty Points):** Pelanggan member terakumulasi poin dari setiap transaksi yang dapat ditukarkan dengan diskon atau reward. Fondasi member dari MVP memungkinkan pengembangan ini tanpa perubahan skema besar.

---

## EPIC-04: ENGINE TRANSAKSI POS (ORDER PROCESSING & HOLD)

### US-ORD-01: Membuat Transaksi POS untuk Pelanggan Terdaftar (Member)
* **Sebagai:** Kasir / Admin
* **Saya ingin:** Membuat order penjualan dengan memilih pelanggan terdaftar dan menambahkan beberapa item produk secara dinamis
* **Agar:** Transaksi terkait dengan profil member dan dapat dilacak dalam riwayat pembelian pelanggan.
* **Prioritas:** `MUST HAVE` (P0)
* **Aturan Terkait:** BR-001, BR-002, BR-003, BR-004, BR-005, BR-013
* **Alur Skenario:**
  1. Kasir membuka menu "Buat Transaksi" (`/orders/new`).
  2. Kasir mencari dan memilih pelanggan aktif dari dropdown/search selector.
  3. Kasir menambahkan baris produk pertama, memilih produk, dan memasukkan kuantitas.
  4. Kasir menekan "Tambah Item" untuk memasukkan produk berikutnya.
  5. Subtotal tiap baris dan estimasi total terhitung secara real-time di antarmuka.
  6. Kasir menekan "Proses Transaksi".
  7. Backend mengeksekusi transaksi database: mengunci baris stok produk, menghitung ulang harga dari DB, memotong stok, membuat nomor order `INV-YYYYMMDD-XXXX`, dan menyimpan snapshot harga.
  8. Sistem merespons sukses (HTTP 201) dan mengarahkan ke halaman detail order.

### US-ORD-02: Membuat Transaksi POS untuk Pelanggan Umum (Walk-in)
* **Sebagai:** Kasir / Admin
* **Saya ingin:** Memproses transaksi tanpa harus memilih pelanggan terdaftar
* **Agar:** Pelayanan kasir tidak terhambat hanya karena pelanggan tidak terdaftar sebagai member.
* **Prioritas:** `MUST HAVE` (P0)
* **Aturan Terkait:** BR-013
* **Alur Skenario:**
  1. Kasir membuka "Buat Transaksi".
  2. Kasir **melewati** langkah pemilihan pelanggan (tombol "Lewati / Pelanggan Umum").
  3. Kasir langsung menambahkan item produk dan kuantitas.
  4. Order diproses secara identik dengan order member, namun disimpan dengan `customer_id = NULL`.
  5. Di seluruh antarmuka dan riwayat, order ini ditampilkan dengan label "Pelanggan Umum".

### US-ORD-03: Hold Transaksi Aktif untuk Melayani Antrean Berikutnya
* **Sebagai:** Kasir
* **Saya ingin:** Mem-hold transaksi yang sedang berjalan untuk sementara waktu agar dapat melayani pelanggan berikutnya yang sudah menunggu
* **Agar:** Efisiensi layanan meningkat — saya tidak perlu membuang seluruh keranjang belanja pelanggan sebelumnya.
* **Prioritas:** `MUST HAVE` (P0)
* **Aturan Terkait:** BR-012, BR-016
* **Alur Skenario:**
  1. Kasir sedang menginput keranjang belanja Pelanggan A namun Pelanggan A belum siap (misalnya mencari uang atau memilih barang lagi).
  2. Kasir menekan tombol "Hold Transaksi".
  3. Sistem menyimpan seluruh isi keranjang (customer_id jika ada, daftar item & kuantitas) ke tabel terpisah `draft_orders` per kasir pembuat, **tanpa memotong stok**.
  4. Antarmuka kasir kembali ke layar transaksi baru yang kosong, siap melayani Pelanggan B.
  5. Setelah selesai melayani Pelanggan B, kasir menekan "Lanjutkan Transaksi Tertahan".
  6. Sistem memuat kembali keranjang Pelanggan A dari `draft_orders`. Kasir dapat memodifikasi item jika perlu.
  7. Kasir menekan "Proses Transaksi" — validasi stok dan locking atomik dijalankan; jika berhasil, transaksi dicatat ke tabel `orders`, draft di `draft_orders` dihapus, dan event dicatat ke `order_activity_logs`.
* **Kasus Pengecualian:**
  - Kasir sudah memiliki held transaction aktif di `draft_orders` dan mencoba hold transaksi lain: Sistem menolak (HTTP 422) dan meminta untuk menyelesaikan atau membuang draft sebelumnya.
  - Stok produk di held transaction sudah habis saat dilanjutkan: Kasir menerima error validasi stok seperti pada transaksi normal (HTTP 422).

### US-ORD-04: Membuang (Discard) Held Transaction
* **Sebagai:** Kasir
* **Saya ingin:** Membatalkan dan membuang transaksi yang sedang di-hold
* **Agar:** State kasir bersih kembali dan tidak ada draft transaksi yang menggantung.
* **Prioritas:** `MUST HAVE` (P0)
* **Aturan Terkait:** BR-012
* **Alur Skenario:**
  1. Kasir menekan "Buang Transaksi Tertahan".
  2. Sistem memunculkan konfirmasi "Yakin? Transaksi yang di-hold akan dihapus permanen."
  3. Kasir mengonfirmasi. Draft dihapus dari server. Tidak ada stok yang terpengaruh.

### US-ORD-05: Pencegahan Overselling & Feedback Validasi Stok Per-Item
* **Sebagai:** Kasir / Admin
* **Saya ingin:** Menerima pesan error yang jelas pada baris item spesifik jika stok salah satu barang tidak mencukupi
* **Agar:** Saya dapat segera memberitahukan pelanggan barang mana yang stoknya kurang tanpa khawatir stok barang lain terlanjur terpotong.
* **Prioritas:** `MUST HAVE` (P0)
* **Aturan Terkait:** BR-003, BR-004

---

## EPIC-05: RIWAYAT, AUDIT DETAIL TRANSAKSI & AUDIT TRAIL

### US-HST-01: Melihat Riwayat Penjualan dengan Filter
* **Sebagai:** Admin / Kasir
* **Saya ingin:** Melihat daftar transaksi yang pernah terjadi dengan filter rentang tanggal dan pelanggan
* **Agar:** Saya dapat memonitor pergerakan transaksi harian dan memeriksa histori pesanan pelanggan tertentu.
* **Prioritas:** `MUST HAVE` (P0)
* **Alur Skenario:**
  1. Pengguna membuka halaman `/orders`.
  2. Sistem menampilkan daftar transaksi: Nomor Order, Nama Pelanggan (atau "Pelanggan Umum"), Kasir Pembuat, Tanggal Transaksi, dan Total Nilai (Format Rupiah).
  3. Pengguna menyaring data menggunakan date picker rentang tanggal atau memilih nama pelanggan tertentu.
  4. Sistem memperbarui tabel sesuai filter yang diterapkan.

### US-HST-02: Membuka Detail Transaksi & Verifikasi Snapshot Harga
* **Sebagai:** Admin / Auditor
* **Saya ingin:** Membuka detail transaksi untuk melihat seluruh item belanja beserta harga satuan historisnya
* **Agar:** Saya memiliki bukti sah transaksi yang nilainya tidak pernah terpengaruh oleh perubahan harga master produk di masa depan.
* **Prioritas:** `MUST HAVE` (P0)
* **Aturan Terkait:** BR-002, BR-006, BR-017
* **Alur Skenario:**
  1. Pengguna mengklik nomor order pada daftar riwayat.
  2. Halaman detail menampilkan:
     - Header invoice: Nomor order, tanggal, nama kasir pembuat, nama pelanggan (atau "Pelanggan Umum") & kontak.
     - Tabel rincian belanja: Kode produk, nama produk, kuantitas, harga satuan saat transaksi (`unit_price`), dan subtotal.
     - Total transaksi akhir.
     - **Log Aktivitas Transaksi (`order_activity_logs`):** Timeline kejadian pada transaksi ini (misal: "Draft dibuat", "Transaksi di-hold", "Transaksi dilanjutkan", "Transaksi diselesaikan").
  3. Meskipun produk di invoice telah diubah harganya atau di-soft delete, angka di invoice tetap sama persis.

### US-AUD-01: Melihat Audit Trail Aktivitas Pengguna (Khusus Admin)
* **Sebagai:** Admin
* **Saya ingin:** Melihat log seluruh aktivitas write yang dilakukan oleh semua pengguna sistem
* **Agar:** Saya dapat menyelidiki perubahan data yang mencurigakan, mengetahui siapa melakukan apa dan kapan.
* **Prioritas:** `MUST HAVE` (P0)
* **Aturan Terkait:** BR-014, BR-015, BR-017, NFR-AUD-01
* **Alur Skenario:**
  1. Admin membuka halaman "Audit Trail" (`/audit-logs`).
  2. Sistem menampilkan log aktivitas terbaru secara terpaginasi dari tabel `audit_logs`: Waktu, User, Aksi, Entitas yang Diubah, dan ringkasan perubahan.
  3. Admin dapat memfilter berdasarkan: nama pengguna, jenis aksi (login/create/update/delete/dll), jenis entitas (produk/pelanggan/order/user), dan rentang tanggal.
  4. Admin dapat mengklik satu entri log untuk melihat detail perubahan data (payload diff JSON sebelum & sesudah).
* **Kasus Pengecualian:**
  - Kasir mencoba membuka rute `/audit-logs` atau memanggil API: Akses ditolak dengan HTTP 403 Forbidden.

---

## EPIC-06: DASHBOARD ANALITIK & MONITORING

### US-DSH-01: Melihat Kartu Ringkasan Metrik dengan Filter Periode
* **Sebagai:** Admin / Owner
* **Saya ingin:** Langsung melihat total transaksi dan akumulasi pendapatan penjualan dengan pilihan filter periode (Harian, Bulanan, Kuartalan)
* **Agar:** Saya memperoleh gambaran performa finansial toko secara cepat dan relevan dengan periode yang saya butuhkan.
* **Prioritas:** `MUST HAVE` (P0)
* **Aturan Terkait:** BR-019
* **Alur Skenario:**
  1. Pengguna login dan mendarat di `/dashboard`.
  2. Kartu metrik menampilkan:
     - **Total Transaksi:** Jumlah keseluruhan order yang berhasil dalam periode dipilih.
     - **Total Penjualan:** Nilai omset dalam format Rupiah.
  3. Pengguna dapat memilih filter periode:
     - **Hari Ini (`daily`):** Transaksi hari berjalan (00:00 - 23:59).
     - **Bulan Ini (`monthly`):** Bulan kalender berjalan (misal 1 - 31 Oktober).
     - **Kuartal Ini (`quarterly`):** Kuartal kalender berjalan (Q1: Jan-Mar, Q2: Apr-Jun, Q3: Jul-Sep, Q4: Okt-Des).
  4. Kartu metrik dan tren otomatis tersinkronisasi dan terupdate secara real-time.

### US-DSH-02: Melihat Tren Penjualan
* **Sebagai:** Admin / Owner
* **Saya ingin:** Melihat grafik tren omset dan jumlah transaksi per hari dalam periode yang dipilih
* **Agar:** Saya dapat mengidentifikasi pola penjualan (hari puncak, hari sepi) dan mengambil keputusan bisnis berbasis data.
* **Prioritas:** `MUST HAVE` (P0)
* **Aturan Terkait:** BR-019
* **Alur Skenario:**
  1. Di dashboard, terdapat grafik tren penjualan dengan sumbu X (tanggal) dan sumbu Y (omset/Rp atau jumlah transaksi).
  2. Grafik menyesuaikan data sesuai filter periode yang dipilih.

### US-DSH-03: Memantau 5 Produk Terlaris (Top 5 Best Seller)
* **Sebagai:** Admin Toko
* **Saya ingin:** Melihat daftar 5 produk dengan penjualan unit tertinggi
* **Agar:** Saya dapat merencanakan pengadaan barang (*restock*) secara lebih tepat sasaran.
* **Prioritas:** `MUST HAVE` (P0)
* **Aturan Terkait:** BR-019
* **Alur Skenario:**
  1. Di dashboard, terdapat widget "5 Produk Terlaris" dalam periode dipilih.
  2. Menampilkan kode produk, nama produk, total kuantitas unit terjual, dan kontribusi nominal pendapatan.

### US-DSH-04: Melihat Produk Penjualan Lesu (Bottom 5 Performers)
* **Sebagai:** Admin Toko
* **Saya ingin:** Melihat daftar produk aktif yang penjualannya rendah atau stagnan dalam periode tertentu
* **Agar:** Saya dapat mengambil tindakan (promosi, evaluasi stok, atau discontinue produk) sebelum menjadi masalah inventaris.
* **Prioritas:** `MUST HAVE` (P0)
* **Aturan Terkait:** BR-018, BR-019
* **Alur Skenario:**
  1. Di dashboard, terdapat panel "Produk Lesu" yang menampilkan tepat **bottom 5 produk aktif** dengan kuantitas terjual paling rendah dalam periode dipilih.
  2. Produk aktif yang tidak memiliki satu pun transaksi dalam periode tersebut diprioritaskan muncul paling atas di daftar ini.

### US-DSH-05: Notifikasi & Peringatan Stok Kritis ($< 5$)
* **Sebagai:** Admin / Bagian Gudang
* **Saya ingin:** Mendapatkan daftar produk yang stoknya tersisa kurang dari 5 unit
* **Agar:** Saya dapat segera melakukan restock sebelum toko kehabisan barang.
* **Prioritas:** `MUST HAVE` (P0)
* **Alur Skenario:**
  1. Di dashboard, terdapat panel peringatan "Stok Kritis".
  2. Sistem menampilkan produk-produk aktif yang memiliki `stock < 5` dengan indikator warna peringatan (*warning badge*).

---

## EPIC-07: MANAJEMEN PENGGUNA INTERNAL (USER MANAGEMENT)

### US-USR-01: Melihat Daftar Pengguna Sistem
* **Sebagai:** Admin Toko
* **Saya ingin:** Melihat daftar seluruh akun pengguna yang terdaftar di sistem beserta status aktif/nonaktifnya
* **Agar:** Saya dapat memonitor siapa saja yang memiliki akses ke sistem operasional toko.
* **Prioritas:** `MUST HAVE` (P0)
* **Aturan Terkait:** BR-011
* **Alur Skenario:**
  1. Admin membuka menu "Manajemen Pengguna" (`/users`).
  2. Sistem menampilkan tabel: Nama, Email, Status (Aktif / Nonaktif), Tanggal Dibuat.
  3. Akun dengan `deleted_at IS NOT NULL` ditampilkan dengan badge "Nonaktif".

### US-USR-02: Reset Kata Sandi Staf/Kasir oleh Admin
* **Sebagai:** Admin Toko
* **Saya ingin:** Mereset kata sandi staf atau kasir yang lupa password tanpa memerlukan konfirmasi email
* **Agar:** Staf tersebut dapat kembali mengakses sistem dengan password baru yang diberikan Admin secara langsung.
* **Prioritas:** `MUST HAVE` (P0)
* **Aturan Terkait:** BR-010, BR-011
* **Alur Skenario:**
  1. Admin mengklik tombol "Reset Password" pada baris pengguna yang dituju.
  2. Muncul dialog yang meminta Admin mengisi password baru untuk user tersebut.
  3. Admin mengisi password baru (minimal 8 karakter) dan menekan "Konfirmasi Reset".
  4. Server memvalidasi bahwa target bukan akun Admin sendiri (Self-Guard BR-011).
  5. Server meng-hash password baru, menyimpannya, dan mengosongkan `refresh_token_hash = NULL` pada akun target — semua sesi aktif pengguna tersebut langsung ter-revoke.
  6. Admin memberitahukan password baru kepada staf secara langsung.
* **Kasus Pengecualian:**
  - Admin mencoba mereset password akun dirinya sendiri: HTTP 403 Forbidden.
  - Target user sudah nonaktif (soft-deleted): HTTP 422 "Akun pengguna tidak aktif".

### US-USR-03: Menonaktifkan Akun Staf/Kasir (Soft Delete)
* **Sebagai:** Admin Toko
* **Saya ingin:** Menonaktifkan akun staf atau kasir yang sudah tidak bekerja di toko
* **Agar:** Mantan staf tidak dapat lagi mengakses sistem, sementara seluruh riwayat transaksi yang pernah dibuatnya tetap tersimpan utuh untuk keperluan audit.
* **Prioritas:** `MUST HAVE` (P0)
* **Aturan Terkait:** BR-010, BR-011
* **Alur Skenario:**
  1. Admin mengklik tombol "Nonaktifkan" pada baris pengguna yang dituju.
  2. Sistem memunculkan dialog konfirmasi.
  3. Admin menekan "Ya, Nonaktifkan".
  4. Server memvalidasi Self-Guard (BR-011).
  5. Server menyetel `deleted_at = NOW()` dan mengosongkan `refresh_token_hash = NULL` secara atomik.
  6. Akun langsung tidak dapat login. Jika pengguna sedang aktif, sesi mereka terhenti saat access token kadaluarsa dan silent refresh ditolak.
  7. Riwayat transaksi yang dibuat pengguna ini tetap tampil lengkap pada riwayat order.
* **Kasus Pengecualian:**
  - Admin mencoba menonaktifkan akun dirinya sendiri: HTTP 403 Forbidden.

### US-USR-04: Menambahkan Pengguna Baru (Admin Only)
* **Sebagai:** Admin Toko
* **Saya ingin:** Mendaftarkan akun staf kasir atau admin baru ke dalam sistem
* **Agar:** Staf baru dapat memiliki kredensial resmi untuk mengoperasikan kasir POS.
* **Prioritas:** `MUST HAVE` (P0)
* **Aturan Terkait:** BR-011, BR-015
* **Alur Skenario:**
  1. Admin membuka menu "Manajemen Pengguna" (`/users`) dan menekan tombol "Tambah Pengguna".
  2. Muncul dialog modal pendaftaran pengguna.
  3. Admin mengisi: Nama Lengkap, Alamat Email, Password (minimal 8 karakter), dan Pilihan Role (`ADMIN` atau `CASHIER`).
  4. Admin menekan tombol "Simpan".
  5. Server memvalidasi keunikan alamat email, format password, dan hak akses Admin pemanggil.
  6. Akun berhasil dibuat dan otomatis muncul pada tabel daftar pengguna.
* **Kasus Pengecualian:**
  - Email sudah digunakan oleh akun lain: Server menolak dengan HTTP 422 "Email sudah terdaftar".
  - Kasir mencoba memanggil endpoint pendaftaran pengguna: Ditolak dengan HTTP 403 Forbidden.
