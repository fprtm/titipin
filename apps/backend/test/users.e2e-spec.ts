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

describe('UsersController & RBAC Engine (E2E)', () => {
  let app: INestApplication;
  let adminAccessToken: string;
  let adminId: string;
  let cashierAccessToken: string;
  let createdUserId: string;
  const testStaffEmail = `staff.test.${Date.now()}@titipin.id`;

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
    adminId = adminLoginRes.body.data.user.id;

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

  it('TEST-06: should reject unauthenticated request to /api/users with 401', async () => {
    const response = await request(app.getHttpServer()).get('/api/users');
    expect(response.status).toBe(401);
  });

  it('TEST-09: RBAC Guard — Cashier accessing Admin-only /api/users endpoints rejected with 403 Forbidden', async () => {
    const getRes = await request(app.getHttpServer())
      .get('/api/users')
      .set('Authorization', `Bearer ${cashierAccessToken}`);
    expect(getRes.status).toBe(403);
    expect(getRes.body.message).toContain('hak akses role tidak mencukupi');

    const postRes = await request(app.getHttpServer())
      .post('/api/users')
      .set('Authorization', `Bearer ${cashierAccessToken}`)
      .send({
        name: 'Illegal Cashier Attempt',
        email: 'illegal@titipin.id',
        password: 'Password123!',
        role: 'CASHIER',
      });
    expect(postRes.status).toBe(403);
  });

  it('Admin should successfully list all users via GET /api/users', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/users')
      .set('Authorization', `Bearer ${adminAccessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThanOrEqual(2);

    const firstUser = response.body.data[0];
    expect(firstUser).toHaveProperty('id');
    expect(firstUser).toHaveProperty('name');
    expect(firstUser).toHaveProperty('email');
    expect(firstUser).toHaveProperty('role');
    expect(firstUser).not.toHaveProperty('password');
    expect(firstUser).not.toHaveProperty('refreshTokenHash');
  });

  it('Admin should register a new cashier via POST /api/users', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/users')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        name: 'Staf Kasir Baru',
        email: testStaffEmail,
        password: 'PasswordStaf123!',
        role: 'CASHIER',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.email).toBe(testStaffEmail);
    expect(response.body.data.role).toBe('CASHIER');
    expect(response.body.data.name).toBe('Staf Kasir Baru');
    expect(response.body.data).not.toHaveProperty('password');

    createdUserId = response.body.data.id;
  });

  it('Admin should be rejected with 422 if attempting to register duplicate email', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/users')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        name: 'Duplikat Staf',
        email: testStaffEmail,
        password: 'PasswordStaf123!',
        role: 'CASHIER',
      });

    expect(response.status).toBe(422);
    expect(response.body.message).toContain('Email sudah terdaftar');
  });

  it('Self-Guard: Admin cannot reset own password via PATCH /api/users/:id/reset-password (403)', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/users/${adminId}/reset-password`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        new_password: 'NewAdminPassword123!',
        new_password_confirmation: 'NewAdminPassword123!',
      });

    expect(response.status).toBe(403);
    expect(response.body.message).toContain('Admin tidak dapat mereset kata sandi sendiri');
  });

  it('Self-Guard: Admin cannot deactivate own account via DELETE /api/users/:id (403)', async () => {
    const response = await request(app.getHttpServer())
      .delete(`/api/users/${adminId}`)
      .set('Authorization', `Bearer ${adminAccessToken}`);

    expect(response.status).toBe(403);
    expect(response.body.message).toContain('Admin tidak dapat menonaktifkan akun sendiri');
  });

  it('Admin resets cashier password with instant session revocation', async () => {
    // 1. Newly created cashier logs in to establish session
    const loginBeforeRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: testStaffEmail,
        password: 'PasswordStaf123!',
      });
    expect(loginBeforeRes.status).toBe(200);

    const cookies = loginBeforeRes.headers['set-cookie'];
    const refreshCookie = Array.isArray(cookies) ? cookies.find((c) => c.startsWith('refresh_token=')) : cookies;

    // 2. Admin resets cashier password
    const resetRes = await request(app.getHttpServer())
      .patch(`/api/users/${createdUserId}/reset-password`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        new_password: 'PasswordBaruStaf99!',
        new_password_confirmation: 'PasswordBaruStaf99!',
      });

    expect(resetRes.status).toBe(200);
    expect(resetRes.body.success).toBe(true);
    expect(resetRes.body.message).toContain('berhasil direset');

    // 3. Former refresh token must now be invalid (session revoked)
    const refreshAfterRes = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', [refreshCookie as string]);
    expect(refreshAfterRes.status).toBe(401);

    // 4. Old password fails
    const oldLoginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: testStaffEmail,
        password: 'PasswordStaf123!',
      });
    expect(oldLoginRes.status).toBe(401);

    // 5. New password succeeds
    const newLoginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: testStaffEmail,
        password: 'PasswordBaruStaf99!',
      });
    expect(newLoginRes.status).toBe(200);
  });

  it('TEST-08: Soft delete user — blocks login & silent refresh revoked', async () => {
    // 1. Deactivate cashier
    const deleteRes = await request(app.getHttpServer())
      .delete(`/api/users/${createdUserId}`)
      .set('Authorization', `Bearer ${adminAccessToken}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);

    // 2. Login attempt by deactivated cashier must be blocked with 401
    const blockedLoginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: testStaffEmail,
        password: 'PasswordBaruStaf99!',
      });
    expect(blockedLoginRes.status).toBe(401);
    expect(blockedLoginRes.body.success).toBe(false);

    // 3. Admin attempting to reset password of deactivated user gets 422
    const resetDeactivatedRes = await request(app.getHttpServer())
      .patch(`/api/users/${createdUserId}/reset-password`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        new_password: 'PasswordLain123!',
        new_password_confirmation: 'PasswordLain123!',
      });
    expect(resetDeactivatedRes.status).toBe(422);
    expect(resetDeactivatedRes.body.message).toContain('Pengguna telah dinonaktifkan');
  });
});
