import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { ResponseTimeInterceptor } from '../src/common/interceptors/response-time.interceptor';

describe('Prometheus Metrics & Observability Engine (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');

    const reflector = app.get(Reflector);
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(
      new ResponseTimeInterceptor(),
      new TransformInterceptor(reflector),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health returns system uptime, memory usage, and database connection status', async () => {
    const response = await request(app.getHttpServer()).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('database', 'connected');
    expect(response.body).toHaveProperty('uptimeSeconds');
    expect(response.body).toHaveProperty('memoryUsageMb');
    expect(typeof response.body.uptimeSeconds).toBe('number');
    expect(typeof response.body.memoryUsageMb).toBe('number');

    // Verify X-Response-Time header
    expect(response.headers['x-response-time']).toBeDefined();
    expect(response.headers['x-response-time']).toMatch(/\d+ms/);
  });

  it('GET /api/metrics exposes standard Prometheus metrics format for scrapers', async () => {
    const response = await request(app.getHttpServer()).get('/api/metrics');
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/plain');

    const metricsText = response.text;

    // Verify Node.js process and memory metrics
    expect(metricsText).toContain('titipin_nodejs_heap_size_used_bytes');

    // Verify database connection pool metrics
    expect(metricsText).toContain('titipin_pg_pool_total_connections');
    expect(metricsText).toContain('titipin_pg_pool_idle_connections');
    expect(metricsText).toContain('titipin_pg_pool_waiting_clients');

    // Verify HTTP duration & request counter metrics
    expect(metricsText).toContain('titipin_http_requests_total');
    expect(metricsText).toContain('titipin_http_request_duration_seconds');
  });
});
