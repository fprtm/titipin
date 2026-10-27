# TITIPIN DEV — TESTING STRATEGY & TEST SUITES GUIDE
## Backend Integration Testing (Supertest), Frontend Component Testing & Test Matrix

This guide details how automated tests are written, configured, and executed in **Titipin**.

---

## 1. ARSITEKTUR & TOOLING TESTING

* **Backend Testing**:
  - Tooling: **Vitest** (atau **Jest**) + **Supertest**.
  - Lokasi: `apps/backend/test/`.
  - Fokus: Pengujian end-to-end HTTP controller, middleware, pipe validasi, guards, dan transaksi Drizzle ORM.
* **Frontend Testing**:
  - Tooling: **Vitest** + **React Testing Library** + **@testing-library/jest-dom**.
  - Lokasi: `apps/frontend/src/**/*.test.tsx`.
  - Fokus: Pengujian interaksi komponen kasir POS, kalkulasi kembalian uang kasir, dan penanganan input form.

---

## 2. 10 CRITICAL INTEGRATION TEST SUITES (BACKEND)

Setiap pengembang dan agen wajib memastikan ke-10 skenario uji kritis berikut terverifikasi sebelum rilis:

| Test ID | Skenario Pengujian | File Test | Kondisi Berhasil (Expectation) |
| :--- | :--- | :--- | :--- |
| `TEST-01` | Autentikasi Dual Token & Profil | `test/auth.e2e-spec.ts` | Login berhasil, mengembalikan Access Token di body & Refresh Token di Cookie HttpOnly. Endpoint `GET /api/auth/me` mengembalikan profil user. |
| `TEST-02` | Validasi & Import Katalog Excel | `test/products-import.e2e-spec.ts` | Upload file `.xlsx` katalog berhasil memetakan baris produk, mendeteksi error baris korup, dan menyisipkan data valid secara idempotensial. |
| `TEST-03` | Export Katalog Excel | `test/products-export.e2e-spec.ts` | Request `GET /api/products/export` mengembalikan header `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` dengan binary XLSX valid. |
| `TEST-04` | Checkout Transaksi POS Atomik | `test/orders-checkout.e2e-spec.ts` | Transaksi multi-item memotong stok produk secara atomik, menyimpan order, dan mencatat entri pada `order_activity_logs`. |
| `TEST-05` | Rollback Checkout Stok Habis | `test/orders-rollback.e2e-spec.ts` | Jika salah satu produk dalam keranjang memiliki stok tidak cukup, seluruh transaksi dibatalkan (rollback) dengan status `400 Bad Request`. Tidak ada stok yang terpotong parsial. |
| `TEST-06` | Concurrency & Anti-Overselling | `test/orders-concurrency.e2e-spec.ts` | Dua kasir memproses sisa 1 unit stok barang yang sama secara serentak. Tepat 1 kasir berhasil, kasir lainnya menerima penolakan stok habis. Stok akhir = 0 (tidak negatif). |
| `TEST-07` | Mekanisme Hold & Resume Order | `test/orders-hold.e2e-spec.ts` | Transaksi antrean dapat di-hold ke tabel `draft_orders` tanpa memotong stok fisik, lalu dapat di-resume atau dihapus. |
| `TEST-08` | Integritas Snapshot Harga | `test/orders-price-snapshot.e2e-spec.ts` | Perubahan harga produk master tidak memengaruhi `unit_price` pada transaksi historis yang telah selesai di masa lampau. |
| `TEST-09` | RBAC & Proteksi Audit Log | `test/audit-rbac.e2e-spec.ts` | User ber-role `CASHIER` yang mengakses endpoint `GET /api/audit-logs` ditolak dengan status `403 Forbidden`. Admin berhasil mengakses data audit. |
| `TEST-10` | Agregasi Metrik Dashboard | `test/dashboard-metrics.e2e-spec.ts` | Kalkulasi total pendapatan harian/bulanan, jumlah transaksi, dan deteksi slow-moving products akurat sesuai formula bisnis. |

---

## 3. POLA PENULISAN TEST INTEGRASI DENGAN SUPERTEST

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Orders Checkout Concurrency (E2E)', () => {
  let app: INestApplication;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login helper to get admin bearer token
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@titipin.id', password: 'AdminPassword123!' });
    adminToken = loginRes.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('TEST-05: should rollback entire checkout when stock is insufficient', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        items: [
          { productId: 'some-valid-id', quantity: 999999 }, // Kuota stok berlebih
        ],
        amountPaid: 1000000,
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.errors).toBeDefined();
  });
});
```

---

## 4. PERINTAH MENJALANKAN TEST

```bash
# Menjalankan seluruh test suite di seluruh monorepo
pnpm test

# Menjalankan test khusus backend
pnpm --filter @titipin/backend test

# Menjalankan test khusus frontend
pnpm --filter @titipin/frontend test

# Menjalankan test dengan laporan code coverage
pnpm test:cov
```
