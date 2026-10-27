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
import { DRIZZLE_ORM, DrizzleDatabase } from '../src/database/database.module';
import * as schema from '../src/database/schema';
import { eq, ilike } from 'drizzle-orm';
import { Role, OrderActivityAction } from '@titipin/shared';

describe('Challenger M3-2: Empirical Edge-Case Stress Testing (Hold Cart, Birthday Discount, Walk-in, Filtering, Snapshots)', () => {
  let app: INestApplication;
  let db: DrizzleDatabase;
  let adminAccessToken: string;
  let cashierAccessToken: string;
  let cashier2AccessToken: string;
  let cashierUserId: string;
  let cashier2UserId: string;

  const runId = Date.now().toString().slice(-6);
  const testPrefix = `CHL3_${runId}`;

  // Products
  let stdProductId: number;
  let highValueProductId: number;
  let immutableProductId: number;

  // Customers
  let birthdayTodayCustomerId: string;
  let birthdayYesterdayCustomerId: string;
  let birthdayTomorrowCustomerId: string;
  let normalCustomerAId: string;
  let normalCustomerBId: string;
  let softDeletedCustomerId: string;

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

    // 1. Authenticate Admin
    const adminLoginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'admin@titipin.id',
        password: 'Admin123!',
      });
    expect(adminLoginRes.status).toBe(200);
    adminAccessToken = adminLoginRes.body.data.accessToken;

    // 2. Authenticate Primary Cashier
    const cashierLoginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'kasir@titipin.id',
        password: 'Kasir123!',
      });
    expect(cashierLoginRes.status).toBe(200);
    cashierAccessToken = cashierLoginRes.body.data.accessToken;
    cashierUserId = cashierLoginRes.body.data.user.id;

    // 3. Create & Authenticate Cashier 2 (for multi-cashier hold isolation tests)
    const cashier2Email = `kasir2_${runId}@titipin.id`;
    const createCashier2Res = await request(app.getHttpServer())
      .post('/api/users')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        name: `Cashier Two ${runId}`,
        email: cashier2Email,
        password: 'CashierPassword123!',
        role: Role.CASHIER,
      });
    expect(createCashier2Res.status).toBe(201);
    cashier2UserId = createCashier2Res.body.data.id;

    const cashier2LoginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: cashier2Email,
        password: 'CashierPassword123!',
      });
    expect(cashier2LoginRes.status).toBe(200);
    cashier2AccessToken = cashier2LoginRes.body.data.accessToken;

    // Clean up any lingering draft orders for both cashiers before testing
    await db.delete(schema.draftOrders).where(eq(schema.draftOrders.userId, cashierUserId));
    await db.delete(schema.draftOrders).where(eq(schema.draftOrders.userId, cashier2UserId));

    // 4. Create Test Products
    // Standard product: Rp 50.000, Stock 100
    const pStd = await request(app.getHttpServer())
      .post('/api/products')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        product_code: `STD_${runId}`,
        product_name: `${testPrefix} Standard Product`,
        stock: 100,
        price: 50000.0,
      });
    expect(pStd.status).toBe(201);
    stdProductId = pStd.body.data.id;

    // High value product: Rp 500.000, Stock 50 (for birthday cap testing)
    const pHigh = await request(app.getHttpServer())
      .post('/api/products')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        product_code: `HIGH_${runId}`,
        product_name: `${testPrefix} High Value Product`,
        stock: 50,
        price: 500000.0,
      });
    expect(pHigh.status).toBe(201);
    highValueProductId = pHigh.body.data.id;

    // Product for Price Immutability testing: Rp 75.000, Stock 40
    const pImm = await request(app.getHttpServer())
      .post('/api/products')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        product_code: `IMM_${runId}`,
        product_name: `${testPrefix} Price Snapshot Product`,
        stock: 40,
        price: 75000.0,
      });
    expect(pImm.status).toBe(201);
    immutableProductId = pImm.body.data.id;

    // 5. Create Test Customers
    const now = new Date();
    const curMonth = String(now.getMonth() + 1).padStart(2, '0');
    const curDay = String(now.getDate()).padStart(2, '0');
    const bdayTodayStr = `1995-${curMonth}-${curDay}`;

    const yDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yMonth = String(yDate.getMonth() + 1).padStart(2, '0');
    const yDay = String(yDate.getDate()).padStart(2, '0');
    const bdayYesterdayStr = `1990-${yMonth}-${yDay}`;

    const tDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tMonth = String(tDate.getMonth() + 1).padStart(2, '0');
    const tDay = String(tDate.getDate()).padStart(2, '0');
    const bdayTomorrowStr = `1993-${tMonth}-${tDay}`;

    // Customer: Birthday Today
    const cToday = await request(app.getHttpServer())
      .post('/api/customers')
      .set('Authorization', `Bearer ${cashierAccessToken}`)
      .send({
        customer_name: `${testPrefix} Bday Today`,
        customer_address: 'Jl. Ultah Hari Ini No. 1',
        gender: 'Pria',
        birth_date: bdayTodayStr,
        phone: '08111111101',
      });
    expect(cToday.status).toBe(201);
    birthdayTodayCustomerId = cToday.body.data.id;

    // Customer: Birthday Yesterday
    const cYesterday = await request(app.getHttpServer())
      .post('/api/customers')
      .set('Authorization', `Bearer ${cashierAccessToken}`)
      .send({
        customer_name: `${testPrefix} Bday Yesterday`,
        customer_address: 'Jl. Ultah Kemarin No. 2',
        gender: 'Wanita',
        birth_date: bdayYesterdayStr,
        phone: '08111111102',
      });
    expect(cYesterday.status).toBe(201);
    birthdayYesterdayCustomerId = cYesterday.body.data.id;

    // Customer: Birthday Tomorrow
    const cTomorrow = await request(app.getHttpServer())
      .post('/api/customers')
      .set('Authorization', `Bearer ${cashierAccessToken}`)
      .send({
        customer_name: `${testPrefix} Bday Tomorrow`,
        customer_address: 'Jl. Ultah Besok No. 3',
        gender: 'Pria',
        birth_date: bdayTomorrowStr,
        phone: '08111111103',
      });
    expect(cTomorrow.status).toBe(201);
    birthdayTomorrowCustomerId = cTomorrow.body.data.id;

    // Normal Customer A
    const cNormA = await request(app.getHttpServer())
      .post('/api/customers')
      .set('Authorization', `Bearer ${cashierAccessToken}`)
      .send({
        customer_name: `${testPrefix} Customer Alpha`,
        customer_address: 'Jl. Alpha No. 10',
        gender: 'Pria',
        birth_date: '1988-06-20',
        phone: '08111111104',
      });
    expect(cNormA.status).toBe(201);
    normalCustomerAId = cNormA.body.data.id;

    // Normal Customer B
    const cNormB = await request(app.getHttpServer())
      .post('/api/customers')
      .set('Authorization', `Bearer ${cashierAccessToken}`)
      .send({
        customer_name: `${testPrefix} Customer Beta`,
        customer_address: 'Jl. Beta No. 20',
        gender: 'Wanita',
        birth_date: '1991-11-10',
        phone: '08111111105',
      });
    expect(cNormB.status).toBe(201);
    normalCustomerBId = cNormB.body.data.id;

    // Customer for soft deletion
    const cSoftDel = await request(app.getHttpServer())
      .post('/api/customers')
      .set('Authorization', `Bearer ${cashierAccessToken}`)
      .send({
        customer_name: `${testPrefix} Soft Deleted Target`,
        customer_address: 'Jl. Hapus No. 99',
        gender: 'Pria',
        birth_date: '1985-04-12',
        phone: '08111111106',
      });
    expect(cSoftDel.status).toBe(201);
    softDeletedCustomerId = cSoftDel.body.data.id;

    // Soft delete customer
    const delRes = await request(app.getHttpServer())
      .delete(`/api/customers/${softDeletedCustomerId}`)
      .set('Authorization', `Bearer ${adminAccessToken}`);
    expect(delRes.status).toBe(200);
  });

  afterAll(async () => {
    try {
      if (db) {
        // Clean draft orders
        if (cashierUserId) {
          await db.delete(schema.draftOrders).where(eq(schema.draftOrders.userId, cashierUserId));
        }
        if (cashier2UserId) {
          await db.delete(schema.draftOrders).where(eq(schema.draftOrders.userId, cashier2UserId));
        }

        // Clean customers created in this run
        await db.delete(schema.customers).where(ilike(schema.customers.customerName, `CHL3_%`));

        // Clean products created in this run
        await db.delete(schema.products).where(ilike(schema.products.productCode, `%_${runId}`));

        // Clean user cashier2
        if (cashier2UserId) {
          await db.delete(schema.users).where(eq(schema.users.id, cashier2UserId));
        }
      }
    } catch (err) {
      console.error('Error during cleanup:', err);
    }
    await app.close();
  });

  // =========================================================================
  // SUITE 1: ADR-005 & BR-012 Hold Cart Isolation & Draft Lifecycle
  // =========================================================================
  describe('1. ADR-005 & BR-012: Hold Cart Isolation & Draft Lifecycle', () => {
    it('1.1: Hold cart persists draft order to draft_orders table without locking or decrementing physical stock', async () => {
      // Record stock prior to hold
      const pResBefore = await request(app.getHttpServer())
        .get(`/api/products/${stdProductId}`)
        .set('Authorization', `Bearer ${cashierAccessToken}`);
      const initialStock = pResBefore.body.data.stock;

      // Hold cart with 6 units
      const holdRes = await request(app.getHttpServer())
        .post('/api/orders/hold')
        .set('Authorization', `Bearer ${cashierAccessToken}`)
        .send({
          customer_id: normalCustomerAId,
          items: [{ product_id: stdProductId, quantity: 6 }],
        });

      expect(holdRes.status).toBe(201);
      expect(holdRes.body.success).toBe(true);
      expect(holdRes.body.data).toBeDefined();
      expect(holdRes.body.data.items).toEqual([{ product_id: stdProductId, quantity: 6 }]);

      // Verify physical product stock is completely unmodified
      const pResAfter = await request(app.getHttpServer())
        .get(`/api/products/${stdProductId}`)
        .set('Authorization', `Bearer ${cashierAccessToken}`);
      expect(pResAfter.body.data.stock).toBe(initialStock);

      // Verify draft record exists in draft_orders database table
      const draftsInDb = await db
        .select()
        .from(schema.draftOrders)
        .where(eq(schema.draftOrders.userId, cashierUserId));
      expect(draftsInDb.length).toBe(1);
      expect(draftsInDb[0].customerId).toBe(normalCustomerAId);
      expect(draftsInDb[0].items).toEqual([{ product_id: stdProductId, quantity: 6 }]);

      // Verify GET /api/orders/draft retrieves the draft
      const getDraftRes = await request(app.getHttpServer())
        .get('/api/orders/draft')
        .set('Authorization', `Bearer ${cashierAccessToken}`);
      expect(getDraftRes.status).toBe(200);
      expect(getDraftRes.body.data.customer_id).toBe(normalCustomerAId);
    });

    it('1.2: BR-012: Cashier attempting to create a 2nd draft MUST be rejected with HTTP 422', async () => {
      // Cashier 1 already has an active draft from test 1.1
      const secondHoldRes = await request(app.getHttpServer())
        .post('/api/orders/hold')
        .set('Authorization', `Bearer ${cashierAccessToken}`)
        .send({
          customer_id: null,
          items: [{ product_id: stdProductId, quantity: 2 }],
        });

      expect(secondHoldRes.status).toBe(422);
      expect(secondHoldRes.body.success).toBe(false);
      expect(secondHoldRes.body.message).toContain('sudah memiliki satu transaksi yang sedang di-hold');

      // Database constraint check: exactly 1 draft exists
      const draftsInDb = await db
        .select()
        .from(schema.draftOrders)
        .where(eq(schema.draftOrders.userId, cashierUserId));
      expect(draftsInDb.length).toBe(1);
      // Ensure the original draft item (quantity: 6) was NOT overwritten
      expect(draftsInDb[0].items).toEqual([{ product_id: stdProductId, quantity: 6 }]);
    });

    it('1.3: ADR-005 Multi-Cashier Isolation: Cashier 2 can hold draft independently; Cashier 1 cannot mutate Cashier 2 draft', async () => {
      // Cashier 2 holds their own draft (while Cashier 1 draft is active)
      const c2HoldRes = await request(app.getHttpServer())
        .post('/api/orders/hold')
        .set('Authorization', `Bearer ${cashier2AccessToken}`)
        .send({
          customer_id: normalCustomerBId,
          items: [{ product_id: highValueProductId, quantity: 1 }],
        });

      expect(c2HoldRes.status).toBe(201);
      expect(c2HoldRes.body.data.items).toEqual([{ product_id: highValueProductId, quantity: 1 }]);

      // Cashier 1 views their draft -> must see Customer A, stdProduct
      const c1DraftRes = await request(app.getHttpServer())
        .get('/api/orders/draft')
        .set('Authorization', `Bearer ${cashierAccessToken}`);
      expect(c1DraftRes.status).toBe(200);
      expect(c1DraftRes.body.data.customerId).toBe(normalCustomerAId);

      // Cashier 2 views their draft -> must see Customer B, highValueProduct
      const c2DraftRes = await request(app.getHttpServer())
        .get('/api/orders/draft')
        .set('Authorization', `Bearer ${cashier2AccessToken}`);
      expect(c2DraftRes.status).toBe(200);
      expect(c2DraftRes.body.data.customerId).toBe(normalCustomerBId);

      // Cashier 1 discards their draft
      const c1DiscardRes = await request(app.getHttpServer())
        .delete('/api/orders/draft')
        .set('Authorization', `Bearer ${cashierAccessToken}`);
      expect(c1DiscardRes.status).toBe(200);

      // Verify Cashier 1 draft is gone
      const c1CheckRes = await request(app.getHttpServer())
        .get('/api/orders/draft')
        .set('Authorization', `Bearer ${cashierAccessToken}`);
      expect(c1CheckRes.status).toBe(404);

      // Verify Cashier 2 draft is STILL intact in DB and API
      const c2CheckRes = await request(app.getHttpServer())
        .get('/api/orders/draft')
        .set('Authorization', `Bearer ${cashier2AccessToken}`);
      expect(c2CheckRes.status).toBe(200);
      expect(c2CheckRes.body.data.customerId).toBe(normalCustomerBId);

      // Clean up Cashier 2 draft
      await request(app.getHttpServer())
        .delete('/api/orders/draft')
        .set('Authorization', `Bearer ${cashier2AccessToken}`);
    });

    it('1.4: Discard removes draft from database directly; subsequent GET returns 404; stock unmodified', async () => {
      // Cashier 1 holds draft with 5 units
      await request(app.getHttpServer())
        .post('/api/orders/hold')
        .set('Authorization', `Bearer ${cashierAccessToken}`)
        .send({
          customer_id: null,
          items: [{ product_id: stdProductId, quantity: 5 }],
        });

      // Verify row exists in DB
      let rows = await db
        .select()
        .from(schema.draftOrders)
        .where(eq(schema.draftOrders.userId, cashierUserId));
      expect(rows.length).toBe(1);

      // Discard draft
      const discardRes = await request(app.getHttpServer())
        .delete('/api/orders/draft')
        .set('Authorization', `Bearer ${cashierAccessToken}`);
      expect(discardRes.status).toBe(200);
      expect(discardRes.body.success).toBe(true);

      // Verify row is deleted from database
      rows = await db
        .select()
        .from(schema.draftOrders)
        .where(eq(schema.draftOrders.userId, cashierUserId));
      expect(rows.length).toBe(0);

      // GET /api/orders/draft returns 404
      const getDraftRes = await request(app.getHttpServer())
        .get('/api/orders/draft')
        .set('Authorization', `Bearer ${cashierAccessToken}`);
      expect(getDraftRes.status).toBe(404);

      // Repeat discard is idempotent
      const repeatDiscardRes = await request(app.getHttpServer())
        .delete('/api/orders/draft')
        .set('Authorization', `Bearer ${cashierAccessToken}`);
      expect(repeatDiscardRes.status).toBe(200);
    });

    it('1.5: Resume converts draft to completed order and deletes draft record atomically', async () => {
      // Stock before hold & resume
      const pBefore = (
        await request(app.getHttpServer())
          .get(`/api/products/${stdProductId}`)
          .set('Authorization', `Bearer ${cashierAccessToken}`)
      ).body.data.stock;

      // Hold draft with 4 units of standard product
      const holdRes = await request(app.getHttpServer())
        .post('/api/orders/hold')
        .set('Authorization', `Bearer ${cashierAccessToken}`)
        .send({
          customer_id: normalCustomerAId,
          items: [{ product_id: stdProductId, quantity: 4 }],
        });
      expect(holdRes.status).toBe(201);

      // Finalize held draft
      const finalizeRes = await request(app.getHttpServer())
        .post('/api/orders/draft/finalize')
        .set('Authorization', `Bearer ${cashierAccessToken}`)
        .send();

      expect(finalizeRes.status).toBe(201);
      expect(finalizeRes.body.success).toBe(true);

      const orderData = finalizeRes.body.data;
      expect(orderData.order_number || orderData.orderNumber).toMatch(/^INV-\d{8}-\d{4}$/);
      expect(orderData.customer_id || orderData.customerId).toBe(normalCustomerAId);
      expect(Number(orderData.total_amount || orderData.totalAmount)).toBe(4 * 50000);

      // Stock is now decremented atomically by 4
      const pAfter = (
        await request(app.getHttpServer())
          .get(`/api/products/${stdProductId}`)
          .set('Authorization', `Bearer ${cashierAccessToken}`)
      ).body.data.stock;
      expect(pAfter).toBe(pBefore - 4);

      // Draft order is atomically removed from database
      const draftInDb = await db
        .select()
        .from(schema.draftOrders)
        .where(eq(schema.draftOrders.userId, cashierUserId));
      expect(draftInDb.length).toBe(0);

      // GET /api/orders/draft returns 404
      const getDraftRes = await request(app.getHttpServer())
        .get('/api/orders/draft')
        .set('Authorization', `Bearer ${cashierAccessToken}`);
      expect(getDraftRes.status).toBe(404);

      // Order activity logs contains ORDER_FINALIZED
      const logs = await db
        .select()
        .from(schema.orderActivityLogs)
        .where(eq(schema.orderActivityLogs.orderId, orderData.id));
      expect(logs.some((l) => l.action === OrderActivityAction.ORDER_FINALIZED)).toBe(true);
    });

    it('1.6: Finalize when NO draft exists strictly returns 404 Not Found', async () => {
      const finalizeRes = await request(app.getHttpServer())
        .post('/api/orders/draft/finalize')
        .set('Authorization', `Bearer ${cashierAccessToken}`)
        .send();

      expect(finalizeRes.status).toBe(404);
      expect(finalizeRes.body.message).toContain('Tidak ada draft transaksi yang tertahan');
    });

    it('1.7: Hold cart payload validation: empty items, zero quantity, and non-existent products fail with 422', async () => {
      // Empty items
      const emptyRes = await request(app.getHttpServer())
        .post('/api/orders/hold')
        .set('Authorization', `Bearer ${cashierAccessToken}`)
        .send({
          customer_id: null,
          items: [],
        });
      expect(emptyRes.status).toBe(422);

      // Negative quantity
      const negRes = await request(app.getHttpServer())
        .post('/api/orders/hold')
        .set('Authorization', `Bearer ${cashierAccessToken}`)
        .send({
          customer_id: null,
          items: [{ product_id: stdProductId, quantity: -1 }],
        });
      expect(negRes.status).toBe(422);

      // Invalid product ID (<= 0)
      const invalidPIdRes = await request(app.getHttpServer())
        .post('/api/orders/hold')
        .set('Authorization', `Bearer ${cashierAccessToken}`)
        .send({
          customer_id: null,
          items: [{ product_id: 0, quantity: 1 }],
        });
      expect(invalidPIdRes.status).toBe(422);
    });
  });

  // =========================================================================
  // SUITE 2: BR-006 Birthday Discount Boundaries
  // =========================================================================
  describe('2. BR-006: Birthday Discount Boundaries (5%, Cap Rp 50.000, MM-DD Match)', () => {
    it('2.1: Exactly 5% discount applied when birth date matches order date MM-DD and 5% is BELOW Rp 50.000 cap', async () => {
      // Purchase 4 units of stdProduct (Rp 50.000) = Subtotal Rp 200.000
      // 5% of 200.000 = Rp 10.000 (which is <= 50.000)
      // Total amount must be 200.000 - 10.000 = Rp 190.000
      const checkoutRes = await request(app.getHttpServer())
        .post('/api/orders/checkout')
        .set('Authorization', `Bearer ${cashierAccessToken}`)
        .send({
          customer_id: birthdayTodayCustomerId,
          items: [{ product_id: stdProductId, quantity: 4 }],
        });

      expect(checkoutRes.status).toBe(201);
      const data = checkoutRes.body.data;
      const total = Number(data.total_amount || data.totalAmount);
      expect(total).toBe(190000);

      // Verify activity log details
      const logs = await db
        .select()
        .from(schema.orderActivityLogs)
        .where(eq(schema.orderActivityLogs.orderId, data.id));
      const createLog = logs.find((l) => l.action === OrderActivityAction.ORDER_CREATED);
      expect(createLog).toBeDefined();
      const details = createLog?.details as Record<string, unknown>;
      expect(details.subtotal).toBe(200000);
      expect(details.discount).toBe(10000);
      expect(details.isBirthdayDiscountApplied).toBe(true);
    });

    it('2.2: Birthday discount is STRICTLY CAPPED at Rp 50.000 when 5% exceeds the cap', async () => {
      // Purchase 4 units of highValueProduct (Rp 500.000) = Subtotal Rp 2.000.000
      // 5% of 2.000.000 = Rp 100.000
      // Capped discount must be Rp 50.000 (NOT 100.000)
      // Total amount must be 2.000.000 - 50.000 = Rp 1.950.000
      const checkoutRes = await request(app.getHttpServer())
        .post('/api/orders/checkout')
        .set('Authorization', `Bearer ${cashierAccessToken}`)
        .send({
          customer_id: birthdayTodayCustomerId,
          items: [{ product_id: highValueProductId, quantity: 4 }],
        });

      expect(checkoutRes.status).toBe(201);
      const data = checkoutRes.body.data;
      const total = Number(data.total_amount || data.totalAmount);
      expect(total).toBe(1950000);

      // Verify activity log explicitly records capped discount of 50.000
      const logs = await db
        .select()
        .from(schema.orderActivityLogs)
        .where(eq(schema.orderActivityLogs.orderId, data.id));
      const createLog = logs.find((l) => l.action === OrderActivityAction.ORDER_CREATED);
      const details = createLog?.details as Record<string, unknown>;
      expect(details.subtotal).toBe(2000000);
      expect(details.discount).toBe(50000);
      expect(details.isBirthdayDiscountApplied).toBe(true);
    });

    it('2.3: Birthday exactly at cap threshold: Subtotal Rp 1.000.000 yields exactly Rp 50.000 discount', async () => {
      // 2 units of highValueProduct (Rp 500.000) = Subtotal Rp 1.000.000
      // 5% of 1.000.000 = exactly Rp 50.000
      // Total = Rp 950.000
      const checkoutRes = await request(app.getHttpServer())
        .post('/api/orders/checkout')
        .set('Authorization', `Bearer ${cashierAccessToken}`)
        .send({
          customer_id: birthdayTodayCustomerId,
          items: [{ product_id: highValueProductId, quantity: 2 }],
        });

      expect(checkoutRes.status).toBe(201);
      const data = checkoutRes.body.data;
      const total = Number(data.total_amount || data.totalAmount);
      expect(total).toBe(950000);

      const logs = await db
        .select()
        .from(schema.orderActivityLogs)
        .where(eq(schema.orderActivityLogs.orderId, data.id));
      const createLog = logs.find((l) => l.action === OrderActivityAction.ORDER_CREATED);
      const details = createLog?.details as Record<string, unknown>;
      expect(details.discount).toBe(50000);
    });

    it('2.4: ZERO discount when member birth date was YESTERDAY (MM-(DD-1))', async () => {
      // 4 units of stdProduct = Subtotal Rp 200.000
      // Customer birthday was yesterday -> Discount MUST BE 0
      // Total = Rp 200.000
      const checkoutRes = await request(app.getHttpServer())
        .post('/api/orders/checkout')
        .set('Authorization', `Bearer ${cashierAccessToken}`)
        .send({
          customer_id: birthdayYesterdayCustomerId,
          items: [{ product_id: stdProductId, quantity: 4 }],
        });

      expect(checkoutRes.status).toBe(201);
      const data = checkoutRes.body.data;
      const total = Number(data.total_amount || data.totalAmount);
      expect(total).toBe(200000);

      const logs = await db
        .select()
        .from(schema.orderActivityLogs)
        .where(eq(schema.orderActivityLogs.orderId, data.id));
      const createLog = logs.find((l) => l.action === OrderActivityAction.ORDER_CREATED);
      const details = createLog?.details as Record<string, unknown>;
      expect(details.discount).toBe(0);
      expect(details.isBirthdayDiscountApplied).toBe(false);
    });

    it('2.5: ZERO discount when member birth date is TOMORROW (MM-(DD+1))', async () => {
      // 4 units of stdProduct = Subtotal Rp 200.000
      // Customer birthday is tomorrow -> Discount MUST BE 0
      // Total = Rp 200.000
      const checkoutRes = await request(app.getHttpServer())
        .post('/api/orders/checkout')
        .set('Authorization', `Bearer ${cashierAccessToken}`)
        .send({
          customer_id: birthdayTomorrowCustomerId,
          items: [{ product_id: stdProductId, quantity: 4 }],
        });

      expect(checkoutRes.status).toBe(201);
      const data = checkoutRes.body.data;
      const total = Number(data.total_amount || data.totalAmount);
      expect(total).toBe(200000);

      const logs = await db
        .select()
        .from(schema.orderActivityLogs)
        .where(eq(schema.orderActivityLogs.orderId, data.id));
      const createLog = logs.find((l) => l.action === OrderActivityAction.ORDER_CREATED);
      const details = createLog?.details as Record<string, unknown>;
      expect(details.discount).toBe(0);
      expect(details.isBirthdayDiscountApplied).toBe(false);
    });
  });

  // =========================================================================
  // SUITE 3: BR-013 Walk-In Customer vs Invalid Customer
  // =========================================================================
  describe('3. BR-013: Walk-In Customer (null) vs Invalid UUID Customer', () => {
    it('3.1: Walk-in customer with explicit customer_id: null checkout succeeds and labels as Pelanggan Umum', async () => {
      const checkoutRes = await request(app.getHttpServer())
        .post('/api/orders/checkout')
        .set('Authorization', `Bearer ${cashierAccessToken}`)
        .send({
          customer_id: null,
          items: [{ product_id: stdProductId, quantity: 2 }],
        });

      expect(checkoutRes.status).toBe(201);
      const data = checkoutRes.body.data;
      expect(data.customer_id || data.customerId).toBeNull();
      expect(data.customer_name || data.customerName).toBe('Pelanggan Umum');
      expect(Number(data.total_amount || data.totalAmount)).toBe(2 * 50000);

      // Verify database record has NULL customer_id
      const orderInDb = await db
        .select()
        .from(schema.orders)
        .where(eq(schema.orders.id, data.id));
      expect(orderInDb[0].customerId).toBeNull();
    });

    it('3.2: Walk-in customer with omitted customer_id checkout succeeds', async () => {
      const checkoutRes = await request(app.getHttpServer())
        .post('/api/orders/checkout')
        .set('Authorization', `Bearer ${cashierAccessToken}`)
        .send({
          items: [{ product_id: stdProductId, quantity: 1 }],
        });

      expect(checkoutRes.status).toBe(201);
      const data = checkoutRes.body.data;
      expect(data.customer_id || data.customerId).toBeNull();
      expect(data.customer_name || data.customerName).toBe('Pelanggan Umum');
    });

    it('3.3: Malformed customer_id (invalid UUID format) is strictly rejected with HTTP 422', async () => {
      const stockBefore = (
        await request(app.getHttpServer())
          .get(`/api/products/${stdProductId}`)
          .set('Authorization', `Bearer ${cashierAccessToken}`)
      ).body.data.stock;

      const checkoutRes = await request(app.getHttpServer())
        .post('/api/orders/checkout')
        .set('Authorization', `Bearer ${cashierAccessToken}`)
        .send({
          customer_id: 'not-a-valid-uuid-format',
          items: [{ product_id: stdProductId, quantity: 2 }],
        });

      expect(checkoutRes.status).toBe(422);
      expect(checkoutRes.body.message).toContain('Format ID pelanggan tidak valid');

      // Verify stock was NOT decremented
      const stockAfter = (
        await request(app.getHttpServer())
          .get(`/api/products/${stdProductId}`)
          .set('Authorization', `Bearer ${cashierAccessToken}`)
      ).body.data.stock;
      expect(stockAfter).toBe(stockBefore);
    });

    it('3.4: Valid UUID syntax of non-existent customer is rejected with HTTP 422', async () => {
      const nonExistentUuid = '00000000-0000-0000-0000-000000000000';
      const checkoutRes = await request(app.getHttpServer())
        .post('/api/orders/checkout')
        .set('Authorization', `Bearer ${cashierAccessToken}`)
        .send({
          customer_id: nonExistentUuid,
          items: [{ product_id: stdProductId, quantity: 1 }],
        });

      expect(checkoutRes.status).toBe(422);
      expect(checkoutRes.body.message).toContain('Pelanggan tidak ditemukan atau sudah dinonaktifkan');
    });

    it('3.5: Soft-deleted customer UUID is rejected with HTTP 422 and stock is preserved', async () => {
      const stockBefore = (
        await request(app.getHttpServer())
          .get(`/api/products/${stdProductId}`)
          .set('Authorization', `Bearer ${cashierAccessToken}`)
      ).body.data.stock;

      const checkoutRes = await request(app.getHttpServer())
        .post('/api/orders/checkout')
        .set('Authorization', `Bearer ${cashierAccessToken}`)
        .send({
          customer_id: softDeletedCustomerId,
          items: [{ product_id: stdProductId, quantity: 3 }],
        });

      expect(checkoutRes.status).toBe(422);
      expect(checkoutRes.body.message).toContain('Pelanggan tidak ditemukan atau sudah dinonaktifkan');

      // Verify stock remains untouched
      const stockAfter = (
        await request(app.getHttpServer())
          .get(`/api/products/${stdProductId}`)
          .set('Authorization', `Bearer ${cashierAccessToken}`)
      ).body.data.stock;
      expect(stockAfter).toBe(stockBefore);
    });
  });

  // =========================================================================
  // SUITE 4: Order History Query Filtering
  // =========================================================================
  describe('4. Order History Query Filtering (Customer & Date Range from/to)', () => {
    let orderAlphaId: number;
    let orderBetaId: number;

    beforeAll(async () => {
      // Create specific orders for Customer Alpha and Customer Beta
      const resAlpha = await request(app.getHttpServer())
        .post('/api/orders/checkout')
        .set('Authorization', `Bearer ${cashierAccessToken}`)
        .send({
          customer_id: normalCustomerAId,
          items: [{ product_id: stdProductId, quantity: 1 }],
        });
      expect(resAlpha.status).toBe(201);
      orderAlphaId = resAlpha.body.data.id;

      const resBeta = await request(app.getHttpServer())
        .post('/api/orders/checkout')
        .set('Authorization', `Bearer ${cashierAccessToken}`)
        .send({
          customer_id: normalCustomerBId,
          items: [{ product_id: stdProductId, quantity: 1 }],
        });
      expect(resBeta.status).toBe(201);
      orderBetaId = resBeta.body.data.id;
    });

    it('4.1: Filter by specific customer_id strictly returns orders for that customer only', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/orders?customer_id=${normalCustomerAId}`)
        .set('Authorization', `Bearer ${cashierAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      // Verify every returned order belongs to Customer Alpha
      for (const item of res.body.data) {
        expect(item.customer_id || item.customerId).toBe(normalCustomerAId);
        expect(item.id).not.toBe(orderBetaId);
      }
      expect(res.body.data.some((it: { id: number }) => it.id === orderAlphaId)).toBe(true);
    });

    it('4.2: Filter by non-existent customer UUID returns empty array with meta.total = 0', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/orders?customer_id=00000000-0000-0000-0000-000000000000`)
        .set('Authorization', `Bearer ${cashierAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.meta.total).toBe(0);
    });

    it('4.3: Filter by malformed customer UUID is rejected with HTTP 422', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/orders?customer_id=not-a-valid-uuid')
        .set('Authorization', `Bearer ${cashierAccessToken}`);

      expect(res.status).toBe(422);
    });

    it('4.4: Date range filtering (from / to): Enclosing range includes orders; Past range excludes them', async () => {
      const todayIso = new Date().toISOString().split('T')[0];

      // Query enclosing today
      const resToday = await request(app.getHttpServer())
        .get(`/api/orders?from=${todayIso}&to=${todayIso}`)
        .set('Authorization', `Bearer ${cashierAccessToken}`);

      expect(resToday.status).toBe(200);
      expect(resToday.body.data.length).toBeGreaterThanOrEqual(2);
      expect(resToday.body.data.some((it: { id: number }) => it.id === orderAlphaId)).toBe(true);

      // Query past historical range (2020)
      const resPast = await request(app.getHttpServer())
        .get('/api/orders?from=2020-01-01&to=2020-01-02')
        .set('Authorization', `Bearer ${cashierAccessToken}`);

      expect(resPast.status).toBe(200);
      expect(resPast.body.data).toEqual([]);
      expect(resPast.body.meta.total).toBe(0);

      // Query future range (2035)
      const resFuture = await request(app.getHttpServer())
        .get('/api/orders?from=2035-01-01&to=2035-01-02')
        .set('Authorization', `Bearer ${cashierAccessToken}`);

      expect(resFuture.status).toBe(200);
      expect(resFuture.body.data).toEqual([]);
      expect(resFuture.body.meta.total).toBe(0);
    });
  });

  // =========================================================================
  // SUITE 5: Immutable Price Snapshots in order_items
  // =========================================================================
  describe('5. Immutable Price Snapshots in order_items', () => {
    it('5.1: Line items preserve historical unit price even when product price subsequently changes in catalog', async () => {
      // Step 1: Initial product price is Rp 75.000 (set during beforeAll)
      const pInitial = await request(app.getHttpServer())
        .get(`/api/products/${immutableProductId}`)
        .set('Authorization', `Bearer ${cashierAccessToken}`);
      expect(Number(pInitial.body.data.price)).toBe(75000);

      // Step 2: Checkout 2 units at Rp 75.000 -> Total Rp 150.000
      const orderRes = await request(app.getHttpServer())
        .post('/api/orders/checkout')
        .set('Authorization', `Bearer ${cashierAccessToken}`)
        .send({
          customer_id: null,
          items: [{ product_id: immutableProductId, quantity: 2 }],
        });

      expect(orderRes.status).toBe(201);
      const orderId = orderRes.body.data.id;
      expect(Number(orderRes.body.data.total_amount || orderRes.body.data.totalAmount)).toBe(150000);

      // Step 3: Admin updates master product price to Rp 140.000 (price hike)
      const updateRes = await request(app.getHttpServer())
        .put(`/api/products/${immutableProductId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          price: 140000.0,
        });
      expect(updateRes.status).toBe(200);
      expect(Number(updateRes.body.data.price)).toBe(140000);

      // Step 4: Verify catalog now reports Rp 140.000
      const pUpdated = await request(app.getHttpServer())
        .get(`/api/products/${immutableProductId}`)
        .set('Authorization', `Bearer ${cashierAccessToken}`);
      expect(Number(pUpdated.body.data.price)).toBe(140000);

      // Step 5: Query historical order via GET /api/orders/:id
      const historyRes = await request(app.getHttpServer())
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${cashierAccessToken}`);

      expect(historyRes.status).toBe(200);
      const historyData = historyRes.body.data;

      // Order total amount must remain unchanged at Rp 150.000
      expect(Number(historyData.total_amount || historyData.totalAmount)).toBe(150000);

      // Line item unit price must remain snapshot of Rp 75.000 (NOT Rp 140.000)
      expect(historyData.items).toBeDefined();
      expect(historyData.items.length).toBe(1);
      const lineItem = historyData.items[0];
      expect(Number(lineItem.unit_price || lineItem.unitPrice)).toBe(75000);
      expect(Number(lineItem.subtotal)).toBe(150000);

      // Step 6: Verify database level immutability directly in schema.orderItems
      const itemInDb = await db
        .select()
        .from(schema.orderItems)
        .where(eq(schema.orderItems.orderId, orderId));
      expect(itemInDb.length).toBe(1);
      expect(Number(itemInDb[0].unitPrice)).toBe(75000);
      expect(Number(itemInDb[0].subtotal)).toBe(150000);

      // Step 7: Subsequent order for same product correctly uses new master price (Rp 140.000)
      const newOrderRes = await request(app.getHttpServer())
        .post('/api/orders/checkout')
        .set('Authorization', `Bearer ${cashierAccessToken}`)
        .send({
          customer_id: null,
          items: [{ product_id: immutableProductId, quantity: 1 }],
        });
      expect(newOrderRes.status).toBe(201);
      expect(Number(newOrderRes.body.data.total_amount || newOrderRes.body.data.totalAmount)).toBe(140000);

      // Re-verify the historical order remains untouched after the new order
      const recheckHistoryRes = await request(app.getHttpServer())
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${cashierAccessToken}`);
      expect(Number(recheckHistoryRes.body.data.total_amount || recheckHistoryRes.body.data.totalAmount)).toBe(150000);
    });
  });
});
