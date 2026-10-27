# ADR-005: Isolasi Tabel Draft Orders untuk Mekanisme Hold Transaksi POS

| Metadata | Keterangan |
| :--- | :--- |
| **Status** | ACCEPTED |
| **Tanggal** | 27 Oktober 2026 |
| **Pilihan yang Dipertimbangkan** | Tabel Terpisah `draft_orders` vs Kolom `status` di Tabel `orders` vs Redis/In-Memory Cache |

---

## Konteks & Masalah
Pada operasional kasir fisik POS, antrean pelanggan sering kali tersendat ketika seorang pelanggan belum siap membayar (misal: mencari uang tunai atau mengambil barang tambahan). Sistem membutuhkan fitur **Hold Transaksi** (`BR-012`) agar kasir dapat menahan transaksi aktif dan melayani pelanggan berikutnya.

Terdapat 3 pendekatan arsitektur untuk menyimpan transaksi yang di-hold:
1. **Opsi A (Single Table):** Menyimpan draft di tabel `orders` yang sama dengan kolom status (`status: 'DRAFT' | 'COMPLETED'`).
2. **Opsi B (Cache/Redis):** Menyimpan draft hanya di memori/Redis per session kasir.
3. **Opsi C (Isolated Table):** Menyimpan draft di tabel terpisah `draft_orders` khusus relasional.

## Keputusan yang Diambil
Memilih **Opsi C: Tabel Terpisah `draft_orders`** di PostgreSQL.

```
[Kasir Hold Cart]   ---> Simpan ke tabel: draft_orders (tanpa potong stok)
[Kasir Selesaikan]  ---> db.transaction: Lock Stok -> Potong Stok -> Insert ke orders & order_items -> Hapus dari draft_orders
```

## Alasan & Evaluasi Keputusan

1. **Kebersihan Data Agregasi Finansial (Data Hygiene):**
   - Jika draft disimpan di tabel `orders` utama (Opsi A), setiap query analitik, total omset, filter laporan keuangan, dan integrasi test wajib menambahkan klausa `WHERE status = 'COMPLETED'`. Lupa menambahkan klausa ini di satu endpoint saja akan langsung menggelembungkan angka omset dan merusak integritas pelaporan bisnis.
   - Dengan tabel terpisah, tabel `orders` **100% hanya berisi transaksi yang sah dan final**.
2. **Constraint 1 Kasir Max 1 Draft Aktif (`BR-012`):**
   - Pada tabel `draft_orders`, kolom `user_id` dipasang constraint `UNIQUE`. Database PostgreSQL secara alami menjamin seorang kasir tidak dapat menumpuk lebih dari satu draft order aktif tanpa perlu menulis lock buatan di aplikasi.
3. **Persistensi Data vs Redis (Opsi B):**
   - Menyimpan di database PostgreSQL menjamin draft order kasir tidak hilang jika terjadi restart server atau refresh browser kasir, serta tidak memerlukan dependensi infrastruktur Redis tambahan dalam penilaian tes 6 jam.
4. **Tidak Mengunci Stok (*No Stock Reservation on Draft*):**
   - Barang di draft tidak memotong stok di `products.stock`. Evaluasi ketersediaan stok dan mutasi atomik baru dieksekusi saat kasir menekan tombol "Finalisasi Transaksi".
