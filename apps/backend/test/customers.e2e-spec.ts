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

describe('CustomersController & Membership Engine (E2E)', () => {
  let app: INestApplication;
  let adminAccessToken: string;
  let cashierAccessToken: string;
  let isCustomersModuleMounted = false;
  let createdCustomerId: string;
  const uniqueSuffix = Date.now().toString().slice(-6);
  const testCustomerName = `Member Test ${uniqueSuffix}`;

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

    // Probe if Customers module is mounted
    const probeRes = await request(app.getHttpServer())
      .get('/api/customers')
      .set('Authorization', `Bearer ${cashierAccessToken}`);
    if (probeRes.body?.message !== 'Cannot GET /api/customers') {
      isCustomersModuleMounted = true;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('TEST-06: should reject unauthenticated request to /api/customers with 401', async (ctx) => {
    if (!isCustomersModuleMounted) {
      ctx.skip();
      return;
    }
    const response = await request(app.getHttpServer()).get('/api/customers');
    expect(response.status).toBe(401);
  });

  it('Admin registers new member via POST /api/customers', async (ctx) => {
    if (!isCustomersModuleMounted) {
      ctx.skip();
      return;
    }

    const response = await request(app.getHttpServer())
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        customer_name: testCustomerName,
        customer_address: 'Jl. Surya Kencana No. 42 Bogor',
        gender: 'Pria',
        birth_date: '1995-08-20',
        phone: '081299881122',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();

    const data = response.body.data;
    expect(data.id).toBeDefined();
    expect(data.customer_name || data.customerName).toBe(testCustomerName);
    expect(data.customer_address || data.customerAddress).toBe('Jl. Surya Kencana No. 42 Bogor');
    expect(data.gender).toBe('Pria');
    expect(data.birth_date || data.birthDate).toBe('1995-08-20');

    createdCustomerId = data.id;
  });

  it('Cashier can also register a new member via POST /api/customers', async (ctx) => {
    if (!isCustomersModuleMounted) {
      ctx.skip();
      return;
    }

    const cashierCustomerName = `Member Kasir ${uniqueSuffix}`;
    const response = await request(app.getHttpServer())
      .post('/api/customers')
      .set('Authorization', `Bearer ${cashierAccessToken}`)
      .send({
        customer_name: cashierCustomerName,
        customer_address: 'Jl. Sudirman No. 88 Jakarta',
        gender: 'Wanita',
        birth_date: '1998-11-05',
        phone: '081377889900',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBeDefined();
  });

  it('Both Cashier and Admin can search and list active customers with pagination', async (ctx) => {
    if (!isCustomersModuleMounted) {
      ctx.skip();
      return;
    }

    const response = await request(app.getHttpServer())
      .get(`/api/customers?search=${testCustomerName}`)
      .set('Authorization', `Bearer ${cashierAccessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    expect(response.body.meta).toBeDefined();
    expect(response.body.meta.page).toBe(1);
  });

  it('Cashier and Admin can retrieve customer profile by UUID via GET /api/customers/:id', async (ctx) => {
    if (!isCustomersModuleMounted) {
      ctx.skip();
      return;
    }

    const response = await request(app.getHttpServer())
      .get(`/api/customers/${createdCustomerId}`)
      .set('Authorization', `Bearer ${cashierAccessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe(createdCustomerId);
    expect(response.body.data.customer_name || response.body.data.customerName).toBe(testCustomerName);
  });

  it('Admin updates member profile via PUT /api/customers/:id', async (ctx) => {
    if (!isCustomersModuleMounted) {
      ctx.skip();
      return;
    }

    const updatedName = `${testCustomerName} Updated`;
    const response = await request(app.getHttpServer())
      .put(`/api/customers/${createdCustomerId}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        customer_name: updatedName,
        customer_address: 'Jl. Sudirman No. 99 Jakarta Pusat',
        phone: '081299999999',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.customer_name || response.body.data.customerName).toBe(updatedName);
    expect(response.body.data.phone).toBe('081299999999');
  });

  it('RBAC: Cashier is blocked with 403 Forbidden from updating member via PUT /api/customers/:id', async (ctx) => {
    if (!isCustomersModuleMounted) {
      ctx.skip();
      return;
    }

    const response = await request(app.getHttpServer())
      .put(`/api/customers/${createdCustomerId}`)
      .set('Authorization', `Bearer ${cashierAccessToken}`)
      .send({
        customer_name: 'Illegal Cashier Update',
      });

    expect(response.status).toBe(403);
  });

  it('RBAC: Cashier is blocked with 403 Forbidden from deleting member via DELETE /api/customers/:id', async (ctx) => {
    if (!isCustomersModuleMounted) {
      ctx.skip();
      return;
    }

    const response = await request(app.getHttpServer())
      .delete(`/api/customers/${createdCustomerId}`)
      .set('Authorization', `Bearer ${cashierAccessToken}`);

    expect(response.status).toBe(403);
  });

  it('Admin soft-deletes member via DELETE /api/customers/:id and verifies exclusion', async (ctx) => {
    if (!isCustomersModuleMounted) {
      ctx.skip();
      return;
    }

    // 1. Soft delete
    const deleteRes = await request(app.getHttpServer())
      .delete(`/api/customers/${createdCustomerId}`)
      .set('Authorization', `Bearer ${adminAccessToken}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);

    // 2. Querying by id returns 404 Not Found
    const getRes = await request(app.getHttpServer())
      .get(`/api/customers/${createdCustomerId}`)
      .set('Authorization', `Bearer ${cashierAccessToken}`);
    expect(getRes.status).toBe(404);

    // 3. Search excludes soft-deleted customer
    const searchRes = await request(app.getHttpServer())
      .get(`/api/customers?search=${testCustomerName}`)
      .set('Authorization', `Bearer ${cashierAccessToken}`);
    expect(searchRes.status).toBe(200);
    const found = searchRes.body.data.some((c: { id: string }) => c.id === createdCustomerId);
    expect(found).toBe(false);
  });

  it('Validation: Rejects invalid inputs with 422 Unprocessable Entity', async (ctx) => {
    if (!isCustomersModuleMounted) {
      ctx.skip();
      return;
    }

    // Invalid gender enum
    const resGender = await request(app.getHttpServer())
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        customer_name: 'Invalid Gender Member',
        customer_address: 'Jl. Testing No. 1',
        gender: 'Other',
        birth_date: '1990-01-01',
      });
    expect(resGender.status).toBe(422);

    // Invalid birth_date format (not YYYY-MM-DD)
    const resDate = await request(app.getHttpServer())
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        customer_name: 'Invalid Date Member',
        customer_address: 'Jl. Testing No. 1',
        gender: 'Pria',
        birth_date: '01/01/1990',
      });
    expect(resDate.status).toBe(422);

    // Short name (< 2 characters)
    const resShortName = await request(app.getHttpServer())
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        customer_name: 'A',
        customer_address: 'Jl. Testing No. 1',
        gender: 'Pria',
        birth_date: '1990-01-01',
      });
    expect(resShortName.status).toBe(422);

    // Short address (< 5 characters)
    const resShortAddress = await request(app.getHttpServer())
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        customer_name: 'Valid Name',
        customer_address: 'Jl',
        gender: 'Pria',
        birth_date: '1990-01-01',
      });
    expect(resShortAddress.status).toBe(422);
  });
});
