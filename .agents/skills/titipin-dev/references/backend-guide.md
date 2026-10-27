# TITIPIN DEV — BACKEND ARCHITECTURE & CODING GUIDE
## NestJS 11+, Drizzle ORM, PostgreSQL & Concurrency Standards

This guide provides explicit instructions for writing backend code in `apps/backend/`.

---

## 1. STRUKTUR MODUL BACKEND (MODULAR MONOLITH)

Setiap domain bisnis diorganisir sebagai modul NestJS mandiri di dalam `apps/backend/src/modules/`:

```
apps/backend/src/
├── common/
│   ├── decorators/          # @CurrentUser(), @Roles()
│   ├── filters/             # all-exceptions.filter.ts
│   ├── guards/              # jwt-auth.guard.ts, roles.guard.ts
│   ├── interceptors/        # transform.interceptor.ts
│   └── pipes/               # zod-validation.pipe.ts
├── config/
│   └── env.config.ts        # Zod environment variable validation
├── database/
│   ├── schema/              # Modular Drizzle schemas (users, products, orders, audit, etc.)
│   ├── seeds/               # Deterministic seed data
│   ├── database.module.ts   # Connection pool provider (node-postgres / pg)
│   └── database.service.ts  # Drizzle client injection token ('DRIZZLE_ORM')
├── modules/
│   ├── auth/                # Login, Refresh, Password Change, Guards
│   ├── users/               # User management (Admin only)
│   ├── products/            # Catalog CRUD, Excel Import/Export
│   ├── customers/           # Member directory CRUD
│   ├── orders/              # POS Checkout, Concurrency Lock, Draft Hold, History
│   ├── dashboard/           # Metrics aggregation & slow-moving products
│   └── audit/               # Centralized audit logging service
├── app.module.ts
└── main.ts                  # Bootstrap, CORS, global filters/interceptors
```

---

## 2. PATTERN PENULISAN KODE BACKEND

### 2.1 Alur Data (Controller -> Service -> Drizzle Database)
* **Controller**: Bertanggung jawab menerima request HTTP, menerapkan Guard autentikasi/otorisasi, memvalidasi input via DTO/Pipes, dan memanggil Service. Controller **tidak boleh** memuat logika bisnis atau query SQL langsung.
* **Service**: Memuat aturan bisnis (*business rules*), validasi domain, orkestrasi transaksi database, dan pemanggilan `AuditService.log()`.
* **Database**: Menggunakan Drizzle ORM yang disuntikkan via Dependency Injection token `@Inject('DRIZZLE_ORM')`.

### 2.2 Contoh Implementasi Service Standar dengan Drizzle
```typescript
import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, isNull, desc } from 'drizzle-orm';
import * as schema from '../../database/schema';
import { AuditService } from '../audit/audit.service';
import { CreateProductDto, UpdateProductDto } from './dto';

@Injectable()
export class ProductsService {
  constructor(
    @Inject('DRIZZLE_ORM') private readonly db: NodePgDatabase<typeof schema>,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query: { page: number; perPage: number; search?: string }) {
    const offset = (query.page - 1) * query.perPage;
    const baseWhere = isNull(schema.products.deletedAt);

    const [items, totalCount] = await Promise.all([
      this.db.query.products.findMany({
        where: baseWhere,
        limit: query.perPage,
        offset,
        orderBy: [desc(schema.products.createdAt)],
      }),
      this.db.$count(schema.products, baseWhere),
    ]);

    return {
      items,
      meta: {
        page: query.page,
        per_page: query.perPage,
        total: totalCount,
        total_pages: Math.ceil(totalCount / query.perPage),
      },
    };
  }

  async update(id: string, dto: UpdateProductDto, actorId: string, ip: string, userAgent: string) {
    const existing = await this.db.query.products.findFirst({
      where: and(eq(schema.products.id, id), isNull(schema.products.deletedAt)),
    });

    if (!existing) {
      throw new NotFoundException(`Produk dengan ID ${id} tidak ditemukan`);
    }

    const [updated] = await this.db
      .update(schema.products)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(schema.products.id, id))
      .returning();

    // Rekam jejak audit append-only
    await this.auditService.log({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'products',
      entityId: id,
      oldValues: existing,
      newValues: updated,
      ipAddress: ip,
      userAgent,
    });

    return updated;
  }
}
```

---

## 3. ATOMISITAS TRANSAKSI & CONCURRENCY LOCKING

### Pola Transaksi Checkout POS (Pessimistic Row-Level Lock)
Untuk mencegah *race condition* atau *overselling* saat beberapa kasir checkout secara bersamaan:

```typescript
import { sql } from 'drizzle-orm';

await this.db.transaction(async (tx) => {
  const productIds = items.map((i) => i.productId);

  // 1. Kunci baris produk secara eksklusif menggunakan FOR UPDATE
  const lockedProducts = await tx.execute(
    sql`SELECT id, name, price, stock 
        FROM products 
        WHERE id IN (${sql.join(productIds, sql`, `)}) 
        AND deleted_at IS NULL 
        FOR UPDATE`
  );

  // 2. Validasi stok untuk setiap item
  for (const item of items) {
    const product = lockedProducts.rows.find((p: any) => p.id === item.productId);
    if (!product) {
      throw new NotFoundException(`Produk ${item.productId} tidak ditemukan`);
    }
    if (product.stock < item.quantity) {
      throw new BadRequestException(`Stok ${product.name} tidak mencukupi (sisa: ${product.stock})`);
    }
  }

  // 3. Potong stok dan insert order & order_items
  for (const item of items) {
    await tx.execute(
      sql`UPDATE products SET stock = stock - ${item.quantity}, updated_at = NOW() WHERE id = ${item.productId}`
    );
  }

  // 4. Simpan order header dan snapshot harga di order_items
  // ...
});
```

---

## 4. STANDAR ERROR HANDLING & NESTED VALIDATION ERRORS

`AllExceptionsFilter` menangani seluruh exception dan menghasilkan format error terstandarisasi:
- Kode status HTTP konsisten (400, 401, 403, 404, 409, 500).
- Respon error validasi form nested:
  ```json
  {
    "success": false,
    "message": "Validasi gagal",
    "errors": {
      "items.1.quantity": ["Kuantitas melebihi sisa stok yang tersedia (stok: 2)"]
    }
  }
  ```
