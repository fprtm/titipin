# TICKET: SLICE 12 — AKSELERASI QUERY, OBSERVABILITAS & STRESS BENCHMARK
## Titipin POS — GIN Trigram Search, Prometheus Metrics, Swagger OpenAPI, POS Hotkeys & Concurrency Stress Test

| Metadata | Keterangan |
| :--- | :--- |
| **Ticket ID** | `TICKET-SLICE-12` |
| **Epic Terkait** | `EPIC-09: ERGONOMI KASIR & OBSERVABILITAS PRODUKSI` |
| **Target Branch** | `feature/slice-12-perf-monitoring-openapi-and-benchmark` |
| **Aturan Bisnis** | [BR-021, BR-022, NFR-PRF-01, NFR-MON-01](../../product/PRD.md) |
| **Dokumen Acuan** | [ADR-008](../../architecture/ADR/ADR-008-postgresql-trigram-and-prometheus-observability.md), [FOUNDATION.md](../../architecture/FOUNDATION.md), [DATA-MODEL.md](../../architecture/DATA-MODEL.md), [openapi.yaml](../../api/openapi.yaml) |
| **Spesifikasi UI** | [03-pos-checkout.md](../../design/pages/03-pos-checkout.md), [07-orders-history.md](../../design/pages/07-orders-history.md) |
| **Status** | `Completed` |
| **Integration Test** | 287 Automated Tests (198 Backend + 89 Frontend), Concurrency Benchmark (`pnpm benchmark`) |

---

## 1. DESKRIPSI & TUJUAN BISNIS
Mengoptimalkan keandalan, performa query, dan kesiapan operasional sistem Titipin POS untuk lingkungan produksi skala enterprise melalui:
1. Akselerasi query pencarian teks parsial via PostgreSQL `pg_trgm` dan indeks GIN Trigram.
2. Pelacakan latensi HTTP via `ResponseTimeInterceptor` (`X-Response-Time` header dan log slow query $>100\text{ms}$).
3. Pemantauan metrik sistem produksi via Prometheus scraper endpoint (`GET /api/metrics`) menggunakan `prom-client`.
4. Dokumentasi interaktif Swagger OpenAPI di `/api/docs` dan Postman Collection siap pakai.
5. Peningkatan ergonomi antarmuka kasir dengan pintasan keyboard industri retail (`F2`, `F8`, `F9`, `Esc`) dan input debounce 300ms.
6. Eliminasi potensi deadlock connection pool pada transaksi checkout atomik dan verifikasi beban konkurensi tinggi melalui modul pengujian stress otomatis (`pnpm benchmark`).

---

## 2. DETAIL TUGAS TEKNIS (TASK BREAKDOWN)

### 2.1 Akselerasi Basis Data GIN Trigram (`apps/backend`)
* [x] Mengaktifkan ekstensi `pg_trgm` secara otomatis saat inisialisasi modul database:
  ```sql
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  ```
* [x] Memasang indeks GIN Trigram (`gin_trgm_ops`) pada kolom teks pencarian:
  * `idx_products_name_trgm` dan `idx_products_code_trgm` pada tabel `products`.
  * `idx_customers_name_trgm` dan `idx_customers_phone_trgm` pada tabel `customers`.
  * `idx_orders_number_trgm` pada tabel `orders`.
* [x] Mengoptimalkan performa query pencarian `ILIKE '%query%'` dari sequential scan menjadi bitmap index scan.

### 2.2 Observabilitas, Latensi & Prometheus Metrics (`apps/backend`)
* [x] Interceptor Waktu Respon (`ResponseTimeInterceptor`):
  * Menghitung durasi pemrosesan tiap request menggunakan `process.hrtime()`.
  * Menginjeksi response header `X-Response-Time: [ms]`.
  * Menuliskan log peringatan otomatis (WARN) jika durasi melebihi 100ms.
* [x] Pemantauan Metrik Prometheus (`MetricsModule`):
  * Mengimplementasikan `MetricsService` berbasis library standar industri `prom-client`.
  * Endpoint `GET /api/metrics` mengekspos metrik CPU, heap memory V8, counter request `http_requests_total`, histogram latensi `http_request_duration_seconds_bucket`, dan state connection pool PostgreSQL (`database_connections_active`, `idle`, `waiting`).
* [x] Peningkatan Endpoint Kesehatan Sistem (`GET /api/health`):
  * Mengembalikan status konektivitas database pool, memory usage, uptime sistem, dan timestamp.

### 2.3 Dokumentasi Interaktif Swagger OpenAPI & Postman
* [x] Pemasangan Swagger UI interaktif di endpoint `GET /api/docs` dengan skema otentikasi JWT Bearer (`bearerAuth`).
* [x] Endpoint skema JSON OpenAPI di `GET /api/docs-json`.
* [x] Pembaruan spesifikasi statis `docs/api/openapi.yaml` dan berkas Postman Collection `docs/api/titipin_postman_collection.json`.

### 2.4 Ergonomi Kasir POS & Debounced Search (`apps/frontend`)
* [x] Standardisasi Pintasan Keyboard Kasir Retail:
  * `F2`: Fokus kursor ke input pencarian produk katalog.
  * `F8`: Tahan transaksi kasir (*hold cart*).
  * `F9`: Buka modal konfirmasi pembayaran (*checkout*).
  * `Esc`: Tutup modal aktif / batalkan dialog konfirmasi.
  * Badge visual shortcut tombol keyboard (`<kbd>F2</kbd>`, `<kbd>F8</kbd>`, `<kbd>F9</kbd>`).
* [x] Penerapan Debounce 300ms pada pencarian produk di kasir POS dan riwayat transaksi di `/orders`.

### 2.5 Solusi Concurrency Pool Deadlock & Stress Benchmark
* [x] Perbaikan Starvasi Connection Pool:
  * Memperbarui `RecordAuditLogUseCase` dan `AuditService` agar menerima parameter opsional context transaksi (`tx?: DrizzleClient`).
  * Meneruskan `tx` aktif dari dalam blok transaksi `process-checkout.use-case.ts`, sehingga pencatatan audit order log tidak meminta koneksi baru dari pool.
  * Mengonfigurasi kapasitas connection pool `max: 20` di `database.module.ts`.
* [x] Skrip Pengujian Beban Konkuren (`pnpm benchmark`):
  * Dibuat di `apps/backend/scripts/benchmark-concurrency.ts`.
  * Menguji 30 checkout bersamaan pada produk dengan stok tepat 5 unit.
  * Memvalidasi hasil: 5 berhasil (201 Created), 25 ditolak (422 Unprocessable Entity), sisa stok di database tepat 0 (*zero-overselling*), throughput $\approx 278\text{ req/sec}$ dalam durasi $\approx 108\text{ms}$.

---

## 3. DEFINITION OF DONE (DOD) CHECKLIST

- [x] Ekstensi `pg_trgm` dan 5 indeks GIN Trigram aktif di basis data PostgreSQL.
- [x] Seluruh response API menyertakan header `X-Response-Time: [ms]`.
- [x] Endpoint `GET /api/metrics` menyajikan metrik Prometheus yang valid dan terformat rapi.
- [x] Dokumentasi Swagger UI dapat diakses di `/api/docs` dan siap diuji secara interaktif.
- [x] Pintasan keyboard `F2`, `F8`, `F9`, dan `Esc` serta debounced search berfungsi responsif di kasir POS.
- [x] Skrip `pnpm benchmark` lolos dengan 0 overselling dan 0 error konkurensi.
- [x] Seluruh 287 automated tests lulus 100% (198 backend tests + 89 frontend tests).
- [x] `pnpm audit:quality` dan `pnpm audit:links` lulus 100%.
