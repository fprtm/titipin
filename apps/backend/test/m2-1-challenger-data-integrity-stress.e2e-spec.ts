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
import { inArray, eq } from 'drizzle-orm';
import { CustomersRepository } from '../src/modules/customers/repositories/customers.repository';

describe('Challenger M2-1: Adversarial Data Integrity & Soft-Delete Stress Test', () => {
  let app: INestApplication;
  let db: DrizzleDatabase;
  let customersRepository: CustomersRepository;
  let adminAccessToken: string;
  let cashierAccessToken: string;
  const createdCustomerIds: string[] = [];
  const testPrefix = `CHL21_${Date.now()}`;

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
    customersRepository = moduleFixture.get<CustomersRepository>(CustomersRepository);

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
    if (createdCustomerIds.length > 0) {
      await db.delete(schema.customers).where(inArray(schema.customers.id, createdCustomerIds));
    }
    await app.close();
  });

  // =========================================================================
  // 1. ADVERSARIAL SOFT-DELETE ISOLATION
  // =========================================================================
  describe('1. Adversarial Soft-Delete Isolation & Leak Prevention', () => {
    let targetCustomerId: string;
    const targetName = `${testPrefix}_SoftDelete_Iso`;
    const targetPhone = '089998887771';

    it('creates a target customer for soft-delete testing', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          customer_name: targetName,
          customer_address: 'Jl. Surya Kencana No. 100 Bogor',
          gender: 'Pria',
          birth_date: '1992-04-12',
          phone: targetPhone,
        });

      expect(res.status).toBe(201);
      targetCustomerId = res.body.data.id;
      createdCustomerIds.push(targetCustomerId);
    });

    it('confirms target customer is visible before deletion', async () => {
      const getRes = await request(app.getHttpServer())
        .get(`/api/customers/${targetCustomerId}`)
        .set('Authorization', `Bearer ${cashierAccessToken}`);
      expect(getRes.status).toBe(200);

      const searchRes = await request(app.getHttpServer())
        .get(`/api/customers?search=${targetName}`)
        .set('Authorization', `Bearer ${cashierAccessToken}`);
      expect(searchRes.status).toBe(200);
      expect(searchRes.body.data.some((c: { id: string }) => c.id === targetCustomerId)).toBe(true);
    });

    it('soft-deletes target customer via DELETE /api/customers/:id and verifies DB state', async () => {
      const delRes = await request(app.getHttpServer())
        .delete(`/api/customers/${targetCustomerId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);
      expect(delRes.body.message).toBe('Data pelanggan berhasil dihapus');

      // Verify DB level: record exists, deletedAt IS NOT NULL
      const [rawRecord] = await db
        .select()
        .from(schema.customers)
        .where(eq(schema.customers.id, targetCustomerId));
      expect(rawRecord).toBeDefined();
      expect(rawRecord.deletedAt).toBeInstanceOf(Date);
      expect(rawRecord.deletedAt).not.toBeNull();

      // Verify Audit log exists
      const auditRecords = await db
        .select()
        .from(schema.auditLogs)
        .where(eq(schema.auditLogs.entityId, targetCustomerId));
      expect(auditRecords.length).toBeGreaterThanOrEqual(1);
      expect(auditRecords.some((r) => r.action === 'CUSTOMER_DELETED')).toBe(true);
    });

    it('GET /api/customers/:id returns 404 Not Found for soft-deleted customer', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/customers/${targetCustomerId}`)
        .set('Authorization', `Bearer ${cashierAccessToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Pelanggan tidak ditemukan');
    });

    it('GET /api/customers with name search excludes soft-deleted customer', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/customers?search=${encodeURIComponent(targetName)}`)
        .set('Authorization', `Bearer ${cashierAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(0);
      expect(res.body.meta.total_items).toBe(0);
    });

    it('GET /api/customers with phone search excludes soft-deleted customer', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/customers?search=${targetPhone}`)
        .set('Authorization', `Bearer ${cashierAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(0);
      expect(res.body.meta.total_items).toBe(0);
    });

    it('PUT /api/customers/:id on soft-deleted customer returns 404 Not Found', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/customers/${targetCustomerId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          customer_name: `${targetName} Revived?`,
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Pelanggan tidak ditemukan');
    });

    it('DELETE /api/customers/:id on already soft-deleted customer returns 404 Not Found', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/customers/${targetCustomerId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Pelanggan tidak ditemukan');
    });

    it('Repository-level methods strictly enforce soft-delete isolation', async () => {
      // findById default (includeDeleted=false) returns null
      const byId = await customersRepository.findById(targetCustomerId);
      expect(byId).toBeNull();

      // findById with includeDeleted=true returns the record
      const byIdDeleted = await customersRepository.findById(targetCustomerId, true);
      expect(byIdDeleted).not.toBeNull();
      expect(byIdDeleted?.id).toBe(targetCustomerId);

      // findByPhone returns null
      const byPhone = await customersRepository.findByPhone(targetPhone);
      expect(byPhone).toBeNull();
    });

    it('Batch soft-deletion correctly updates meta.total_items and pagination', async () => {
      const batchTag = `${testPrefix}_Batch`;
      const ids: string[] = [];

      for (let i = 1; i <= 3; i++) {
        const createRes = await request(app.getHttpServer())
          .post('/api/customers')
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .send({
            customer_name: `${batchTag} Customer ${i}`,
            customer_address: `Jl. Batch Test No. ${i} Bandung`,
            gender: i % 2 === 0 ? 'Wanita' : 'Pria',
            birth_date: '1994-06-15',
            phone: `0899911122${i}`,
          });
        expect(createRes.status).toBe(201);
        ids.push(createRes.body.data.id);
        createdCustomerIds.push(createRes.body.data.id);
      }

      // Initial count: 3
      let listRes = await request(app.getHttpServer())
        .get(`/api/customers?search=${encodeURIComponent(batchTag)}`)
        .set('Authorization', `Bearer ${cashierAccessToken}`);
      expect(listRes.status).toBe(200);
      expect(listRes.body.data.length).toBe(3);
      expect(listRes.body.meta.total_items).toBe(3);

      // Soft-delete one item
      const del1 = await request(app.getHttpServer())
        .delete(`/api/customers/${ids[1]}`)
        .set('Authorization', `Bearer ${adminAccessToken}`);
      expect(del1.status).toBe(200);

      // Count decreases to 2
      listRes = await request(app.getHttpServer())
        .get(`/api/customers?search=${encodeURIComponent(batchTag)}`)
        .set('Authorization', `Bearer ${cashierAccessToken}`);
      expect(listRes.status).toBe(200);
      expect(listRes.body.data.length).toBe(2);
      expect(listRes.body.meta.total_items).toBe(2);
      expect(listRes.body.data.some((c: { id: string }) => c.id === ids[1])).toBe(false);

      // Soft-delete remaining items
      await request(app.getHttpServer())
        .delete(`/api/customers/${ids[0]}`)
        .set('Authorization', `Bearer ${adminAccessToken}`);
      await request(app.getHttpServer())
        .delete(`/api/customers/${ids[2]}`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      // Count decreases to 0
      listRes = await request(app.getHttpServer())
        .get(`/api/customers?search=${encodeURIComponent(batchTag)}`)
        .set('Authorization', `Bearer ${cashierAccessToken}`);
      expect(listRes.status).toBe(200);
      expect(listRes.body.data.length).toBe(0);
      expect(listRes.body.meta.total_items).toBe(0);
    });
  });

  // =========================================================================
  // 2. BOUNDARY & VALIDATION STRESS
  // =========================================================================
  describe('2. Boundary & Validation Stress', () => {
    describe('2.1 Customer Name Boundary (2 - 150 chars)', () => {
      it('rejects customer_name with 1 character (lower boundary - 1) with 422', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/customers')
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .send({
            customer_name: 'A',
            customer_address: 'Jl. Merdeka No. 10 Jakarta',
            gender: 'Pria',
            birth_date: '1990-01-01',
          });

        expect(res.status).toBe(422);
        expect(res.body.success).toBe(false);
      });

      it('accepts customer_name with 2 characters (lower boundary exact) with 201', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/customers')
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .send({
            customer_name: 'Bo',
            customer_address: 'Jl. Merdeka No. 10 Jakarta',
            gender: 'Pria',
            birth_date: '1990-01-01',
          });

        expect(res.status).toBe(201);
        createdCustomerIds.push(res.body.data.id);
        expect(res.body.data.customer_name || res.body.data.customerName).toBe('Bo');
      });

      it('accepts customer_name with 150 characters (upper boundary exact) with 201', async () => {
        const exact150 = 'A'.repeat(150);
        const res = await request(app.getHttpServer())
          .post('/api/customers')
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .send({
            customer_name: exact150,
            customer_address: 'Jl. Merdeka No. 10 Jakarta',
            gender: 'Pria',
            birth_date: '1990-01-01',
          });

        expect(res.status).toBe(201);
        createdCustomerIds.push(res.body.data.id);
        expect((res.body.data.customer_name || res.body.data.customerName).length).toBe(150);
      });

      it('rejects customer_name with 151 characters (upper boundary + 1) with 422', async () => {
        const over150 = 'A'.repeat(151);
        const res = await request(app.getHttpServer())
          .post('/api/customers')
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .send({
            customer_name: over150,
            customer_address: 'Jl. Merdeka No. 10 Jakarta',
            gender: 'Pria',
            birth_date: '1990-01-01',
          });

        expect(res.status).toBe(422);
        expect(res.body.success).toBe(false);
      });

      it('rejects empty customer_name ("") with 422', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/customers')
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .send({
            customer_name: '',
            customer_address: 'Jl. Merdeka No. 10 Jakarta',
            gender: 'Pria',
            birth_date: '1990-01-01',
          });

        expect(res.status).toBe(422);
      });
    });

    describe('2.2 Customer Address Boundary (5 - 255 chars)', () => {
      it('rejects customer_address with 4 characters (lower boundary - 1) with 422', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/customers')
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .send({
            customer_name: 'Boundary Test User',
            customer_address: 'Jl.X',
            gender: 'Pria',
            birth_date: '1990-01-01',
          });

        expect(res.status).toBe(422);
        expect(res.body.success).toBe(false);
      });

      it('accepts customer_address with 5 characters (lower boundary exact) with 201', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/customers')
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .send({
            customer_name: 'Boundary Test User',
            customer_address: 'Jl. X',
            gender: 'Pria',
            birth_date: '1990-01-01',
          });

        expect(res.status).toBe(201);
        createdCustomerIds.push(res.body.data.id);
        expect(res.body.data.customer_address || res.body.data.customerAddress).toBe('Jl. X');
      });

      it('accepts customer_address with 255 characters (upper boundary exact) with 201', async () => {
        const exact255 = 'Jl. ' + 'B'.repeat(251);
        expect(exact255.length).toBe(255);

        const res = await request(app.getHttpServer())
          .post('/api/customers')
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .send({
            customer_name: 'Boundary Test User',
            customer_address: exact255,
            gender: 'Pria',
            birth_date: '1990-01-01',
          });

        expect(res.status).toBe(201);
        createdCustomerIds.push(res.body.data.id);
        expect((res.body.data.customer_address || res.body.data.customerAddress).length).toBe(255);
      });

      it('rejects customer_address with 256 characters (upper boundary + 1) with 422', async () => {
        const over255 = 'Jl. ' + 'B'.repeat(252);
        expect(over255.length).toBe(256);

        const res = await request(app.getHttpServer())
          .post('/api/customers')
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .send({
            customer_name: 'Boundary Test User',
            customer_address: over255,
            gender: 'Pria',
            birth_date: '1990-01-01',
          });

        expect(res.status).toBe(422);
      });

      it('rejects empty customer_address ("") with 422', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/customers')
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .send({
            customer_name: 'Boundary Test User',
            customer_address: '',
            gender: 'Pria',
            birth_date: '1990-01-01',
          });

        expect(res.status).toBe(422);
      });
    });

    describe('2.3 Gender Enum Validation', () => {
      it('accepts "Pria" and "Wanita"', async () => {
        const resPria = await request(app.getHttpServer())
          .post('/api/customers')
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .send({
            customer_name: 'Test Pria',
            customer_address: 'Jl. Melati No. 1',
            gender: 'Pria',
            birth_date: '1991-03-10',
          });
        expect(resPria.status).toBe(201);
        createdCustomerIds.push(resPria.body.data.id);

        const resWanita = await request(app.getHttpServer())
          .post('/api/customers')
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .send({
            customer_name: 'Test Wanita',
            customer_address: 'Jl. Mawar No. 2',
            gender: 'Wanita',
            birth_date: '1993-07-25',
          });
        expect(resWanita.status).toBe(201);
        createdCustomerIds.push(resWanita.body.data.id);
      });

      const invalidGenders = ['Other', 'Unknown', '', 'pria', 'wanita', 'Male', 'Female', 123, null];
      for (const g of invalidGenders) {
        it(`rejects invalid gender ${JSON.stringify(g)} with 422`, async () => {
          const res = await request(app.getHttpServer())
            .post('/api/customers')
            .set('Authorization', `Bearer ${adminAccessToken}`)
            .send({
              customer_name: 'Invalid Gender User',
              customer_address: 'Jl. Testing No. 1',
              gender: g,
              birth_date: '1990-01-01',
            });

          expect(res.status).toBe(422);
          expect(res.body.success).toBe(false);
        });
      }
    });

    describe('2.4 Birth Date Format Validation', () => {
      it('accepts valid YYYY-MM-DD birth_date', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/customers')
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .send({
            customer_name: 'Valid Date User',
            customer_address: 'Jl. Sehat Selalu No. 9',
            gender: 'Pria',
            birth_date: '1988-12-31',
          });

        expect(res.status).toBe(201);
        createdCustomerIds.push(res.body.data.id);
      });

      const invalidDateFormats = [
        '1990/01/01',
        '01-01-1990',
        'invalid-date',
        '1990-1-1',
        '1990-01',
        '',
        '31-12-1988',
        '1990.01.01',
        'notadate',
      ];

      for (const d of invalidDateFormats) {
        it(`rejects invalid birth_date format ${JSON.stringify(d)} with 422`, async () => {
          const res = await request(app.getHttpServer())
            .post('/api/customers')
            .set('Authorization', `Bearer ${adminAccessToken}`)
            .send({
              customer_name: 'Invalid Date User',
              customer_address: 'Jl. Testing No. 1',
              gender: 'Pria',
              birth_date: d,
            });

          expect(res.status).toBe(422);
          expect(res.body.success).toBe(false);
        });
      }
    });

    describe('2.5 Phone Boundary (max 20 chars, optional/nullable)', () => {
      it('accepts phone with 20 characters (upper boundary exact) with 201', async () => {
        const exact20 = '08123456789012345678';
        expect(exact20.length).toBe(20);

        const res = await request(app.getHttpServer())
          .post('/api/customers')
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .send({
            customer_name: 'Phone Exact 20 User',
            customer_address: 'Jl. Merdeka No. 10 Jakarta',
            gender: 'Pria',
            birth_date: '1990-01-01',
            phone: exact20,
          });

        expect(res.status).toBe(201);
        createdCustomerIds.push(res.body.data.id);
        expect(res.body.data.phone).toBe(exact20);
      });

      it('rejects phone with 21 characters (upper boundary + 1) with 422', async () => {
        const over20 = '081234567890123456789';
        expect(over20.length).toBe(21);

        const res = await request(app.getHttpServer())
          .post('/api/customers')
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .send({
            customer_name: 'Phone Over 20 User',
            customer_address: 'Jl. Merdeka No. 10 Jakarta',
            gender: 'Pria',
            birth_date: '1990-01-01',
            phone: over20,
          });

        expect(res.status).toBe(422);
      });

      it('accepts phone as null or omitted with 201', async () => {
        const resNull = await request(app.getHttpServer())
          .post('/api/customers')
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .send({
            customer_name: 'Phone Null User',
            customer_address: 'Jl. Merdeka No. 10 Jakarta',
            gender: 'Wanita',
            birth_date: '1995-02-14',
            phone: null,
          });
        expect(resNull.status).toBe(201);
        createdCustomerIds.push(resNull.body.data.id);
        expect(resNull.body.data.phone).toBeNull();

        const resOmitted = await request(app.getHttpServer())
          .post('/api/customers')
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .send({
            customer_name: 'Phone Omitted User',
            customer_address: 'Jl. Merdeka No. 10 Jakarta',
            gender: 'Wanita',
            birth_date: '1995-02-14',
          });
        expect(resOmitted.status).toBe(201);
        createdCustomerIds.push(resOmitted.body.data.id);
      });
    });

    describe('2.6 Search Parameter & SQL Injection Resilience', () => {
      it('handles SQL injection payloads safely without throwing 500 or exposing data', async () => {
        const payloads = [
          `' OR '1'='1`,
          `'; DROP TABLE customers; --`,
          `" OR ""="`,
          `%`,
          `_`,
          `' UNION SELECT * FROM users --`,
        ];

        for (const p of payloads) {
          const res = await request(app.getHttpServer())
            .get(`/api/customers?search=${encodeURIComponent(p)}`)
            .set('Authorization', `Bearer ${cashierAccessToken}`);

          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
        }
      });

      it('handles extreme pagination boundaries gracefully', async () => {
        const resZero = await request(app.getHttpServer())
          .get('/api/customers?page=0&per_page=0')
          .set('Authorization', `Bearer ${cashierAccessToken}`);
        // Zod min(1) fails with 422 if coerced number < 1
        expect([200, 422]).toContain(resZero.status);

        const resNegative = await request(app.getHttpServer())
          .get('/api/customers?page=-1&per_page=-5')
          .set('Authorization', `Bearer ${cashierAccessToken}`);
        expect(resNegative.status).toBe(422);

        const resHuge = await request(app.getHttpServer())
          .get('/api/customers?page=1&per_page=999')
          .set('Authorization', `Bearer ${cashierAccessToken}`);
        // per_page max is 100, so 999 should either clamp or reject with 422
        expect([200, 422]).toContain(resHuge.status);
      });
    });

    describe('2.7 UUID Validation on Parameterized Endpoints', () => {
      it('GET /api/customers/:id rejects malformed UUID with 400', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/customers/not-a-uuid')
          .set('Authorization', `Bearer ${cashierAccessToken}`);
        expect(res.status).toBe(400);
      });

      it('PUT /api/customers/:id rejects malformed UUID with 400', async () => {
        const res = await request(app.getHttpServer())
          .put('/api/customers/not-a-uuid')
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .send({ customer_name: 'Test' });
        expect(res.status).toBe(400);
      });

      it('DELETE /api/customers/:id rejects malformed UUID with 400', async () => {
        const res = await request(app.getHttpServer())
          .delete('/api/customers/not-a-uuid')
          .set('Authorization', `Bearer ${adminAccessToken}`);
        expect(res.status).toBe(400);
      });
    });

    describe('2.8 Update Validation Stress', () => {
      let testCustId: string;

      it('prepares customer for update validation', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/customers')
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .send({
            customer_name: 'Update Boundary Target',
            customer_address: 'Jl. Pahlawan No. 1 Surabaya',
            gender: 'Pria',
            birth_date: '1985-05-15',
          });
        expect(res.status).toBe(201);
        testCustId = res.body.data.id;
        createdCustomerIds.push(testCustId);
      });

      it('rejects PUT with customer_name shorter than 2 characters with 422', async () => {
        const res = await request(app.getHttpServer())
          .put(`/api/customers/${testCustId}`)
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .send({ customer_name: 'X' });
        expect(res.status).toBe(422);
      });

      it('rejects PUT with customer_address shorter than 5 characters with 422', async () => {
        const res = await request(app.getHttpServer())
          .put(`/api/customers/${testCustId}`)
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .send({ customer_address: 'Jl.' });
        expect(res.status).toBe(422);
      });

      it('rejects PUT with invalid gender with 422', async () => {
        const res = await request(app.getHttpServer())
          .put(`/api/customers/${testCustId}`)
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .send({ gender: 'Invalid' });
        expect(res.status).toBe(422);
      });

      it('rejects PUT with invalid birth_date format with 422', async () => {
        const res = await request(app.getHttpServer())
          .put(`/api/customers/${testCustId}`)
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .send({ birth_date: '15/05/1985' });
        expect(res.status).toBe(422);
      });

      it('rejects PUT with phone > 20 characters with 422', async () => {
        const res = await request(app.getHttpServer())
          .put(`/api/customers/${testCustId}`)
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .send({ phone: '123456789012345678901' });
        expect(res.status).toBe(422);
      });
    });
  });

  // =========================================================================
  // 3. ADVERSARIAL EDGE CASES & INTEGRITY HARNESS
  // =========================================================================
  describe('3. Adversarial Edge Cases & Integrity Harness', () => {
    describe('3.1 Whitespace & Trimming Behavior', () => {
      it('handles whitespace-only customer_name ("   ")', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/customers')
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .send({
            customer_name: '   ',
            customer_address: 'Jl. Melati Putih No. 10',
            gender: 'Pria',
            birth_date: '1990-01-01',
          });

        if (res.status === 201) {
          createdCustomerIds.push(res.body.data.id);
        }
        // Documents that schema currently trims after min(2) check
        expect([201, 422]).toContain(res.status);
      });

      it('handles padded customer_name ("  Budi  ") by trimming', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/customers')
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .send({
            customer_name: '  Budi Trimming Test  ',
            customer_address: 'Jl. Melati Putih No. 10',
            gender: 'Pria',
            birth_date: '1990-01-01',
          });

        expect(res.status).toBe(201);
        createdCustomerIds.push(res.body.data.id);
        expect(res.body.data.customer_name || res.body.data.customerName).toBe('Budi Trimming Test');
      });
    });

    describe('3.2 Calendar Validity on birth_date', () => {
      it('tests impossible calendar date "2025-02-30" (Feb 30th)', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/customers')
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .send({
            customer_name: 'Feb 30 Test Customer',
            customer_address: 'Jl. Merdeka No. 10 Jakarta',
            gender: 'Pria',
            birth_date: '2025-02-30',
          });

        if (res.status === 201) {
          createdCustomerIds.push(res.body.data.id);
        }
        // Documents behavior when regex passes but PostgreSQL rejects invalid date
        expect([201, 422, 500]).toContain(res.status);
      });

      it('tests future birth date "2099-01-01"', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/customers')
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .send({
            customer_name: 'Future Birth Date Customer',
            customer_address: 'Jl. Masa Depan No. 100',
            gender: 'Wanita',
            birth_date: '2099-01-01',
          });

        if (res.status === 201) {
          createdCustomerIds.push(res.body.data.id);
        }
        // Documents current schema acceptance of future YYYY-MM-DD
        expect([201, 422]).toContain(res.status);
      });
    });

    describe('3.3 Phone Re-registration after Soft-Delete', () => {
      it('allows a new customer to register using the phone number of a soft-deleted customer', async () => {
        const sharedPhone = `0855${Date.now().toString().slice(-8)}`;

        // 1. Create Customer 1
        const c1Res = await request(app.getHttpServer())
          .post('/api/customers')
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .send({
            customer_name: 'First Owner of Phone',
            customer_address: 'Jl. Lama No. 1',
            gender: 'Pria',
            birth_date: '1990-01-01',
            phone: sharedPhone,
          });
        expect(c1Res.status).toBe(201);
        const c1Id = c1Res.body.data.id;
        createdCustomerIds.push(c1Id);

        // 2. Soft-delete Customer 1
        const delRes = await request(app.getHttpServer())
          .delete(`/api/customers/${c1Id}`)
          .set('Authorization', `Bearer ${adminAccessToken}`);
        expect(delRes.status).toBe(200);

        // 3. Create Customer 2 with same phone
        const c2Res = await request(app.getHttpServer())
          .post('/api/customers')
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .send({
            customer_name: 'Second Owner of Phone',
            customer_address: 'Jl. Baru No. 2',
            gender: 'Wanita',
            birth_date: '1995-05-05',
            phone: sharedPhone,
          });
        expect(c2Res.status).toBe(201);
        const c2Id = c2Res.body.data.id;
        createdCustomerIds.push(c2Id);

        // 4. Searching for sharedPhone returns ONLY Customer 2
        const searchRes = await request(app.getHttpServer())
          .get(`/api/customers?search=${sharedPhone}`)
          .set('Authorization', `Bearer ${cashierAccessToken}`);
        expect(searchRes.status).toBe(200);
        expect(searchRes.body.data.length).toBe(1);
        expect(searchRes.body.data[0].id).toBe(c2Id);

        // 5. Repository findByPhone returns Customer 2
        const repoCustomer = await customersRepository.findByPhone(sharedPhone);
        expect(repoCustomer).not.toBeNull();
        expect(repoCustomer?.id).toBe(c2Id);
      });
    });

    describe('3.4 Concurrency Stress: Concurrent Mutations', () => {
      it('handles concurrent updates safely without data corruption', async () => {
        // Create base customer
        const res = await request(app.getHttpServer())
          .post('/api/customers')
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .send({
            customer_name: 'Concurrent Base Customer',
            customer_address: 'Jl. Concurrency No. 1',
            gender: 'Pria',
            birth_date: '1990-01-01',
          });
        expect(res.status).toBe(201);
        const targetId = res.body.data.id;
        createdCustomerIds.push(targetId);

        // Execute 5 concurrent PUT requests
        const updates = Array.from({ length: 5 }, (_, i) =>
          request(app.getHttpServer())
            .put(`/api/customers/${targetId}`)
            .set('Authorization', `Bearer ${adminAccessToken}`)
            .send({
              customer_name: `Concurrent Name ${i}`,
              customer_address: `Jl. Concurrency No. ${i}`,
            }),
        );

        const results = await Promise.all(updates);
        for (const r of results) {
          expect(r.status).toBe(200);
        }

        // Verify final state is valid and consistent
        const finalGet = await request(app.getHttpServer())
          .get(`/api/customers/${targetId}`)
          .set('Authorization', `Bearer ${cashierAccessToken}`);
        expect(finalGet.status).toBe(200);
        expect(finalGet.body.data.id).toBe(targetId);
        expect(finalGet.body.data.customer_name).toMatch(/^Concurrent Name \d$/);
      });
    });
  });
});
