import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import ExcelJS from 'exceljs';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { ZodValidationPipe } from '../src/common/pipes/zod-validation.pipe';

describe('ProductsController & Inventory Engine (E2E)', () => {
  let app: INestApplication;
  let adminAccessToken: string;
  let cashierAccessToken: string;
  let createdProductId: number;
  const uniqueCode = `PRD${Date.now().toString().slice(-6)}`;

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

  it('TEST-06: should reject unauthenticated request to /api/products with 401', async () => {
    const response = await request(app.getHttpServer()).get('/api/products');
    expect(response.status).toBe(401);
  });

  it('Admin creates new product via POST /api/products', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/products')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        product_code: uniqueCode,
        product_name: 'Minuman Teh Melati 350ml',
        stock: 25,
        price: 5500.0,
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.productCode).toBe(uniqueCode);
    expect(response.body.data.productName).toBe('Minuman Teh Melati 350ml');
    expect(response.body.data.stock).toBe(25);
    expect(Number(response.body.data.price)).toBe(5500);

    createdProductId = response.body.data.id;
  });

  it('Rejects duplicate product_code with 422 Unprocessable Entity', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/products')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        product_code: uniqueCode,
        product_name: 'Minuman Teh Melati Duplikat',
        stock: 10,
        price: 5500.0,
      });

    expect(response.status).toBe(422);
    expect(response.body.message).toContain('Kode produk sudah terdaftar');
  });

  it('Cashier is forbidden from creating products (403 Forbidden)', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/products')
      .set('Authorization', `Bearer ${cashierAccessToken}`)
      .send({
        product_code: 'CASHIER_FAIL',
        product_name: 'Produk Ilegal',
        stock: 10,
        price: 1000,
      });

    expect(response.status).toBe(403);
  });

  it('Both Cashier and Admin can search and list active products with pagination metadata', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/products?search=${uniqueCode}`)
      .set('Authorization', `Bearer ${cashierAccessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBe(1);
    expect(response.body.data[0].productCode).toBe(uniqueCode);
    expect(response.body.meta).toBeDefined();
    expect(response.body.meta.page).toBe(1);
    expect(response.body.meta.total_items).toBe(1);
  });

  it('Admin updates product details via PUT /api/products/:id', async () => {
    const response = await request(app.getHttpServer())
      .put(`/api/products/${createdProductId}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        product_name: 'Minuman Teh Melati Jumbo 500ml',
        stock: 30,
        price: 6500.0,
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.productName).toBe('Minuman Teh Melati Jumbo 500ml');
    expect(response.body.data.stock).toBe(30);
    expect(Number(response.body.data.price)).toBe(6500);
  });

  it('GET /api/products/export returns valid Excel sheet (.xlsx)', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/products/export')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(response.body).toBeDefined();

    // Verify valid Excel file by parsing buffer
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(response.body as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    const worksheet = workbook.getWorksheet('Katalog Produk');
    expect(worksheet).toBeDefined();
    expect(worksheet!.rowCount).toBeGreaterThanOrEqual(2);
  });

  it('TEST-07: Soft delete product & verify excluded from catalog and ordering', async () => {
    // 1. Soft delete product
    const deleteRes = await request(app.getHttpServer())
      .delete(`/api/products/${createdProductId}`)
      .set('Authorization', `Bearer ${adminAccessToken}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);

    // 2. Querying by id must return 404
    const getRes = await request(app.getHttpServer())
      .get(`/api/products/${createdProductId}`)
      .set('Authorization', `Bearer ${cashierAccessToken}`);

    expect(getRes.status).toBe(404);

    // 3. Search must exclude the soft-deleted product
    const searchRes = await request(app.getHttpServer())
      .get(`/api/products?search=${uniqueCode}`)
      .set('Authorization', `Bearer ${cashierAccessToken}`);

    expect(searchRes.status).toBe(200);
    expect(searchRes.body.data.length).toBe(0);
  });

  it('TEST-07: Idempotent Excel Import restores deleted product, updates existing and inserts new', async () => {
    // Build test spreadsheet buffer with 2 products:
    // 1. Previously deleted uniqueCode -> should be updated & restored
    // 2. New product -> should be inserted
    const newCode = `NEW${Date.now().toString().slice(-6)}`;
    const testWorkbook = new ExcelJS.Workbook();
    const sheet = testWorkbook.addWorksheet('Import Test');
    sheet.columns = [
      { header: 'Kode Produk', key: 'code' },
      { header: 'Nama Produk', key: 'name' },
      { header: 'Harga', key: 'price' },
      { header: 'Stok', key: 'stock' },
    ];
    sheet.addRow({ code: uniqueCode, name: 'Teh Melati Restored', price: 7000, stock: 50 });
    sheet.addRow({ code: newCode, name: 'Kopi Susu Gula Aren', price: 15000, stock: 40 });

    const buffer = Buffer.from(await testWorkbook.xlsx.writeBuffer());

    // First Import run
    const importRes1 = await request(app.getHttpServer())
      .post('/api/products/import')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .attach('file', buffer, 'katalog_import.xlsx');

    expect(importRes1.status).toBe(200);
    expect(importRes1.body.success).toBe(true);
    expect(importRes1.body.data.total_rows).toBe(2);
    expect(importRes1.body.data.inserted).toBe(1);
    expect(importRes1.body.data.updated).toBe(1);

    // Verify soft-deleted product is now restored and active in listing!
    const restoredRes = await request(app.getHttpServer())
      .get(`/api/products?search=${uniqueCode}`)
      .set('Authorization', `Bearer ${cashierAccessToken}`);

    expect(restoredRes.status).toBe(200);
    expect(restoredRes.body.data.length).toBe(1);
    expect(restoredRes.body.data[0].productName).toBe('Teh Melati Restored');
    expect(restoredRes.body.data[0].stock).toBe(50);

    // Second Import run with exact same file -> IDEMPOTENT: 0 inserted, 2 updated, no duplicates!
    const importRes2 = await request(app.getHttpServer())
      .post('/api/products/import')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .attach('file', buffer, 'katalog_import.xlsx');

    expect(importRes2.status).toBe(200);
    expect(importRes2.body.data.total_rows).toBe(2);
    expect(importRes2.body.data.inserted).toBe(0);
    expect(importRes2.body.data.updated).toBe(2);
  });
});
