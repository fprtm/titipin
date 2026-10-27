# PAGE SPECIFICATION: DATA PELANGGAN / MEMBER (`/customers`)
## Titipin POS — Customer & Member Management Screen

| Metadata | Keterangan |
| :--- | :--- |
| **Route** | `/customers` |
| **Akses** | Read & Create: Kasir & Admin; Update & Delete: Admin Only |
| **Komponen Utama** | Data Table Kaca, Modal Pendaftaran Member, Filter Pencarian Nama |
| **API Terkait** | `GET /api/customers`, `POST /api/customers`, `GET /api/customers/:id`, `PUT /api/customers/:id`, `DELETE /api/customers/:id` |

---

## 1. STRUKTUR VISUAL & WIREFRAME (ASCII)

```
┌────────────────────────────────────────────────────────────────────────┐
│ HEADER: Data Pelanggan & Member Toko                                   │
│                                                                        │
│ ┌────────────────────────────────────────┐            ┌──────────────┐ │
│ │ [Cari nama pelanggan...               ] │            │ + Member Baru│ │
│ └────────────────────────────────────────┘            └──────────────┘ │
│                                                                        │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ TABEL MEMBER (glass-panel rounded-2xl)                             │ │
│ │ NAMA PELANGGAN    GENDER   TGL LAHIR   NO. HP       ALAMAT   AKSI  │ │
│ │ ───────────────── ──────── ─────────── ──────────── ──────── ───── │ │
│ │ Budi Santoso      Pria     10/02/1995  081234567890 Jakarta  [•••] │ │
│ │ Siti Aminah       Wanita   14/08/1998  085712345678 Bandung  [•••] │ │
│ │ Ahmad Dahlan      Pria     01/01/1990  -            Surabaya [•••] │ │
│ │ ────────────────────────────────────────────────────────────────── │ │
│ │ Menampilkan 1 - 10 dari 15 member        [Prev] [1] [2] [Next]     │ │
│ └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. MODAL PENDAFTARAN MEMBER BARU (`CreateCustomerModal`)

* **Trigger:** Tombol `+ Member Baru` (`rounded-xl h-11 bg-emerald-700 text-white font-medium`).
* **Container:** `<Dialog />` (`rounded-3xl p-8 max-w-lg glass-panel`).
* **Form Input:**
  1. `Nama Lengkap (customer_name)`: Text input (`rounded-xl h-11`), maksimal 150 karakter.
  2. `Alamat Tinggal (customer_address)`: Text input (`rounded-xl h-11`), maksimal 255 karakter.
  3. `Jenis Kelamin (gender)`: Radio group bergaya pill (`rounded-xl`): `[ Pria ]` atau `[ Wanita ]`.
  4. `Tanggal Lahir (birth_date)`: Date picker / input tanggal format `YYYY-MM-DD`.
  5. `Nomor Handphone (phone)`: Text input nomor HP (opsional).
* **Validasi Client:** Zod Schema `CreateCustomerInput`.
* **Aksi Simpan:**
  * Memanggil `POST /api/customers`.
  * Menutup modal dan menampilkan toast sukses `Member Budi Santoso berhasil didaftarkan`.
  * Data langsung dapat dipilih di combobox kasir POS.
