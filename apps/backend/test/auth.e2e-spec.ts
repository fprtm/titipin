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

describe('AuthController & Authentication Engine (E2E)', () => {
  let app: INestApplication;
  let adminAccessToken: string;
  let refreshTokenCookie: string;

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
  });

  afterAll(async () => {
    await app.close();
  });

  it('TEST-01: should login with valid credentials, issue in-memory access token and HttpOnly refresh token cookie', async () => {
    const response = await request(app.getHttpServer()).post('/api/auth/login').send({
      email: 'admin@titipin.id',
      password: 'Admin123!',
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.accessToken).toBeDefined();
    expect(response.body.data.access_token).toBeDefined();
    expect(response.body.data.user).toBeDefined();
    expect(response.body.data.user.email).toBe('admin@titipin.id');
    expect(response.body.data.user.role).toBe('ADMIN');

    // Verify Set-Cookie header for refresh_token
    const rawCookies = response.headers['set-cookie'];
    const cookies = Array.isArray(rawCookies) ? rawCookies : [rawCookies as string];
    expect(cookies).toBeDefined();
    const refreshCookie = cookies.find((cookie: string) => cookie.startsWith('refresh_token='));
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toContain('HttpOnly');

    adminAccessToken = response.body.data.accessToken;
    refreshTokenCookie = refreshCookie!.split(';')[0];
  });

  it('TEST-01: should reject login with wrong password with 401 Unauthorized', async () => {
    const response = await request(app.getHttpServer()).post('/api/auth/login').send({
      email: 'admin@titipin.id',
      password: 'WrongPassword999!',
    });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Email atau kata sandi tidak valid');
  });

  it('TEST-01: should reject login for non-existent email with 401 Unauthorized', async () => {
    const response = await request(app.getHttpServer()).post('/api/auth/login').send({
      email: 'nonexistent@titipin.id',
      password: 'AnyPassword123!',
    });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Email atau kata sandi tidak valid');
  });

  it('TEST-06: should reject GET /api/auth/me without token with 401 Unauthorized', async () => {
    const response = await request(app.getHttpServer()).get('/api/auth/me');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('TEST-06: should reject GET /api/auth/me with invalid Bearer token with 401 Unauthorized', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid-token-sample');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('TEST-01: should return user profile on GET /api/auth/me with valid access token', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminAccessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.email).toBe('admin@titipin.id');
    expect(response.body.data.role).toBe('ADMIN');
  });

  it('TEST-01: should rotate refresh token and issue new access token on POST /api/auth/refresh', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', [refreshTokenCookie]);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.accessToken).toBeDefined();
    expect(response.body.data.access_token).toBeDefined();

    // Verify new rotated refresh token cookie was issued
    const rawCookies = response.headers['set-cookie'];
    const cookies = Array.isArray(rawCookies) ? rawCookies : [rawCookies as string];
    expect(cookies).toBeDefined();
    const newRefreshCookie = cookies.find((c: string) => c.startsWith('refresh_token='));
    expect(newRefreshCookie).toBeDefined();

    // Update tokens for subsequent tests
    adminAccessToken = response.body.data.accessToken;
    const oldCookie = refreshTokenCookie;
    refreshTokenCookie = newRefreshCookie!.split(';')[0];

    // Verify old rotated refresh token is now rejected (revocation of rotated tokens)
    const oldTokenResponse = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', [oldCookie]);

    expect(oldTokenResponse.status).toBe(401);
  });

  it('TEST-01: should update profile display name on PATCH /api/auth/me', async () => {
    const response = await request(app.getHttpServer())
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ name: 'Super Admin Updated' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('Super Admin Updated');

    // Revert name back to original
    await request(app.getHttpServer())
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ name: 'Super Admin' });
  });

  it('TEST-01: should reject change-password with wrong current password', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        current_password: 'WrongCurrentPassword!',
        new_password: 'NewAdmin12345!',
        new_password_confirmation: 'NewAdmin12345!',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('TEST-01: should logout and revoke session on POST /api/auth/logout', async () => {
    const logoutResponse = await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${adminAccessToken}`);

    expect(logoutResponse.status).toBe(200);
    expect(logoutResponse.body.success).toBe(true);

    // Refresh should now fail because refreshTokenHash was cleared
    const refreshAfterLogoutResponse = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', [refreshTokenCookie]);

    expect(refreshAfterLogoutResponse.status).toBe(401);
  });
});
