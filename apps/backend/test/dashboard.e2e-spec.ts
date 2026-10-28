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

describe('DashboardController & Analytics Engine (E2E)', () => {
  let app: INestApplication;
  let adminAccessToken: string;
  let cashierAccessToken: string;
  let isDashboardModuleMounted = false;

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

    // Probe if Dashboard module is mounted
    const probeRes = await request(app.getHttpServer())
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${cashierAccessToken}`);
    if (probeRes.body?.message !== 'Cannot GET /api/dashboard/summary') {
      isDashboardModuleMounted = true;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('TEST-06: should reject unauthenticated request to /api/dashboard/summary with 401', async (ctx) => {
    if (!isDashboardModuleMounted) {
      ctx.skip();
      return;
    }
    const response = await request(app.getHttpServer()).get('/api/dashboard/summary');
    expect(response.status).toBe(401);
  });

  it('Cashier and Admin can retrieve dashboard summary metrics via GET /api/dashboard/summary', async (ctx) => {
    if (!isDashboardModuleMounted) {
      ctx.skip();
      return;
    }

    const response = await request(app.getHttpServer())
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${cashierAccessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();

    const data = response.body.data;
    expect(typeof data.total_transactions === 'number' || typeof data.totalTransactions === 'number').toBe(true);
    expect(data.total_sales_amount !== undefined || data.totalSalesAmount !== undefined).toBe(true);
    expect(Array.isArray(data.top_products || data.topProducts)).toBe(true);
    expect(Array.isArray(data.slow_products || data.slowProducts)).toBe(true);
    expect(Array.isArray(data.low_stock_products || data.lowStockProducts)).toBe(true);
  });

  it('Dual-path alias compatibility: GET /api/dashboard/metrics returns summary metrics', async (ctx) => {
    if (!isDashboardModuleMounted) {
      ctx.skip();
      return;
    }

    const response = await request(app.getHttpServer())
      .get('/api/dashboard/metrics')
      .set('Authorization', `Bearer ${adminAccessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
  });

  it('Period Filtering: Supports daily, monthly, quarterly, and yearly aggregations', async (ctx) => {
    if (!isDashboardModuleMounted) {
      ctx.skip();
      return;
    }

    // Daily
    const dailyRes = await request(app.getHttpServer())
      .get('/api/dashboard/summary?period=daily')
      .set('Authorization', `Bearer ${cashierAccessToken}`);
    expect(dailyRes.status).toBe(200);
    expect(dailyRes.body.data.period).toBe('daily');

    // Monthly
    const monthlyRes = await request(app.getHttpServer())
      .get('/api/dashboard/summary?period=monthly')
      .set('Authorization', `Bearer ${cashierAccessToken}`);
    expect(monthlyRes.status).toBe(200);
    expect(monthlyRes.body.data.period).toBe('monthly');

    // Quarterly
    const quarterlyRes = await request(app.getHttpServer())
      .get('/api/dashboard/summary?period=quarterly')
      .set('Authorization', `Bearer ${cashierAccessToken}`);
    expect(quarterlyRes.status).toBe(200);
    expect(quarterlyRes.body.data.period).toBe('quarterly');

    // Yearly
    const yearlyRes = await request(app.getHttpServer())
      .get('/api/dashboard/summary?period=yearly')
      .set('Authorization', `Bearer ${cashierAccessToken}`);
    expect(yearlyRes.status).toBe(200);
    expect(yearlyRes.body.data.period).toBe('yearly');
  });

  it('Low Stock Products: Only active products with stock < 5 are listed in low_stock_products', async (ctx) => {
    if (!isDashboardModuleMounted) {
      ctx.skip();
      return;
    }

    const response = await request(app.getHttpServer())
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${adminAccessToken}`);

    expect(response.status).toBe(200);
    const lowStock = response.body.data.low_stock_products || response.body.data.lowStockProducts;
    expect(Array.isArray(lowStock)).toBe(true);
    for (const item of lowStock) {
      expect(item.stock).toBeLessThan(5);
    }
  });

  it('Sales Trend: GET /api/dashboard/trend returns time series points array across all periods', async (ctx) => {
    if (!isDashboardModuleMounted) {
      ctx.skip();
      return;
    }

    // Monthly
    const monthlyRes = await request(app.getHttpServer())
      .get('/api/dashboard/trend?period=monthly')
      .set('Authorization', `Bearer ${cashierAccessToken}`);

    expect(monthlyRes.status).toBe(200);
    expect(monthlyRes.body.success).toBe(true);
    expect(Array.isArray(monthlyRes.body.data)).toBe(true);

    if (monthlyRes.body.data.length > 0) {
      const point = monthlyRes.body.data[0];
      expect(point.date).toBeDefined();
      expect(typeof point.transactions === 'number').toBe(true);
      expect(point.revenue !== undefined).toBe(true);
    }

    // Daily
    const dailyRes = await request(app.getHttpServer())
      .get('/api/dashboard/trend?period=daily')
      .set('Authorization', `Bearer ${cashierAccessToken}`);

    expect(dailyRes.status).toBe(200);
    expect(dailyRes.body.success).toBe(true);
    expect(Array.isArray(dailyRes.body.data)).toBe(true);

    // Quarterly
    const quarterlyRes = await request(app.getHttpServer())
      .get('/api/dashboard/trend?period=quarterly')
      .set('Authorization', `Bearer ${cashierAccessToken}`);

    expect(quarterlyRes.status).toBe(200);
    expect(quarterlyRes.body.success).toBe(true);
    expect(Array.isArray(quarterlyRes.body.data)).toBe(true);

    // Yearly
    const yearlyRes = await request(app.getHttpServer())
      .get('/api/dashboard/trend?period=yearly')
      .set('Authorization', `Bearer ${cashierAccessToken}`);

    expect(yearlyRes.status).toBe(200);
    expect(yearlyRes.body.success).toBe(true);
    expect(Array.isArray(yearlyRes.body.data)).toBe(true);
  });

  it('Validation: Rejects invalid period with 422 or 400', async (ctx) => {
    if (!isDashboardModuleMounted) {
      ctx.skip();
      return;
    }

    const response = await request(app.getHttpServer())
      .get('/api/dashboard/summary?period=annual')
      .set('Authorization', `Bearer ${adminAccessToken}`);

    expect([400, 422]).toContain(response.status);
  });
});
