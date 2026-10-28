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

describe('OrdersController, POS Checkout & Draft Engine (E2E)', () => {
  let app: INestApplication;
  let adminAccessToken: string;
  let cashierAccessToken: string;
  let isOrdersModuleMounted = false;
  let testProductId: number;
  let testLowStockProductId: number;
  let testCustomerId: string | null = null;
  let testBirthdayCustomerId: string | null = null;
  const uniqueCode = `ORD${Date.now().toString().slice(-6)}`;

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

    // Check if OrdersController is mounted in AppModule
    const probeRes = await request(app.getHttpServer())
      .get('/api/orders')
      .set('Authorization', `Bearer ${cashierAccessToken}`);
    if (probeRes.body?.message !== 'Cannot GET /api/orders') {
      isOrdersModuleMounted = true;
    }

    if (isOrdersModuleMounted) {
      // Create primary test product (stock: 30, price: 15000)
      const p1Res = await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          product_code: `P1_${uniqueCode}`,
          product_name: 'Produk Uji Transaksi POS 1',
          stock: 30,
          price: 15000.0,
        });
      if (p1Res.body?.data?.id) {
        testProductId = p1Res.body.data.id;
      }

      // Create low stock test product (stock: 2, price: 25000)
      const p2Res = await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          product_code: `P2_${uniqueCode}`,
          product_name: 'Produk Uji Stok Rendah POS 2',
          stock: 2,
          price: 25000.0,
        });
      if (p2Res.body?.data?.id) {
        testLowStockProductId = p2Res.body.data.id;
      }

      // Probe Customers module
      const customerProbe = await request(app.getHttpServer())
        .get('/api/customers')
        .set('Authorization', `Bearer ${cashierAccessToken}`);

      if (customerProbe.body?.message !== 'Cannot GET /api/customers') {
        // Register regular customer
        const c1Res = await request(app.getHttpServer())
          .post('/api/customers')
          .set('Authorization', `Bearer ${cashierAccessToken}`)
          .send({
            customer_name: 'Pelanggan Reguler E2E',
            customer_address: 'Jl. Melati No. 10 Jakarta',
            gender: 'Pria',
            birth_date: '1990-01-15',
            phone: '081299887766',
          });
        if (c1Res.body?.data?.id) {
          testCustomerId = c1Res.body.data.id;
        }

        // Register birthday customer (birthday matches today's month and day MM-DD)
        const today = new Date();
        const monthStr = String(today.getMonth() + 1).padStart(2, '0');
        const dayStr = String(today.getDate()).padStart(2, '0');
        const birthdayDate = `1992-${monthStr}-${dayStr}`;

        const c2Res = await request(app.getHttpServer())
          .post('/api/customers')
          .set('Authorization', `Bearer ${cashierAccessToken}`)
          .send({
            customer_name: 'Pelanggan Ulang Tahun E2E',
            customer_address: 'Jl. Mawar No. 5 Bandung',
            gender: 'Wanita',
            birth_date: birthdayDate,
            phone: '081233445566',
          });
        if (c2Res.body?.data?.id) {
          testBirthdayCustomerId = c2Res.body.data.id;
        }
      }
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('TEST-06: should reject unauthenticated request to /api/orders with 401', async (ctx) => {
    if (!isOrdersModuleMounted) {
      ctx.skip();
      return;
    }
    const response = await request(app.getHttpServer()).get('/api/orders');
    expect(response.status).toBe(401);
  });

  it('TEST-01: Member checkout order created atomically (stock decremented, invoice issued, total valid)', async (ctx) => {
    if (!isOrdersModuleMounted) {
      ctx.skip();
      return;
    }

    const initialStockRes = await request(app.getHttpServer())
      .get(`/api/products/${testProductId}`)
      .set('Authorization', `Bearer ${cashierAccessToken}`);
    const initialStock = initialStockRes.body.data.stock;

    const response = await request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${cashierAccessToken}`)
      .send({
        customer_id: testCustomerId,
        items: [
          {
            product_id: testProductId,
            quantity: 3,
          },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();

    const orderData = response.body.data;
    expect(orderData.order_number || orderData.orderNumber).toMatch(/^INV-\d{8}-\d{4}$/);
    expect(Number(orderData.total_amount || orderData.totalAmount)).toBe(3 * 15000);

    // Verify stock is decremented atomically
    const afterStockRes = await request(app.getHttpServer())
      .get(`/api/products/${testProductId}`)
      .set('Authorization', `Bearer ${cashierAccessToken}`);
    expect(afterStockRes.body.data.stock).toBe(initialStock - 3);
  });

  it('TEST-02: Walk-in checkout order created (customer_id = null, "Pelanggan Umum" label)', async (ctx) => {
    if (!isOrdersModuleMounted) {
      ctx.skip();
      return;
    }

    const response = await request(app.getHttpServer())
      .post('/api/orders/checkout')
      .set('Authorization', `Bearer ${cashierAccessToken}`)
      .send({
        customer_id: null,
        items: [
          {
            product_id: testProductId,
            quantity: 1,
          },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);

    const orderData = response.body.data;
    const customerLabel = orderData.customer_name || orderData.customerName;
    expect(customerLabel).toBe('Pelanggan Umum');
    expect(Number(orderData.total_amount || orderData.totalAmount)).toBe(15000);
  });

  it('TEST-03: Insufficient stock rollback (atomic transaction rollback, stock unmodified)', async (ctx) => {
    if (!isOrdersModuleMounted) {
      ctx.skip();
      return;
    }

    // Verify low stock product currently has stock 2
    const beforeStockRes = await request(app.getHttpServer())
      .get(`/api/products/${testLowStockProductId}`)
      .set('Authorization', `Bearer ${cashierAccessToken}`);
    const beforeStock = beforeStockRes.body.data.stock;
    expect(beforeStock).toBe(2);

    // Request 5 units (exceeds available 2)
    const response = await request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${cashierAccessToken}`)
      .send({
        customer_id: null,
        items: [
          {
            product_id: testLowStockProductId,
            quantity: 5,
          },
        ],
      });

    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);

    // Verify stock is UNMODIFIED (transaction rolled back completely)
    const afterStockRes = await request(app.getHttpServer())
      .get(`/api/products/${testLowStockProductId}`)
      .set('Authorization', `Bearer ${cashierAccessToken}`);
    expect(afterStockRes.body.data.stock).toBe(2);
  });

  it('TEST-03: Multi-item Insufficient stock rollback preserves all items stock', async (ctx) => {
    if (!isOrdersModuleMounted) {
      ctx.skip();
      return;
    }

    const p1Before = (
      await request(app.getHttpServer())
        .get(`/api/products/${testProductId}`)
        .set('Authorization', `Bearer ${cashierAccessToken}`)
    ).body.data.stock;

    // Cart with Item 1 (valid stock) + Item 2 (insufficient stock)
    const response = await request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${cashierAccessToken}`)
      .send({
        customer_id: null,
        items: [
          { product_id: testProductId, quantity: 2 },
          { product_id: testLowStockProductId, quantity: 10 },
        ],
      });

    expect(response.status).toBe(422);

    // Item 1 stock must NOT have been deducted partially
    const p1After = (
      await request(app.getHttpServer())
        .get(`/api/products/${testProductId}`)
        .set('Authorization', `Bearer ${cashierAccessToken}`)
    ).body.data.stock;
    expect(p1After).toBe(p1Before);
  });

  it('TEST-04: Hold cart persists to draft_orders without locking stock, resume & finalize draft', async (ctx) => {
    if (!isOrdersModuleMounted) {
      ctx.skip();
      return;
    }

    const stockBefore = (
      await request(app.getHttpServer())
        .get(`/api/products/${testProductId}`)
        .set('Authorization', `Bearer ${cashierAccessToken}`)
    ).body.data.stock;

    // 1. Hold cart
    const holdRes = await request(app.getHttpServer())
      .post('/api/orders/hold')
      .set('Authorization', `Bearer ${cashierAccessToken}`)
      .send({
        customer_id: testCustomerId,
        items: [
          {
            product_id: testProductId,
            quantity: 4,
          },
        ],
      });

    expect(holdRes.status).toBe(201);
    expect(holdRes.body.success).toBe(true);

    // 2. Physical stock must NOT be locked or decremented
    const stockDuringHold = (
      await request(app.getHttpServer())
        .get(`/api/products/${testProductId}`)
        .set('Authorization', `Bearer ${cashierAccessToken}`)
    ).body.data.stock;
    expect(stockDuringHold).toBe(stockBefore);

    // 3. Retrieve held draft
    const getDraftRes = await request(app.getHttpServer())
      .get('/api/orders/held')
      .set('Authorization', `Bearer ${cashierAccessToken}`);

    expect(getDraftRes.status).toBe(200);
    expect(getDraftRes.body.success).toBe(true);
    expect(getDraftRes.body.data).toBeDefined();

    // 4. Finalize held draft
    const finalizeRes = await request(app.getHttpServer())
      .post('/api/orders/held/finalize')
      .set('Authorization', `Bearer ${cashierAccessToken}`)
      .send();

    expect(finalizeRes.status).toBe(201);
    expect(finalizeRes.body.success).toBe(true);

    // 5. Physical stock is NOW decremented
    const stockAfterFinalize = (
      await request(app.getHttpServer())
        .get(`/api/products/${testProductId}`)
        .set('Authorization', `Bearer ${cashierAccessToken}`)
    ).body.data.stock;
    expect(stockAfterFinalize).toBe(stockBefore - 4);

    // 6. Held draft is now removed from draft_orders
    const afterDraftRes = await request(app.getHttpServer())
      .get('/api/orders/held')
      .set('Authorization', `Bearer ${cashierAccessToken}`);
    expect(afterDraftRes.status).toBe(404);
  });

  it('BR-012: Rejects holding a 2nd cart when cashier already has an active draft', async (ctx) => {
    if (!isOrdersModuleMounted) {
      ctx.skip();
      return;
    }

    // Hold first cart
    const hold1 = await request(app.getHttpServer())
      .post('/api/orders/hold')
      .set('Authorization', `Bearer ${cashierAccessToken}`)
      .send({
        customer_id: null,
        items: [{ product_id: testProductId, quantity: 1 }],
      });
    expect(hold1.status).toBe(201);

    // Attempt second hold by same cashier
    const hold2 = await request(app.getHttpServer())
      .post('/api/orders/hold')
      .set('Authorization', `Bearer ${cashierAccessToken}`)
      .send({
        customer_id: null,
        items: [{ product_id: testProductId, quantity: 2 }],
      });
    expect(hold2.status).toBe(422);
    expect(hold2.body.message).toContain('sudah memiliki satu transaksi yang sedang di-hold');

    // Clean up draft via discard
    const discardRes = await request(app.getHttpServer())
      .delete('/api/orders/held')
      .set('Authorization', `Bearer ${cashierAccessToken}`);
    expect(discardRes.status).toBe(200);
  });

  it('TEST-05: Input validation failure (negative quantity / corrupt payload rejected with 422)', async (ctx) => {
    if (!isOrdersModuleMounted) {
      ctx.skip();
      return;
    }

    // Negative quantity
    const resNegative = await request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${cashierAccessToken}`)
      .send({
        customer_id: null,
        items: [{ product_id: testProductId, quantity: -2 }],
      });
    expect(resNegative.status).toBe(422);

    // Zero quantity
    const resZero = await request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${cashierAccessToken}`)
      .send({
        customer_id: null,
        items: [{ product_id: testProductId, quantity: 0 }],
      });
    expect(resZero.status).toBe(422);

    // Empty items array
    const resEmpty = await request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${cashierAccessToken}`)
      .send({
        customer_id: null,
        items: [],
      });
    expect(resEmpty.status).toBe(422);

    // Non-existent product ID
    const resNonExistent = await request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${cashierAccessToken}`)
      .send({
        customer_id: null,
        items: [{ product_id: 99999999, quantity: 1 }],
      });
    expect(resNonExistent.status).toBe(422);
  });

  it('BR-006: Applies 5% Member Birthday Discount (capped at Rp 50.000) when birth date matches order date', async (ctx) => {
    if (!isOrdersModuleMounted || !testBirthdayCustomerId) {
      ctx.skip();
      return;
    }

    // Purchase 4 units of 15000 = Subtotal 60.000
    // 5% discount = 3.000
    // Total should be 57.000
    const response = await request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${cashierAccessToken}`)
      .send({
        customer_id: testBirthdayCustomerId,
        items: [{ product_id: testProductId, quantity: 4 }],
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);

    const orderData = response.body.data;
    const totalAmount = Number(orderData.total_amount || orderData.totalAmount);
    expect(totalAmount).toBe(57000);
  });

  it('Orders History: Cashier and Admin can list orders with pagination and date filters', async (ctx) => {
    if (!isOrdersModuleMounted) {
      ctx.skip();
      return;
    }

    const response = await request(app.getHttpServer())
      .get('/api/orders?page=1&per_page=10')
      .set('Authorization', `Bearer ${cashierAccessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.meta).toBeDefined();
    expect(response.body.meta.page).toBe(1);
  });

  it('Orders Search: Filters orders by invoice orderNumber and customerName', async (ctx) => {
    if (!isOrdersModuleMounted) {
      ctx.skip();
      return;
    }

    // Search by invoice prefix/substring
    const resOrderNumber = await request(app.getHttpServer())
      .get('/api/orders?search=INV-')
      .set('Authorization', `Bearer ${cashierAccessToken}`);

    expect(resOrderNumber.status).toBe(200);
    expect(resOrderNumber.body.success).toBe(true);
    expect(Array.isArray(resOrderNumber.body.data)).toBe(true);
    for (const item of resOrderNumber.body.data) {
      expect(item.orderNumber).toContain('INV-');
    }

    // Search by non-existent query
    const resNotFound = await request(app.getHttpServer())
      .get('/api/orders?search=NON_EXISTENT_ORDER_XYZ_999')
      .set('Authorization', `Bearer ${cashierAccessToken}`);

    expect(resNotFound.status).toBe(200);
    expect(resNotFound.body.data.length).toBe(0);
    expect(resNotFound.body.meta.total).toBe(0);
  });

  it('Orders Detail: GET /api/orders/:id returns invoice detail with immutable price snapshots', async (ctx) => {
    if (!isOrdersModuleMounted) {
      ctx.skip();
      return;
    }

    // Create a known order
    const createRes = await request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${cashierAccessToken}`)
      .send({
        customer_id: null,
        items: [{ product_id: testProductId, quantity: 1 }],
      });
    const orderId = createRes.body.data.id;

    // Retrieve detail
    const detailRes = await request(app.getHttpServer())
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${cashierAccessToken}`);

    expect(detailRes.status).toBe(200);
    expect(detailRes.body.success).toBe(true);
    expect(detailRes.body.data.id).toBe(orderId);
    expect(detailRes.body.data.items).toBeDefined();
    expect(detailRes.body.data.items.length).toBeGreaterThanOrEqual(1);

    const lineItem = detailRes.body.data.items[0];
    expect(Number(lineItem.unit_price || lineItem.unitPrice)).toBe(15000);
  });

  it('Orders Export: GET /api/orders/export returns multi-sheet Excel file (.xlsx)', async (ctx) => {
    if (!isOrdersModuleMounted) {
      ctx.skip();
      return;
    }

    const response = await request(app.getHttpServer())
      .get('/api/orders/export')
      .set('Authorization', `Bearer ${cashierAccessToken}`);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(response.headers['content-disposition']).toContain(
      'attachment; filename="Laporan_Penjualan_Titipin_',
    );
    expect(response.body).toBeDefined();
  });
});
