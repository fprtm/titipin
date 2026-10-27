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
import { ilike, eq, and, isNull } from 'drizzle-orm';
import { AuditAction } from '@titipin/shared';

describe('Challenger M2-2: RBAC Security Matrix & Concurrency Stress Test', () => {
  let app: INestApplication;
  let db: DrizzleDatabase;
  let adminAccessToken: string;
  let cashierAccessToken: string;
  const runId = Date.now().toString().slice(-6);
  const testPrefix = `CHL_M2_${runId}`;
  let sampleCustomerId: string;

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

    // 2. Authenticate Cashier
    const cashierLoginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'kasir@titipin.id',
        password: 'Kasir123!',
      });
    expect(cashierLoginRes.status).toBe(200);
    cashierAccessToken = cashierLoginRes.body.data.accessToken;

    // 3. Create a baseline customer for RBAC mutation tests
    const baseCustomerRes = await request(app.getHttpServer())
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        customer_name: `${testPrefix}_Baseline`,
        customer_address: 'Jl. Baseline Stress Test No. 1',
        gender: 'Pria',
        birth_date: '1992-05-15',
        phone: '081200000001',
      });
    expect(baseCustomerRes.status).toBe(201);
    sampleCustomerId = baseCustomerRes.body.data.id;
  });

  afterAll(async () => {
    // Cleanup created test records
    try {
      if (db) {
        await db
          .delete(schema.customers)
          .where(ilike(schema.customers.customerName, `CHL_M2_%`));
      }
    } catch (err) {
      console.error('Error cleaning up test customers:', err);
    }
    await app.close();
  });

  describe('1. RBAC Matrix & Token Authentication Adversarial Tests', () => {
    it('1.1: Cashier attempting PUT /api/customers/:id must strictly return 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/customers/${sampleCustomerId}`)
        .set('Authorization', `Bearer ${cashierAccessToken}`)
        .send({
          customer_name: `${testPrefix}_Hacked_Name`,
          customer_address: 'Illegal Cashier Address',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Akses ditolak|hak akses/i);
    });

    it('1.2: Cashier attempting DELETE /api/customers/:id must strictly return 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/customers/${sampleCustomerId}`)
        .set('Authorization', `Bearer ${cashierAccessToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Akses ditolak|hak akses/i);
    });

    it('1.3: Cashier attempting PUT on a non-existent UUID must be blocked with 403 (Guard before handler/repo)', async () => {
      const nonExistentUuid = '00000000-0000-0000-0000-000000000000';
      const res = await request(app.getHttpServer())
        .put(`/api/customers/${nonExistentUuid}`)
        .set('Authorization', `Bearer ${cashierAccessToken}`)
        .send({ customer_name: 'Cashier Non Existent Update' });

      expect(res.status).toBe(403);
    });

    it('1.4: Cashier attempting DELETE on a non-existent UUID must be blocked with 403', async () => {
      const nonExistentUuid = '00000000-0000-0000-0000-000000000000';
      const res = await request(app.getHttpServer())
        .delete(`/api/customers/${nonExistentUuid}`)
        .set('Authorization', `Bearer ${cashierAccessToken}`);

      expect(res.status).toBe(403);
    });

    it('1.5: Cashier attempting PUT with invalid UUID string must be blocked with 403 before pipe execution', async () => {
      const res = await request(app.getHttpServer())
        .put('/api/customers/not-a-valid-uuid')
        .set('Authorization', `Bearer ${cashierAccessToken}`)
        .send({ customer_name: 'Cashier Probe' });

      expect(res.status).toBe(403);
    });

    it('1.6: Cashier attempting DELETE with invalid UUID string must be blocked with 403 before pipe execution', async () => {
      const res = await request(app.getHttpServer())
        .delete('/api/customers/not-a-valid-uuid')
        .set('Authorization', `Bearer ${cashierAccessToken}`);

      expect(res.status).toBe(403);
    });

    it('1.7: Unauthenticated requests across ALL customer endpoints must strictly return 401 Unauthorized', async () => {
      const getListRes = await request(app.getHttpServer()).get('/api/customers');
      expect(getListRes.status).toBe(401);

      const getByIdRes = await request(app.getHttpServer()).get(`/api/customers/${sampleCustomerId}`);
      expect(getByIdRes.status).toBe(401);

      const postRes = await request(app.getHttpServer())
        .post('/api/customers')
        .send({
          customer_name: `${testPrefix}_Unauth`,
          customer_address: 'Jl. Unauth No. 99',
          gender: 'Pria',
          birth_date: '1990-01-01',
        });
      expect(postRes.status).toBe(401);

      const putRes = await request(app.getHttpServer())
        .put(`/api/customers/${sampleCustomerId}`)
        .send({ customer_name: 'Unauth Update' });
      expect(putRes.status).toBe(401);

      const deleteRes = await request(app.getHttpServer())
        .delete(`/api/customers/${sampleCustomerId}`);
      expect(deleteRes.status).toBe(401);
    });

    it('1.8: Tampered or invalid JWT tokens must strictly return 401 Unauthorized', async () => {
      const malformedHeaderRes = await request(app.getHttpServer())
        .get('/api/customers')
        .set('Authorization', 'Bearer invalid.tampered.jwt.token');
      expect(malformedHeaderRes.status).toBe(401);

      const emptyBearerRes = await request(app.getHttpServer())
        .get('/api/customers')
        .set('Authorization', 'Bearer ');
      expect(emptyBearerRes.status).toBe(401);

      const basicAuthRes = await request(app.getHttpServer())
        .get('/api/customers')
        .set('Authorization', 'Basic dXNlcjpwYXNz');
      expect(basicAuthRes.status).toBe(401);
    });

    it('1.9: Admin JWT token has full access to all endpoints (200/201)', async () => {
      // Create
      const createRes = await request(app.getHttpServer())
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          customer_name: `${testPrefix}_Admin_Full`,
          customer_address: 'Jl. Admin Permitted No. 10',
          gender: 'Wanita',
          birth_date: '1995-12-12',
          phone: '081234567890',
        });
      expect(createRes.status).toBe(201);
      const custId = createRes.body.data.id;

      // Read List
      const listRes = await request(app.getHttpServer())
        .get('/api/customers')
        .set('Authorization', `Bearer ${adminAccessToken}`);
      expect(listRes.status).toBe(200);

      // Read Single
      const singleRes = await request(app.getHttpServer())
        .get(`/api/customers/${custId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`);
      expect(singleRes.status).toBe(200);

      // Update
      const updateRes = await request(app.getHttpServer())
        .put(`/api/customers/${custId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ customer_name: `${testPrefix}_Admin_Full_Updated` });
      expect(updateRes.status).toBe(200);

      // Delete
      const deleteRes = await request(app.getHttpServer())
        .delete(`/api/customers/${custId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`);
      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);
    });

    it('1.10: Cashier JWT token has legitimate access to GET and POST, but blocked from PUT and DELETE', async () => {
      // Cashier Create
      const createRes = await request(app.getHttpServer())
        .post('/api/customers')
        .set('Authorization', `Bearer ${cashierAccessToken}`)
        .send({
          customer_name: `${testPrefix}_Cashier_Legit`,
          customer_address: 'Jl. Kasir Pos No. 5',
          gender: 'Pria',
          birth_date: '2000-01-01',
          phone: '081277665544',
        });
      expect(createRes.status).toBe(201);
      const custId = createRes.body.data.id;

      // Cashier Read List
      const listRes = await request(app.getHttpServer())
        .get('/api/customers')
        .set('Authorization', `Bearer ${cashierAccessToken}`);
      expect(listRes.status).toBe(200);

      // Cashier Read Single
      const singleRes = await request(app.getHttpServer())
        .get(`/api/customers/${custId}`)
        .set('Authorization', `Bearer ${cashierAccessToken}`);
      expect(singleRes.status).toBe(200);

      // Cashier Update (Blocked)
      const updateRes = await request(app.getHttpServer())
        .put(`/api/customers/${custId}`)
        .set('Authorization', `Bearer ${cashierAccessToken}`)
        .send({ customer_name: 'Disallowed Name' });
      expect(updateRes.status).toBe(403);

      // Cashier Delete (Blocked)
      const deleteRes = await request(app.getHttpServer())
        .delete(`/api/customers/${custId}`)
        .set('Authorization', `Bearer ${cashierAccessToken}`);
      expect(deleteRes.status).toBe(403);
    });
  });

  describe('2. Concurrent Customer Creation & Integrity Stress Tests', () => {
    it('2.1: 25 simultaneous concurrent customer registrations by Cashier execute cleanly', async () => {
      const concurrencyCount = 25;
      const promises = Array.from({ length: concurrencyCount }, (_, i) => {
        return request(app.getHttpServer())
          .post('/api/customers')
          .set('Authorization', `Bearer ${cashierAccessToken}`)
          .send({
            customer_name: `${testPrefix}_Conc_Cashier_${i}`,
            customer_address: `Jl. Bersama Concurrency Kav. ${i}`,
            gender: i % 2 === 0 ? 'Pria' : 'Wanita',
            birth_date: `199${i % 10}-01-10`,
            phone: `0811${String(i).padStart(4, '0')}9999`,
          });
      });

      const results = await Promise.all(promises);

      // Check all 25 succeeded with 201
      const statuses = results.map((r) => r.status);
      expect(statuses.every((s) => s === 201)).toBe(true);

      // Check all 25 returned valid IDs and are distinct
      const ids = results.map((r) => r.body.data?.id);
      expect(ids.every((id) => Boolean(id))).toBe(true);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(concurrencyCount);

      // Verify all 25 exist in database
      const dbRecords = await db
        .select()
        .from(schema.customers)
        .where(
          and(
            ilike(schema.customers.customerName, `${testPrefix}_Conc_Cashier_%`),
            isNull(schema.customers.deletedAt),
          ),
        );
      expect(dbRecords.length).toBe(concurrencyCount);
    });

    it('2.2: 25 simultaneous concurrent customer registrations by Admin generate 25 distinct audit records', async () => {
      const concurrencyCount = 25;
      const promises = Array.from({ length: concurrencyCount }, (_, i) => {
        return request(app.getHttpServer())
          .post('/api/customers')
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .send({
            customer_name: `${testPrefix}_Conc_Admin_${i}`,
            customer_address: `Jl. Admin Audit Trail Kav. ${i}`,
            gender: 'Wanita',
            birth_date: `1995-06-${String((i % 28) + 1).padStart(2, '0')}`,
            phone: `0812${String(i).padStart(4, '0')}8888`,
          });
      });

      const results = await Promise.all(promises);
      expect(results.every((r) => r.status === 201)).toBe(true);

      const createdIds = results.map((r) => r.body.data.id);

      // Verify audit logs exist for all 25 customer creations
      const auditLogs = await db
        .select()
        .from(schema.auditLogs)
        .where(eq(schema.auditLogs.action, AuditAction.CUSTOMER_CREATED));

      const matchingAuditLogs = auditLogs.filter((log) => createdIds.includes(log.entityId));
      expect(matchingAuditLogs.length).toBe(concurrencyCount);
    });

    it('2.3: Concurrent customer registrations with identical phone numbers handle gracefully without deadlock', async () => {
      const sharedPhone = '089988776655';
      const count = 8;
      const promises = Array.from({ length: count }, (_, i) => {
        return request(app.getHttpServer())
          .post('/api/customers')
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .send({
            customer_name: `${testPrefix}_SharedPhone_${i}`,
            customer_address: `Jl. Shared Phone Kav. ${i}`,
            gender: 'Pria',
            birth_date: '1993-04-12',
            phone: sharedPhone,
          });
      });

      const results = await Promise.all(promises);
      // All requests must finish (no deadlock, no 500)
      expect(results.every((r) => r.status === 201)).toBe(true);

      const savedRecords = await db
        .select()
        .from(schema.customers)
        .where(
          and(
            ilike(schema.customers.customerName, `${testPrefix}_SharedPhone_%`),
            isNull(schema.customers.deletedAt),
          ),
        );
      expect(savedRecords.length).toBe(count);
    });
  });

  describe('3. Active Concurrency & Pagination Stability', () => {
    it('3.1: Interleaved concurrent customer creations and paginated queries remain consistent and stable', async () => {
      // Concurrently launch 15 customer creations and 10 paginated searches
      const creationPromises = Array.from({ length: 15 }, (_, i) => {
        return request(app.getHttpServer())
          .post('/api/customers')
          .set('Authorization', `Bearer ${cashierAccessToken}`)
          .send({
            customer_name: `${testPrefix}_Interleaved_${i}`,
            customer_address: `Jl. Interleaved Street ${i}`,
            gender: 'Pria',
            birth_date: '1997-03-15',
            phone: `0819${String(i).padStart(4, '0')}1122`,
          });
      });

      const queryPromises = Array.from({ length: 10 }, (_, i) => {
        const page = (i % 3) + 1;
        return request(app.getHttpServer())
          .get(`/api/customers?page=${page}&per_page=5&sort=customer_name&order=asc`)
          .set('Authorization', `Bearer ${cashierAccessToken}`);
      });

      const [creationResults, queryResults] = await Promise.all([
        Promise.all(creationPromises),
        Promise.all(queryPromises),
      ]);

      // All creations succeeded with 201
      expect(creationResults.every((r) => r.status === 201)).toBe(true);

      // All queries succeeded with 200
      expect(queryResults.every((r) => r.status === 200)).toBe(true);

      for (const qRes of queryResults) {
        expect(qRes.body.success).toBe(true);
        expect(Array.isArray(qRes.body.data)).toBe(true);
        expect(qRes.body.meta).toBeDefined();
        expect(typeof qRes.body.meta.total_items).toBe('number');
        expect(typeof qRes.body.meta.total_pages).toBe('number');
        expect(qRes.body.data.length).toBeLessThanOrEqual(5);
      }
    });

    it('3.2: Pagination boundary queries (high page, sorting, limit capping)', async () => {
      // Out of bounds page returns empty array and correct meta
      const highPageRes = await request(app.getHttpServer())
        .get('/api/customers?page=99999&per_page=10')
        .set('Authorization', `Bearer ${cashierAccessToken}`);
      expect(highPageRes.status).toBe(200);
      expect(highPageRes.body.data).toEqual([]);
      expect(highPageRes.body.meta.page).toBe(99999);

      // Sort by different fields
      const sortCreatedRes = await request(app.getHttpServer())
        .get('/api/customers?sort=created_at&order=desc&per_page=5')
        .set('Authorization', `Bearer ${cashierAccessToken}`);
      expect(sortCreatedRes.status).toBe(200);
      expect(sortCreatedRes.body.data.length).toBeGreaterThan(0);

      const sortBirthRes = await request(app.getHttpServer())
        .get('/api/customers?sort=birth_date&order=asc&per_page=5')
        .set('Authorization', `Bearer ${cashierAccessToken}`);
      expect(sortBirthRes.status).toBe(200);
      expect(sortBirthRes.body.data.length).toBeGreaterThan(0);

      // Query parameter rejection for invalid per_page > 100
      const invalidLimitRes = await request(app.getHttpServer())
        .get('/api/customers?per_page=150')
        .set('Authorization', `Bearer ${cashierAccessToken}`);
      expect(invalidLimitRes.status).toBe(422);

      // Query parameter rejection for page < 1
      const invalidPageRes = await request(app.getHttpServer())
        .get('/api/customers?page=0')
        .set('Authorization', `Bearer ${cashierAccessToken}`);
      expect(invalidPageRes.status).toBe(422);
    });

    it('3.3: SQL Injection / Wildcard fuzzing on search endpoint is safely handled', async () => {
      const sqlInjectionPayloads = [
        `' OR '1'='1`,
        `"; DROP TABLE customers; --`,
        `%25%25%25`,
        `'; SELECT * FROM users; --`,
        `\\`,
      ];

      for (const payload of sqlInjectionPayloads) {
        const res = await request(app.getHttpServer())
          .get(`/api/customers?search=${encodeURIComponent(payload)}`)
          .set('Authorization', `Bearer ${cashierAccessToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
      }
    });
  });

  describe('4. Soft-Delete Integrity & State Re-testing', () => {
    it('4.1: Soft-deleted member is inaccessible to both Cashier and Admin via GET, PUT, and DELETE', async () => {
      // Create a customer to delete
      const createRes = await request(app.getHttpServer())
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          customer_name: `${testPrefix}_ToDelete`,
          customer_address: 'Jl. Hapus Permanen No. 4',
          gender: 'Pria',
          birth_date: '1991-07-07',
          phone: '081299990000',
        });
      const custId = createRes.body.data.id;

      // Admin soft deletes
      const deleteRes = await request(app.getHttpServer())
        .delete(`/api/customers/${custId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`);
      expect(deleteRes.status).toBe(200);

      // Cashier GET -> 404
      const cashierGet = await request(app.getHttpServer())
        .get(`/api/customers/${custId}`)
        .set('Authorization', `Bearer ${cashierAccessToken}`);
      expect(cashierGet.status).toBe(404);

      // Admin GET -> 404
      const adminGet = await request(app.getHttpServer())
        .get(`/api/customers/${custId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`);
      expect(adminGet.status).toBe(404);

      // Admin PUT -> 404
      const adminPut = await request(app.getHttpServer())
        .put(`/api/customers/${custId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ customer_name: 'Attempted Revive' });
      expect(adminPut.status).toBe(404);

      // Admin DELETE again -> 404
      const adminDeleteAgain = await request(app.getHttpServer())
        .delete(`/api/customers/${custId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`);
      expect(adminDeleteAgain.status).toBe(404);

      // Cashier PUT -> 403 (RBAC guard blocks before 404!)
      const cashierPut = await request(app.getHttpServer())
        .put(`/api/customers/${custId}`)
        .set('Authorization', `Bearer ${cashierAccessToken}`)
        .send({ customer_name: 'Cashier Revive' });
      expect(cashierPut.status).toBe(403);

      // Cashier DELETE -> 403 (RBAC guard blocks before 404!)
      const cashierDelete = await request(app.getHttpServer())
        .delete(`/api/customers/${custId}`)
        .set('Authorization', `Bearer ${cashierAccessToken}`);
      expect(cashierDelete.status).toBe(403);
    });
  });
});
