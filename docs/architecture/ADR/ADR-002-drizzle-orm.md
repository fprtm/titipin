# ADR-002: Pemilihan Drizzle ORM untuk Data Access Layer

| Metadata | Keterangan |
| :--- | :--- |
| **Status** | ACCEPTED |
| **Tanggal** | 27 Oktober 2026 |
| **Pilihan yang Dipertimbangkan** | Drizzle ORM vs Prisma ORM vs TypeORM |

---

## Konteks & Masalah
Spesifikasi pengujian teknis memperbolehkan kandidat memilih antara Prisma, Drizzle, atau TypeORM untuk Track A (Node.js/TypeScript). Aplikasi ini memiliki karakteristik beban kerja yang kritis:
1. **Risiko Concurrency & Race Condition Stok (`BR-004`):** Kasir melayani transaksi dalam waktu bersamaan. Membutuhkan penguncian baris eksplisit (*pessimistic row locking*) `SELECT ... FOR UPDATE` di level SQL.
2. **PostgreSQL BigInt ID (`products.id`, `orders.id`, `order_items.id`):** Node.js secara bawaan tidak dapat me-serialize `BigInt` ke JSON (`TypeError: Do not know how to serialize a BigInt`).
3. **Kecepatan Build & Resource Footprint:** Aplikasi dijalankan menggunakan container Docker dengan resource terbatas pada proses evaluasi.

## Keputusan yang Diambil
Memilih **Drizzle ORM** dengan driver PostgreSQL `node-postgres` (`pg`):
1. **Native Pessimistic Row Locking:** Drizzle menyediakan method type-safe `.for('update')` langsung di query builder tanpa perlu menulis query mentah yang tidak ter-type-check.
2. **Native BigInt Serialization:** Menggunakan definisi skema `bigint('id', { mode: 'number' })`. Driver Drizzle otomatis mengonversi `bigint` PostgreSQL menjadi `number` JavaScript murni pada runtime, menuntaskan masalah JSON serialization di level data layer.
3. **Zero Overhead & Type Safety Murni:** Drizzle tidak menggunakan binary engine Rust terpisah (seperti Prisma) atau metadata reflection yang rapuh (seperti TypeORM).

## Perbandingan Kriteria Evaluasi

| Kriteria | Drizzle ORM | Prisma ORM | TypeORM |
| :--- | :--- | :--- | :--- |
| **Pessimistic Locking (`FOR UPDATE`)** | **Native first-class (`.for('update')`)** | Tidak native di query client; butuh `$queryRawUnsafe` | Didukung via `.setLock('pessimistic_write')` |
| **BigInt Serializability** | **Otomatis via `{ mode: 'number' }`** | Mengembalikan `BigInt` (wajib custom JSON monkey-patch) | Butuh transformer custom per kolom |
| **Runtime Overhead** | Sangat ringan (Thin SQL builder murni) | Lebih berat (Binary query engine Rust IPC) | Menengah (Class instantiation overhead) |
| **Docker Build Speed** | Cepat (Pure TypeScript package) | Lambat (Wajib `prisma generate` & engine binary) | Cepat |
| **Atomic Returning Clause** | **Didukung penuh (`.returning()`)** | Parsial di mode interaktif | Terbatas |

## Konsekuensi & Mitigasi
* *Konsekuensi:* Drizzle memerlukan penulisan SQL migration secara disiplin menggunakan `drizzle-kit generate` dan script migrasi programmatik.
* *Mitigasi:* Disediakan script migrasi otomatis `pnpm db:migrate` yang dijalankan saat docker-compose bootstrap atau sebelum integration test dieksekusi.
