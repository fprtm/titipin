# Handoff Report: Milestone 3 Test Suites, Concurrency Stress Behavior & ADR-005 Strategy

## 1. Observation

### 1.1 Existing Test Suite Analysis (`apps/backend/test/orders.e2e-spec.ts`)
Inspection of `apps/backend/test/orders.e2e-spec.ts` (513 lines) revealed the current test suite structure:
- **Module Probing & Guard**:
  - Lines 57-62:
    ```typescript
    const probeRes = await request(app.getHttpServer())
      .get('/api/orders')
      .set('Authorization', `Bearer ${cashierAccessToken}`);
    if (probeRes.body?.message !== 'Cannot GET /api/orders') {
      isOrdersModuleMounted = true;
    }
    ```
  - When `isOrdersModuleMounted` is `false`, all 11 test cases skip via `ctx.skip()`.
- **Existing Test Cases in File**:
  1. `Line 141`: `TEST-06: should reject unauthenticated request to /api/orders with 401`
  2. `Line 150`: `TEST-01: Member checkout order created atomically (stock decremented, invoice issued, total valid)`
     - Uses `POST /api/orders`, expects `INV-\d{8}-\d{4}` format, validates atomic stock deduction.
  3. `Line 189`: `TEST-02: Walk-in checkout order created (customer_id = null, "Pelanggan Umum" label)`
     - Uses `POST /api/orders/checkout`, sets `customer_name: 'Pelanggan Umum'`.
  4. `Line 217`: `TEST-03: Insufficient stock rollback (atomic transaction rollback, stock unmodified)`
     - Tests single item exceeding stock -> expects `HTTP 422`, verifies DB stock unmodified.
  5. `Line 254`: `TEST-03: Multi-item Insufficient stock rollback preserves all items stock`
     - Tests cart with 1 valid item + 1 invalid item -> expects `HTTP 422`, verifies neither item was deducted.
  6. `Line 289`: `TEST-04: Hold cart persists to draft_orders without locking stock, resume & finalize draft`
     - Tests `POST /api/orders/hold`, asserts physical stock is NOT locked/decremented, tests `GET /api/orders/held`, tests `POST /api/orders/held/finalize`, asserts stock decremented and draft deleted (`GET /api/orders/held` returns 404).
  7. `Line 359`: `BR-012: Rejects holding a 2nd cart when cashier already has an active draft`
     - Tests holding 2nd cart -> expects `HTTP 422` with message containing `'sudah memiliki satu transaksi yang sedang di-hold'`, then tests `DELETE /api/orders/held`.
  8. `Line 393`: `TEST-05: Input validation failure (negative quantity / corrupt payload rejected with 422)`
     - Tests negative quantity, 0 quantity, empty items array, non-existent product ID.
  9. `Line 440`: `BR-006: Applies 5% Member Birthday Discount (capped at Rp 50.000) when birth date matches order date`
     - Sets customer birthday to today (`MM-DD`), verifies 5% discount (capped at Rp 50.000).
  10. `Line 465`: `Orders History: Cashier and Admin can list orders with pagination and date filters`
     - Tests `GET /api/orders?page=1&per_page=10`.
  11. `Line 482`: `Orders Detail: GET /api/orders/:id returns invoice detail with immutable price snapshots`
     - Tests `GET /api/orders/:id`, checks line items `unit_price`.

### 1.2 Critical Gaps Identified in `orders.e2e-spec.ts`
1. **Missing Concurrency Race Condition Test**:
   - `Line 393` currently uses the label `TEST-05` for input validation ("TEST-05: Input validation failure").
   - However, `DISPATCH.md` task 1 and `titipin-dev/references/testing-guide.md` define `TEST-05` / `TEST-06` as:
     `High concurrency stress: simultaneous checkouts competing for the same stock, verifying zero overselling`.
   - `orders.e2e-spec.ts` does NOT contain any simultaneous HTTP checkout test (`Promise.all` or `Promise.allSettled`) competing for a finite stock.
2. **Endpoint Path Mismatch (`/held` vs `/draft`)**:
   - `orders.e2e-spec.ts` calls:
     - `GET /api/orders/held`
     - `POST /api/orders/held/finalize`
     - `DELETE /api/orders/held`
   - However, `DISPATCH.md` task 1, `ORIGINAL_REQUEST.md § R3.2`, and `ADR-005` specify:
     - `GET /api/orders/draft`
     - `DELETE /api/orders/draft`
     - `POST /api/orders/hold`
   - `PROJECT.md` line 34 mentions: `GET /api/orders/held` & `/draft`, `DELETE /api/orders/held` & `/draft`.
3. **Missing Explicit Activity Log Verification in `orders.e2e-spec.ts`**:
   - `BR-012` and `ADR-006` mandate recording `ORDER_CREATED`, `ORDER_HELD`, `ORDER_RESUMED`, `ORDER_FINALIZED` in `order_activity_logs`.
   - `orders.e2e-spec.ts:482` checks `items` in order detail, but does NOT assert that `activityLogs` (or `activity_logs`) contains the expected lifecycle entries.

### 1.3 Database Schema & Migration Verification for `draft_orders`
Direct query against PostgreSQL database `titipin_db` via `pg` client yielded:
```json
Tables in DB: [
  "users", "draft_orders", "customers", "orders",
  "order_activity_logs", "order_items", "products", "audit_logs"
]
draft_orders columns: [
  { "column_name": "id", "data_type": "bigint", "is_nullable": "NO" },
  { "column_name": "user_id", "data_type": "uuid", "is_nullable": "NO" },
  { "column_name": "customer_id", "data_type": "uuid", "is_nullable": "YES" },
  { "column_name": "items", "data_type": "jsonb", "is_nullable": "NO" },
  { "column_name": "created_at", "data_type": "timestamp with time zone", "is_nullable": "NO" },
  { "column_name": "updated_at", "data_type": "timestamp with time zone", "is_nullable": "NO" }
]
draft_orders constraints: [
  { "conname": "draft_orders_pkey", "contype": "p" },
  { "conname": "draft_orders_user_id_unique", "contype": "u" },
  { "conname": "draft_orders_user_id_users_id_fk", "contype": "f" },
  { "conname": "draft_orders_customer_id_customers_id_fk", "contype": "f" }
]
```
- Existing migration `apps/backend/drizzle/0000_rainy_snowbird.sql` (lines 42-50, 97-98, 108) already created `draft_orders`, `orders`, `order_items`, and `order_activity_logs`.
- The database schema strictly adheres to ADR-005 with `CONSTRAINT "draft_orders_user_id_unique" UNIQUE("user_id")`.
- **Zero schema migration is required** for Milestone 3.

### 1.4 Concurrency Locking Observation (`products.repository.ts:163-178`)
In `apps/backend/src/modules/products/repositories/products.repository.ts`:
```typescript
async lockProductsForUpdate(ids: number[], tx: DrizzleClient): Promise<(typeof schema.products.$inferSelect)[]> {
  if (ids.length === 0) return [];
  const sortedIds = Array.from(new Set(ids)).sort((a, b) => a - b);
  const lockedProducts = await tx
    .select()
    .from(schema.products)
    .where(and(inArray(schema.products.id, sortedIds), isNull(schema.products.deletedAt)))
    .for('update');
  return lockedProducts;
}
```
- While `sortedIds` is sorted ascending in JavaScript, the generated SQL is:
  `select ... from "products" where "products"."id" in ($1, $2) for update`
- As observed in `test/m1-challenger-stress.e2e-spec.ts:237`:
  `Does generated SQL contain ORDER BY clause?: false`
- In PostgreSQL, without an explicit `.orderBy(asc(schema.products.id))` in the Drizzle query, row-level locks on heap tuples can be evaluated in heap order rather than deterministic ID order during multi-row lookups.

### 1.5 Git State
- Current branch: `develop`.
- Latest commit: `675ed66 feat(customers): implement slice 4 customers and membership management`.
- Untracked files present: `.agents/teamwork/` and test files (`audit.e2e-spec.ts`, `dashboard.e2e-spec.ts`, `m1-challenger-stress.e2e-spec.ts`, `m2-1-challenger-data-integrity-stress.e2e-spec.ts`, `m2-challenger-stress.e2e-spec.ts`, `orders.e2e-spec.ts`).

---

## 2. Logic Chain

1. **Test Coverage Alignment**:
   - Because `orders.e2e-spec.ts` defines 11 tests covering basic CRUD, hold/resume, discounts, and validation, but lacks HTTP-level concurrency stress, implementing only what is in `orders.e2e-spec.ts` would leave concurrency anti-overselling unverified at the HTTP interface level.
   - Therefore, a dedicated concurrency stress test must be added to verify simultaneous checkouts competing for stock = 1 (or stock = 5), proving zero overselling and exact 422 handling.
2. **Route Compatibility**:
   - Because `orders.e2e-spec.ts` expects `/api/orders/held` while `DISPATCH.md` and `PROJECT.md` specify `/api/orders/draft`, implementing only one set of routes would break either the automated test suite or external API consumers.
   - Therefore, `OrdersController` must provide dual route decorators for both `/held` and `/draft` (e.g. `@Get(['held', 'draft'])`, `@Delete(['held', 'draft'])`, `@Post(['held/finalize', 'draft/finalize'])`), and dual checkout routes (`@Post()` and `@Post('checkout')`).
3. **Database Migration State**:
   - Because `draft_orders` is already created in PostgreSQL with `UNIQUE(user_id)` and foreign keys, attempting to generate a new migration would generate empty/conflicting SQL.
   - Therefore, no migration step (`db:generate` or `db:migrate`) is required for `draft_orders`.
4. **Deadlock Immunity**:
   - Because high concurrency stress tests will trigger concurrent transactions locking multiple products simultaneously, having deterministic lock ordering at the database level prevents deadlock aborts (`40P01: deadlock detected`).
   - Adding `.orderBy(asc(schema.products.id))` to `lockProductsForUpdate` in `products.repository.ts` guarantees deterministic lock acquisition at the database engine level.
5. **Invoice Sequencing**:
   - Because multiple concurrent checkouts can commit in the same second, sequential invoice generation (`INV-YYYYMMDD-XXXX`) must be collision-proof. Using a sequence query or atomic counter ensures uniqueness under high concurrency.
6. **Git Flow Discipline**:
   - Following project standards, Milestone 3 must be developed on `feature/slice-5-6-pos-engine`, audited via lint/typecheck/test, and merged back into `develop` with `--no-ff`.

---

## 3. Caveats

1. **PostgreSQL Connection Pool Sizing**:
   - In `database.module.ts`, `pg.Pool` uses default connection limits (10 connections). High concurrency stress tests firing >10 simultaneous requests may experience pool queueing rather than immediate concurrency if the pool is saturated. Testing with concurrency factor of 2 to 5 concurrent competing transactions is optimal and realistic.
2. **DTO & Serializer Property Casing**:
   - Tests in `orders.e2e-spec.ts` accept both snake_case and camelCase (`order_number || orderNumber`, `total_amount || totalAmount`, `customer_name || customerName`). The controller response must return fields matching `@titipin/shared` contracts (`OrderDetailData`) with aliases to satisfy both frontend and test assertions.
3. **Existing Untracked Test Files**:
   - There are untracked test files from future milestones (`dashboard.e2e-spec.ts`, `audit.e2e-spec.ts`). These currently skip cleanly when their respective modules are unmounted, so they do not fail the Vitest run.

---

## 4. Conclusion & Actionable Blueprint

### 4.1 Backend Architecture Blueprint (`OrdersModule`)

#### A. File Structure:
```
apps/backend/src/modules/orders/
├── repositories/
│   └── orders.repository.ts
├── use-cases/
│   ├── process-checkout.use-case.ts
│   ├── hold-draft-order.use-case.ts
│   ├── get-draft-order.use-case.ts
│   ├── discard-draft-order.use-case.ts
│   ├── finalize-draft-order.use-case.ts
│   ├── find-orders.use-case.ts
│   └── get-order-by-id.use-case.ts
├── orders.controller.ts
├── orders.service.ts
└── orders.module.ts
```

#### B. Repository Design (`OrdersRepository`):
- `createOrder(orderData, itemsData, tx: DrizzleClient)`: Inserts into `orders`, bulk inserts into `order_items`.
- `findOrderById(id: number, tx?: DrizzleClient)`: Joins `orders`, `order_items`, `customers`, and `order_activity_logs`.
- `findOrders(query: OrderQueryInput, tx?: DrizzleClient)`: Paginated query with filters for `from`, `to`, `customer_id`, `search`.
- `getNextOrderSequence(dateStr: string, tx: DrizzleClient)`: Generates sequential `INV-YYYYMMDD-XXXX`.
- `createDraftOrder(userId: string, customerId: string | null, items: any[], tx?: DrizzleClient)`: Inserts into `draft_orders`.
- `findDraftOrderByUserId(userId: string, tx?: DrizzleClient)`: Selects draft by `userId`.
- `deleteDraftOrderByUserId(userId: string, tx?: DrizzleClient)`: Deletes draft by `userId`.
- `recordActivityLog(orderId: number, action: OrderActivityAction, performedBy: string, details?: any, tx?: DrizzleClient)`: Inserts into `order_activity_logs`.

#### C. Use-Case Specifications:
1. **`ProcessCheckoutUseCase`**:
   - Executes inside `db.transaction(async (tx) => { ... })`.
   - If `customer_id` provided: fetch customer via `customersRepository.findById(id)`. If deleted, throw 422. If today matches birth date (`MM-DD`), calculate `BR-006` discount (5% capped at Rp 50.000).
   - If `customer_id` is null/omitted: set `customer_name = 'Pelanggan Umum'` (`BR-013`).
   - Call `productsService.lockAndDeductStock(tx, items)` -> acquires row locks (`FOR UPDATE`), verifies stock and active status, decrements stock. Throws `UnprocessableEntityException` on deficiency.
   - Calculate subtotal, apply discount, calculate `total_amount`.
   - Generate unique `order_number` (`INV-YYYYMMDD-XXXX`).
   - Insert `orders` and `order_items`.
   - Record activity log: `ORDER_CREATED`.
   - Log security audit log non-blockingly via `auditService.log(...)`.
   - Return formatted `OrderDetailData`.
2. **`HoldDraftOrderUseCase`**:
   - Check if draft exists for `userId`. If exists, throw `UnprocessableEntityException('Kasir sudah memiliki satu transaksi yang sedang di-hold')` (`BR-012`).
   - Persist to `draft_orders` table. DO NOT deduct or reserve physical stock (`ADR-005`).
   - Return draft data.
3. **`GetDraftOrderUseCase`**:
   - Retrieve draft by `userId`. If not found, throw `NotFoundException('Tidak ada transaksi yang sedang di-hold')`.
   - Return draft data with items.
4. **`DiscardDraftOrderUseCase`**:
   - Delete draft from `draft_orders` for `userId`.
   - Return `{ success: true, message: 'Draft order berhasil dihapus' }`.
5. **`FinalizeDraftOrderUseCase`**:
   - Executes inside `db.transaction(async (tx) => { ... })`.
   - Fetch draft for `userId`. If none, throw `NotFoundException`.
   - Execute stock locking & deduction, invoice generation, discount calculation, insert `orders` & `order_items`.
   - Delete draft from `draft_orders`.
   - Record activity log: `ORDER_FINALIZED`.
   - Return formatted `OrderDetailData`.
6. **`FindOrdersUseCase`** & **`GetOrderByIdUseCase`**:
   - Handle history queries, pagination, and single invoice detail retrieval.

#### D. Controller Routing Design (`OrdersController`):
```typescript
@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  // Checkout (Dual endpoint support)
  @Post()
  @Post('checkout')
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  async checkout(...) { ... }

  // Hold Draft Order
  @Post('hold')
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  async hold(...) { ... }

  // Get Held Draft (Dual route support)
  @Get('held')
  @Get('draft')
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  async getDraft(...) { ... }

  // Discard Held Draft (Dual route support)
  @Delete('held')
  @Delete('draft')
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  async discardDraft(...) { ... }

  // Finalize Held Draft (Dual route support)
  @Post('held/finalize')
  @Post('draft/finalize')
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  async finalizeDraft(...) { ... }

  // Orders History
  @Get()
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  async findAll(...) { ... }

  // Order Detail
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  async findById(...) { ... }
}
```

### 4.2 Concurrency Stress Test Suite Specification

Add a dedicated concurrency test in `orders.e2e-spec.ts` (and/or `test/m3-challenger-stress.e2e-spec.ts`):
```typescript
it('TEST-05 / CONCURRENCY: Simultaneous checkouts competing for limited stock prevents overselling', async () => {
  // 1. Create a competition product with stock = 1
  const productRes = await request(app.getHttpServer())
    .post('/api/products')
    .set('Authorization', `Bearer ${adminAccessToken}`)
    .send({
      product_code: `RACE_${Date.now()}`,
      product_name: 'Produk Kompetisi Stok Terbatas',
      stock: 1,
      price: 50000.0,
    });
  const raceProductId = productRes.body.data.id;

  // 2. Fire 2 concurrent checkouts competing for the single stock unit
  const checkoutPayload = {
    customer_id: null,
    items: [{ product_id: raceProductId, quantity: 1 }],
  };

  const [res1, res2] = await Promise.all([
    request(app.getHttpServer())
      .post('/api/orders/checkout')
      .set('Authorization', `Bearer ${cashierAccessToken}`)
      .send(checkoutPayload),
    request(app.getHttpServer())
      .post('/api/orders/checkout')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send(checkoutPayload),
  ]);

  const statuses = [res1.status, res2.status].sort();
  expect(statuses).toEqual([201, 422]);

  // 3. Verify final stock is exactly 0 (no negative stock, zero overselling)
  const finalProduct = await request(app.getHttpServer())
    .get(`/api/products/${raceProductId}`)
    .set('Authorization', `Bearer ${adminAccessToken}`);
  expect(finalProduct.body.data.stock).toBe(0);
});
```

### 4.3 Lock Ordering Enhancement Recommendation
In `apps/backend/src/modules/products/repositories/products.repository.ts`, update `lockProductsForUpdate`:
```typescript
  async lockProductsForUpdate(
    ids: number[],
    tx: DrizzleClient,
  ): Promise<(typeof schema.products.$inferSelect)[]> {
    if (ids.length === 0) return [];
    const sortedIds = Array.from(new Set(ids)).sort((a, b) => a - b);

    const lockedProducts = await tx
      .select()
      .from(schema.products)
      .where(and(inArray(schema.products.id, sortedIds), isNull(schema.products.deletedAt)))
      .orderBy(asc(schema.products.id)) // <--- Explicit ORDER BY guarantees database engine level lock ordering
      .for('update');

    return lockedProducts;
  }
```

### 4.4 Git Flow Branching & Pipeline Protocol
1. **Branch Creation**:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/slice-5-6-pos-engine
   ```
2. **Implementation & Unit Verification**:
   - Implement `OrdersRepository`, use-cases, `OrdersService`, `OrdersController`.
   - Wire `OrdersModule` into `app.module.ts`.
   - Build frontend `/pos` page with responsive catalog grid, cart sidebar, quick cash keypad, and hold drawer.
   - Add HTTP concurrency test to `orders.e2e-spec.ts`.
3. **Quality & Test Gates**:
   ```bash
   # Gate 1: Zero inline SVG or emoji check
   ! grep -rn "<svg" apps/frontend/src/
   
   # Gate 2: Static analysis
   pnpm turbo lint
   pnpm turbo typecheck

   # Gate 3: Integration tests
   pnpm --filter @titipin/backend test test/orders.e2e-spec.ts
   pnpm turbo test

   # Gate 4: Quality & Link scripts
   ./scripts/audit-code-quality.sh
   python3 ./scripts/verify-links.py
   ```
4. **Merge & Branch Deletion**:
   ```bash
   git checkout develop
   git merge --no-ff feature/slice-5-6-pos-engine -m "feat(pos): implement slice 5 pos cashier engine and slice 6 hold cart isolation"
   git branch -d feature/slice-5-6-pos-engine
   ```

---

## 5. Verification Method

To independently verify all findings and validate future implementation:

1. **Verify PostgreSQL Schema & Constraints**:
   ```bash
   node -e "
   const { Client } = require('pg');
   const client = new Client({ connectionString: 'postgresql://postgres:postgres@localhost:5432/titipin_db' });
   async function verify() {
     await client.connect();
     const res = await client.query(\"SELECT conname, contype FROM pg_constraint WHERE conrelid = 'draft_orders'::regclass\");
     console.log(res.rows);
     await client.end();
   }
   verify();
   "
   ```
   - **Expected**: Output contains `draft_orders_user_id_unique` with `contype: 'u'`.

2. **Verify Test Suite Activation**:
   ```bash
   pnpm --filter @titipin/backend test test/orders.e2e-spec.ts
   ```
   - **Before Implementation**: All 11 tests skip with `isOrdersModuleMounted = false`.
   - **After Implementation**: All tests pass (`11 passed`, 0 skipped).

3. **Verify Concurrency & Anti-Overselling**:
   Execute the concurrency test with 2+ simultaneous requests competing for stock = 1:
   - **Invalidation Condition**: If both succeed (`201, 201`), stock becomes negative, or if a deadlock error (`40P01`) occurs instead of HTTP 422, the verification has failed.
