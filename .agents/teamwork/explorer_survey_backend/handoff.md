# Backend Technical Survey & Clean Architecture Assessment
**Subagent**: `explorer_survey_backend`  
**Date**: 2026-10-27T17:40:00Z  
**Scope**: `apps/backend/src/`, `packages/shared/`, `apps/backend/drizzle/`, and project documentation  
**Handoff Type**: Hard (Task Complete)

---

## 1. Observation

Direct observations from examining the codebase, Drizzle configurations, tests, and documentation:

### 1.1 Existing Module Inventory (`apps/backend/src/modules/`)
Inspection of `apps/backend/src/modules/` reveals 5 modules:
1. **`auth`** (`apps/backend/src/modules/auth/`):
   - Files: `auth.controller.ts`, `auth.service.ts`, `auth.module.ts`, `dto/login.dto.ts`, `dto/change-password.dto.ts`, `dto/update-profile.dto.ts`.
   - Direct Drizzle queries in `auth.service.ts`:
     - Line 49: `this.db.select().from(schema.users).where(eq(schema.users.email, loginDto.email)).limit(1)`
     - Line 93: `this.db.update(schema.users).set({ refreshTokenHash, updatedAt: new Date() }).where(eq(schema.users.id, user.id))`
     - Line 137: `this.db.select().from(schema.users).where(eq(schema.users.id, payload.sub)).limit(1)`
     - Line 181: `this.db.update(schema.users).set({ refreshTokenHash: newRefreshTokenHash, updatedAt: new Date() }).where(eq(schema.users.id, user.id))`
     - Line 196: `this.db.update(schema.users).set({ refreshTokenHash: null, updatedAt: new Date() }).where(eq(schema.users.id, userId))`
     - Line 217: `this.db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1)`
     - Line 236: `this.db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1)`
     - Line 246: `this.db.update(schema.users).set({ name: dto.name, updatedAt: new Date() }).where(...).returning()`
     - Line 277: `this.db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1)`
     - Line 294: `this.db.update(schema.users).set({ password: newPasswordHash, updatedAt: new Date() }).where(...)`
2. **`users`** (`apps/backend/src/modules/users/`):
   - Files: `users.controller.ts`, `users.service.ts`, `users.module.ts`, `dto/create-user.dto.ts`, `dto/reset-password.dto.ts`.
   - Direct Drizzle queries in `users.service.ts`:
     - Line 40: `this.db.select().from(schema.users).orderBy(desc(schema.users.createdAt))`
     - Line 49: `this.db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1)`
     - Line 67: `this.db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, dto.email.toLowerCase().trim())).limit(1)`
     - Line 80: `this.db.insert(schema.users).values({...}).returning()`
     - Line 120: `this.db.select().from(schema.users).where(eq(schema.users.id, targetId)).limit(1)`
     - Line 137: `this.db.update(schema.users).set({ password: hashedPassword, refreshTokenHash: null, updatedAt: new Date() }).where(eq(schema.users.id, targetId))`
     - Line 181: `this.db.select().from(schema.users).where(eq(schema.users.id, targetId)).limit(1)`
     - Line 191: `this.db.update(schema.users).set({ deletedAt: new Date(), refreshTokenHash: null, updatedAt: new Date() }).where(eq(schema.users.id, targetId))`
3. **`products`** (`apps/backend/src/modules/products/`):
   - Files: `products.controller.ts`, `products.service.ts`, `products.module.ts`, `dto/create-product.dto.ts`, `dto/update-product.dto.ts`.
   - Direct Drizzle queries in `products.service.ts`:
     - Line 81: `this.db.select({ count: count() }).from(schema.products).where(whereClause)`
     - Line 89: `this.db.select().from(schema.products).where(whereClause).orderBy(orderByExpression).limit(perPage).offset(offset)`
     - Line 111: `this.db.select().from(schema.products).where(and(eq(schema.products.id, id), isNull(schema.products.deletedAt))).limit(1)`
     - Line 131: `this.db.select({ id: schema.products.id }).from(schema.products).where(eq(schema.products.productCode, code)).limit(1)`
     - Line 141: `this.db.insert(schema.products).values({...}).returning()`
     - Line 178: `this.db.select().from(schema.products).where(and(eq(schema.products.id, id), isNull(schema.products.deletedAt))).limit(1)`
     - Line 202: `this.db.update(schema.products).set(updateValues).where(eq(schema.products.id, id)).returning()`
     - Line 237: `this.db.select().from(schema.products).where(and(eq(schema.products.id, id), isNull(schema.products.deletedAt))).limit(1)`
     - Line 247: `this.db.update(schema.products).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(schema.products.id, id))`
     - Line 281: `this.db.select().from(schema.products).where(isNull(schema.products.deletedAt)).orderBy(asc(schema.products.productName))` (Excel export)
     - Lines 411-436: Batch import loop: `this.db.select()`, `this.db.update()`, `this.db.insert()`.
   - Missing method: There is currently no `lockAndDeductStock(tx, items)` method for atomic pessimistic locking in `ProductsService`.
4. **`audit`** (`apps/backend/src/modules/audit/`):
   - Files: `audit.module.ts`, `audit.service.ts`, `audit.service.spec.ts`, `dto/create-audit-log.dto.ts`.
   - Direct Drizzle query:
     - `audit.service.ts` Line 19: `this.db.insert(schema.auditLogs).values({...}).returning()`
   - Missing: No controller exists (`audit.controller.ts`), no query method exists (`findAll`), and no HTTP endpoint for `GET /api/audit-logs` is implemented.
5. **`health`** (`apps/backend/src/modules/health/`):
   - Files: `health.controller.ts`, `health.service.ts`, `health.module.ts`. Simple DB ping via SQL `SELECT 1`.
6. **Missing Modules (Slices 4, 5, 6, 7, 8)**:
   - `modules/customers/` does NOT exist (Slice 4).
   - `modules/orders/` does NOT exist (Slices 5, 6, 7).
   - `modules/dashboard/` does NOT exist (Slice 8).
   - In `apps/backend/src/app.module.ts`, lines 10-17 only import `DatabaseModule`, `AuditModule`, `HealthModule`, `AuthModule`, `UsersModule`, and `ProductsModule`.

### 1.2 Database Schema & Migration Status
- Inspection of `apps/backend/src/database/schema/`:
  - `users.schema.ts`: Defines `userRoleEnum` ('ADMIN', 'CASHIER'), `users` table with UUID PK, unique email, soft delete `deletedAt`.
  - `products.schema.ts`: Defines `products` table with identity BigInt PK (`mode: 'number'`), `productCode` unique, `stock` (integer with check `>= 0`), `price` (numeric(12,2) with check `> 0`), and index `idx_products_search`.
  - `customers.schema.ts`: Defines `genderEnum` ('Pria', 'Wanita'), `customers` table with UUID PK, `birthDate` (date `mode: 'string'`), soft delete `deletedAt`, index `idx_customers_name`.
  - `orders.schema.ts`: Defines 4 tables:
    1. `orders`: BigInt PK (`mode: 'number'`), `orderNumber` (unique), `customerId` (nullable FK to customers for walk-in `BR-013`), `createdBy` (FK to users), `orderDate`, `totalAmount` (numeric(14,2)).
    2. `orderItems`: BigInt PK, `orderId` (FK to orders CASCADE), `productId` (FK to products), `quantity` (> 0), `unitPrice` (numeric(12,2) snapshot `BR-002`), `subtotal` (numeric(14,2)).
    3. `draftOrders`: BigInt PK, `userId` (UUID UNIQUE FK to users CASCADE `BR-012`, `BR-016`), `customerId` (nullable FK), `items` (jsonb array).
    4. `orderActivityLogs`: BigInt PK, `orderId` (FK to orders CASCADE), `action` (varchar 50), `performedBy` (FK to users), `details` (jsonb).
  - `audit.schema.ts`: Defines `auditLogs` table with BigInt PK, `userId` (nullable FK to users SET NULL), `action`, `entityType`, `entityId`, `payload` (jsonb), `ipAddress`, `userAgent`.
  - `index.ts`: Re-exports all 8 tables and configures deep `relations` for Drizzle Query API.
- Migration Status:
  - `apps/backend/drizzle/0000_rainy_snowbird.sql` already contains the full DDL for all 8 tables, 2 enums, check constraints, foreign keys, and indexes.
  - `apps/backend/drizzle.config.ts` points to `./src/database/schema/index.ts` with dialect `postgresql`.

### 1.3 Shared Contracts Status (`packages/shared/`)
- Existing schemas: `login.schema.ts`, `user.schema.ts`, `product.schema.ts`.
- Missing schemas:
  - `customer.schema.ts` (`createCustomerSchema`, `updateCustomerSchema`, `customerQuerySchema`)
  - `order.schema.ts` (`createOrderSchema`, `checkoutOrderSchema`, `orderQuerySchema`, `draftOrderSchema`)
  - `audit.schema.ts` (`auditQuerySchema`)
  - `dashboard.schema.ts` (`dashboardQuerySchema`)
- Existing types in `packages/shared/src/types/`: `customer.types.ts`, `order.types.ts`, `dashboard.types.ts` are present but need synchronization with schemas and DTO interfaces.

---

## 2. Logic Chain

From these direct observations, we deduce the following structural dependencies and requirements:

1. **Decoupling Drizzle ORM via Repositories**:
   - Currently, business logic (e.g., password hashing, soft-delete rules, pagination calculation) and persistence operations (e.g. `this.db.select()`, `this.db.update()`) are co-located in `UsersService`, `ProductsService`, and `AuthService`.
   - Decoupling requires moving all Drizzle calls into dedicated repositories:
     - `UsersRepository` (`apps/backend/src/modules/users/repositories/users.repository.ts`)
     - `ProductsRepository` (`apps/backend/src/modules/products/repositories/products.repository.ts`)
     - `AuditRepository` (`apps/backend/src/modules/audit/repositories/audit.repository.ts`)
     - `CustomersRepository` (`apps/backend/src/modules/customers/repositories/customers.repository.ts`)
     - `OrdersRepository` (`apps/backend/src/modules/orders/repositories/orders.repository.ts`)
     - `DashboardRepository` (`apps/backend/src/modules/dashboard/repositories/dashboard.repository.ts`)
   - Repositories accept transaction contexts (`tx?: DrizzleDatabase | DrizzleTx`) to support atomic transactions spanning multiple operations across modules.

2. **Single-Responsibility Use-Cases Decomposition**:
   - Monolithic services currently handle multiple unrelated concerns (e.g., `ProductsService` handles catalog searching, single-item lookup, admin CRUD, Excel workbook export formatting, and Excel CSV/XLSX streaming parsing).
   - Decomposing these into standalone use-cases ensures each class has one reason to change, simplifies unit testing via mocked repositories, and satisfies R1.

3. **Preserving Backward-Compatible Module Facades**:
   - Existing E2E tests (`auth.e2e-spec.ts`, `products.e2e-spec.ts`, `users.e2e-spec.ts`) instantiate the NestJS application via `AppModule` and send HTTP calls to existing controllers.
   - Existing controllers (`ProductsController`, `UsersController`, `AuthController`) directly inject `ProductsService`, `UsersService`, `AuthService`.
   - By retaining `ProductsService`, `UsersService`, and `AuthService` as facades that inject and delegate to their respective Use-Cases, zero controller signatures or test suites will break.

4. **Concurrency & Locking Mechanics for Checkout**:
   - In `POST /api/orders` (and alias `POST /api/orders/checkout`), multiple concurrent cashiers may attempt to buy the same product stock.
   - Executing `SELECT ... WHERE id IN (...) AND deleted_at IS NULL FOR UPDATE` locks the target rows exclusively until the transaction commits or aborts.
   - To prevent database deadlocks caused by inverted locking order (cashier 1 locking A then B while cashier 2 locks B then A), product IDs MUST be sorted deterministically (`productIds.sort((a, b) => a - b)`) prior to row locking.
   - Stock deduction must verify `product.stock >= requestedQuantity`. If insufficient, throwing `UnprocessableEntityException` with nested error format `errors["items.X.quantity"] = ["..."]` triggers an automatic rollback of the transaction.
   - The PostgreSQL check constraint `check_stock_non_negative (stock >= 0)` serves as the second immutable barrier in the database engine.

5. **Hold Cart Isolation (`ADR-005`, `BR-012`, `BR-016`)**:
   - Table `draft_orders` has a `UNIQUE(user_id)` constraint on the cashier's UUID.
   - This constraint mechanically prevents a cashier from storing more than 1 held draft order without requiring artificial application-level locking.
   - Holding an order inserts into `draft_orders` WITHOUT touching `products.stock` or `orders`.
   - Resuming/finalizing reads from `draft_orders`, executes atomic stock lock/deduction in `db.transaction`, creates the final record in `orders` and `order_items`, and deletes the draft row from `draft_orders`.

6. **Member Birthday Discount Calculation (`BR-006`)**:
   - When an order has a non-null `customerId`:
     - Lookup customer and verify `deletedAt === null`.
     - Extract `customer.birthDate` mode string `YYYY-MM-DD`.
     - Compare `birthDate.slice(5)` (`MM-DD`) with transaction date `MM-DD`.
     - If matched: calculate `discount = Math.min(grossSubtotal * 0.05, 50000)`.
     - `totalAmount = grossSubtotal - discount`.
     - Record details in `order_activity_logs` (`details: { birthdayDiscountApplied: true, discountAmount: discount }`).

---

## 3. Detailed Architecture & Implementation Blueprint

### 3.1 Module-by-Module Blueprint

| Module | Repositories (`repositories/`) | Use-Cases (`use-cases/`) | Facade Service | Controller Endpoints |
|---|---|---|---|---|
| **`auth`** | Leverages `UsersRepository` | `LoginUseCase`<br>`RefreshTokenUseCase`<br>`LogoutUseCase`<br>`GetProfileUseCase`<br>`UpdateProfileUseCase`<br>`ChangePasswordUseCase` | `AuthService` | `POST /api/auth/login`<br>`POST /api/auth/refresh`<br>`POST /api/auth/logout`<br>`GET /api/auth/me`<br>`PUT /api/auth/me`<br>`POST /api/auth/change-password` |
| **`users`** | `UsersRepository` | `FindUsersUseCase`<br>`FindUserByIdUseCase`<br>`CreateUserUseCase`<br>`ResetPasswordUseCase`<br>`DeactivateUserUseCase` | `UsersService` | `GET /api/users`<br>`POST /api/users`<br>`PATCH /api/users/:id/reset-password`<br>`DELETE /api/users/:id` |
| **`products`** | `ProductsRepository` | `FindProductsUseCase`<br>`GetProductByIdUseCase`<br>`CreateProductUseCase`<br>`UpdateProductUseCase`<br>`DeleteProductUseCase`<br>`ExportProductsUseCase`<br>`ImportProductsUseCase`<br>`LockAndDeductStockUseCase` | `ProductsService` | `GET /api/products`<br>`GET /api/products/export`<br>`POST /api/products/import`<br>`GET /api/products/:id`<br>`POST /api/products`<br>`PUT /api/products/:id`<br>`DELETE /api/products/:id` |
| **`customers`** *(New - Slice 4)* | `CustomersRepository` | `FindCustomersUseCase`<br>`GetCustomerByIdUseCase`<br>`CreateCustomerUseCase`<br>`UpdateCustomerUseCase`<br>`DeleteCustomerUseCase` | `CustomersService` | `GET /api/customers`<br>`POST /api/customers`<br>`GET /api/customers/:id`<br>`PUT /api/customers/:id`<br>`DELETE /api/customers/:id` |
| **`orders`** *(New - Slices 5, 6, 7)* | `OrdersRepository` | `ProcessCheckoutUseCase`<br>`HoldDraftOrderUseCase`<br>`GetHeldDraftOrderUseCase`<br>`DiscardHeldDraftOrderUseCase`<br>`FinalizeHeldDraftOrderUseCase`<br>`FindOrdersUseCase`<br>`GetOrderByIdUseCase` | `OrdersService` | `POST /api/orders` & alias `/checkout`<br>`POST /api/orders/hold`<br>`GET /api/orders/held` & alias `/draft`<br>`DELETE /api/orders/held` & alias `/draft`<br>`POST /api/orders/held/finalize`<br>`GET /api/orders`<br>`GET /api/orders/:id` |
| **`dashboard`** *(New - Slice 8)* | `DashboardRepository` | `GetDashboardSummaryUseCase`<br>`GetDashboardTrendUseCase` | `DashboardService` | `GET /api/dashboard/summary` & alias `/metrics`<br>`GET /api/dashboard/trend` |
| **`audit`** | `AuditRepository` | `RecordAuditLogUseCase`<br>`GetAuditLogsUseCase` | `AuditService` | `GET /api/audit-logs` (Admin only) |

### 3.2 Concurrency Locking Specification (`POST /api/orders`)
```typescript
// Algorithm in ProcessCheckoutUseCase / OrdersRepository:
export class ProcessCheckoutUseCase {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: DrizzleDatabase,
    private readonly productsService: ProductsService,
    private readonly customersRepository: CustomersRepository,
    private readonly ordersRepository: OrdersRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(input: CheckoutOrderInput, cashierId: string, metadata?: RequestMeta) {
    return this.db.transaction(async (tx) => {
      // 1. Sort product IDs to prevent deadlocks across concurrent cashier checkouts
      const sortedItemInputs = [...input.items].sort((a, b) => a.productId - b.productId);
      
      // 2. Lock rows and deduct stock atomically via Products module
      const verifiedProducts = await this.productsService.lockAndDeductStock(tx, sortedItemInputs);

      // 3. Calculate gross subtotal
      let grossSubtotal = 0;
      const orderItemsData = verifiedProducts.map((p) => {
        const subtotal = p.unitPrice * p.quantity;
        grossSubtotal += subtotal;
        return {
          productId: p.id,
          quantity: p.quantity,
          unitPrice: p.unitPrice.toFixed(2),
          subtotal: subtotal.toFixed(2),
        };
      });

      // 4. Calculate member birthday discount (BR-006)
      let discount = 0;
      let birthdayMatched = false;
      if (input.customerId) {
        const customer = await this.customersRepository.findById(input.customerId, false);
        if (!customer) {
          throw new UnprocessableEntityException('Pelanggan tidak ditemukan atau telah dinonaktifkan');
        }
        const todayStr = new Date().toISOString().slice(5, 10); // MM-DD
        const customerBirthStr = customer.birthDate.slice(5, 10);
        if (todayStr === customerBirthStr) {
          discount = Math.min(grossSubtotal * 0.05, 50000);
          birthdayMatched = true;
        }
      }

      const totalAmount = (grossSubtotal - discount).toFixed(2);

      // 5. Generate unique invoice number: INV-YYYYMMDD-XXXX
      const invoiceNumber = await this.ordersRepository.generateNextInvoiceNumber(tx);

      // 6. Insert orders record
      const order = await this.ordersRepository.createOrder(tx, {
        orderNumber: invoiceNumber,
        customerId: input.customerId ?? null,
        createdBy: cashierId,
        totalAmount,
      });

      // 7. Insert order_items records (price snapshotting BR-002)
      await this.ordersRepository.createOrderItems(tx, order.id, orderItemsData);

      // 8. If cashier had an active draft order, clear it
      await this.ordersRepository.deleteDraftOrderByUserId(tx, cashierId);

      // 9. Record lifecycle log & audit log
      await this.ordersRepository.createOrderActivityLog(tx, {
        orderId: order.id,
        action: 'ORDER_CREATED',
        performedBy: cashierId,
        details: { grossSubtotal, discount, birthdayMatched, totalAmount },
      });

      await this.auditService.log({
        userId: cashierId,
        action: AuditAction.ORDER_CREATED,
        entityType: 'ORDER',
        entityId: String(order.id),
        newValues: { orderNumber: invoiceNumber, totalAmount, itemsCount: orderItemsData.length },
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      });

      return this.ordersRepository.findOrderById(tx, order.id);
    });
  }
}
```

---

## 4. Caveats

1. **Database Schema Pre-existence**: The 8 schema definitions in `apps/backend/src/database/schema/` and migration `0000_rainy_snowbird.sql` already define all tables and relations. No new DDL tables are required; however, the shared package (`packages/shared/src/schemas/`) still lacks Zod schemas for Customers, Orders, Audit, and Dashboard queries.
2. **Endpoint URL Aliases**: `ORIGINAL_REQUEST.md` specifies `POST /api/orders/checkout` and `GET /api/orders/draft`, whereas `openapi.yaml` uses `POST /api/orders` and `GET /api/orders/held`. To achieve 100% compatibility with both specs and tests, controllers must declare aliases (e.g. `@Post()` and `@Post('checkout')`, `@Get('held')` and `@Get('draft')`).
3. **Transaction Context Propagation**: When delegating work from `OrdersModule` to `ProductsModule` during checkout, the Drizzle transaction context `tx` must be passed as an argument so both product stock updates and order insertions stay within the same ACID unit.
4. **Read-Only Investigation Bound**: No code files were modified during this investigation.

---

## 5. Conclusion

1. **Codebase Preparedness**: The monorepo has a solid architectural foundation with full Drizzle schema definitions and working auth/users/products base services, but requires significant clean-architecture refactoring to isolate Drizzle queries from business services.
2. **Refactoring Path**: Decoupling `UsersService`, `ProductsService`, and `AuthService` into Repositories (`repositories/*.repository.ts`) and single-responsibility Use-Cases (`use-cases/*.use-case.ts`), while retaining the services as thin facades, is completely viable, non-breaking, and enables clean implementation of Slices 4 through 9.
3. **Concurrency Readiness**: PostgreSQL pessimistic locking (`FOR UPDATE`) with sorted IDs, check constraints (`stock >= 0`), and isolated table `draft_orders` (`UNIQUE(user_id)`) satisfy all ACID and business requirements (`BR-001` through `BR-019`).

---

## 6. Verification Method

To verify these findings independently:

1. **Verify Existing Modules & Direct Drizzle Queries**:
   ```bash
   grep -rn "this.db" apps/backend/src/modules/
   ```
   *Expected*: Direct queries in `users.service.ts`, `products.service.ts`, `auth.service.ts`, `audit.service.ts`.

2. **Verify Database Schemas & Migration Status**:
   ```bash
   ls -la apps/backend/src/database/schema/
   cat apps/backend/drizzle/0000_rainy_snowbird.sql | grep "CREATE TABLE"
   ```
   *Expected*: 8 tables (`users`, `products`, `customers`, `draft_orders`, `order_activity_logs`, `order_items`, `orders`, `audit_logs`).

3. **Verify Existing Backend Integration Tests**:
   ```bash
   pnpm --filter @titipin/backend test
   ```
   *Expected*: `auth.e2e-spec.ts`, `products.e2e-spec.ts`, `users.e2e-spec.ts`, `health.e2e-spec.ts` execute.

4. **Invalidation Condition**:
   - If `ProductsService` or `UsersService` public method signatures are changed or removed instead of using the facade pattern, existing E2E tests in `apps/backend/test/` will fail.
