# TITIPIN POS — COMPREHENSIVE E2E & INTEGRATION TEST ARCHITECTURE
## 4-Tier Opaque-Box Test Strategy, Automated Integration Matrix & Test Runner Infrastructure

- **Project**: Titipin Point of Sale & Order Management System
- **Repository Root**: `/Users/yuma/Workspace/lab/titipin`
- **Document Version**: 1.0.0
- **Author**: E2E Test Writer Subagent (`e2e_test_writer`)
- **Status**: AUTHORITATIVE TEST SPECIFICATION

---

## 1. Executive Summary & Test Methodology

This document establishes the end-to-end (E2E) and integration test architecture for Titipin POS across all functional domains (Customers, POS Cashier Engine, Hold Cart Isolation, Dashboard Metrics, and Audit Trail). The testing architecture enforces a **Dual-Track Quality Strategy**:
1. **Opaque-Box Specification Derivation**: All test cases are derived strictly from authoritative specifications (`ORIGINAL_REQUEST.md`, `openapi.yaml`, `PRD.md`, `DATA-MODEL.md`, `ADR-005`, and `ADR-006`) without reliance on internal implementation details.
2. **Automated Integration Test Harness**: Supertest-driven integration test suites implemented in `apps/backend/test/` executing against a live PostgreSQL test database through NestJS HTTP routing, global validation pipes, authentication/RBAC guards, database transactions, and pessimistic row locking (`FOR UPDATE`).

### The 4-Tier Test Classification Matrix
- **Tier 1: Feature Coverage (>=5 test cases per feature)**: Core positive paths, validating functional acceptance criteria and business rules.
- **Tier 2: Boundary & Corner Cases (>=5 test cases per feature)**: Stress inputs, zero values, maximum boundaries, soft-deletion exclusion, date/time boundaries, and negative quantities.
- **Tier 3: Cross-Feature Combinations**: Pairwise and multi-module interactions (e.g., Member Birthday Discount + Multi-Item Cart, Hold Cart + Concurrent Stock Depletion, Soft-Deleted Entity Cascade Safety).
- **Tier 4: Real-World Application Scenarios**: Multi-step business journeys simulating opening shifts, peak lunch hour hold/resume bursts, cashier handovers, and daily reconciliation.

---

## 2. Authoritative Requirements & Traceability Matrix

| Feature Domain | Authoritative Reference | Business Rules / Constraints | Test Suites |
| :--- | :--- | :--- | :--- |
| **Customers & Membership** | `ORIGINAL_REQUEST.md § R2`, `openapi.yaml:440-525`, `PRD.md § Slice 4` | `BR-006` (Soft delete), Admin-only edit/delete (`RBAC`), Name 2-150 chars, Address 5-255 chars, Gender Enum (`Pria`/`Wanita`), Date `YYYY-MM-DD` | `customers.e2e-spec.ts` |
| **POS Checkout Engine** | `ORIGINAL_REQUEST.md § R3`, `openapi.yaml:529-575`, `PRD.md § Slice 5` | `TEST-01` (Member checkout), `TEST-02` (Walk-in), `TEST-03` (Atomic rollback), `BR-001` (Server pricing), `BR-004` (Pessimistic `FOR UPDATE`), `BR-006` (5% Birthday discount max Rp 50.000) | `orders.e2e-spec.ts` |
| **Hold Cart Isolation** | `ORIGINAL_REQUEST.md § R3`, `ADR-005`, `openapi.yaml:580-645`, `PRD.md § Slice 6` | `TEST-04` (Hold/Resume), `BR-012` (1 draft per cashier, `UNIQUE(user_id)`), No stock reservation until finalized | `orders.e2e-spec.ts` |
| **Orders History & Receipts** | `ORIGINAL_REQUEST.md § R4`, `openapi.yaml:650-680`, `PRD.md § Slice 7` | `BR-002` (Immutable price snapshot), Sequential invoice `INV-YYYYMMDD-XXXX`, Activity log lifecycle (`ORDER_CREATED`, `ORDER_FINALIZED`), 80mm thermal receipt | `orders.e2e-spec.ts` |
| **Dashboard Metrics** | `ORIGINAL_REQUEST.md § R4`, `openapi.yaml:685-715`, `PRD.md § Slice 8` | `BR-018` (Slow-moving product formula), Low stock threshold (`< 5`), Period aggregation (`daily`, `monthly`, `quarterly`) | `dashboard.e2e-spec.ts` |
| **Audit Trail & RBAC** | `ORIGINAL_REQUEST.md § R4`, `ADR-006`, `openapi.yaml:719-753`, `PRD.md § Slice 9` | `TEST-09` (Cashier blocked with 403 Forbidden), Tamper-evident append-only log, Before/After JSON payload diff | `audit.e2e-spec.ts` |

---

## 3. Tier 1: Feature Coverage (>=5 Test Cases Per Feature)

### 3.1 Feature 1: Customer Management (`apps/backend/test/customers.e2e-spec.ts`)
1. **TC-CST-01 [Happy Path: Register Member]**: Admin or Cashier registers member with complete valid payload (`customer_name`, `customer_address`, `gender: 'Pria'`, `birth_date: '1995-05-12'`, `phone: '08123456789'`). Response status `201 Created` with generated UUID `id` and timestamps.
2. **TC-CST-02 [Happy Path: List Members]**: Admin or Cashier requests `GET /api/customers?page=1&per_page=10`. Response status `200 OK` returns items array with pagination metadata (`total_items`, `page`, `per_page`, `total_pages`).
3. **TC-CST-03 [Happy Path: Search Member by Name]**: User queries `GET /api/customers?search=Budi`. Response status `200 OK` returns matching active customers containing substring "Budi" (case-insensitive).
4. **TC-CST-04 [Happy Path: Retrieve Member Detail]**: User queries `GET /api/customers/:id`. Response status `200 OK` returns exact customer profile details.
5. **TC-CST-05 [Happy Path: Admin Update Member]**: Admin sends `PUT /api/customers/:id` with updated address and phone. Response status `200 OK` reflects persisted changes.
6. **TC-CST-06 [Happy Path: Admin Soft-Delete Member]**: Admin sends `DELETE /api/customers/:id`. Response status `200 OK` sets `deleted_at = NOW()`. Subsequent `GET /api/customers/:id` returns `404 Not Found`.

### 3.2 Feature 2: POS Cashier Checkout & Orders Engine (`apps/backend/test/orders.e2e-spec.ts`)
1. **TC-ORD-01 [TEST-01: Atomic Member Checkout]**: Cashier checks out order with registered `customer_id` and 2 distinct products. Response `201 Created` returns sequential invoice `INV-YYYYMMDD-XXXX`, decrements product stocks atomically, snapshots `unit_price`, and records `ORDER_CREATED` activity log.
2. **TC-ORD-02 [TEST-02: Walk-In Checkout]**: Cashier checks out order with `customer_id: null`. Response `201 Created` displays "Pelanggan Umum", total calculated correctly with 0 member discount, and stock decremented.
3. **TC-ORD-03 [TEST-03: Insufficient Stock Rollback]**: Cashier requests item with `quantity > stock`. Backend aborts transaction atomically, returns `422 Unprocessable Entity`, and leaves inventory stock untouched.
4. **TC-ORD-04 [Birthday Discount BR-006]**: Member whose `birth_date` (MM-DD) matches transaction date (MM-DD) receives 5% discount (capped at Rp 50.000). Total amount reflects subtotal minus discount.
5. **TC-ORD-05 [Dual Route Path Compatibility]**: Verifies checkout succeeds via both `POST /api/orders` and alias `POST /api/orders/checkout`.
6. **TC-ORD-06 [Order History Listing & Detail]**: Cashier/Admin queries `GET /api/orders` with pagination and date filter; retrieves specific order by ID or order number via `GET /api/orders/:id` containing line items and activity log chronology.

### 3.3 Feature 3: Hold Cart Isolation (`apps/backend/test/orders.e2e-spec.ts`)
1. **TC-HLD-01 [Hold Active Cart]**: Cashier holds active queue cart via `POST /api/orders/hold`. Payload persists in `draft_orders` table. Inventory stock is NOT locked or decremented.
2. **TC-HLD-02 [Get Held Cart]**: Cashier retrieves their active draft via `GET /api/orders/held` (and alias `GET /api/orders/draft`). Returns stored items and customer ID.
3. **TC-HLD-03 [Finalize Held Cart]**: Cashier finalizes held cart via `POST /api/orders/held/finalize`. Draft is converted to completed order in `orders` table, inventory stock is decremented, draft is deleted from `draft_orders`, and `ORDER_FINALIZED` activity log is written.
4. **TC-HLD-04 [Discard Held Cart]**: Cashier discards draft via `DELETE /api/orders/held` (and alias `DELETE /api/orders/draft`). Record deleted from `draft_orders`.
5. **TC-HLD-05 [404 on Missing Draft]**: Requesting `GET /api/orders/held` or `DELETE /api/orders/held` when no draft exists returns `404 Not Found`.

### 3.4 Feature 4: Dashboard Metrics & Analytics (`apps/backend/test/dashboard.e2e-spec.ts`)
1. **TC-DSH-01 [Summary Daily Metrics]**: Cashier/Admin requests `GET /api/dashboard/summary?period=daily`. Response status `200 OK` returns `total_transactions`, `total_sales_amount`, `top_products`, `slow_products`, `low_stock_products`.
2. **TC-DSH-02 [Summary Monthly & Quarterly Metrics]**: Verifies `period=monthly` and `period=quarterly` aggregate sales across month and quarter date boundaries.
3. **TC-DSH-03 [Low Stock Detection]**: Verifies `low_stock_products` lists all active products with `stock < 5`.
4. **TC-DSH-04 [Slow-Moving Products BR-018]**: Verifies `slow_products` prioritizes active products with 0 sales at the top, followed by lowest sales volume.
5. **TC-DSH-05 [Sales Trend Time Series]**: Cashier/Admin requests `GET /api/dashboard/trend?period=monthly`. Response `200 OK` returns chronological array of daily points `{ date, transactions, revenue }`.
6. **TC-DSH-06 [Dual Route Path Compatibility]**: Verifies metrics succeed via both `GET /api/dashboard/summary` and alias `GET /api/dashboard/metrics`.

### 3.5 Feature 5: Audit Trail & RBAC Security (`apps/backend/test/audit.e2e-spec.ts`)
1. **TC-AUD-01 [TEST-09: Cashier Blocked 403 Forbidden]**: User with `CASHIER` token attempts `GET /api/audit-logs`. System returns `403 Forbidden`.
2. **TC-AUD-02 [Admin Audit Log Listing]**: User with `ADMIN` token queries `GET /api/audit-logs`. System returns `200 OK` with paginated log entries.
3. **TC-AUD-03 [Filter by Action]**: Admin filters audit logs with `?action=ORDER_CREATED` or `?action=CUSTOMER_CREATED`. Returns only matching events.
4. **TC-AUD-04 [Audit Payload Diff Verification]**: Verifies audit record contains valid `payload` JSON with `before` and `after` snapshots.
5. **TC-AUD-05 [Unauthenticated 401 Rejection]**: Request without `Authorization` header returns `401 Unauthorized`.

---

## 4. Tier 2: Boundary & Corner Cases (>=5 Test Cases Per Feature)

### 4.1 Boundary Cases: Customers
1. **BC-CST-01 [Minimum Length Name (2 chars)]**: Customer name with exactly 2 characters (e.g., "Ai") is accepted. Name with 1 character ("A") is rejected with `422 Unprocessable Entity`.
2. **BC-CST-02 [Maximum Length Name (150 chars)]**: Customer name with exactly 150 characters is accepted. Name with 151 characters is rejected with `422`.
3. **BC-CST-03 [Address Boundary (5 and 255 chars)]**: Address with 4 characters rejected; exactly 5 accepted; exactly 255 accepted; 256 rejected.
4. **BC-CST-04 [Invalid Gender Enum Value]**: Payload with `gender: 'Other'` or `gender: 'Male'` is rejected with `422` (must be `Pria` or `Wanita`).
5. **BC-CST-05 [Date Boundary: Leap Year & Non-Existent Dates]**: Birth date `2024-02-29` (leap day) is accepted. Malformed date `2023-02-29` or invalid string `1990-13-45` rejected with `422`.
6. **BC-CST-06 [Soft-Deleted Customer Exclusion]**: Soft-deleted customer ID is excluded from autocomplete search `GET /api/customers?search=...` and returns `404` when queried by UUID.

### 4.2 Boundary Cases: POS Checkout & Orders
1. **BC-ORD-01 [Zero Quantity in Checkout]**: Payload `{ items: [{ product_id: 1, quantity: 0 }] }` rejected with `422` (quantity must be positive integer >= 1).
2. **BC-ORD-02 [Negative Quantity in Checkout]**: Payload `{ items: [{ product_id: 1, quantity: -5 }] }` rejected with `422`.
3. **BC-ORD-03 [Empty Items Array]**: Payload `{ items: [] }` rejected with `422` (minimum 1 item required).
4. **BC-ORD-04 [Exact Stock Exhaustion (Stock = 5, Quantity = 5)]**: Requesting exact remaining stock decrements stock to exactly `0` without error.
5. **BC-ORD-05 [Stock Deficit of 1 (Stock = 5, Quantity = 6)]**: Requesting 1 unit over stock causes immediate atomic rollback; stock remains 5.
6. **BC-ORD-06 [Birthday Discount Maximum Cap]**: Member birthday with large purchase (e.g. Subtotal = Rp 2.000.000, 5% = Rp 100.000) caps discount at exactly Rp 50.000 (`total_amount = Rp 1.950.000`).
7. **BC-ORD-07 [Immutable Unit Price Snapshot]**: If product master price changes from Rp 10.000 to Rp 20.000 after order completion, `GET /api/orders/:id` continues to return historical `unit_price: "10000.00"`.

### 4.3 Boundary Cases: Hold Cart Isolation
1. **BC-HLD-01 [Single Active Draft Per Cashier (BR-012)]**: Cashier holding a second draft while one is already held is rejected with `422` ("Anda sudah memiliki satu transaksi yang sedang di-hold").
2. **BC-HLD-02 [Different Cashiers Independent Drafts]**: Cashier A and Cashier B can each hold 1 distinct draft simultaneously without collision.
3. **BC-HLD-03 [Hold Cart with Zero / Empty Items]**: Holding `{ items: [] }` rejected with `422`.
4. **BC-HLD-04 [Draft Order With Null Customer (Walk-In Draft)]**: Holding draft with `customer_id: null` is valid and retrievable.
5. **BC-HLD-05 [Finalize Draft When Stock Exhausted During Hold]**: If product stock becomes 0 while held in draft, finalization fails with `422`, transaction rolls back, and draft order is PRESERVED so cashier can adjust items.

### 4.4 Boundary Cases: Dashboard Metrics
1. **BC-DSH-01 [Invalid Period Parameter]**: `GET /api/dashboard/summary?period=yearly` rejected with `422` or `400` (valid periods: `daily`, `monthly`, `quarterly`).
2. **BC-DSH-02 [Zero Sales Day]**: Day with 0 transactions returns `total_transactions: 0`, `total_sales_amount: "0.00"` without null pointer exceptions.
3. **BC-DSH-03 [Boundary Stock for Low Stock Alert]**: Product with stock = 5 is NOT in `low_stock_products`. Product with stock = 4 IS in `low_stock_products` (`stock < 5`).
4. **BC-DSH-04 [Slow Products with Tied Zero Sales]**: Products with 0 sales all returned at top of `slow_products` list.
5. **BC-DSH-05 [Quarter Boundary Aggregation]**: Q1 correctly includes Jan 1 to Mar 31; excludes Apr 1.

### 4.5 Boundary Cases: Audit Trail & RBAC
1. **BC-AUD-01 [Self-Deactivation Guard]**: Admin attempting `DELETE /api/users/:adminId` on themselves rejected with `403 Forbidden`.
2. **BC-AUD-02 [Self-Password Reset Guard]**: Admin attempting `PATCH /api/users/:adminId/reset-password` on themselves rejected with `403 Forbidden`.
3. **BC-AUD-03 [Cashier Editing Customer]**: Cashier attempting `PUT /api/customers/:id` rejected with `403 Forbidden`.
4. **BC-AUD-04 [Cashier Deleting Customer]**: Cashier attempting `DELETE /api/customers/:id` rejected with `403 Forbidden`.
5. **BC-AUD-05 [Tamper Resistance]**: Audit logs table has no `PUT` or `DELETE` HTTP endpoints exposed; records are strictly append-only.

---

## 5. Tier 3: Cross-Feature Combinations

| Test Case ID | Feature 1 | Feature 2 | Scenario Description | Expected Outcome |
| :--- | :--- | :--- | :--- | :--- |
| **TC-XFT-01** | POS Checkout | Customer Birthday | Member birthday order with 5 items of different quantities where subtotal exceeds Rp 1.000.000 | 5% discount calculated across all line items, capped at Rp 50.000, all stock decremented atomically. |
| **TC-XFT-02** | Hold Cart | Inventory Deduction | Cashier A holds 5 units of Product X (stock: 5). Cashier B checks out 5 units of Product X | Cashier B checkout succeeds (stock becomes 0). When Cashier A attempts to finalize draft, transaction fails with 422 stock deficit rollback. |
| **TC-XFT-03** | Product Soft-Delete | POS Checkout | Product Y is soft-deleted by Admin. Cashier attempts to checkout cart containing Product Y | Checkout rejected with 422 ("Produk tidak ditemukan atau sudah dinonaktifkan"). Zero stock decremented. |
| **TC-XFT-04** | Customer Soft-Delete | POS Checkout | Customer Z is soft-deleted. Cashier attempts checkout referencing Customer Z's ID | Checkout rejected with 422 or customer ignored. |
| **TC-XFT-05** | POS Checkout | Central Audit Log | Cashier completes checkout of order | Order created in `orders`, items in `order_items`, activity log in `order_activity_logs`, and audit trail entry `ORDER_CREATED` written in `audit_logs`. |
| **TC-XFT-06** | POS Checkout | Dashboard Analytics | Cashier checks out order for Rp 150.000. Immediately queries dashboard summary for `daily` | `total_transactions` increments by 1; `total_sales_amount` increases by 150000.00; product appears in `top_products`. |
| **TC-XFT-07** | Hold Cart | Discard & New Hold | Cashier holds draft, changes mind, discards via `DELETE /api/orders/held`, then immediately holds a different cart | Discard returns 200; subsequent hold returns 201; no duplicate key conflict on `draft_orders.user_id`. |
| **TC-XFT-08** | Concurrency Locking | POS Checkout | Two cashiers send checkout for the same product (stock = 1) at the exact same time | Pessimistic `FOR UPDATE` serializes requests. First cashier gets 201; second cashier gets 422. Stock ends at 0 (never negative). |

---

## 6. Tier 4: Real-World Application Scenarios

### 6.1 Scenario 1: Morning Cashier Shift Opening & Walk-In Peak
- **Steps**:
  1. Cashier logs in via `/api/auth/login`.
  2. Cashier registers a new walk-in member who wanted a loyalty card via `POST /api/customers`.
  3. Cashier processes 3 consecutive walk-in sales (`customer_id: null`) for morning snacks and drinks.
  4. Each sale decrements stock and issues consecutive invoices (`INV-YYYYMMDD-0001`, `INV-YYYYMMDD-0002`, `INV-YYYYMMDD-0003`).
  5. Cashier queries `GET /api/orders` to verify transactions appear in morning shift history.
- **Verification**: Invoices are sequential; walk-in customer displayed as "Pelanggan Umum"; stock counts accurately reduced.

### 6.2 Scenario 2: Lunch Rush Queue Hold & Multi-Customer Handling
- **Steps**:
  1. Cashier scans 4 items for Customer A.
  2. Customer A forgot wallet; Cashier puts order on hold via `POST /api/orders/hold`.
  3. Cashier immediately serves Customer B (walk-in) and completes checkout.
  4. Customer A returns with wallet; Cashier retrieves held order via `GET /api/orders/held`.
  5. Cashier finalizes Customer A's held order via `POST /api/orders/held/finalize`.
  6. Cashier checks `GET /api/orders/held` and receives `404 Not Found` (draft cleanly consumed).
- **Verification**: Draft successfully isolated, Customer B was not blocked, Customer A transaction finalized cleanly with `ORDER_FINALIZED` activity log.

### 6.3 Scenario 3: Member Birthday Celebration & Price Fluctuation
- **Steps**:
  1. Member registered with birthday matching today's date.
  2. Member purchases Rp 500.000 of goods.
  3. 5% birthday discount applied (Rp 25.000 discount, net total Rp 475.000).
  4. Order saved with invoice and snapshot price.
  5. Admin later updates master product price in catalog (`PUT /api/products/:id`).
  6. Cashier views past invoice detail `GET /api/orders/:id`.
- **Verification**: Historical invoice still shows original purchased price and discounted total; master product price change does NOT retroactively alter historical sale.

### 6.4 Scenario 4: Daily Settlement & End-of-Day Audit Reconciliation
- **Steps**:
  1. Store closes for the day.
  2. Admin logs in with `ADMIN` role.
  3. Admin queries `GET /api/dashboard/summary?period=daily` to review total revenue and order count.
  4. Admin queries `GET /api/audit-logs` filtering by today's date to verify all product edits, staff logouts, and checkout audit entries.
  5. Cashier attempts to access `GET /api/audit-logs` and is firmly blocked with `403 Forbidden`.
- **Verification**: Metric numbers match sum of orders; audit trail contains complete tamper-evident audit history; RBAC enforced.

---

## 7. Automated Integration Test Suites in `apps/backend/test/`

The test runner architecture implements Supertest integration suites in `apps/backend/test/`:

1. **`orders.e2e-spec.ts`**:
   - `TEST-01`: Atomic Member Checkout (stock deduction, invoice sequence, activity log).
   - `TEST-02`: Walk-in Checkout (`customer_id: null`, "Pelanggan Umum").
   - `TEST-03`: Insufficient Stock Rollback (atomic rollback, stock unmodified).
   - `TEST-04`: Hold Cart Isolation (`draft_orders`, single draft per cashier, resume & finalize).
   - `TEST-05`: Input Validation Failure (negative quantity, empty items, corrupt payload).
   - Historical orders listing (`GET /api/orders`) and detail (`GET /api/orders/:id`).
   - Birthday discount calculation (`BR-006`) with cap at Rp 50.000.

2. **`customers.e2e-spec.ts`**:
   - Member registration (`POST /api/customers`) with Zod validation.
   - Member search and pagination (`GET /api/customers`).
   - Member detail retrieval (`GET /api/customers/:id`).
   - Admin update (`PUT /api/customers/:id`) & Cashier rejection (`403 Forbidden`).
   - Admin soft-delete (`DELETE /api/customers/:id`) & Cashier rejection (`403 Forbidden`).
   - Soft-delete exclusion from active queries.

3. **`dashboard.e2e-spec.ts`**:
   - Daily, Monthly, and Quarterly summary aggregation (`GET /api/dashboard/summary` & alias `/metrics`).
   - Top 5 products and Slow 5 products (`BR-018` with zero-sales priority).
   - Low stock products (`stock < 5`).
   - Sales trend points (`GET /api/dashboard/trend`).
   - Validation of period parameter.

4. **`audit.e2e-spec.ts`**:
   - `TEST-09`: Cashier blocked from audit logs (`403 Forbidden`).
   - Unauthenticated request rejected (`401 Unauthorized`).
   - Admin audit retrieval with pagination and action filter (`GET /api/audit-logs`).
   - Payload diff validation.

---

## 8. Test Execution Commands & Environment

```bash
# Execute entire test suite across monorepo
pnpm test

# Execute backend tests specifically
pnpm --filter @titipin/backend test

# Execute specific e2e test suite
pnpm --filter @titipin/backend exec vitest run test/orders.e2e-spec.ts
pnpm --filter @titipin/backend exec vitest run test/customers.e2e-spec.ts
pnpm --filter @titipin/backend exec vitest run test/dashboard.e2e-spec.ts
pnpm --filter @titipin/backend exec vitest run test/audit.e2e-spec.ts

# Code coverage report
pnpm test:cov
```
