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

describe('AnalyticsController & Business Intelligence Engine (E2E)', () => {
  let app: INestApplication;
  let adminAccessToken: string;
  let cashierAccessToken: string;

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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('RBAC Security & Authentication', () => {
    it('should reject unauthenticated request to /api/analytics/overview with 401', async () => {
      const response = await request(app.getHttpServer()).get('/api/analytics/overview');
      expect(response.status).toBe(401);
    });

    it('should forbid cashier from accessing /api/analytics/overview with 403', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/analytics/overview')
        .set('Authorization', `Bearer ${cashierAccessToken}`);
      expect(response.status).toBe(403);
    });

    it('should forbid cashier from accessing /api/analytics/bundling-suggestions with 403', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/analytics/bundling-suggestions')
        .set('Authorization', `Bearer ${cashierAccessToken}`);
      expect(response.status).toBe(403);
    });
  });

  describe('Validation', () => {
    it('should reject invalid period query with 422', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/analytics/overview?period=invalid_period')
        .set('Authorization', `Bearer ${adminAccessToken}`);
      expect(response.status).toBe(422);
    });
  });

  describe('Admin Analytics Retrieval', () => {
    it('should return complete analytics overview with all BI models for Admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/analytics/overview?period=monthly')
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const data = response.body.data;
      expect(data).toHaveProperty('period', 'monthly');
      expect(data).toHaveProperty('totalRevenue');
      expect(data).toHaveProperty('totalTransactions');
      expect(data).toHaveProperty('averageOrderValue');
      expect(data).toHaveProperty('peakHour');
      expect(data).toHaveProperty('topDay');

      // Trend array
      expect(Array.isArray(data.trend)).toBe(true);
      if (data.trend.length > 0) {
        expect(data.trend[0]).toHaveProperty('date');
        expect(data.trend[0]).toHaveProperty('label');
        expect(data.trend[0]).toHaveProperty('revenue');
        expect(data.trend[0]).toHaveProperty('transactions');
        expect(data.trend[0]).toHaveProperty('aov');
      }

      // Hourly traffic
      expect(Array.isArray(data.hourlyTraffic)).toBe(true);

      // Day of week traffic
      expect(Array.isArray(data.dayOfWeekTraffic)).toBe(true);

      // Bundling Suggestions (Market Basket Analysis)
      expect(Array.isArray(data.bundlingSuggestions)).toBe(true);
      if (data.bundlingSuggestions.length > 0) {
        expect(data.bundlingSuggestions[0]).toHaveProperty('productAId');
        expect(data.bundlingSuggestions[0]).toHaveProperty('productAName');
        expect(data.bundlingSuggestions[0]).toHaveProperty('productBId');
        expect(data.bundlingSuggestions[0]).toHaveProperty('productBName');
        expect(data.bundlingSuggestions[0]).toHaveProperty('coOccurrenceCount');
        expect(data.bundlingSuggestions[0]).toHaveProperty('suggestedDiscountPercent');
      }

      // Customer Segmentation
      expect(data.customerSegmentation).toBeDefined();
      expect(data.customerSegmentation).toHaveProperty('memberOrders');
      expect(data.customerSegmentation).toHaveProperty('memberRevenue');
      expect(data.customerSegmentation).toHaveProperty('walkInOrders');
      expect(data.customerSegmentation).toHaveProperty('walkInRevenue');
      expect(data.customerSegmentation).toHaveProperty('memberRevenueSharePercent');

      // Actionable Insights
      expect(Array.isArray(data.actionableInsights)).toBe(true);
      if (data.actionableInsights.length > 0) {
        expect(data.actionableInsights[0]).toHaveProperty('id');
        expect(data.actionableInsights[0]).toHaveProperty('category');
        expect(data.actionableInsights[0]).toHaveProperty('title');
        expect(data.actionableInsights[0]).toHaveProperty('description');
        expect(data.actionableInsights[0]).toHaveProperty('impact');
        expect(data.actionableInsights[0]).toHaveProperty('priority');
      }
    });

    it('should support daily, quarterly, and yearly period queries for overview', async () => {
      for (const period of ['daily', 'quarterly', 'yearly'] as const) {
        const response = await request(app.getHttpServer())
          .get(`/api/analytics/overview?period=${period}`)
          .set('Authorization', `Bearer ${adminAccessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.period).toBe(period);
        expect(Array.isArray(response.body.data.trend)).toBe(true);
      }
    });

    it('should retrieve trend data via GET /api/analytics/trend', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/analytics/trend?period=yearly')
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should retrieve peak hours & day distribution via GET /api/analytics/peak-hours', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/analytics/peak-hours?period=monthly')
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('hourly');
      expect(response.body.data).toHaveProperty('dayOfWeek');
      expect(Array.isArray(response.body.data.hourly)).toBe(true);
      expect(Array.isArray(response.body.data.dayOfWeek)).toBe(true);
    });

    it('should retrieve market basket bundling suggestions via GET /api/analytics/bundling-suggestions', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/analytics/bundling-suggestions')
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should retrieve customer segmentation analytics via GET /api/analytics/customer-segments', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/analytics/customer-segments?period=monthly')
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('memberOrders');
      expect(response.body.data).toHaveProperty('walkInOrders');
    });
  });
});
