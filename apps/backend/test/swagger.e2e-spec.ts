import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';

describe('Swagger / OpenAPI Documentation Engine (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');

    const swaggerConfig = new DocumentBuilder()
      .setTitle('Titipin POS & Order Management API')
      .setDescription('Dokumentasi Resmi API Sistem Kasir & Manajemen Order PT Laksmada Aza Simetri')
      .setVersion('1.0.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer' }, 'JWT-auth')
      .build();

    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, swaggerDocument);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/docs serves Swagger UI HTML page with 200 OK', async () => {
    const response = await request(app.getHttpServer()).get('/api/docs');
    expect(response.status).toBe(200);
    expect(response.text).toContain('swagger-ui');
  });

  it('GET /api/docs-json serves valid OpenAPI 3.0 specification in JSON format', async () => {
    const response = await request(app.getHttpServer()).get('/api/docs-json');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('openapi');
    expect(response.body.info).toHaveProperty('title', 'Titipin POS & Order Management API');
    expect(response.body).toHaveProperty('paths');
    expect(response.body).toHaveProperty('components');
  });
});
