# ADR-001: Pola Arsitektur Modular Monolith Berbasis Bounded Context

| Metadata | Keterangan |
| :--- | :--- |
| **Status** | ACCEPTED |
| **Tanggal** | 27 Oktober 2026 |
| **Kandidat Arsitektur** | Modular Monolith vs Root-Layered Monolith vs Microservices |

---

## Konteks & Masalah
Aplikasi Titipin POS mencakup beberapa domain bisnis yang saling terkait namun memiliki batasan tanggung jawab yang jelas:
* Autentikasi & Pengguna (`auth`, `users`)
* Manajemen Produk & Stok (`products`)
* Manajemen Pelanggan / Member (`customers`)
* Engine Transaksi Penjualan (`orders`)
* Laporan & Analitik Toko (`dashboard`)
* Audit Trail Sistem (`audit`)

Ketentuan teknis dari penilaian menekankan pada:
1. **Kualitas Kode & Separation of Concerns (Bobot 20%):** Kemampuan mengorganisir kode dengan batas domain yang rapi.
2. **Kebenaran Transaksi Atomik (Bobot 30%):** Transaksi penjualan multi-item yang membutuhkan koordinasi langsung antara pengecekan stok produk, kalkulasi harga, pemotongan stok, dan pembuatan invoice.
3. **Waktu Pengerjaan Efektif 6 Jam:** Membutuhkan arsitektur yang kokoh namun tidak memiliki kompleksitas operasional berlebih (*over-engineering*).

## Keputusan yang Diambil
Memilih pola **Modular Monolith** dengan pendekatan *Feature-Sliced / Bounded Contexts* menggunakan NestJS Modules:
1. Setiap domain bisnis diisolasi dalam satu folder modul mandiri di `apps/backend/src/modules/<domain>/` yang merangkum lapisannya sendiri:
   - **Presentation Layer:** Controller dan Data Transfer Objects (DTO).
   - **Domain / Application Layer:** Service logika bisnis dan validasi domain.
   - **Persistence Layer:** Repository / Data Access menggunakan Drizzle ORM.
2. Komunikasi antarmodul dalam backend dieksekusi secara *in-process* melalui dependency injection NestJS.
3. Transaksi atomik lintas-tabel (misal order mutasi stok) dieksekusi dalam satu unit kerja transaksi database ACID murni (`db.transaction`).

## Konsekuensi & Justifikasi

### Keuntungan (Pros)
* **Batas Domain yang Tegas (High Cohesion, Low Coupling):** Struktur kode mencerminkan domain bisnis nyata, bukan sekadar pengelompokan teknis generik (`controllers/`, `services/`, `models/`).
* **Integritas Transaksi ACID Sederhana:** Tidak memerlukan *Distributed Transaction* atau pola *Saga / 2-Phase Commit* yang rentan terhadap *partial failure* jaringan.
* **Performa Tinggi & Zero Network Latency:** Komunikasi antar-domain berjalan di level memori in-process tanpa overhead HTTP/gRPC.
* **Jalur Evolusi Jelas:** Jika kelak modul `orders` perlu diskalakan secara independen, modul tersebut dapat diekstraksi menjadi microservice terpisah dengan refactor minimal karena batasan kodenya sudah terisolasi sejak awal.

### Kerugian & Mitigasi (Cons & Mitigation)
* **Risiko Pelanggaran Batas Antarmodul:** Developer dapat tergiur mengimpor langsung tabel Drizzle dari modul lain.
  - *Mitigasi:* Setiap modul hanya boleh mengekspor Service resminya melalui `exports` pada NestJS Module; manipulasi data persistence modul lain via repository luar dilarang.
