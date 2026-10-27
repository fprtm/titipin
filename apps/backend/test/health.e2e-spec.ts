import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { Reflector } from '@nestjs/core';
import { PG_POOL } from '../src/database/database.module';

describe('HealthController (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    const reflector = app.get(Reflector);
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new TransformInterceptor(reflector));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health should return ok and connected database', async () => {
    const response = await request(app.getHttpServer()).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toBeDefined();
    expect(response.body.status).toBe('ok');
    expect(response.body.database).toBe('connected');
    expect(response.body.timestamp).toBeDefined();
  });

  it('GET /api/health should return 503 error format when database is unavailable', async () => {
    const disconnectedModule: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PG_POOL)
      .useValue({
        query: vi.fn().mockRejectedValue(new Error('Connection lost')),
        end: vi.fn().mockResolvedValue(undefined),
      })
      .compile();

    const disconnectedApp = disconnectedModule.createNestApplication();
    disconnectedApp.setGlobalPrefix('api');
    const reflector = disconnectedApp.get(Reflector);
    disconnectedApp.useGlobalFilters(new AllExceptionsFilter());
    disconnectedApp.useGlobalInterceptors(new TransformInterceptor(reflector));
    await disconnectedApp.init();

    const response = await request(disconnectedApp.getHttpServer()).get('/api/health');

    expect(response.status).toBe(503);
    expect(response.body).toBeDefined();
    expect(response.body.status).toBe('error');
    expect(response.body.database).toBe('disconnected');
    expect(response.body.error).toBe('Connection lost');
    expect(response.body.timestamp).toBeDefined();

    await disconnectedApp.close();
  });
});
