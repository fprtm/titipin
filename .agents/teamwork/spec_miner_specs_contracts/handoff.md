# Comprehensive Specification Mining Report: Clean Architecture Refactor (R1) & Slices 4–9

**Author**: Spec Miner Subagent  
**Working Directory**: `/Users/yuma/Workspace/lab/titipin/.agents/teamwork/spec_miner_specs_contracts`  
**Date**: 2026-10-27T17:35:00Z  
**Target Monorepo**: Titipin POS & Order Management  

---

## 1. Observation

Direct observations extracted from authoritative repository sources:

### 1.1 Authoritative Documentation & Architectural Decision Records
1. **`ORIGINAL_REQUEST.md` (lines 12–32)**:
   - **R1**: Decouple data access from business logic via dedicated Repositories (`UsersRepository`, `ProductsRepository`, `CustomersRepository`, `OrdersRepository`, `AuditRepository`, `DashboardRepository`) and single-responsibility Use-Cases (`CreateProductUseCase`, `ImportProductsUseCase`, `ProcessCheckoutUseCase`, `HoldDraftOrderUseCase`). Backward-compatible facades required.
   - **R2 (Slice 4)**: `CustomersRepository`, Use-Cases (`FindCustomersUseCase`, `CreateCustomerUseCase`, `UpdateCustomerUseCase`, `DeleteCustomerUseCase`), REST API: `GET /api/customers`, `POST /api/customers`, `GET /api/customers/:id`, `PUT /api/customers/:id` (Admin), `DELETE /api/customers/:id` (soft-delete, Admin).
   - **R3 (Slice 5 & 6)**: `POST /api/orders/checkout` (and `POST /api/orders`) with row locking (`FOR UPDATE`), member birthday discount calculation (`BR-006`: 5% max Rp 50.000 when customer birth date matches transaction date), order activity logging (`ORDER_CREATED`). Draft cart isolation per ADR-005: `POST /api/orders/hold`, `GET /api/orders/draft` (and `GET /api/orders/held`), `DELETE /api/orders/draft` (and `DELETE /api/orders/held`) using isolated `draft_orders` table with `UNIQUE(user_id)`.
   - **R4 (Slice 7, 8, 9)**: `orders` module (`GET /api/orders`, `GET /api/orders/:id`, thermal receipt 80mm monospace `@media print`), `dashboard` module (`GET /api/dashboard/metrics` and `GET /api/dashboard/summary`, daily revenue, transaction count, low-stock count, active members, trend charts, top-selling items), `audit` module (`GET /api/audit-logs` Admin only, Docker production build `docker-compose.prod.yml`).
2. **`docs/architecture/ADR/ADR-005-pos-draft-orders-isolation.md` (lines 19–38)**:
   - Draft orders are isolated in `draft_orders` table; `orders` table strictly holds completed transactions.
   - Table `draft_orders` has a `UNIQUE(user_id)` constraint enforcing that 1 cashier can hold at most 1 draft at any time (`BR-012`).
   - Draft orders do NOT deduct inventory stock until finalized.
3. **`docs/architecture/ADR/ADR-006-dual-logging-strategy.md` (lines 16–28)**:
   - Dual logging strategy:
     - `audit_logs`: System-wide security & compliance audit trail (write operations: create/update/delete on users, products, customers, orders; password changes, deactivations). Admin-only access.
     - `order_activity_logs`: Transaction lifecycle events (`ORDER_CREATED`, `ORDER_HELD`, `ORDER_RESUMED`, `ORDER_FINALIZED`). Returned directly in `GET /api/orders/:id`.
4. **`docs/architecture/DATA-MODEL.md` (lines 175–289, 357–500)**:
   - Table `customers`: `id` (uuid PK default random), `customer_name` (varchar 150), `customer_address` (varchar 255), `gender` (enum 'Pria', 'Wanita'), `birth_date` (date string mode), `phone` (varchar 20, nullable), `created_at`, `updated_at`, `deleted_at`. Index `idx_customers_name`.
   - Table `orders`: `id` (bigint identity, mode: number), `order_number` (varchar 30 UK format `INV-YYYYMMDD-XXXX`), `customer_id` (uuid nullable references customers.id), `created_by` (uuid references users.id), `order_date` (timestamptz), `total_amount` (numeric 14,2), `created_at`, `updated_at`.
   - Table `order_items`: `id` (bigint identity), `order_id` (bigint references orders.id CASCADE), `product_id` (bigint references products.id), `quantity` (int check > 0), `unit_price` (numeric 12,2 historical snapshot), `subtotal` (numeric 14,2), `created_at`, `updated_at`.
   - Table `draft_orders`: `id` (bigint identity), `user_id` (uuid references users.id CASCADE UK), `customer_id` (uuid references customers.id SET NULL nullable), `items` (jsonb array of `{ product_id: number, quantity: number }`), `created_at`, `updated_at`.
   - Table `order_activity_logs`: `id` (bigint identity), `order_id` (bigint references orders.id CASCADE), `action` (varchar 50), `performed_by` (uuid references users.id), `details` (jsonb nullable), `created_at` (timestamptz default now).
   - Table `audit_logs`: `id` (bigint identity), `user_id` (uuid references users.id SET NULL nullable), `action` (varchar 50), `entity_type` (varchar 50), `entity_id` (varchar 100), `payload` (jsonb `{ before, after }`), `ip_address` (varchar 45), `user_agent` (varchar 255), `created_at` (timestamptz default now).
5. **`docs/api/openapi.yaml`**:
   - `GET /api/customers`, `POST /api/customers`, `GET /api/customers/{id}`, `PUT /api/customers/{id}`, `DELETE /api/customers/{id}` (lines 440–525).
   - `GET /api/orders`, `POST /api/orders`, `POST /api/orders/hold`, `GET /api/orders/held`, `DELETE /api/orders/held`, `POST /api/orders/held/finalize`, `GET /api/orders/{id}` (lines 529–680).
   - `GET /api/dashboard/summary`, `GET /api/dashboard/trend` (lines 685–715).
   - `GET /api/audit-logs` (lines 719–753).
6. **`docs/product/PRD.md` & `ACCEPTANCE-CRITERIA.md`**:
   - `BR-001`: Server-side pricing & calculation. Client never supplies unit prices or total amounts.
   - `BR-002`: Immutable historical unit price snapshot in `order_items.unit_price`.
   - `BR-003`: All-or-nothing atomic transaction. If any item stock is insufficient, transaction rolls back completely.
   - `BR-004`: Concurrency safety using `SELECT ... FOR UPDATE` row locking.
   - `BR-005`: Order number sequence format: `INV-YYYYMMDD-XXXX` (daily 4-digit sequence zero-padded).
   - `BR-006` (PRD): Soft-delete historical integrity (products and customers).
   - `BR-006` (User Request / POS engine): Member birthday discount: 5% discount max Rp 50.000 when customer's `birth_date` (month & day) matches current transaction date (month & day).
   - `BR-012` & `BR-016`: Hold draft in `draft_orders` without stock deduction. Max 1 draft per cashier.
   - `BR-013`: Walk-in order allowed (`customer_id = null`), labeled "Pelanggan Umum".
   - `BR-014`: Central audit trail for all write operations.
   - `BR-015`: RBAC via JWT claim (`role: ADMIN | CASHIER`). Kasir receives 403 Forbidden on Admin-only endpoints.
   - `BR-017`: Dual logging separation.
   - `BR-018`: Slow product definition: bottom 5 active products by sales volume in period; active products with 0 sales prioritized at the very top.
   - `BR-019`: Period definitions: `daily` (00:00 to 23:59 server local date), `monthly` (1st to end of current month), `quarterly` (Q1 Jan–Mar, Q2 Apr–Jun, Q3 Jul–Sep, Q4 Oct–Dec).

### 1.2 Inspection of `packages/shared/src/`
- Existing Enums (`packages/shared/src/enums/`):
  - `Role` (`ADMIN`, `CASHIER`)
  - `Gender` (`Pria`, `Wanita`)
  - `OrderActivityAction` (`ORDER_CREATED`, `ORDER_HELD`, `ORDER_RESUMED`, `ORDER_FINALIZED`)
  - `AuditAction` (`AUTH_LOGIN`, `AUTH_LOGOUT`, `PRODUCT_CREATED`, `PRODUCT_UPDATED`, `PRODUCT_DELETED`, `CUSTOMER_CREATED`, `CUSTOMER_UPDATED`, `CUSTOMER_DELETED`, `ORDER_CREATED`, `USER_CREATED`, `USER_RESET_PASSWORD`, `USER_DEACTIVATED`, `AUTH_PASSWORD_CHANGED`)
- Existing Types (`packages/shared/src/types/`):
  - `Customer`, `CreateCustomerInput`, `UpdateCustomerInput` (defined, but lacks `CustomerItem` snake_case aliases and response wrappers `CustomerListResponse`, `CustomerDetailResponse`).
  - `Order`, `OrderItem`, `CheckoutItemInput`, `CheckoutOrderInput`, `DraftOrder` (partially defined, but lacks `OrderDetailData`, `OrderItemDetail`, `OrderActivityLogItem`, `OrderDetailResponse`, `OrderListResponse`, `DraftOrderData`).
  - `DashboardSummary`, `BestSellingProduct`, `SlowMovingProduct` (partially defined, lacks `DashboardSummaryResponse`, `DashboardTrendResponse`, `DashboardPeriod`).
  - `AuditLogItem`, `AuditLogListResponse` are **completely missing** from `packages/shared/src/types/`.
- Existing Schemas (`packages/shared/src/schemas/`):
  - Only `login.schema.ts`, `user.schema.ts`, `product.schema.ts` exist.
  - **Missing**: `customer.schema.ts` (`createCustomerSchema`, `updateCustomerSchema`, `customerQuerySchema`), `order.schema.ts` (`createOrderSchema`, `checkoutOrderSchema`, `holdOrderSchema`, `orderQuerySchema`), `dashboard.schema.ts` (`dashboardQuerySchema`), `audit.schema.ts` (`auditQuerySchema`).

### 1.3 Inspection of `apps/backend/src/`
- `apps/backend/src/database/schema/`:
  - `customers.schema.ts` and `orders.schema.ts` are already declared in Drizzle!
  - `orders` table has columns: `id`, `orderNumber`, `customerId`, `createdBy`, `orderDate`, `totalAmount`, `createdAt`, `updatedAt`.
  - `orderItems` table has: `id`, `orderId`, `productId`, `quantity`, `unitPrice`, `subtotal`.
  - `draftOrders` table has: `id`, `userId` (`unique`), `customerId`, `items`, `createdAt`, `updatedAt`.
  - `orderActivityLogs` table has: `id`, `orderId`, `action`, `performedBy`, `details`, `createdAt`.
  - `auditLogs` table has: `id`, `userId`, `action`, `entityType`, `entityId`, `payload`, `ipAddress`, `userAgent`, `createdAt`.
- Existing modules:
  - `modules/products/products.service.ts`: Monolithic (contains direct `db.select()`, `db.insert()`, and ExcelJS export/import). Needs R1 refactoring to `ProductsRepository` and dedicated Use-Cases.
  - `modules/users/users.service.ts`: Monolithic (contains direct `db.select()`, `db.insert()`, password hashing). Needs R1 refactoring to `UsersRepository` and dedicated Use-Cases.
  - `modules/audit/`: Currently only has `audit.service.ts` with `log()` method; lacks controller `GET /api/audit-logs`, repository, and queries.
  - `modules/customers/`: **Does not exist yet**. Needs full module implementation with Repository, Use-Cases, Service Facade, Controller, and DTOs.
  - `modules/orders/`: **Does not exist yet**. Needs full module implementation with Repository, Use-Cases (`ProcessCheckoutUseCase`, `HoldDraftOrderUseCase`, etc.), Service Facade, Controller, and DTOs.
  - `modules/dashboard/`: **Does not exist yet**. Needs full module implementation with Repository, Use-Cases, Service Facade, Controller, and DTOs.

---

## 2. Logic Chain

1. **Route Dual-Path & Compatibility Alignment**:
   - The OpenAPI spec defines `/api/orders/held` (`GET`, `DELETE`, `POST /api/orders/held/finalize`) and `POST /api/orders`.
   - The `ORIGINAL_REQUEST.md` specifies `/api/orders/draft` (`GET`, `DELETE`), `POST /api/orders/hold`, `POST /api/orders/checkout`, and `GET /api/dashboard/metrics`.
   - **Deduction**: The backend controllers must register both route paths as aliases:
     - `POST /api/orders` AND `POST /api/orders/checkout` -> delegates to `ProcessCheckoutUseCase`.
     - `GET /api/orders/held` AND `GET /api/orders/draft` -> delegates to `GetDraftOrderUseCase`.
     - `DELETE /api/orders/held` AND `DELETE /api/orders/draft` -> delegates to `DiscardDraftOrderUseCase`.
     - `POST /api/orders/held/finalize` -> delegates to `FinalizeDraftOrderUseCase`.
     - `GET /api/dashboard/summary` AND `GET /api/dashboard/metrics` -> delegates to `GetDashboardSummaryUseCase`.
   - This ensures 100% compliance with both the OpenAPI schema specification and user instructions/tests.

2. **Clean Architecture (R1) Boundary Enforcement**:
   - Direct Drizzle database queries (`this.db.select()`, `this.db.insert()`, etc.) currently reside directly in `products.service.ts` and `users.service.ts`.
   - Moving all database operations into `repositories/*.repository.ts` isolates ORM concerns and ensures soft-delete filtering is centralized.
   - Decomposing business operations into single-responsibility `use-cases/*.use-case.ts` prevents monolithic service bloat.
   - Retaining `ProductsService`, `UsersService`, etc., as facade classes injecting the use-cases ensures that existing controllers and tests (`auth.e2e-spec.ts`, `products.e2e-spec.ts`, `users.e2e-spec.ts`) continue functioning with zero regressions.

3. **POS Engine Stock Concurrency & BR-006 Birthday Discount**:
   - Stock deduction must use PostgreSQL pessimistic locking `db.select().from(products).where(...).for('update')` inside an explicit `db.transaction(...)`.
   - If any requested product has `stock < requestedQuantity` or is soft-deleted (`deleted_at IS NOT NULL`), the transaction immediately rolls back and throws `UnprocessableEntityException` with format `errors["items.X.quantity"] = ["Stok <Name> tersisa <S>, diminta <D>"]` (HTTP 422).
   - If `customer_id` is provided, the customer's `birth_date` is evaluated against `order_date` (or `new Date()`):
     - If customer birth date is `YYYY-MM-DD`, extract `MM-DD`.
     - If order date in local time has matching `MM-DD`:
       - Calculate 5% of subtotal: `rawDiscount = Math.round(subtotal * 0.05)`.
       - Apply maximum cap: `discountAmount = Math.min(rawDiscount, 50000)`.
       - Final `totalAmount = subtotal - discountAmount`.
       - Store discount metadata in `order_activity_logs.details` (e.g. `{ subtotal, discount: discountAmount, reason: 'BIRTHDAY_DISCOUNT' }`).
     - If birth date does not match or `customer_id` is null (walk-in):
       - `discountAmount = 0`, `totalAmount = subtotal`.

4. **Draft Orders Table Isolation (ADR-005)**:
   - When a cashier holds a cart via `POST /api/orders/hold`:
     - The backend checks `draft_orders` for `user_id = currentUserId`.
     - If a record exists, return HTTP 422 ("Anda sudah memiliki satu transaksi yang sedang di-hold. Selesaikan atau buang transaksi tersebut terlebih dahulu.").
     - Otherwise, insert into `draft_orders`. Physical product stock is untouched.
   - When finalized via `POST /api/orders/held/finalize`:
     - Run `db.transaction`: lock products `FOR UPDATE`, deduct stock, create record in `orders`, create records in `order_items`, delete row from `draft_orders`, log `ORDER_FINALIZED` to `order_activity_logs`, and record audit log.

5. **Dashboard Analytics (Slice 8)**:
   - Period filtering applies to `orders.order_date`:
     - `daily`: Start of current local day `00:00:00` to end of day `23:59:59`.
     - `monthly`: First day of current month `00:00:00` to end of current month.
     - `quarterly`: First day of current calendar quarter (Q1: Jan 1, Q2: Apr 1, Q3: Jul 1, Q4: Oct 1) to end of quarter.
   - Top 5 products: `order_items` joined with `orders`, grouped by `product_id`, ordered by `SUM(quantity) DESC`, limit 5.
   - Slow 5 products (`BR-018`): Active products (`deleted_at IS NULL`) with least sales in period; active products with 0 transactions in period MUST be prioritized at the top.
   - Low stock products: All active products with `stock < 5` (independent of period).

6. **Role-Based Access Control (RBAC)**:
   - Evaluated by `RolesGuard` checking `user.role` from JWT claims (`ADMIN` vs `CASHIER`).
   - If a `CASHIER` attempts to access an endpoint marked `@Roles(Role.ADMIN)`, the server throws `ForbiddenException` returning HTTP 403.

---

## 3. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Architecture | Clean Repositories (R1) | Encapsulate Drizzle queries, transactions, and soft-delete filters | Entity parameters, filter criteria, Drizzle transaction objects | Domain entities, counts, tuples | DB connection errors, query syntax errors | `ORIGINAL_REQUEST.md`, `ARCHITECTURE.md` |
| 2 | Architecture | Single-Responsibility Use-Cases (R1) | Decompose services into focused command/query handlers | Command/Query DTOs | Result DTOs | Domain exceptions (`NotFoundException`, `UnprocessableEntityException`) | `ORIGINAL_REQUEST.md` |
| 3 | Customers | Customer Listing (`GET /api/customers`) | Search by customer name with pagination | Query: `page`, `per_page`, `search` | `CustomerListResponse` (`items`, `meta`) | 401 Unauthorized if unauthenticated | `openapi.yaml`, `TICKET-SLICE-4` |
| 4 | Customers | Customer Registration (`POST /api/customers`) | Register new member profile (Cashier & Admin) | Body: `customer_name`, `customer_address`, `gender` ('Pria'/'Wanita'), `birth_date` ('YYYY-MM-DD'), `phone`? | `CustomerDetailResponse` (`id`, details, `created_at`), HTTP 201 | 422 if invalid gender enum or missing required fields | `openapi.yaml`, `AC-CST-01` |
| 5 | Customers | Customer Profile Detail (`GET /api/customers/:id`) | Get member profile by UUID | Path: `id` (UUID) | `CustomerDetailResponse` | 404 Not Found if missing or soft-deleted | `openapi.yaml`, `TICKET-SLICE-4` |
| 6 | Customers | Update Customer (`PUT /api/customers/:id`) | Update member profile (Admin Only) | Path: `id`, Body: `customer_name`, `customer_address`, `gender`, `birth_date`, `phone` | `CustomerDetailResponse`, HTTP 200 | 403 Forbidden for Cashier, 404 if not found | `openapi.yaml`, `TICKET-SLICE-4` |
| 7 | Customers | Soft Delete Customer (`DELETE /api/customers/:id`) | Mark customer as deleted (`deleted_at = NOW()`) (Admin Only) | Path: `id` (UUID) | `SuccessResponse`, HTTP 200 | 403 Forbidden for Cashier, 404 if not found | `openapi.yaml`, `AC-CST-01` |
| 8 | Orders / POS | Atomic Order Checkout (`POST /api/orders` & `/checkout`) | Checkout order with pessimistic row locking, stock deduction, birthday discount | Body: `customer_id` (nullable), `items` (`product_id`, `quantity`) | `OrderDetailResponse` (invoice `INV-YYYYMMDD-XXXX`, items, activity log), HTTP 201 | 422 Unprocessable Entity if stock < requested (total rollback) | `openapi.yaml`, `ORIGINAL_REQUEST.md`, `TICKET-SLICE-5` |
| 9 | Orders / POS | Member Birthday Discount (`BR-006`) | 5% discount (max Rp 50.000) when member birth date matches transaction date | `customer_id` and matching `birth_date` MM-DD | Deducted `total_amount`, discount recorded in activity log | None (falls back to 0 discount if no match or walk-in) | `ORIGINAL_REQUEST.md`, `PRD.md` |
| 10 | Orders / POS | Hold Draft Order (`POST /api/orders/hold`) | Persist active cart to `draft_orders` without deducting stock | Body: `customer_id` (nullable), `items` | `SuccessResponse` or draft data, HTTP 201 | 422 if cashier already has 1 active draft | `openapi.yaml`, `ADR-005`, `TICKET-SLICE-6` |
| 11 | Orders / POS | Get Held Draft (`GET /api/orders/held` & `/draft`) | Retrieve active draft for current logged-in cashier | Header: Authorization Bearer (user ID extracted) | `DraftOrderData` (`id`, `user_id`, `customer_id`, `items`, `created_at`), HTTP 200 | 404 Not Found if no draft exists | `openapi.yaml`, `ORIGINAL_REQUEST.md`, `TICKET-SLICE-6` |
| 12 | Orders / POS | Discard Held Draft (`DELETE /api/orders/held` & `/draft`) | Delete draft cart from `draft_orders` | Header: Authorization Bearer | `SuccessResponse`, HTTP 200 | 404 if no draft exists | `openapi.yaml`, `ORIGINAL_REQUEST.md`, `TICKET-SLICE-6` |
| 13 | Orders / POS | Finalize Held Draft (`POST /api/orders/held/finalize`) | Promote draft cart to completed order atomically | Body (optional): updated `items` or empty (uses stored items) | `OrderDetailResponse`, HTTP 201 | 422 if stock insufficient or no draft exists | `openapi.yaml`, `TICKET-SLICE-6` |
| 14 | Orders History | Order History Listing (`GET /api/orders`) | List completed orders with date range and customer filters | Query: `from`, `to`, `customer_id`, `page`, `per_page` | `OrderListResponse` (array of `OrderDetailData`, `meta`), HTTP 200 | 401 Unauthorized | `openapi.yaml`, `TICKET-SLICE-7` |
| 15 | Orders History | Order Invoice Detail (`GET /api/orders/:id`) | View invoice by ID or order_number with snapshot prices & timeline | Path: `id` (numeric ID or order_number string) | `OrderDetailResponse` (header, item snapshots, activity log timeline), HTTP 200 | 404 Not Found if non-existent | `openapi.yaml`, `TICKET-SLICE-7` |
| 16 | Orders History | Thermal Receipt Print View | Monospace 80mm printable layout for POS receipt | Trigger: Print button / `@media print` | Thermal-formatted printable invoice | Hides non-printable UI elements | `TICKET-SLICE-7`, `03-pos-checkout.md` |
| 17 | Dashboard | Dashboard Summary (`GET /api/dashboard/summary` & `/metrics`) | Aggregated store KPIs: revenue, order count, top 5, slow 5, low stock | Query: `period` ('daily' / 'monthly' / 'quarterly') | `DashboardSummaryResponse` (KPI metrics, top_products, slow_products, low_stock_products), HTTP 200 | 401 Unauthorized | `openapi.yaml`, `TICKET-SLICE-8` |
| 18 | Dashboard | Dashboard Sales Trend (`GET /api/dashboard/trend`) | Daily sales revenue and volume time series for period | Query: `period` ('daily' / 'monthly' / 'quarterly') | `DashboardTrendResponse` (array of `{ date, transactions, revenue }`), HTTP 200 | 401 Unauthorized | `openapi.yaml`, `TICKET-SLICE-8` |
| 19 | Audit Trail | System Audit Logs (`GET /api/audit-logs`) | Query centralized system audit trail with filters (Admin Only) | Query: `user_id`, `action`, `entity_type`, `from`, `to`, `page`, `per_page` | `AuditLogListResponse` (array of `AuditLogItem` with JSON diff payload, `meta`), HTTP 200 | 403 Forbidden for Cashier, 401 if unauthenticated | `openapi.yaml`, `TICKET-SLICE-7`, `TICKET-SLICE-9` |
| 20 | Release / Infra | Production Dockerization | Containerized multi-service deployment | `docker compose -f docker-compose.prod.yml up --build` | Running backend, frontend, postgres services | Build errors, port collisions | `TICKET-SLICE-9`, `PRD.md` |
| 21 | Release / QA | Full Seeder & 9/9 Integration Tests | Comprehensive demo data (2 users, 20+ products, 15+ members, 30+ orders) | `pnpm db:seed`, `pnpm test` | 100% passing tests (TEST-01 to TEST-09) | Test assertion failures | `TICKET-SLICE-9`, `ACCEPTANCE-CRITERIA.md` |

---

## 4. Edge Cases

| # | Feature | Input / Condition | Observed / Required Behavior |
|---|---------|-------------------|-----------------------------|
| 1 | POS Checkout | Order with `customer_id: null` (Walk-in) | Server sets `orders.customer_id = NULL`. Response and invoice display `customer_name = "Pelanggan Umum"`. Birthday discount evaluates to 0. Stock deducts normally. |
| 2 | POS Checkout | Customer birth date matches today's date (`MM-DD`) | Server applies 5% discount: `discount = Math.min(Math.round(subtotal * 0.05), 50000)`. `total_amount = subtotal - discount`. Detail recorded in `order_activity_logs.details`. |
| 3 | POS Checkout | Customer birthday discount exceeding maximum cap (Subtotal = Rp 2.000.000, 5% = Rp 100.000) | Server caps discount at Rp 50.000 (`Math.min(100000, 50000) = 50000`). Total amount charged is Rp 1.950.000. |
| 4 | POS Checkout | Product stock is 3, client requests quantity 5 | Pessimistic lock acquires row. Stock check fails. Entire transaction rolls back atomik. HTTP 422 returned with `{ errors: { "items.0.quantity": ["Stok <Name> tersisa 3, diminta 5"] } }`. Product stock remains 3. |
| 5 | POS Checkout | Concurrent checkout: 2 cashiers request 1 remaining unit at the exact same millisecond | First transaction locks row `FOR UPDATE`, decrements stock to 0, succeeds with 201. Second transaction unblocks, reads stock = 0, fails with 422. Stock never becomes negative (-1). |
| 6 | POS Checkout | Client includes forged `price` or `subtotal` in payload | Server ignores/strips client-provided prices; recalculates unit price and subtotals strictly from database `products.price`. |
| 7 | POS Checkout | Order contains soft-deleted product (`deleted_at IS NOT NULL`) | Server rejects with HTTP 422 ("Produk tidak ditemukan atau sudah dinonaktifkan"). |
| 8 | Hold Cart | Cashier attempts to hold a second cart while an active draft already exists | Server checks `draft_orders` for `user_id`. Unique constraint / validation catches duplicate. Rejects with HTTP 422: "Anda sudah memiliki satu transaksi yang sedang di-hold. Selesaikan atau buang transaksi tersebut terlebih dahulu." Existing draft is preserved. |
| 9 | Hold Cart | Products held in draft order are checked in inventory | Stock is NOT reserved or deducted. Stock remains fully available for other cashiers to sell until finalized. |
| 10 | Finalize Held Cart | Held product ran out of stock while in draft state before cashier finalizes | Finalization attempts to lock and deduct stock. Detects insufficient stock. Rolls back. HTTP 422 returned. Draft order is NOT deleted, allowing cashier to adjust quantity or discard. |
| 11 | Order Invoice Detail | Master product price changed from Rp 12.000 to Rp 18.000 after order completed | Order detail reads `order_items.unit_price`. Historical snapshot remains Rp 12.000. Invoice total remains strictly identical. |
| 12 | Dashboard Metrics | Active products with 0 sales during selected monthly period | Included in `slow_products` (Bottom 5), prioritized at the very top (index 0, 1...) above products with 1 or 2 sales (`BR-018`). |
| 13 | Dashboard Metrics | Period set to `quarterly` | Server groups dates into Q1 (Jan–Mar), Q2 (Apr–Jun), Q3 (Jul–Sep), Q4 (Oct–Dec) based on current server date. |
| 14 | RBAC Guard | Cashier token calls `GET /api/audit-logs`, `GET /api/users`, `POST /api/products`, `PUT /api/customers/:id`, or `DELETE /api/customers/:id` | `RolesGuard` rejects request immediately with HTTP 403 Forbidden (`{ success: false, message: "Akses ditolak: hak akses role tidak mencukupi" }`). |
| 15 | RBAC Self-Guard | Admin calls `DELETE /api/users/:adminId` or `PATCH /api/users/:adminId/reset-password` on their own ID | Server checks `currentUserId === targetUserId`. Rejects with HTTP 403 Forbidden ("Admin tidak dapat menonaktifkan atau mereset akun sendiri"). |

---

## 5. Detailed Specification by Slice

### 5.1 Clean Architecture Refactor (R1)
Decompose monolithic service logic into dedicated repositories and single-responsibility use-cases:

1. **`UsersRepository` (`src/modules/users/repositories/users.repository.ts`)**:
   - `findAll(): Promise<User[]>`
   - `findById(id: string): Promise<User | null>`
   - `findByEmail(email: string): Promise<User | null>`
   - `create(data: NewUser): Promise<User>`
   - `update(id: string, data: Partial<User>): Promise<User>`
   - `softDelete(id: string): Promise<User>`
   - `clearRefreshToken(id: string): Promise<void>`
   - `updateRefreshTokenHash(id: string, hash: string | null): Promise<void>`
2. **`ProductsRepository` (`src/modules/products/repositories/products.repository.ts`)**:
   - `findAll(options: { search?: string; sort?: string; order?: 'asc' | 'desc'; page: number; perPage: number }): Promise<{ items: Product[]; total: number }>`
   - `findById(id: number): Promise<Product | null>`
   - `findByProductCode(code: string): Promise<Product | null>`
   - `create(data: NewProduct): Promise<Product>`
   - `update(id: number, data: Partial<Product>): Promise<Product>`
   - `softDelete(id: number): Promise<Product>`
   - `lockProductsForUpdate(tx: DrizzleTransaction, productIds: number[]): Promise<Product[]>`
   - `deductStock(tx: DrizzleTransaction, productId: number, quantity: number): Promise<void>`
   - `upsertNaturalKey(product: { productCode: string; productName: string; stock: number; price: string }): Promise<'inserted' | 'updated'>`
   - `findAllActiveForExport(): Promise<Product[]>`
3. **`CustomersRepository` (`src/modules/customers/repositories/customers.repository.ts`)**:
   - `findAll(options: { search?: string; page: number; perPage: number }): Promise<{ items: Customer[]; total: number }>`
   - `findById(id: string): Promise<Customer | null>`
   - `create(data: NewCustomer): Promise<Customer>`
   - `update(id: string, data: Partial<Customer>): Promise<Customer>`
   - `softDelete(id: string): Promise<Customer>`
4. **`OrdersRepository` (`src/modules/orders/repositories/orders.repository.ts`)**:
   - `findAll(options: { from?: string; to?: string; customerId?: string; page: number; perPage: number }): Promise<{ items: OrderWithRelations[]; total: number }>`
   - `findById(id: number): Promise<OrderWithRelations | null>`
   - `findByOrderNumber(orderNumber: string): Promise<OrderWithRelations | null>`
   - `createOrderWithItems(order: NewOrder, items: NewOrderItem[], tx?: DrizzleTransaction): Promise<Order>`
   - `findDraftByUserId(userId: string): Promise<DraftOrder | null>`
   - `createDraft(userId: string, customerId: string | null, items: any[]): Promise<DraftOrder>`
   - `deleteDraftByUserId(userId: string, tx?: DrizzleTransaction): Promise<void>`
   - `createOrderActivityLog(log: NewOrderActivityLog, tx?: DrizzleTransaction): Promise<void>`
   - `findActivityLogsByOrderId(orderId: number): Promise<OrderActivityLog[]>`
   - `getNextInvoiceSequence(datePrefix: string): Promise<number>`
5. **`DashboardRepository` (`src/modules/dashboard/repositories/dashboard.repository.ts`)**:
   - `getSummaryMetrics(period: 'daily' | 'monthly' | 'quarterly'): Promise<{ totalTransactions: number; totalSalesAmount: string }>`
   - `getTopProducts(period: 'daily' | 'monthly' | 'quarterly', limit?: number): Promise<Array<{ productId: number; productName: string; totalSold: number; revenue: string }>>`
   - `getSlowProducts(period: 'daily' | 'monthly' | 'quarterly', limit?: number): Promise<Array<{ productId: number; productName: string; totalSold: number }>>`
   - `getLowStockProducts(threshold?: number): Promise<Array<{ id: number; productCode: string; productName: string; stock: number }>>`
   - `getTrendData(period: 'daily' | 'monthly' | 'quarterly'): Promise<Array<{ date: string; transactions: number; revenue: string }>>`
6. **`AuditRepository` (`src/modules/audit/repositories/audit.repository.ts`)**:
   - `create(entry: NewAuditLog): Promise<AuditLog>`
   - `findAll(options: { userId?: string; action?: string; entityType?: string; from?: string; to?: string; page: number; perPage: number }): Promise<{ items: AuditLogWithUser[]; total: number }>`

---

### 5.2 Slice 4: Customer & Membership Management (`TICKET-SLICE-4`)
- **Module**: `apps/backend/src/modules/customers/`
- **Endpoints**:
  1. `GET /api/customers`
     - Query: `page` (default 1), `per_page` (default 10), `search` (optional string)
     - Response (200): `{ success: true, data: CustomerItem[], meta: PaginationMeta }`
     - Roles: `ADMIN`, `CASHIER`
  2. `POST /api/customers`
     - Body: `{ customer_name: string, customer_address: string, gender: 'Pria' | 'Wanita', birth_date: string (YYYY-MM-DD), phone?: string | null }`
     - Response (201): `{ success: true, data: CustomerItem }`
     - Roles: `ADMIN`, `CASHIER`
     - Audit Log: `CUSTOMER_CREATED`
  3. `GET /api/customers/:id`
     - Path: `id` (UUID)
     - Response (200): `{ success: true, data: CustomerItem }`
     - Roles: `ADMIN`, `CASHIER`
  4. `PUT /api/customers/:id`
     - Path: `id` (UUID), Body: `UpdateCustomerInput`
     - Response (200): `{ success: true, data: CustomerItem }`
     - Roles: `ADMIN` ONLY (Cashier -> 403 Forbidden)
     - Audit Log: `CUSTOMER_UPDATED`
  5. `DELETE /api/customers/:id`
     - Path: `id` (UUID)
     - Response (200): `{ success: true, message: "Pelanggan berhasil dinonaktifkan" }`
     - Roles: `ADMIN` ONLY (Cashier -> 403 Forbidden)
     - Audit Log: `CUSTOMER_DELETED`
- **Frontend (`/customers`)**:
  - Glassmorphic table displaying Member ID, Name, Gender badge, Birth Date, Phone, Address, Actions (`[•••]` dropdown).
  - Modal Pendaftaran Member: Name, Address, Gender pill radio (`Pria` / `Wanita`), Date Picker, Phone.
  - Soft-delete confirmation dialog.
  - Icons exclusively from `lucide-react`.

---

### 5.3 Slice 5: POS Cashier Engine (`TICKET-SLICE-5`)
- **Module**: `apps/backend/src/modules/orders/`
- **Endpoints**:
  1. `POST /api/orders` (and alias `POST /api/orders/checkout`)
     - Body: `{ customer_id?: string | null, items: Array<{ product_id: number, quantity: number }> }`
     - Atomic Transaction Workflow:
       1. Start `db.transaction(...)`.
       2. Query products with pessimistic lock: `db.select().from(products).where(inArray(...)).for('update')`.
       3. If any item has insufficient stock or is soft-deleted, throw `UnprocessableEntityException` (422), rolling back all changes.
       4. Calculate line item subtotals from database `products.price`.
       5. Calculate order subtotal.
       6. Check `BR-006` Member Birthday Discount:
          - If `customer_id` is provided, fetch customer birth date.
          - If `birth_date` (MM-DD) matches order date (MM-DD):
            - `discount = Math.min(Math.round(subtotal * 0.05), 50000)`.
            - `total_amount = subtotal - discount`.
          - Else: `total_amount = subtotal`.
       7. Deduct physical stock: `products.stock = products.stock - item.quantity`.
       8. Generate order number: `INV-YYYYMMDD-XXXX`.
       9. Insert into `orders` table.
       10. Insert line items into `order_items` recording snapshot `unit_price`.
       11. Insert `ORDER_CREATED` event into `order_activity_logs` (with discount details if applied).
       12. Record audit log `ORDER_CREATED`.
     - Response (201): `{ success: true, data: OrderDetailData }`
     - Roles: `ADMIN`, `CASHIER`
- **Frontend (`/pos`)**:
  - Dual-pane split layout: Left catalog (65%) + Right sticky cart (35%).
  - Quick catalog search with `/` shortcut. Product cards with smart stock badges (>10 green, 5-10 yellow, <5 red, 0 disabled).
  - Walk-in vs Member switcher with member combobox autocomplete.
  - Cash payment modal with quick bill buttons (`[Uang Pas]`, `[Rp 20.000]`, `[Rp 50.000]`, `[Rp 100.000]`) and change calculator.
  - Error highlight on insufficient stock.

---

### 5.4 Slice 6: Hold/Resume Cart Isolation (`TICKET-SLICE-6`)
- **Module**: `apps/backend/src/modules/orders/`
- **Database Table**: `draft_orders` with constraint `UNIQUE(user_id)`.
- **Endpoints**:
  1. `POST /api/orders/hold`
     - Body: `{ customer_id?: string | null, items: Array<{ product_id: number, quantity: number }> }`
     - Checks if cashier currently has an existing row in `draft_orders`. If yes, returns 422.
     - Saves payload to `draft_orders`. Stock is NOT deducted.
     - Response (201): `{ success: true, message: "Keranjang berhasil di-hold" }`
  2. `GET /api/orders/held` (and alias `GET /api/orders/draft`)
     - Fetches active draft for current cashier from `draft_orders`.
     - Response (200): `{ success: true, data: DraftOrderData }`
     - Error (404): If no draft held.
  3. `DELETE /api/orders/held` (and alias `DELETE /api/orders/draft`)
     - Discards active draft for current cashier.
     - Response (200): `{ success: true, message: "Draft berhasil dibuang" }`
  4. `POST /api/orders/held/finalize`
     - Body (optional): `{ customer_id?: string | null, items?: Array<{ product_id: number, quantity: number }> }`.
     - Executes atomic checkout, promotes draft to `orders` & `order_items`, removes draft from `draft_orders`, logs `ORDER_FINALIZED` to `order_activity_logs`.
     - Response (201): `{ success: true, data: OrderDetailData }`
- **Frontend**:
  - "Tahan Keranjang (Hold)" button in cart (disabled if 1 draft already held).
  - Held Order Pill indicator in top navbar: "1 Transaksi Tertahan (Klik untuk Melanjutkan)".
  - Resume & Discard actions.

---

### 5.5 Slice 7: Orders History & Thermal Receipt Print View (`TICKET-SLICE-7`)
- **Module**: `apps/backend/src/modules/orders/`
- **Endpoints**:
  1. `GET /api/orders`
     - Query: `from`, `to`, `customer_id`, `page`, `per_page`.
     - Response (200): `{ success: true, data: OrderDetailData[], meta: PaginationMeta }`
     - Walk-in orders displayed with `customer_name = "Pelanggan Umum"`.
  2. `GET /api/orders/:id`
     - Path: `id` (can accept numeric ID or `INV-YYYYMMDD-XXXX`).
     - Response (200): `{ success: true, data: OrderDetailData }` including item snapshots and `activity_logs`.
- **Frontend (`/orders` and `/orders/[id]`)**:
  - Date range filter and customer filter toolbar.
  - Official invoice card with vertical timeline of `order_activity_logs`.
  - Thermal Print CSS: `@media print` with 80mm width, monospace font, hiding all navbar and sidebar elements.

---

### 5.6 Slice 8: Dashboard Metrics & Trend Charts (`TICKET-SLICE-8`)
- **Module**: `apps/backend/src/modules/dashboard/`
- **Endpoints**:
  1. `GET /api/dashboard/summary` (and alias `GET /api/dashboard/metrics`)
     - Query: `period`: `daily` | `monthly` | `quarterly` (default: `daily`)
     - Response (200):
       ```json
       {
         "success": true,
         "data": {
           "period": "monthly",
           "total_transactions": 35,
           "total_sales_amount": "1250000.00",
           "top_products": [
             { "product_id": 1, "product_name": "Hydrococo 150ml", "total_sold": 42, "revenue": "504000.00" }
           ],
           "slow_products": [
             { "product_id": 7, "product_name": "Biskuit Kaleng", "total_sold": 0 }
           ],
           "low_stock_products": [
             { "id": 5, "product_code": "P0005", "product_name": "Kopi Sachet", "stock": 2 }
           ]
         }
       }
       ```
     - Rules:
       - `top_products`: Top 5 active products by units sold.
       - `slow_products` (`BR-018`): Bottom 5 active products by units sold; active products with 0 sales prioritized at the top.
       - `low_stock_products`: All active products with `stock < 5`.
  2. `GET /api/dashboard/trend`
     - Query: `period`: `daily` | `monthly` | `quarterly` (default: `monthly`)
     - Response (200): `{ success: true, data: Array<{ date: string, transactions: number, revenue: string }> }`
- **Frontend (`/dashboard`)**:
  - Period switch pill (`Hari Ini`, `Bulan Ini`, `Kuartal Ini`).
  - 4 KPI cards (Omset, Total Transaksi, Produk Juara, Stok Kritis).
  - Recharts interactive gradient area chart.
  - Dual comparison panel: Top 5 Best Sellers vs Bottom 5 Slow Movers.

---

### 5.7 Slice 9: Audit Trail & Production Docker Build (`TICKET-SLICE-9`)
- **Module**: `apps/backend/src/modules/audit/`
- **Endpoints**:
  1. `GET /api/audit-logs`
     - Query: `user_id`, `action`, `entity_type`, `from`, `to`, `page`, `per_page`
     - Response (200): `{ success: true, data: AuditLogItem[], meta: PaginationMeta }`
     - Protected: `ADMIN` ONLY. Cashier blocked with HTTP 403 Forbidden.
- **Frontend (`/audit-logs`)**:
  - Admin-only page with multi-filter toolbar.
  - Modal Diff viewer with JSON before & after comparison in monospace dark theme.
- **Database Seeder (`apps/backend/src/database/seeds/index.ts`)**:
  - 2 Accounts: `admin@titipin.id` (`ADMIN`) and `kasir@titipin.id` (`CASHIER`) with password `password123` / `Admin123!` / `Kasir123!`.
  - Minimal 20 active catalog products (with varied stock levels: safe, warning, critical <5, out of stock).
  - Minimal 15 registered customers (varied genders, addresses, birth dates).
  - Minimal 30 historical orders spanning past 30 days (mixture of walk-in and member transactions).
  - Complete `order_items`, `order_activity_logs`, and `audit_logs`.
- **Production Dockerization**:
  - Backend multi-stage `Dockerfile`.
  - Frontend standalone `Dockerfile`.
  - `docker-compose.prod.yml` connecting postgres, backend, and frontend.

---

## 6. Role-Based Access Control (RBAC) Matrix

| Endpoint Route | Method | Allowed Roles | Cashier Behavior | Admin Behavior |
|----------------|--------|---------------|------------------|----------------|
| `/api/auth/*` (login, refresh, logout, me) | ANY | PUBLIC / ALL | 200 OK | 200 OK |
| `/api/auth/change-password` | POST / PATCH | ALL | 200 OK (own account) | 200 OK (own account) |
| `/api/users` | GET | `ADMIN` ONLY | **403 Forbidden** | 200 OK |
| `/api/users` | POST | `ADMIN` ONLY | **403 Forbidden** | 201 Created |
| `/api/users/:id/reset-password` | PATCH | `ADMIN` ONLY | **403 Forbidden** | 200 OK (403 if self-target) |
| `/api/users/:id` | DELETE | `ADMIN` ONLY | **403 Forbidden** | 200 OK (403 if self-target) |
| `/api/products` | GET | `ADMIN`, `CASHIER` | 200 OK | 200 OK |
| `/api/products/:id` | GET | `ADMIN`, `CASHIER` | 200 OK | 200 OK |
| `/api/products/export` | GET | `ADMIN`, `CASHIER` | 200 OK | 200 OK |
| `/api/products` | POST | `ADMIN` ONLY | **403 Forbidden** | 201 Created |
| `/api/products/:id` | PUT | `ADMIN` ONLY | **403 Forbidden** | 200 OK |
| `/api/products/:id` | DELETE | `ADMIN` ONLY | **403 Forbidden** | 200 OK |
| `/api/products/import` | POST | `ADMIN` ONLY | **403 Forbidden** | 200 OK |
| `/api/customers` | GET | `ADMIN`, `CASHIER` | 200 OK | 200 OK |
| `/api/customers` | POST | `ADMIN`, `CASHIER` | 201 Created | 201 Created |
| `/api/customers/:id` | GET | `ADMIN`, `CASHIER` | 200 OK | 200 OK |
| `/api/customers/:id` | PUT | `ADMIN` ONLY | **403 Forbidden** | 200 OK |
| `/api/customers/:id` | DELETE | `ADMIN` ONLY | **403 Forbidden** | 200 OK |
| `/api/orders` / `/checkout` | POST | `ADMIN`, `CASHIER` | 201 Created | 201 Created |
| `/api/orders/hold` | POST | `ADMIN`, `CASHIER` | 201 Created | 201 Created |
| `/api/orders/held` / `/draft` | GET | `ADMIN`, `CASHIER` | 200 OK | 200 OK |
| `/api/orders/held` / `/draft` | DELETE | `ADMIN`, `CASHIER` | 200 OK | 200 OK |
| `/api/orders/held/finalize` | POST | `ADMIN`, `CASHIER` | 201 Created | 201 Created |
| `/api/orders` | GET | `ADMIN`, `CASHIER` | 200 OK | 200 OK |
| `/api/orders/:id` | GET | `ADMIN`, `CASHIER` | 200 OK | 200 OK |
| `/api/dashboard/summary` / `/metrics` | GET | `ADMIN`, `CASHIER` | 200 OK | 200 OK |
| `/api/dashboard/trend` | GET | `ADMIN`, `CASHIER` | 200 OK | 200 OK |
| `/api/audit-logs` | GET | `ADMIN` ONLY | **403 Forbidden** | 200 OK |

---

## 7. Shared Contracts Gap Analysis (`packages/shared/src/`)

### 7.1 Existing vs Missing Types
| File | Status | Missing Definitions |
|------|--------|---------------------|
| `types/customer.types.ts` | Incomplete | Lacks `CustomerItem` snake_case alias fields (`customer_name`, `customer_address`, `birth_date`, `created_at`, `updated_at`), lacks `CustomerListResponse`, `CustomerDetailResponse`, and `CustomerQueryInput`. |
| `types/order.types.ts` | Incomplete | Has basic `Order` and `DraftOrder`, but lacks `CreateOrderInput`, `CreateOrderItemInput`, `OrderItemDetail`, `OrderActivityLogItem`, `OrderDetailData`, `OrderDetailResponse`, `OrderListResponse`, `DraftOrderData`, `DraftOrderResponse`. |
| `types/dashboard.types.ts` | Incomplete | Has legacy summary interface, but lacks OpenAPI-aligned `DashboardSummaryResponse`, `DashboardTrendItem`, `DashboardTrendResponse`, `TopProductItem`, `SlowProductItem`, `LowStockProductItem`, `DashboardPeriod` type. |
| `types/audit.types.ts` | **Missing** | Entire file missing! Needs `AuditLogItem`, `AuditLogListResponse`, `AuditQueryInput`. |

### 7.2 Existing vs Missing Zod Schemas
| File | Status | Missing Definitions |
|------|--------|---------------------|
| `schemas/customer.schema.ts` | **Missing** | Needs `createCustomerSchema`, `updateCustomerSchema`, `customerQuerySchema`. |
| `schemas/order.schema.ts` | **Missing** | Needs `createOrderItemSchema`, `createOrderSchema`, `checkoutOrderSchema`, `holdOrderSchema`, `orderQuerySchema`. |
| `schemas/dashboard.schema.ts` | **Missing** | Needs `dashboardQuerySchema` validating `period` enum `('daily' | 'monthly' | 'quarterly')`. |
| `schemas/audit.schema.ts` | **Missing** | Needs `auditQuerySchema` validating query filters. |

---

## 8. Caveats

1. **Route Naming Aliases**:
   - `docs/api/openapi.yaml` specifies `/api/orders/held`, while `ORIGINAL_REQUEST.md` specifies `/api/orders/draft`. Both route paths must be registered in the controller to ensure zero regressions across both OpenAPI contract tests and new automated tests.
   - Similarly, both `POST /api/orders` and `POST /api/orders/checkout` must be registered, as well as `GET /api/dashboard/summary` and `GET /api/dashboard/metrics`.
2. **BigInt Serialization**:
   - As mandated by DATA-MODEL.md, all Drizzle `bigint` columns must use `{ mode: 'number' }` to prevent Node.js `TypeError: Do not know how to serialize a BigInt` runtime errors.
3. **No SVG / Emoji Rule**:
   - All frontend icons must strictly be imported from `lucide-react`. Any hardcoded `<svg>` or emoji character will fail `pnpm audit:quality`.

---

## 9. Conclusion

The authoritative specifications for Titipin POS Slices 4 through 9 and the Clean Architecture Refactoring (R1) are fully defined across `DATA-MODEL.md`, `openapi.yaml`, `ADR-005`, `ADR-006`, and `ACCEPTANCE-CRITERIA.md`. 
The database tables and relations (`customers`, `orders`, `order_items`, `draft_orders`, `order_activity_logs`, `audit_logs`) are already established in Drizzle schema definitions.
The primary gaps to implement are:
1. Exporting missing Zod schemas and TypeScript interfaces in `packages/shared/src/`.
2. Refactoring existing backend services (`products`, `users`) into clean Repositories and Use-Cases (R1).
3. Implementing backend modules for `customers` (Slice 4), `orders` with row-locking, birthday discount, and draft isolation (Slices 5 & 6), order history & receipts (Slice 7), dashboard KPIs & trends (Slice 8), and audit logs controller & seeder (Slice 9).
4. Building responsive, glassmorphic Next.js 15 frontend pages (`/customers`, `/pos` cashier, `/orders`, `/orders/[id]`, `/dashboard`, `/audit-logs`).
5. Writing and passing all 9 integration test suites (`TEST-01` to `TEST-09`).

---

## 10. Verification Method

To independently verify all specifications documented in this report:

1. **Verify Database Schemas**:
   ```bash
   pnpm --filter @titipin/backend exec tsx -e "import * as s from './src/database/schema'; console.log(Object.keys(s));"
   ```
2. **Verify Shared Contracts & Typechecks**:
   ```bash
   pnpm --filter @titipin/shared build
   pnpm turbo typecheck
   ```
3. **Verify Documentation Link Integrity**:
   ```bash
   python3 scripts/verify-links.py
   ```
4. **Inspect OpenAPI Spec Coverage**:
   Inspect `docs/api/openapi.yaml` for paths:
   - `/api/customers`
   - `/api/orders`
   - `/api/orders/hold`
   - `/api/orders/held`
   - `/api/dashboard/summary`
   - `/api/dashboard/trend`
   - `/api/audit-logs`
