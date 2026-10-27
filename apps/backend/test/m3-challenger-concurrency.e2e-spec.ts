import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { ZodValidationPipe } from '../src/common/pipes/zod-validation.pipe';
import { DRIZZLE_ORM, PG_POOL, DrizzleDatabase } from '../src/database/database.module';
import * as schema from '../src/database/schema';
import { inArray, eq } from 'drizzle-orm';
import { Pool } from 'pg';

describe('Milestone 3 Challenger: Concurrency, Anti-Overselling & Pessimistic Locking Stress Test', () => {
  let app: INestApplication;
  let db: DrizzleDatabase;
  let pool: Pool;
  let adminAccessToken: string;
  let cashierAccessToken: string;

  // Track created product IDs for cleanup
  const createdProductIds: number[] = [];
  const createdOrderIds: number[] = [];

  const uniqueSuffix = Date.now().toString().slice(-6);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    const reflector = app.get(Reflector);
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new TransformInterceptor(reflector));
    app.useGlobalPipes(new ZodValidationPipe());

    await app.init();

    db = moduleFixture.get<DrizzleDatabase>(DRIZZLE_ORM);
    pool = moduleFixture.get<Pool>(PG_POOL);

    // Authenticate Admin
    const adminLoginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'admin@titipin.id',
        password: 'Admin123!',
      });
    adminAccessToken = adminLoginRes.body.data.accessToken;

    // Authenticate Cashier
    const cashierLoginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'kasir@titipin.id',
        password: 'Kasir123!',
      });
    cashierAccessToken = cashierLoginRes.body.data.accessToken;
  });

  afterAll(async () => {
    // Clean up created orders
    if (createdOrderIds.length > 0) {
      await db.delete(schema.orders).where(inArray(schema.orders.id, createdOrderIds));
    }

    // Clean up created test products
    if (createdProductIds.length > 0) {
      await db.delete(schema.products).where(inArray(schema.products.id, createdProductIds));
    }

    await app.close();
  }, 30000);

  // Helper to create test products
  const createTestProduct = async (name: string, stock: number, price: number): Promise<number> => {
    const shortCode = `S_${Date.now().toString().slice(-8)}_${Math.floor(Math.random() * 99)}`;
    const res = await request(app.getHttpServer())
      .post('/api/products')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        product_code: shortCode,
        product_name: name,
        stock,
        price,
      });

    if (res.status !== 201) {
      console.error('Failed to create test product:', res.body);
    }
    expect(res.status).toBe(201);
    const productId = res.body.data.id;
    createdProductIds.push(productId);
    return productId;
  };

  // =========================================================================
  // SUITE 1: 5 Concurrent Checkouts for Limited Stock = 2 (Zero Overselling)
  // =========================================================================
  describe('Suite 1: Competing Concurrent Checkouts for Limited Stock (stock = 2, 5 concurrent requests)', () => {
    it('empirically enforces exactly 2 HTTP 201 successes, 3 HTTP 422 failures, 0 overselling, and 0 deadlocks', async () => {
      // 1. Create product with stock = 2
      const productId = await createTestProduct(`LimitedStock_${uniqueSuffix}`, 2, 20000);

      // Verify initial stock is 2
      const initialStockRes = await request(app.getHttpServer())
        .get(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${cashierAccessToken}`);
      expect(initialStockRes.body.data.stock).toBe(2);

      // 2. Dispatch 5 concurrent checkout requests simultaneously via Promise.all
      const requests = Array.from({ length: 5 }, () =>
        request(app.getHttpServer())
          .post('/api/orders')
          .set('Authorization', `Bearer ${cashierAccessToken}`)
          .send({
            customer_id: null,
            items: [{ product_id: productId, quantity: 1 }],
          }),
      );

      const responses = await Promise.all(requests);

      // 3. Partition responses by status code
      const successes = responses.filter((r) => r.status === 201);
      const stockDeficientFailures = responses.filter((r) => r.status === 422);
      const serverErrors = responses.filter((r) => r.status >= 500);
      const deadlockErrors = responses.filter(
        (r) =>
          JSON.stringify(r.body).includes('40P01') ||
          JSON.stringify(r.body).toLowerCase().includes('deadlock'),
      );

      // Record empirical metrics
      console.log('--- Suite 1 Empirical Results ---');
      console.log('Total concurrent requests:', responses.length);
      console.log('HTTP 201 Successes:', successes.length);
      console.log('HTTP 422 Stock Deficiencies:', stockDeficientFailures.length);
      console.log('HTTP 500 Server Errors:', serverErrors.length);
      console.log('Deadlock (40P01) Occurrences:', deadlockErrors.length);

      // 4. Assert exact distribution
      expect(successes.length).toBe(2);
      expect(stockDeficientFailures.length).toBe(3);
      expect(serverErrors.length).toBe(0);
      expect(deadlockErrors.length).toBe(0);

      // Track order IDs for teardown
      for (const succ of successes) {
        if (succ.body.data?.id) {
          createdOrderIds.push(succ.body.data.id);
        }
      }

      // Verify all 3 failing responses report insufficient stock
      for (const fail of stockDeficientFailures) {
        expect(fail.body.message).toContain('tidak mencukupi');
      }

      // 5. Verify Zero Overselling: remaining stock in DB is EXACTLY 0
      const apiStockAfter = (
        await request(app.getHttpServer())
          .get(`/api/products/${productId}`)
          .set('Authorization', `Bearer ${cashierAccessToken}`)
      ).body.data.stock;
      expect(apiStockAfter).toBe(0);

      const [dbProduct] = await db
        .select()
        .from(schema.products)
        .where(eq(schema.products.id, productId));
      expect(dbProduct.stock).toBe(0);
    });
  });

  // =========================================================================
  // SUITE 2: Multi-Item Cart Rollback Under Race Conditions
  // =========================================================================
  describe('Suite 2: Multi-Item Cart Rollback under Race Conditions', () => {
    it('empirically verifies multi-item atomic rollback when one item is exhausted during race', async () => {
      // Product A has abundant stock (10), Product B has scarce stock (2)
      const productAId = await createTestProduct(`AbundantItemA_${uniqueSuffix}`, 10, 10000);
      const productBId = await createTestProduct(`ScarceItemB_${uniqueSuffix}`, 2, 30000);

      // 5 concurrent requests, each attempting to buy 1 unit of A AND 1 unit of B
      const requests = Array.from({ length: 5 }, () =>
        request(app.getHttpServer())
          .post('/api/orders')
          .set('Authorization', `Bearer ${cashierAccessToken}`)
          .send({
            customer_id: null,
            items: [
              { product_id: productAId, quantity: 1 },
              { product_id: productBId, quantity: 1 },
            ],
          }),
      );

      const responses = await Promise.all(requests);

      const successes = responses.filter((r) => r.status === 201);
      const failures = responses.filter((r) => r.status === 422);

      console.log('--- Suite 2 Empirical Results ---');
      console.log('HTTP 201 Successes:', successes.length);
      console.log('HTTP 422 Failures:', failures.length);

      // Exactly 2 must succeed (exhausting Product B's 2 units)
      expect(successes.length).toBe(2);
      expect(failures.length).toBe(3);

      for (const succ of successes) {
        if (succ.body.data?.id) {
          createdOrderIds.push(succ.body.data.id);
        }
      }

      // Product B stock must be exactly 0 (2 - 2)
      const stockBAfter = (
        await request(app.getHttpServer())
          .get(`/api/products/${productBId}`)
          .set('Authorization', `Bearer ${cashierAccessToken}`)
      ).body.data.stock;
      expect(stockBAfter).toBe(0);

      // CRITICAL GUARANTEE: Product A stock must be EXACTLY 10 - 2 = 8!
      // If rollback failed in any of the 3 rejected requests, Product A stock would be < 8.
      const stockAAfter = (
        await request(app.getHttpServer())
          .get(`/api/products/${productAId}`)
          .set('Authorization', `Bearer ${cashierAccessToken}`)
      ).body.data.stock;
      expect(stockAAfter).toBe(8);

      const [dbProductA] = await db
        .select()
        .from(schema.products)
        .where(eq(schema.products.id, productAId));
      expect(dbProductA.stock).toBe(8);
    });
  });

  // =========================================================================
  // SUITE 3: Deadlock Immunity Under Cross-Contention / Inverted Lock Order
  // =========================================================================
  describe('Suite 3: Deadlock Immunity Under Inverted Lock Ordering (Reverse ID Race)', () => {
    it('empirically verifies deterministic ID sorting prevents PostgreSQL 40P01 deadlocks during inverse contention', async () => {
      // Create two products and determine which ID is smaller and larger
      const id1 = await createTestProduct(`LockProd1_${uniqueSuffix}`, 15, 12000);
      const id2 = await createTestProduct(`LockProd2_${uniqueSuffix}`, 15, 18000);

      const smallId = Math.min(id1, id2);
      const largeId = Math.max(id1, id2);

      // Transaction orders:
      // Half request [smallId, largeId]
      // Half request [largeId, smallId] (inverted order)
      // Without ORDER BY asc(id), concurrent executions would acquire locks in opposite order and trigger 40P01 deadlock!
      const requests = [
        // Pattern A: small then large
        request(app.getHttpServer())
          .post('/api/orders')
          .set('Authorization', `Bearer ${cashierAccessToken}`)
          .send({
            customer_id: null,
            items: [
              { product_id: smallId, quantity: 1 },
              { product_id: largeId, quantity: 1 },
            ],
          }),
        // Pattern B: large then small
        request(app.getHttpServer())
          .post('/api/orders')
          .set('Authorization', `Bearer ${cashierAccessToken}`)
          .send({
            customer_id: null,
            items: [
              { product_id: largeId, quantity: 1 },
              { product_id: smallId, quantity: 1 },
            ],
          }),
        // Pattern A: small then large
        request(app.getHttpServer())
          .post('/api/orders')
          .set('Authorization', `Bearer ${cashierAccessToken}`)
          .send({
            customer_id: null,
            items: [
              { product_id: smallId, quantity: 1 },
              { product_id: largeId, quantity: 1 },
            ],
          }),
        // Pattern B: large then small
        request(app.getHttpServer())
          .post('/api/orders')
          .set('Authorization', `Bearer ${cashierAccessToken}`)
          .send({
            customer_id: null,
            items: [
              { product_id: largeId, quantity: 1 },
              { product_id: smallId, quantity: 1 },
            ],
          }),
        // Pattern B: large then small
        request(app.getHttpServer())
          .post('/api/orders')
          .set('Authorization', `Bearer ${cashierAccessToken}`)
          .send({
            customer_id: null,
            items: [
              { product_id: largeId, quantity: 1 },
              { product_id: smallId, quantity: 1 },
            ],
          }),
        // Pattern A: small then large
        request(app.getHttpServer())
          .post('/api/orders')
          .set('Authorization', `Bearer ${cashierAccessToken}`)
          .send({
            customer_id: null,
            items: [
              { product_id: smallId, quantity: 1 },
              { product_id: largeId, quantity: 1 },
            ],
          }),
      ];

      const responses = await Promise.all(requests);

      const deadlockErrors = responses.filter(
        (r) =>
          JSON.stringify(r.body).includes('40P01') ||
          JSON.stringify(r.body).toLowerCase().includes('deadlock'),
      );
      const serverErrors = responses.filter((r) => r.status >= 500);
      const successes = responses.filter((r) => r.status === 201);

      console.log('--- Suite 3 Empirical Results ---');
      console.log('Total cross-contention requests:', responses.length);
      console.log('Successful checkouts:', successes.length);
      console.log('Deadlock errors (40P01):', deadlockErrors.length);
      console.log('Server errors (>=500):', serverErrors.length);

      expect(deadlockErrors.length).toBe(0);
      expect(serverErrors.length).toBe(0);
      expect(successes.length).toBe(6);

      for (const succ of successes) {
        if (succ.body.data?.id) {
          createdOrderIds.push(succ.body.data.id);
        }
      }

      // Both products had 15 stock. 6 checkouts purchased 1 each.
      // Remaining stock must be 15 - 6 = 9 for both products.
      const stockSmall = (
        await request(app.getHttpServer())
          .get(`/api/products/${smallId}`)
          .set('Authorization', `Bearer ${cashierAccessToken}`)
      ).body.data.stock;
      const stockLarge = (
        await request(app.getHttpServer())
          .get(`/api/products/${largeId}`)
          .set('Authorization', `Bearer ${cashierAccessToken}`)
      ).body.data.stock;

      expect(stockSmall).toBe(9);
      expect(stockLarge).toBe(9);
    });
  });

  // =========================================================================
  // SUITE 4: Concurrent Invoice Generation & Advisory Lock Integrity
  // =========================================================================
  describe('Suite 4: Concurrent Invoice Sequence & Advisory Lock Integrity', () => {
    it(
      'empirically guarantees 3 successes, 2 failures, 0 overselling, and unique sequential invoices',
      async () => {
        const productId = await createTestProduct(`AdvisoryProd_${uniqueSuffix}`, 3, 10000);

        // 5 simultaneous checkout requests on stock = 3
        const requests = Array.from({ length: 5 }, () =>
          request(app.getHttpServer())
            .post('/api/orders')
            .set('Authorization', `Bearer ${cashierAccessToken}`)
            .send({
              customer_id: null,
              items: [{ product_id: productId, quantity: 1 }],
            }),
        );

        const responses = await Promise.all(requests);

        const successes = responses.filter((r) => r.status === 201);
        const failures = responses.filter((r) => r.status === 422);
        const errors = responses.filter((r) => r.status >= 500);

        console.log('--- Suite 4 Empirical Results ---');
        console.log('Concurrent invoice test requests:', responses.length);
        console.log('Successes (201):', successes.length);
        console.log('Failures (422):', failures.length);
        console.log('Errors (500):', errors.length);

        expect(successes.length).toBe(3);
        expect(failures.length).toBe(2);
        expect(errors.length).toBe(0);

        // Verify zero overselling
        const finalStock = (
          await request(app.getHttpServer())
            .get(`/api/products/${productId}`)
            .set('Authorization', `Bearer ${cashierAccessToken}`)
        ).body.data.stock;
        expect(finalStock).toBe(0);

        // Collect order numbers to verify PostgreSQL advisory lock prevented duplicate invoice numbers
        const orderNumbers = successes.map((r) => {
          const d = r.body.data;
          const num = d.order_number || d.orderNumber;
          if (d.id) createdOrderIds.push(d.id);
          return num;
        });

        const uniqueOrderNumbers = new Set(orderNumbers);
        expect(uniqueOrderNumbers.size).toBe(3);
      },
      30000,
    );
  });

  // =========================================================================
  // SUITE 5: Database Connection & Transaction State Cleanliness
  // =========================================================================
  describe('Suite 5: Database Connection & Transaction State Cleanliness', () => {
    it(
      'empirically verifies zero dangling uncommitted transactions in pg_stat_activity',
      async () => {
      // Query PostgreSQL pg_stat_activity for any 'idle in transaction' connections
      const client = await pool.connect();
      try {
        const res = await client.query(`
          SELECT pid, state, query, age(clock_timestamp(), query_start) AS query_age
          FROM pg_stat_activity
          WHERE datname = current_database()
            AND state = 'idle in transaction'
            AND pid <> pg_backend_pid();
        `);

        console.log('--- Suite 5 Empirical Results ---');
        console.log('Dangling "idle in transaction" connections count:', res.rows.length);
        if (res.rows.length > 0) {
          console.log('Stuck transactions:', res.rows);
        }

        expect(res.rows.length).toBe(0);
      } finally {
        client.release();
      }

      // Verify that database is completely responsive for subsequent normal operations
      const followupProductId = await createTestProduct(`FollowupProd_${uniqueSuffix}`, 1, 5000);
      const followupRes = await request(app.getHttpServer())
        .post('/api/orders')
        .set('Authorization', `Bearer ${cashierAccessToken}`)
        .send({
          customer_id: null,
          items: [{ product_id: followupProductId, quantity: 1 }],
        });

      expect(followupRes.status).toBe(201);
      if (followupRes.body.data?.id) {
        createdOrderIds.push(followupRes.body.data.id);
      }
    }, 30000);
  });
});
