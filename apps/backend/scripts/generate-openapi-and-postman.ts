import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';
import { AppModule } from '../src/app.module';

async function generate() {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api');

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

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  const outDir = path.resolve(__dirname, '../../../docs/api');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 1. Write openapi.json
  const openApiPath = path.join(outDir, 'openapi.json');
  fs.writeFileSync(openApiPath, JSON.stringify(document, null, 2));
  console.log(`✅ Generated OpenAPI JSON: ${openApiPath}`);

  // 2. Generate Postman Collection v2.1.0 from OpenAPI Document
  interface PostmanFolder {
    name: string;
    item: unknown[];
  }
  interface SwaggerOperation {
    summary?: string;
    description?: string;
    tags?: string[];
  }

  const postmanItems: PostmanFolder[] = [];
  const paths = document.paths || {};

  for (const [routePath, methods] of Object.entries(paths)) {
    for (const [method, operation] of Object.entries(methods as Record<string, unknown>)) {
      if (['get', 'post', 'put', 'patch', 'delete'].includes(method.toLowerCase())) {
        const op = operation as SwaggerOperation;
        const tag = op.tags?.[0] || 'General';

        let tagFolder = postmanItems.find((i) => i.name === tag);
        if (!tagFolder) {
          tagFolder = {
            name: tag,
            item: [],
          };
          postmanItems.push(tagFolder);
        }

        const pathSegments = routePath
          .replace(/^\//, '')
          .split('/')
          .map((s) => (s.startsWith('{') && s.endsWith('}') ? `:${s.slice(1, -1)}` : s));

        tagFolder.item.push({
          name: op.summary || `${method.toUpperCase()} ${routePath}`,
          request: {
            method: method.toUpperCase(),
            header: [
              {
                key: 'Accept',
                value: 'application/json',
                type: 'text',
              },
            ],
            url: {
              raw: `{{baseUrl}}/${routePath.replace(/^\//, '')}`,
              host: ['{{baseUrl}}'],
              path: pathSegments,
            },
            description: op.description || '',
          },
          response: [],
        });
      }
    }
  }

  const postmanCollection = {
    info: {
      name: 'Titipin POS & Order Management API Collection',
      description: 'Koleksi Postman untuk pengujian API Titipin POS sesuai standar teknis PT Laksmada Aza Simetri.',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    auth: {
      type: 'bearer',
      bearer: [
        {
          key: 'token',
          value: '{{accessToken}}',
          type: 'string',
        },
      ],
    },
    variable: [
      {
        key: 'baseUrl',
        value: 'http://localhost:3001/api',
        type: 'string',
      },
      {
        key: 'accessToken',
        value: '',
        type: 'string',
      },
    ],
    item: postmanItems,
  };

  const postmanPath = path.join(outDir, 'titipin-pos.postman_collection.json');
  fs.writeFileSync(postmanPath, JSON.stringify(postmanCollection, null, 2));
  console.log(`✅ Generated Postman Collection JSON: ${postmanPath}`);

  await app.close();
}

generate().catch((err) => {
  console.error('Error generating API documents:', err);
  process.exit(1);
});
