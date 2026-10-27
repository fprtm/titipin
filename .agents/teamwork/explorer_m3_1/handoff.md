# Technical Blueprint: Milestone 3 (Slices 5 & 6 — POS Engine & Hold Cart Isolation)

## 1. Observation

Direct investigation of the codebase revealed the following concrete observations:

### 1.1 Database Schema State
- File: `apps/backend/src/database/schema/orders.schema.ts` (lines 1–98):
  - Table `orders` (lines 19–38): `id` (bigint identity, mode: number), `orderNumber` (`varchar(30)`, unique), `customerId` (`uuid`, nullable for walk-in per `BR-013`), `createdBy` (`uuid`, FK to `users.id`), `orderDate` (`timestamptz`), `totalAmount` (`numeric(14,2)`).
  - Table `order_items` (lines 41–62): `id` (bigint identity, mode: number), `orderId` (`bigint`, FK `orders.id` ON DELETE CASCADE), `productId` (`bigint`, FK `products.id`), `quantity` (`integer`), `unitPrice` (`numeric(12,2)` historical snapshot per `BR-002`), `subtotal` (`numeric(14,2)`).
  - Table `draft_orders` (lines 65–79): `id` (bigint identity, mode: number), `userId` (`uuid`, FK `users.id` with `.unique()`, enforcing 1 draft active per cashier per `BR-012` and ADR-005), `customerId` (`uuid`, nullable, ON DELETE SET NULL), `items` (`jsonb` typed as `Array<{ product_id: number; quantity: number }>`).
  - Table `order_activity_logs` (lines 81–97): `id` (bigint identity, mode: number), `orderId` (`bigint`, FK `orders.id` ON DELETE CASCADE), `action` (`varchar(50)`), `performedBy` (`uuid`, FK `users.id`), `details` (`jsonb`, nullable).
- File: `apps/backend/src/database/schema/index.ts` (lines 18–89):
  - Drizzle relational mapping already defined: `usersRelations`, `customersRelations`, `productsRelations`, `ordersRelations`, `orderItemsRelations`, `draftOrdersRelations`, and `orderActivityLogsRelations`.
- CLI Command: `pnpm --filter @titipin/backend db:push`:
  - Returned: `[✓] Pulling schema from database... [i] No changes detected`. All four tables are already created and active in PostgreSQL 16+.

### 1.2 Existing Module & Dependency State
- File: `apps/backend/src/app.module.ts` (lines 1–22):
  - Imports: `DatabaseModule`, `AuditModule`, `HealthModule`, `AuthModule`, `UsersModule`, `ProductsModule`, `CustomersModule`.
  - `OrdersModule` is **NOT yet mounted**, causing probe in `orders.e2e-spec.ts` to return `Cannot GET /api/orders`.
- File: `apps/backend/src/modules/products/use-cases/lock-and-deduct-stock.use-case.ts` (lines 18–74):
  - Exported and ready for injection. Takes `tx: DrizzleClient` and `items: DeductStockItemInput[]`.
  - Performs pessimistic locking via `ProductsRepository.lockProductsForUpdate`.
  - Checks if `!product || product.deletedAt !== null` -> throws `UnprocessableEntityException('Produk dengan ID ... tidak ditemukan atau sudah tidak aktif')`.
  - Checks if `product.stock < item.quantity` -> throws `UnprocessableEntityException('Stok produk ... tidak mencukupi (tersedia: ..., diminta: ...)')`.
  - Decrements physical stock atomically: `await this.productsRepository.deductStock(item.productId, item.quantity, tx)`.
  - Returns locked snapshot `LockedProductResult[]` (`id`, `productName`, `unitPrice: Number(product.price)`, `quantity`).
- File: `apps/backend/src/modules/products/repositories/products.repository.ts` (lines 163–178):
  - Method `lockProductsForUpdate(ids: number[], tx: DrizzleClient)`:
    ```typescript
    const sortedIds = Array.from(new Set(ids)).sort((a, b) => a - b);
    const lockedProducts = await tx
      .select()
      .from(schema.products)
      .where(and(inArray(schema.products.id, sortedIds), isNull(schema.products.deletedAt)))
      .for('update');
    ```
- File: `apps/backend/src/modules/customers/repositories/customers.repository.ts` (lines 77–96):
  - `findById(id: string, includeDeleted = false, tx?: DrizzleClient)` queries customer by UUID.
- File: `apps/backend/src/modules/audit/audit.service.ts` (lines 14–16):
  - Method `log(entry: CreateAuditLogDto)` handles central audit logging.
- File: `packages/shared/src/schemas/order.schema.ts` (lines 1–41):
  - Defines `createOrderItemSchema`, `createOrderSchema`, `checkoutOrderSchema`, `holdOrderSchema`, `orderQuerySchema`.
- File: `packages/shared/src/types/order.types.ts` (lines 1–122):
  - Defines `OrderDetailData`, `OrderItemDetail`, `DraftOrderData`, `CreateOrderInput`, `CheckoutOrderInput`, `HoldOrderInput`.
- File: `packages/shared/src/enums/order-activity-action.enum.ts` (lines 1–6):
  - `OrderActivityAction`: `ORDER_CREATED`, `ORDER_HELD`, `ORDER_RESUMED`, `ORDER_FINALIZED`.

### 1.3 Test Suite Expectations (`apps/backend/test/orders.e2e-spec.ts`)
- `TEST-06`: Unauthenticated `GET /api/orders` rejected with HTTP 401.
- `TEST-01`: `POST /api/orders` with member `customer_id` creates order atomically:
  - Stock decremented by quantity.
  - Invoice matches `/^INV-\d{8}-\d{4}$/`.
  - Total amount strictly server-calculated ($3 \times 15000 = 45000$).
- `TEST-02`: `POST /api/orders/checkout` with `customer_id = null` produces "Pelanggan Umum" label.
- `TEST-03`: Requesting quantity greater than available stock returns HTTP 422, with complete transaction rollback and untouched stock.
- `TEST-03`: Multi-item cart with one invalid item rolls back all items' stock.
- `TEST-04`: Cart hold workflow:
  - `POST /api/orders/hold` persists to `draft_orders` without reserving physical stock.
  - `GET /api/orders/held` retrieves held draft.
  - `POST /api/orders/held/finalize` locks stock, creates `orders` record, deletes draft from `draft_orders`.
  - Subsequent `GET /api/orders/held` returns HTTP 404.
- `BR-012`: Attempting a 2nd hold while an active draft exists returns HTTP 422 with message containing `sudah memiliki satu transaksi yang sedang di-hold`.
  - `DELETE /api/orders/held` discards draft with HTTP 200.
- `TEST-05`: Invalid inputs (negative quantity, 0 quantity, empty array, non-existent product ID) rejected with HTTP 422.
- `BR-006`: Member birthday discount: 5% discount (capped at Rp 50.000) when member birth date matches order date (`MM-DD`). Subtotal $60.000 \to 5\% = 3.000 \to$ Total $57.000$.
- History & Detail:
  - `GET /api/orders?page=1&per_page=10` returns paginated list with `meta`.
  - `GET /api/orders/:id` returns order details with snapshot items and activity logs.

---

## 2. Logic Chain

From the direct observations above, the implementation architecture is derived through the following logic chain:

1. **Schema & Persistence Isolation (ADR-005, BR-016)**:
   - Observation 1.1 shows `draft_orders` and `orders` are two distinct PostgreSQL tables.
   - Deduction: Completed sales strictly touch `orders` and `order_items`. Draft carts strictly touch `draft_orders`. Financial aggregations and sales history queries in `OrdersRepository.findAll` only target `orders`, guaranteeing zero pollution from abandoned drafts.

2. **Deadlock Prevention in Concurrency Locking**:
   - Observation 1.2 shows `ProductsRepository.lockProductsForUpdate` sorts IDs in JavaScript: `Array.from(new Set(ids)).sort((a, b) => a - b)`.
   - Deduction: In PostgreSQL, `SELECT ... FOR UPDATE` locks rows as they are returned. To guarantee PostgreSQL visits rows in deterministic ascending ID order regardless of query plan, the query in `ProductsRepository.lockProductsForUpdate` should include `.orderBy(asc(schema.products.id))`. This prevents deadlocks when two cashiers simultaneously checkout carts containing the same items in opposite sequences.

3. **Atomic Stock Rollback on Insufficient Stock (`TEST-03`)**:
   - Observation 1.2 shows `LockAndDeductStockUseCase` throws `UnprocessableEntityException` if `product.stock < item.quantity` or product is deleted.
   - Deduction: By executing checkout inside NestJS `this.db.transaction(async (tx) => { ... })`, any thrown exception immediately triggers a PostgreSQL `ROLLBACK`. No stock is deducted and no order record is committed, satisfying `TEST-03`.

4. **Member Birthday Discount Calculation (`BR-006`)**:
   - Observation 1.2 & 1.3 show customer birth date is stored as string `YYYY-MM-DD` and compared to transaction date `MM-DD`.
   - Deduction:
     - If `customer_id` is supplied, query customer via `CustomersRepository.findById(customerId, false, tx)`.
     - If customer does not exist or `deletedAt !== null`, throw `UnprocessableEntityException('Pelanggan tidak ditemukan atau sudah dinonaktifkan')`.
     - Extract `MM-DD` from `birthDate` and current transaction date (local server date).
     - If `birthMMDD === orderMMDD`, calculate `discountAmount = Math.min(50000, Math.round(subtotal * 0.05))`.
     - `totalAmount = Math.max(0, subtotal - discountAmount)`.

5. **Walk-in Handling (`BR-013`, `TEST-02`)**:
   - Observation 1.3 shows `customer_id = null` must produce `customer_name: 'Pelanggan Umum'`.
   - Deduction: In response mapper, when `customerId === null`, set both `customerName: 'Pelanggan Umum'` and `customer_name: 'Pelanggan Umum'`.

6. **Draft Hold & Resume Lifecycle (ADR-005, `TEST-04`, `BR-012`)**:
   - Observation 1.1 shows `draft_orders.user_id` has a unique constraint.
   - Deduction:
     - `HoldDraftOrderUseCase`: First checks `ordersRepository.findDraftByUserId(userId)`. If exists, throws `UnprocessableEntityException('Kasir sudah memiliki satu transaksi yang sedang di-hold. Selesaikan atau batalkan draft sebelumnya terlebih dahulu.')`.
     - `ResumeDraftOrderUseCase`: Retrieves draft for `userId`. If not found, throws `NotFoundException`. Executes atomic checkout, then executes `ordersRepository.deleteDraftByUserId(userId, tx)`.
     - `DiscardDraftOrderUseCase`: Deletes draft via `ordersRepository.deleteDraftByUserId(userId)`.

7. **Clean Architecture Boundary & Architectural Purity (`m1-challenger-stress.e2e-spec.ts`)**:
   - Observation 1.3 shows automated tests verify that zero `*.service.ts` or `*.controller.ts` files import `drizzle-orm`, `DRIZZLE_ORM`, or execute `this.db.select()`.
   - Deduction: All database access MUST be encapsulated in `OrdersRepository`. Use-cases coordinate business logic and transaction boundaries. `OrdersService` acts purely as a delegating facade.

---

## 3. Detailed Component Blueprint

### 3.1 Directory Structure (`apps/backend/src/modules/orders/`)
```
apps/backend/src/modules/orders/
├── dto/
│   ├── create-order.dto.ts
│   ├── hold-order.dto.ts
│   └── order-query.dto.ts
├── repositories/
│   └── orders.repository.ts
├── use-cases/
│   ├── process-checkout.use-case.ts
│   ├── hold-draft-order.use-case.ts
│   ├── get-draft-order.use-case.ts
│   ├── discard-draft-order.use-case.ts
│   ├── resume-draft-order.use-case.ts
│   ├── find-orders.use-case.ts
│   └── get-order-by-id.use-case.ts
├── orders.service.ts
├── orders.controller.ts
└── orders.module.ts
```

---

### 3.2 `OrdersRepository` Specification
File: `apps/backend/src/modules/orders/repositories/orders.repository.ts`

```typescript
import { Injectable, Inject } from '@nestjs/common';
import {
  eq,
  and,
  sql,
  desc,
  asc,
  count,
  SQL,
  gte,
  lte,
} from 'drizzle-orm';
import { DRIZZLE_ORM, DrizzleDatabase, DrizzleClient } from '../../../database/database.module';
import * as schema from '../../../database/schema';
import { OrderQueryInput, OrderDetailData } from '@titipin/shared';

@Injectable()
export class OrdersRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDatabase) {}

  getClient(tx?: DrizzleClient): DrizzleClient {
    return tx ?? this.db;
  }

  // 1. Transaction runner
  async transaction<T>(callback: (tx: DrizzleClient) => Promise<T>): Promise<T> {
    return this.db.transaction(callback);
  }

  // 2. Generate unique order number: INV-YYYYMMDD-XXXX
  async generateOrderNumber(tx?: DrizzleClient, date: Date = new Date()): Promise<string> {
    const yyyy = date.getFullYear().toString();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const datePrefix = `INV-${yyyy}${mm}${dd}-`;

    const latest = await this.getClient(tx)
      .select({ orderNumber: schema.orders.orderNumber })
      .from(schema.orders)
      .where(sql`${schema.orders.orderNumber} LIKE ${datePrefix + '%'}`)
      .orderBy(desc(schema.orders.orderNumber))
      .limit(1);

    let nextSeq = 1;
    if (latest.length > 0 && latest[0].orderNumber) {
      const parts = latest[0].orderNumber.split('-');
      if (parts.length === 3) {
        const lastSeq = parseInt(parts[2], 10);
        if (!isNaN(lastSeq)) {
          nextSeq = lastSeq + 1;
        }
      }
    }

    return `${datePrefix}${String(nextSeq).padStart(4, '0')}`;
  }

  // 3. Create completed order
  async createOrder(
    data: {
      orderNumber: string;
      customerId: string | null;
      createdBy: string;
      totalAmount: string;
      orderDate?: Date;
    },
    tx?: DrizzleClient,
  ): Promise<typeof schema.orders.$inferSelect> {
    const [newOrder] = await this.getClient(tx)
      .insert(schema.orders)
      .values({
        orderNumber: data.orderNumber,
        customerId: data.customerId,
        createdBy: data.createdBy,
        totalAmount: data.totalAmount,
        orderDate: data.orderDate ?? new Date(),
      })
      .returning();

    return newOrder;
  }

  // 4. Create line items with price snapshot
  async createOrderItems(
    items: Array<{
      orderId: number;
      productId: number;
      quantity: number;
      unitPrice: string;
      subtotal: string;
    }>,
    tx?: DrizzleClient,
  ): Promise<void> {
    if (items.length === 0) return;
    await this.getClient(tx).insert(schema.orderItems).values(items);
  }

  // 5. Create order activity log
  async createActivityLog(
    data: {
      orderId: number;
      action: string;
      performedBy: string;
      details?: Record<string, unknown> | null;
    },
    tx?: DrizzleClient,
  ): Promise<void> {
    await this.getClient(tx).insert(schema.orderActivityLogs).values({
      orderId: data.orderId,
      action: data.action,
      performedBy: data.performedBy,
      details: data.details ?? null,
    });
  }

  // 6. Draft cart persistence
  async findDraftByUserId(
    userId: string,
    tx?: DrizzleClient,
  ): Promise<typeof schema.draftOrders.$inferSelect | null> {
    const [draft] = await this.getClient(tx)
      .select()
      .from(schema.draftOrders)
      .where(eq(schema.draftOrders.userId, userId))
      .limit(1);

    return draft ?? null;
  }

  async saveDraftOrder(
    data: {
      userId: string;
      customerId: string | null;
      items: Array<{ product_id: number; quantity: number }>;
    },
    tx?: DrizzleClient,
  ): Promise<typeof schema.draftOrders.$inferSelect> {
    const [draft] = await this.getClient(tx)
      .insert(schema.draftOrders)
      .values({
        userId: data.userId,
        customerId: data.customerId,
        items: data.items,
      })
      .returning();

    return draft;
  }

  async deleteDraftByUserId(userId: string, tx?: DrizzleClient): Promise<void> {
    await this.getClient(tx)
      .delete(schema.draftOrders)
      .where(eq(schema.draftOrders.userId, userId));
  }

  // 7. Orders Listing with filters
  async findAll(
    query: OrderQueryInput,
    tx?: DrizzleClient,
  ): Promise<{ items: OrderDetailData[]; total: number }> {
    const page = Math.max(1, query.page || 1);
    const perPage = Math.max(1, Math.min(100, query.per_page || 10));
    const offset = (page - 1) * perPage;

    const conditions: SQL[] = [];

    if (query.customer_id) {
      conditions.push(eq(schema.orders.customerId, query.customer_id));
    }
    if (query.from) {
      conditions.push(gte(schema.orders.orderDate, new Date(query.from)));
    }
    if (query.to) {
      const toDate = new Date(query.to);
      toDate.setHours(23, 59, 59, 999);
      conditions.push(lte(schema.orders.orderDate, toDate));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await this.getClient(tx)
      .select({ count: count() })
      .from(schema.orders)
      .where(whereClause);
    const total = countResult?.count ? Number(countResult.count) : 0;

    const rows = await this.getClient(tx)
      .select({
        id: schema.orders.id,
        orderNumber: schema.orders.orderNumber,
        customerId: schema.orders.customerId,
        customerName: schema.customers.customerName,
        createdBy: schema.orders.createdBy,
        createdByName: schema.users.name,
        orderDate: schema.orders.orderDate,
        totalAmount: schema.orders.totalAmount,
        createdAt: schema.orders.createdAt,
        updatedAt: schema.orders.updatedAt,
      })
      .from(schema.orders)
      .leftJoin(schema.customers, eq(schema.orders.customerId, schema.customers.id))
      .leftJoin(schema.users, eq(schema.orders.createdBy, schema.users.id))
      .where(whereClause)
      .orderBy(desc(schema.orders.orderDate))
      .limit(perPage)
      .offset(offset);

    // Format results with snake_case aliases and Pelanggan Umum label
    const items: OrderDetailData[] = rows.map((row) => ({
      id: row.id,
      orderNumber: row.orderNumber,
      order_number: row.orderNumber,
      customerId: row.customerId,
      customer_id: row.customerId,
      customerName: row.customerId ? row.customerName : 'Pelanggan Umum',
      customer_name: row.customerId ? row.customerName : 'Pelanggan Umum',
      createdBy: row.createdBy,
      created_by: row.createdBy,
      createdByName: row.createdByName,
      created_by_name: row.createdByName,
      cashierName: row.createdByName,
      orderDate: row.orderDate.toISOString(),
      order_date: row.orderDate.toISOString(),
      totalAmount: Number(row.totalAmount),
      total_amount: Number(row.totalAmount),
      items: [],
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));

    return { items, total };
  }

  // 8. Order Detail with snapshots & timeline
  async findById(id: number, tx?: DrizzleClient): Promise<OrderDetailData | null> {
    const [orderRow] = await this.getClient(tx)
      .select({
        id: schema.orders.id,
        orderNumber: schema.orders.orderNumber,
        customerId: schema.orders.customerId,
        customerName: schema.customers.customerName,
        createdBy: schema.orders.createdBy,
        createdByName: schema.users.name,
        orderDate: schema.orders.orderDate,
        totalAmount: schema.orders.totalAmount,
        createdAt: schema.orders.createdAt,
        updatedAt: schema.orders.updatedAt,
      })
      .from(schema.orders)
      .leftJoin(schema.customers, eq(schema.orders.customerId, schema.customers.id))
      .leftJoin(schema.users, eq(schema.orders.createdBy, schema.users.id))
      .where(eq(schema.orders.id, id))
      .limit(1);

    if (!orderRow) return null;

    // Fetch line items
    const itemRows = await this.getClient(tx)
      .select({
        id: schema.orderItems.id,
        productId: schema.orderItems.productId,
        quantity: schema.orderItems.quantity,
        unitPrice: schema.orderItems.unitPrice,
        subtotal: schema.orderItems.subtotal,
        productName: schema.products.productName,
        productCode: schema.products.productCode,
      })
      .from(schema.orderItems)
      .leftJoin(schema.products, eq(schema.orderItems.productId, schema.products.id))
      .where(eq(schema.orderItems.orderId, id));

    // Fetch activity logs
    const activityRows = await this.getClient(tx)
      .select({
        id: schema.orderActivityLogs.id,
        orderId: schema.orderActivityLogs.orderId,
        action: schema.orderActivityLogs.action,
        performedBy: schema.orderActivityLogs.performedBy,
        performedByName: schema.users.name,
        details: schema.orderActivityLogs.details,
        createdAt: schema.orderActivityLogs.createdAt,
      })
      .from(schema.orderActivityLogs)
      .leftJoin(schema.users, eq(schema.orderActivityLogs.performedBy, schema.users.id))
      .where(eq(schema.orderActivityLogs.orderId, id))
      .orderBy(asc(schema.orderActivityLogs.createdAt));

    return {
      id: orderRow.id,
      orderNumber: orderRow.orderNumber,
      order_number: orderRow.orderNumber,
      customerId: orderRow.customerId,
      customer_id: orderRow.customerId,
      customerName: orderRow.customerId ? orderRow.customerName : 'Pelanggan Umum',
      customer_name: orderRow.customerId ? orderRow.customerName : 'Pelanggan Umum',
      createdBy: orderRow.createdBy,
      created_by: orderRow.createdBy,
      createdByName: orderRow.createdByName,
      created_by_name: orderRow.createdByName,
      cashierName: orderRow.createdByName,
      orderDate: orderRow.orderDate.toISOString(),
      order_date: orderRow.orderDate.toISOString(),
      totalAmount: Number(orderRow.totalAmount),
      total_amount: Number(orderRow.totalAmount),
      items: itemRows.map((it) => ({
        id: it.id,
        productId: it.productId,
        product_id: it.productId,
        productName: it.productName ?? undefined,
        product_name: it.productName ?? undefined,
        productCode: it.productCode ?? undefined,
        product_code: it.productCode ?? undefined,
        quantity: it.quantity,
        unitPrice: Number(it.unitPrice),
        unit_price: Number(it.unitPrice),
        subtotal: Number(it.subtotal),
      })),
      activityLogs: activityRows.map((act) => ({
        id: act.id,
        orderId: act.orderId,
        order_id: act.orderId,
        action: act.action,
        performedBy: act.performedBy,
        performed_by: act.performedBy,
        performedByName: act.performedByName ?? undefined,
        performed_by_name: act.performedByName ?? undefined,
        details: act.details as Record<string, unknown> | null,
        createdAt: act.createdAt.toISOString(),
        created_at: act.createdAt.toISOString(),
      })),
      activity_logs: activityRows.map((act) => ({
        id: act.id,
        orderId: act.orderId,
        order_id: act.orderId,
        action: act.action,
        performedBy: act.performedBy,
        performed_by: act.performedBy,
        performedByName: act.performedByName ?? undefined,
        performed_by_name: act.performedByName ?? undefined,
        details: act.details as Record<string, unknown> | null,
        createdAt: act.createdAt.toISOString(),
        created_at: act.createdAt.toISOString(),
      })),
      createdAt: orderRow.createdAt.toISOString(),
      updatedAt: orderRow.updatedAt.toISOString(),
    };
  }
}
```

---

### 3.3 Single-Responsibility Use-Cases

#### A. `ProcessCheckoutUseCase` (`use-cases/process-checkout.use-case.ts`)
Responsibilities:
1. Normalizes `items` input payload (`product_id` / `productId`).
2. Validates Customer (if `customer_id` is supplied):
   - Invokes `CustomersRepository.findById(customerId)`.
   - If not found or soft-deleted, throws `UnprocessableEntityException('Pelanggan tidak ditemukan atau sudah dinonaktifkan')`.
   - Checks `BR-006` birthday match (`MM-DD` of `customer.birthDate` vs transaction date `MM-DD`).
3. Executes within `OrdersRepository.transaction(async (tx) => { ... })`:
   - Invokes `ProductsService.lockAndDeductStock(tx, items)`. On stock deficiency or soft-deleted item, throws HTTP 422 with total rollback.
   - Calculates `subtotal = sum(unitPrice * quantity)`.
   - If birthday matches: `discount = Math.min(50000, Math.round(subtotal * 0.05))`; `totalAmount = subtotal - discount`. Else `totalAmount = subtotal`.
   - Generates `orderNumber = await OrdersRepository.generateOrderNumber(tx)`.
   - Inserts order into `orders`.
   - Inserts line items into `order_items` with historical `unitPrice` snapshot.
   - Inserts `ORDER_CREATED` event into `order_activity_logs`.
   - Calls `AuditService.log({ action: 'ORDER_CREATED', ... })`.
4. Returns complete `OrderDetailData`.

#### B. `HoldDraftOrderUseCase` (`use-cases/hold-draft-order.use-case.ts`)
Responsibilities:
1. Verifies cashier does not already have an active held transaction:
   - Calls `OrdersRepository.findDraftByUserId(cashierId)`.
   - If draft exists: throws `UnprocessableEntityException('Kasir sudah memiliki satu transaksi yang sedang di-hold. Selesaikan atau batalkan draft sebelumnya terlebih dahulu.')`.
2. Validates items array is non-empty with quantities $\ge 1$.
3. If `customer_id` supplied, checks customer exists and is active.
4. Persists to `draft_orders` via `OrdersRepository.saveDraftOrder`. Does NOT touch inventory stock.
5. Emits audit log `ORDER_HELD`.
6. Returns `{ success: true, message: 'Transaksi berhasil di-hold', data: draft }`.

#### C. `GetDraftOrderUseCase` (`use-cases/get-draft-order.use-case.ts`)
Responsibilities:
1. Calls `OrdersRepository.findDraftByUserId(cashierId)`.
2. If null, throws `NotFoundException('Tidak ada transaksi tertahan untuk kasir ini')`.
3. Optionally enriches item records with product names/prices from `ProductsRepository` for POS UI convenience.
4. Returns formatted `DraftOrderData`.

#### D. `DiscardDraftOrderUseCase` (`use-cases/discard-draft-order.use-case.ts`)
Responsibilities:
1. Calls `OrdersRepository.findDraftByUserId(cashierId)`.
2. If draft exists, calls `OrdersRepository.deleteDraftByUserId(cashierId)`.
3. Emits audit log `DRAFT_DISCARDED`.
4. Returns `{ success: true, message: 'Draft transaksi berhasil dibatalkan' }`.

#### E. `ResumeDraftOrderUseCase` (`use-cases/resume-draft-order.use-case.ts`)
Responsibilities:
1. Finds draft for `cashierId`. If null, throws `NotFoundException`.
2. Resolves cart items: if caller provided updated items in body, use updated items; otherwise use `draft.items`.
3. Runs atomic checkout inside `OrdersRepository.transaction`:
   - Stock lock & deduct via `ProductsService.lockAndDeductStock`.
   - Birthday discount check for `draft.customerId`.
   - Creates `orders` and `order_items` records.
   - Inserts `ORDER_FINALIZED` event into `order_activity_logs`.
   - Deletes draft from `draft_orders`.
   - Emits audit log `ORDER_FINALIZED`.
4. Returns created `OrderDetailData`.

#### F. `FindOrdersUseCase` (`use-cases/find-orders.use-case.ts`) & `GetOrderByIdUseCase` (`use-cases/get-order-by-id.use-case.ts`)
- Standard query use-cases delegating to `OrdersRepository.findAll` and `OrdersRepository.findById`.

---

### 3.4 `OrdersService` Facade Specification
File: `apps/backend/src/modules/orders/orders.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import {
  CreateOrderInput,
  CheckoutOrderInput,
  HoldOrderInput,
  OrderQueryInput,
  OrderDetailData,
  DraftOrderData,
} from '@titipin/shared';
import { ProcessCheckoutUseCase } from './use-cases/process-checkout.use-case';
import { HoldDraftOrderUseCase } from './use-cases/hold-draft-order.use-case';
import { GetDraftOrderUseCase } from './use-cases/get-draft-order.use-case';
import { DiscardDraftOrderUseCase } from './use-cases/discard-draft-order.use-case';
import { ResumeDraftOrderUseCase } from './use-cases/resume-draft-order.use-case';
import { FindOrdersUseCase } from './use-cases/find-orders.use-case';
import { GetOrderByIdUseCase } from './use-cases/get-order-by-id.use-case';

@Injectable()
export class OrdersService {
  constructor(
    private readonly processCheckoutUseCase: ProcessCheckoutUseCase,
    private readonly holdDraftOrderUseCase: HoldDraftOrderUseCase,
    private readonly getDraftOrderUseCase: GetDraftOrderUseCase,
    private readonly discardDraftOrderUseCase: DiscardDraftOrderUseCase,
    private readonly resumeDraftOrderUseCase: ResumeDraftOrderUseCase,
    private readonly findOrdersUseCase: FindOrdersUseCase,
    private readonly getOrderByIdUseCase: GetOrderByIdUseCase,
  ) {}

  async checkout(
    dto: CreateOrderInput | CheckoutOrderInput,
    cashierId: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<OrderDetailData> {
    return this.processCheckoutUseCase.execute(dto, cashierId, metadata);
  }

  async hold(dto: HoldOrderInput, cashierId: string): Promise<DraftOrderData> {
    return this.holdDraftOrderUseCase.execute(dto, cashierId);
  }

  async getDraft(cashierId: string): Promise<DraftOrderData> {
    return this.getDraftOrderUseCase.execute(cashierId);
  }

  async discardDraft(cashierId: string): Promise<{ success: boolean; message: string }> {
    return this.discardDraftOrderUseCase.execute(cashierId);
  }

  async finalizeDraft(
    cashierId: string,
    dto?: CreateOrderInput,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<OrderDetailData> {
    return this.resumeDraftOrderUseCase.execute(cashierId, dto, metadata);
  }

  async findAll(query: OrderQueryInput) {
    return this.findOrdersUseCase.execute(query);
  }

  async findById(id: number): Promise<OrderDetailData> {
    return this.getOrderByIdUseCase.execute(id);
  }
}
```

---

### 3.5 `OrdersController` Specification
File: `apps/backend/src/modules/orders/orders.controller.ts`

```typescript
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  createOrderSchema,
  CreateOrderInput,
  checkoutOrderSchema,
  CheckoutOrderInput,
  holdOrderSchema,
  HoldOrderInput,
  orderQuerySchema,
  OrderQueryInput,
} from '@titipin/shared';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  async findAll(@Query(new ZodValidationPipe(orderQuerySchema)) query: OrderQueryInput) {
    return this.ordersService.findAll(query);
  }

  // POST /api/orders (Primary POS Checkout)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(createOrderSchema)) dto: CreateOrderInput,
    @CurrentUser('id') cashierId: string,
    @Req() req: Request,
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
    const userAgent = req.headers['user-agent'];
    return this.ordersService.checkout(dto, cashierId, { ipAddress, userAgent });
  }

  // POST /api/orders/checkout (Alias)
  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  async checkout(
    @Body(new ZodValidationPipe(checkoutOrderSchema)) dto: CheckoutOrderInput,
    @CurrentUser('id') cashierId: string,
    @Req() req: Request,
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
    const userAgent = req.headers['user-agent'];
    return this.ordersService.checkout(dto, cashierId, { ipAddress, userAgent });
  }

  // POST /api/orders/hold
  @Post('hold')
  @HttpCode(HttpStatus.CREATED)
  async hold(
    @Body(new ZodValidationPipe(holdOrderSchema)) dto: HoldOrderInput,
    @CurrentUser('id') cashierId: string,
  ) {
    return this.ordersService.hold(dto, cashierId);
  }

  // GET /api/orders/held & GET /api/orders/draft
  @Get('held')
  async getHeld(@CurrentUser('id') cashierId: string) {
    return this.ordersService.getDraft(cashierId);
  }

  @Get('draft')
  async getDraft(@CurrentUser('id') cashierId: string) {
    return this.ordersService.getDraft(cashierId);
  }

  // DELETE /api/orders/held & DELETE /api/orders/draft
  @Delete('held')
  async discardHeld(@CurrentUser('id') cashierId: string) {
    return this.ordersService.discardDraft(cashierId);
  }

  @Delete('draft')
  async discardDraft(@CurrentUser('id') cashierId: string) {
    return this.ordersService.discardDraft(cashierId);
  }

  // POST /api/orders/held/finalize
  @Post('held/finalize')
  @HttpCode(HttpStatus.CREATED)
  async finalizeHeld(
    @Body() dto: CreateOrderInput | undefined,
    @CurrentUser('id') cashierId: string,
    @Req() req: Request,
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
    const userAgent = req.headers['user-agent'];
    return this.ordersService.finalizeDraft(cashierId, dto, { ipAddress, userAgent });
  }

  // GET /api/orders/:id (MUST be after static sub-paths)
  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.findById(id);
  }
}
```

---

### 3.6 `OrdersModule` Mounting Specification
File: `apps/backend/src/modules/orders/orders.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrdersRepository } from './repositories/orders.repository';
import { ProcessCheckoutUseCase } from './use-cases/process-checkout.use-case';
import { HoldDraftOrderUseCase } from './use-cases/hold-draft-order.use-case';
import { GetDraftOrderUseCase } from './use-cases/get-draft-order.use-case';
import { DiscardDraftOrderUseCase } from './use-cases/discard-draft-order.use-case';
import { ResumeDraftOrderUseCase } from './use-cases/resume-draft-order.use-case';
import { FindOrdersUseCase } from './use-cases/find-orders.use-case';
import { GetOrderByIdUseCase } from './use-cases/get-order-by-id.use-case';
import { DatabaseModule } from '../../database/database.module';
import { ProductsModule } from '../products/products.module';
import { CustomersModule } from '../customers/customers.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    DatabaseModule,
    ProductsModule,
    CustomersModule,
    AuditModule,
    AuthModule,
  ],
  controllers: [OrdersController],
  providers: [
    OrdersRepository,
    ProcessCheckoutUseCase,
    HoldDraftOrderUseCase,
    GetDraftOrderUseCase,
    DiscardDraftOrderUseCase,
    ResumeDraftOrderUseCase,
    FindOrdersUseCase,
    GetOrderByIdUseCase,
    OrdersService,
  ],
  exports: [
    OrdersService,
    OrdersRepository,
    ProcessCheckoutUseCase,
    HoldDraftOrderUseCase,
    GetDraftOrderUseCase,
    DiscardDraftOrderUseCase,
    ResumeDraftOrderUseCase,
    FindOrdersUseCase,
    GetOrderByIdUseCase,
  ],
})
export class OrdersModule {}
```

In `apps/backend/src/app.module.ts`:
Add `OrdersModule` to `@Module({ imports: [..., OrdersModule] })`.

---

## 4. Caveats

1. **Deadlock Lock Order**: In `ProductsRepository.lockProductsForUpdate` (`apps/backend/src/modules/products/repositories/products.repository.ts`), adding `.orderBy(asc(schema.products.id))` ensures database-level ordering in the SQL statement. Currently, IDs are sorted ascending in JavaScript before being passed to `inArray(products.id, sortedIds)`. Adding `.orderBy(asc(schema.products.id))` to the query builder guarantees the RDBMS evaluation sequence.
2. **Flexible Key Mapping (camelCase vs snake_case)**: While `@titipin/shared` Zod schema defines `product_id` and `customer_id`, the DTO normalizer in `ProcessCheckoutUseCase` should accept either `product_id || productId` and `customer_id || customerId` to ensure effortless interoperability between Next.js React client and raw JSON API calls.
3. **Route Declaration Order**: In `OrdersController`, the parameterized route `@Get(':id')` MUST be declared AFTER `@Get('held')` and `@Get('draft')`, otherwise Express router will treat `'held'` as an `id` string and trigger a `400 Bad Request` in `ParseIntPipe`.
4. **Finalize Body Optionality**: In `POST /api/orders/held/finalize`, the request body is optional. If the client sends an empty body (`{}` or none), the use-case must fall back to the items stored in `draft_orders`.

---

## 5. Conclusion

Milestone 3's backend foundation is structurally prepared:
- The Drizzle database schema (`orders`, `order_items`, `draft_orders`, `order_activity_logs`) is already verified in PostgreSQL.
- `ProductsService.lockAndDeductStock` is already in place with atomic rollback and `FOR UPDATE` locking.
- Implementing `OrdersRepository`, the 7 single-responsibility use-cases, `OrdersService` facade, `OrdersController`, and registering `OrdersModule` into `AppModule` will immediately activate and satisfy all 11 tests in `apps/backend/test/orders.e2e-spec.ts`.

---

## 6. Verification Method

To independently verify the implementation:

1. **Orders E2E Test Suite**:
   ```bash
   pnpm --filter @titipin/backend test test/orders.e2e-spec.ts
   ```
   *Expected*: All 11 tests pass with 0 skipped and 0 failures:
   - TEST-06 (401 unauthenticated)
   - TEST-01 (Atomic member checkout, invoice generation, stock decrement)
   - TEST-02 (Walk-in order with "Pelanggan Umum" label)
   - TEST-03 (Single and multi-item insufficient stock rollback)
   - TEST-04 (Hold draft without stock deduction, resume & finalize)
   - BR-012 (Max 1 held draft per cashier, discard draft)
   - TEST-05 (422 input validation rejection)
   - BR-006 (5% Member Birthday Discount)
   - History & Detail endpoints

2. **Architectural Purity & Challenger Suite**:
   ```bash
   pnpm --filter @titipin/backend test test/m1-challenger-stress.e2e-spec.ts
   ```
   *Expected*: Validates that `orders.service.ts` and `orders.controller.ts` have zero direct Drizzle queries or tokens.

3. **Monorepo Quality & Types**:
   ```bash
   pnpm turbo typecheck
   pnpm turbo lint
   ```
   *Expected*: Zero TypeScript errors, zero ESLint errors.
