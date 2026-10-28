import { NestFactory, Reflector } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { envConfig } from './config/env.config';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { ResponseTimeInterceptor } from './common/interceptors/response-time.interceptor';
import { ZodValidationPipe } from './common/pipes/zod-validation.pipe';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());
  app.setGlobalPrefix('api');

  app.enableCors({
    origin: [envConfig.FRONTEND_URL],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  });

  const reflector = app.get(Reflector);
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(
    new ResponseTimeInterceptor(),
    new TransformInterceptor(reflector),
  );
  app.useGlobalPipes(new ZodValidationPipe());

  // Setup OpenAPI / Swagger Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Titipin POS & Order Management API')
    .setDescription(
      'Dokumentasi Resmi API Sistem Kasir & Manajemen Order PT Laksmada Aza Simetri (Titipin POS). ' +
      'Mendukung otentikasi JWT Bearer, transaksi checkout atomik dengan pessimistic locking, ' +
      'pencarian cepat berbasis PostgreSQL GIN Trigram, serta analitik penjualan.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Masukkan access token JWT (Format: Bearer <token>)',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Auth', 'Autentikasi pengguna, rotasi refresh token, profil, dan ubah kata sandi')
    .addTag('Products', 'Katalog produk, manajemen stok, dan pencarian cepat GIN trigram')
    .addTag('Customers', 'Data pelanggan, membership, dan diskon otomatis ulang tahun')
    .addTag('Orders', 'Checkout kasir POS atomik, hold draft order, riwayat transaksi, dan ekspor Excel')
    .addTag('Dashboard', 'Metrik ringkasan penjualan, produk terlaris, dan stok menipis')
    .addTag('Analytics', 'Business intelligence, tren penjualan multi-axis, basket analysis & bundling')
    .addTag('Users', 'Manajemen staf kasir dan kontrol akses berbasis peran (RBAC)')
    .addTag('Audit', 'Audit trail log untuk compliance dan integritas data')
    .addTag('Health & Monitoring', 'Status kesehatan server, database pool, dan metrik Prometheus')
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument, {
    customSiteTitle: 'Titipin POS API Documentation',
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(envConfig.PORT);
  logger.log(`Titipin Backend is running on: http://localhost:${envConfig.PORT}/api`);
  logger.log(`Swagger Documentation available at: http://localhost:${envConfig.PORT}/api/docs`);
  logger.log(`Prometheus Metrics available at: http://localhost:${envConfig.PORT}/api/metrics`);
}

bootstrap();
