# Handoff Report: Milestone 2 — Slice 4 (Customers & Membership Management) Test Coverage, RBAC Matrix & Git Flow

## 1. Observation

### 1.1 Test Suite Analysis (`apps/backend/test/customers.e2e-spec.ts`)
Inspection of `apps/backend/test/customers.e2e-spec.ts` (lines 1–299) confirms the existing E2E test file defines 10 test scenarios under `describe('CustomersController & Membership Engine (E2E)')`:

1. **Module Probe & Skip Guard** (lines 54–60):
   ```typescript
   const probeRes = await request(app.getHttpServer())
     .get('/api/customers')
     .set('Authorization', `Bearer ${cashierAccessToken}`);
   if (probeRes.body?.message !== 'Cannot GET /api/customers') {
     isCustomersModuleMounted = true;
   }
   ```
   When `CustomersModule` is not yet mounted in `app.module.ts`, each test calls `ctx.skip()`. Direct execution via `pnpm --filter @titipin/backend test test/customers.e2e-spec.ts` completed with `1 passed (10 tests | 10 skipped)`. Once `CustomersModule` is mounted, all 10 tests run automatically.

2. **Test 1 — Unauthenticated Access (TEST-06)** (lines 67–74):
   - Request: `GET /api/customers` without Authorization header.
   - Verbatim Assertion: `expect(response.status).toBe(401);`

3. **Test 2 — Admin Member Registration** (lines 76–105):
   - Request: `POST /api/customers` with `adminAccessToken`.
   - Payload:
     ```json
     {
       "customer_name": "Member Test <suffix>",
       "customer_address": "Jl. Surya Kencana No. 42 Bogor",
       "gender": "Pria",
       "birth_date": "1995-08-20",
       "phone": "081299881122"
     }
     ```
   - Assertions: `status === 201`, `body.success === true`, `data.id` is defined, `data.customer_name || data.customerName === testCustomerName`, `data.gender === 'Pria'`, `data.birth_date || data.birthDate === '1995-08-20'`.

4. **Test 3 — Cashier Member Registration** (lines 107–128):
   - Request: `POST /api/customers` with `cashierAccessToken`.
   - Payload: `customer_name: "Member Kasir <suffix>", gender: "Wanita", birth_date: "1998-11-05", phone: "081377889900"`.
   - Assertions: `status === 201`, `body.success === true`, `body.data.id` is defined.
   - **Crucial Rule**: Cashiers ARE explicitly allowed to register members. Endpoint MUST NOT be locked to Admin only.

5. **Test 4 — Search & Pagination** (lines 130–146):
   - Request: `GET /api/customers?search=${testCustomerName}` with `cashierAccessToken`.
   - Assertions: `status === 200`, `body.success === true`, `Array.isArray(body.data) === true`, `body.data.length >= 1`, `body.meta.page === 1`.
   - Allowed roles: Both Cashier and Admin.

6. **Test 5 — Retrieve Customer Profile by UUID** (lines 148–162):
   - Request: `GET /api/customers/${createdCustomerId}` with `cashierAccessToken`.
   - Assertions: `status === 200`, `body.success === true`, `body.data.id === createdCustomerId`.
   - Allowed roles: Both Cashier and Admin.

7. **Test 6 — Admin Profile Update** (lines 164–184):
   - Request: `PUT /api/customers/${createdCustomerId}` with `adminAccessToken`.
   - Payload: `{ customer_name, customer_address, phone }`.
   - Assertions: `status === 200`, `body.success === true`, `body.data.customer_name === updatedName`.

8. **Test 7 — RBAC Cashier Blocked from Updating Profile** (lines 186–200):
   - Request: `PUT /api/customers/${createdCustomerId}` with `cashierAccessToken`.
   - Assertion: `expect(response.status).toBe(403);`
   - Allowed roles: Admin only (`@Roles(Role.ADMIN)`).

9. **Test 8 — RBAC Cashier Blocked from Deleting Profile** (lines 202–213):
   - Request: `DELETE /api/customers/${createdCustomerId}` with `cashierAccessToken`.
   - Assertion: `expect(response.status).toBe(403);`
   - Allowed roles: Admin only (`@Roles(Role.ADMIN)`).

10. **Test 9 — Soft Delete & Catalog Exclusion** (lines 215–242):
    - Sub-step 1: Admin sends `DELETE /api/customers/${createdCustomerId}` -> `status === 200`.
    - Sub-step 2: Cashier queries `GET /api/customers/${createdCustomerId}` -> `expect(getRes.status).toBe(404);`.
    - Sub-step 3: Cashier searches `GET /api/customers?search=${testCustomerName}` -> `searchRes.body.data.some(c => c.id === createdCustomerId) === false`.

11. **Test 10 — Input Validation & Error Handling** (lines 244–297):
    - Case A: Invalid gender enum (`gender: 'Other'`) -> `expect(resGender.status).toBe(422)`.
    - Case B: Non YYYY-MM-DD birth_date (`birth_date: '01/01/1990'`) -> `expect(resDate.status).toBe(422)`.
    - Case C: Customer name < 2 characters (`customer_name: 'A'`) -> `expect(resShortName.status).toBe(422)`.
    - Case D: Customer address < 5 characters (`customer_address: 'Jl'`) -> `expect(resShortAddress.status).toBe(422)`.

### 1.2 Downstream & Cross-Suite Test Invocations
- In `apps/backend/test/orders.e2e-spec.ts`:
  - Lines 93–133: The POS orders E2E test probes `/api/customers` and automatically provisions two customers (`testCustomerId` and `testBirthdayCustomerId`) via `POST /api/customers` using `cashierAccessToken`.
  - Lines 440–463: Tests `BR-006: Applies 5% Member Birthday Discount (capped at Rp 50.000) when birth date matches order date`.
- In `packages/shared/src/schemas/customer.schema.ts` & `packages/shared/src/types/customer.types.ts`:
  - `createCustomerSchema`, `updateCustomerSchema`, and `customerQuerySchema` are fully defined with Zod.
  - `CustomerItem` defines dual support for camelCase (`customerName`, `customerAddress`, `birthDate`) and snake_case aliases (`customer_name`, `customer_address`, `birth_date`).
- In `packages/shared/src/enums/audit-action.enum.ts`:
  - Lines 7–9 define `AuditAction.CUSTOMER_CREATED`, `CUSTOMER_UPDATED`, and `CUSTOMER_DELETED`.

### 1.3 Baseline System State
- Current git branch: `develop` at commit `7fffc5a` (`merge: feature/clean-architecture into develop`).
- All 10 backend test files passed (44 passed, 33 skipped awaiting slice implementations).
- All 7 frontend test files passed (30 passed, 0 failed).
- `pnpm audit:quality` exited with code 0 (0 raw inline SVG, 0 lint errors, 0 TS errors).
- `pnpm audit:links` checked 140 links, 100% valid.

---

## 2. Logic Chain

1. **Controller & Endpoint RBAC Specification**:
   - `CustomersController` must have class-level `@UseGuards(JwtAuthGuard, RolesGuard)`.
   - `GET /api/customers`, `GET /api/customers/:id`, and `POST /api/customers` must NOT specify `@Roles(Role.ADMIN)` because cashier authentication is explicitly verified in tests 3, 4, and 5 (`customers.e2e-spec.ts:116, 138, 156`).
   - `PUT /api/customers/:id` and `DELETE /api/customers/:id` MUST specify `@Roles(Role.ADMIN)` because cashier requests must be rejected with 403 Forbidden (`customers.e2e-spec.ts:199, 212`).

2. **Clean Architecture Module Decomposition**:
   Following the precedent set in `ProductsModule` and `UsersModule` (as refactored in Milestone 1):
   - **Repository** (`apps/backend/src/modules/customers/repositories/customers.repository.ts`):
     - `findAll(query: CustomerQueryInput, tx?: DrizzleClient)`: filters `isNull(deletedAt)`, handles `search` (case-insensitive substring match on `customerName`), handles pagination (`offset = (page - 1) * perPage`), returns `{ items, total }`.
     - `findById(id: string, includeDeleted = false, tx?: DrizzleClient)`: queries `schema.customers` by UUID, filters `isNull(deletedAt)` by default.
     - `create(data: { customerName, customerAddress, gender, birthDate, phone }, tx?: DrizzleClient)`: inserts into `schema.customers` returning created record.
     - `update(id: string, data: Partial<...>, tx?: DrizzleClient)`: updates record and sets `updatedAt = new Date()`.
     - `softDelete(id: string, tx?: DrizzleClient)`: executes `update` setting `deletedAt = new Date(), updatedAt = new Date()`.
   - **Use-Cases** (`apps/backend/src/modules/customers/use-cases/`):
     - `FindCustomersUseCase`: transforms query results into `CustomerListResponse` containing `meta` pagination.
     - `GetCustomerByIdUseCase`: fetches customer or throws `NotFoundException('Pelanggan tidak ditemukan')` (essential for 404 behavior in test 9).
     - `CreateCustomerUseCase`: invokes repository, records `AuditAction.CUSTOMER_CREATED` in `AuditService`.
     - `UpdateCustomerUseCase`: checks existence (throws 404 if not found), updates record, records `AuditAction.CUSTOMER_UPDATED`.
     - `DeleteCustomerUseCase`: checks existence (throws 404 if not found), soft deletes record, records `AuditAction.CUSTOMER_DELETED`.
   - **Service Facade** (`CustomersService`):
     - Injects and delegates to each use-case, providing backward-compatible facade.
   - **Controller** (`CustomersController`):
     - Applies `ZodValidationPipe` on inputs. Handles routes `/api/customers`.

3. **Frontend Implementation & Testing Alignment**:
   - Page route: `apps/frontend/src/app/(dashboard)/customers/page.tsx`.
   - UI Elements: Glassmorphism table (`.glass-panel`, `.glass-card`), member registration modal with gender pills and birth date picker, member edit modal, and soft-delete confirmation dialog.
   - RBAC in UI: Cashier can register new members (`+ Tambah Member` visible); Admin has full access (`+ Tambah Member`, `Ubah`, `Hapus`).
   - Icon Ban Compliance: All icons strictly imported from `lucide-react` (`UserPlus`, `Edit2`, `Trash2`, `Search`, `Calendar`, etc.). Zero `<svg>` and zero unicode emoji.
   - Component Test: `apps/frontend/src/app/(dashboard)/customers/customers.test.tsx` mocking `apiClient` and verifying both Admin and Cashier rendering states.

---

## 3. Caveats

1. **Database UUID Format**: Customer primary keys are generated as PostgreSQL UUIDs (`uuid('id').defaultRandom()`). Unlike integer product IDs (`ParseIntPipe`), customer routes use string UUIDs (`/api/customers/:id`).
2. **Serial Test Execution Requirement**: Vitest in `apps/backend/vitest.config.ts` enforces `fileParallelism: false`. Tests should always be run serially (default in config) to avoid race conditions or dirty database states between e2e test files.
3. **No Direct Drizzle Calls in Controllers or Use-Cases**: In adherence with `ORIGINAL_REQUEST.md § R1`, Drizzle queries (`db.select()`, `db.insert()`, `db.update()`) must exist strictly inside `CustomersRepository`.

---

## 4. Conclusion

The specification, test expectations, and RBAC rules for Slice 4 (Customers & Membership Management) are completely verified:

### 4.1 Endpoint & RBAC Matrix
| HTTP Method | Route | Roles Allowed | Status Code (Success) | Status Code (Forbidden/Error) | Audit Action Logged |
|---|---|---|---|---|---|
| `GET` | `/api/customers` | `ADMIN`, `CASHIER` | `200 OK` | `401 Unauthorized` | None |
| `POST` | `/api/customers` | `ADMIN`, `CASHIER` | `201 Created` | `401`, `422 Unprocessable` | `CUSTOMER_CREATED` |
| `GET` | `/api/customers/:id` | `ADMIN`, `CASHIER` | `200 OK` | `401`, `404 Not Found` | None |
| `PUT` | `/api/customers/:id` | `ADMIN` only | `200 OK` | `401`, `403 Forbidden`, `404`, `422` | `CUSTOMER_UPDATED` |
| `DELETE` | `/api/customers/:id` | `ADMIN` only | `200 OK` | `401`, `403 Forbidden`, `404 Not Found` | `CUSTOMER_DELETED` |

### 4.2 Git Flow Execution Plan
To implement and verify Slice 4 without regressions:

1. **Branch Checkout**:
   ```bash
   git checkout develop
   git checkout -b feature/slice-4-customers
   ```

2. **Implementation Sequence**:
   - **Step A**: Implement `CustomersRepository` in `apps/backend/src/modules/customers/repositories/customers.repository.ts`.
   - **Step B**: Implement Use-Cases (`FindCustomersUseCase`, `GetCustomerByIdUseCase`, `CreateCustomerUseCase`, `UpdateCustomerUseCase`, `DeleteCustomerUseCase`) in `apps/backend/src/modules/customers/use-cases/`.
   - **Step C**: Implement `CustomersService` and `CustomersController`.
   - **Step D**: Register `CustomersModule` in `apps/backend/src/app.module.ts`.
   - **Step E**: Implement Frontend `/customers` page and modal components in `apps/frontend/src/app/(dashboard)/customers/page.tsx`.
   - **Step F**: Implement frontend test suite in `apps/frontend/src/app/(dashboard)/customers/customers.test.tsx`.

3. **Verification Command Pipeline**:
   ```bash
   # 1. Audit frontend for forbidden icons
   grep -rn "<svg" apps/frontend/src/

   # 2. Run linting across entire monorepo
   pnpm turbo lint

   # 3. Strict TypeScript typechecking
   pnpm turbo typecheck

   # 4. Automated test suite execution (backend + frontend)
   pnpm turbo test

   # 5. Full compliance quality audit
   pnpm audit:quality

   # 6. Documentation links verification
   pnpm audit:links
   ```

4. **Merge and Branch Cleanup**:
   ```bash
   git checkout develop
   git merge --no-ff feature/slice-4-customers -m "merge: feature/slice-4-customers into develop"
   git branch -d feature/slice-4-customers
   ```

---

## 5. Verification Method

To independently reproduce and verify this investigation:

1. **Verify Backend Customer Test Suite**:
   ```bash
   cd /Users/yuma/Workspace/lab/titipin
   pnpm --filter @titipin/backend test test/customers.e2e-spec.ts
   ```
   *Expected outcome*: 1 test file executed, 10 tests collected and skipped due to unmounted module probe guard.

2. **Verify Full Monorepo Quality & Linting Baseline**:
   ```bash
   pnpm audit:quality
   ```
   *Expected outcome*: All 4 audit phases pass (0 raw svg, 0 lint errors, 0 typecheck errors, test suites exit with 0).

3. **Verify Documentation Links**:
   ```bash
   pnpm audit:links
   ```
   *Expected outcome*: All 140 markdown links valid.

4. **Invalidation Conditions**:
   - If `POST /api/customers` is decorated with `@Roles(Role.ADMIN)`, Cashier customer creation will fail with 403, breaking test case 3 (`customers.e2e-spec.ts:107`) and breaking downstream POS order checkout (`orders.e2e-spec.ts:101`).
   - If `GET /api/customers/:id` returns 200 or null instead of throwing `NotFoundException` (HTTP 404) for soft-deleted customers, test case 9 will fail (`customers.e2e-spec.ts:233`).
   - If raw `<svg>` elements are introduced in `apps/frontend/src/app/(dashboard)/customers/`, `pnpm audit:quality` will fail immediately at step 1/4.
