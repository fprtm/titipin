# Milestone 1 Challenge Report: Empirical Stress-Testing of Shared Contracts & Architecture

**Challenger**: `challenger_m1_2` (Challenger 2)  
**Date**: 2026-10-27T18:07:00Z  
**Target**: Milestone 1 Deliverables (`@titipin/shared` contracts, backend clean architecture refactoring)  
**Verdict**: **`REQUEST_CHANGES`**  

---

## 1. Observation

Direct empirical observations, reproducible test runs, line numbers, and verbatim outputs:

### A. Zod Schema Boundary Stress Tests (`packages/shared/src/schemas/`)

Using Node.js against `@titipin/shared` (`packages/shared/dist/index.js` and source files), empirical tests yielded the following direct results:

1. **Gender Enum Validation (`packages/shared/src/schemas/customer.schema.ts:15-17`)**:
   - `createCustomerSchema.safeParse({ ..., gender: 'Pria' })` -> **PASS** (`success: true`)
   - `createCustomerSchema.safeParse({ ..., gender: 'Wanita' })` -> **PASS** (`success: true`)
   - `createCustomerSchema.safeParse({ ..., gender: 'pria' })` -> **REJECTED** (`Pilihan gender harus Pria atau Wanita`)
   - `createCustomerSchema.safeParse({ ..., gender: 'Male' })` -> **REJECTED** (`Pilihan gender harus Pria atau Wanita`)
   - `createCustomerSchema.safeParse({ ..., gender: 'Other' })` -> **REJECTED** (`Pilihan gender harus Pria atau Wanita`)
   - `createCustomerSchema.safeParse({ ..., gender: '' })` -> **REJECTED** (`Pilihan gender harus Pria atau Wanita`)
   - `createCustomerSchema.safeParse({ ..., gender: null })` -> **REJECTED** (`Pilihan gender harus Pria atau Wanita`)

2. **Birth Date Calendar & Leap Day Validation (`customer.schema.ts:18-20, 49-51`)**:
   - Regex currently used: `regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal lahir harus YYYY-MM-DD')`
   - Valid standard date `1990-05-15`: **PASS** (`success: true`)
   - Valid leap year leap day `2024-02-29`: **PASS** (`success: true`)
   - Valid century leap year leap day `2000-02-29`: **PASS** (`success: true`)
   - **Invalid non-leap year leap day `2023-02-29`**: **VULNERABILITY DETECTED**!
     - `createCustomerSchema.safeParse({ ..., birth_date: '2023-02-29' })` evaluated to `success: true`!
     - Output: `{ birth_date: '2023-02-29' }`.
   - **Non-existent calendar day `2024-02-30`**: **VULNERABILITY DETECTED**!
     - `createCustomerSchema.safeParse({ ..., birth_date: '2024-02-30' })` evaluated to `success: true`!
   - **Impossible calendar month & day `9999-99-99`**: **VULNERABILITY DETECTED**!
     - `createCustomerSchema.safeParse({ ..., birth_date: '9999-99-99' })` evaluated to `success: true`!

3. **String Length Boundaries & Whitespace Trimming (`customer.schema.ts:5-14`)**:
   - Schema definition:
     ```typescript
     customer_name: z.string().min(2, ...).max(150, ...).transform((val) => val.trim()),
     customer_address: z.string().min(5, ...).max(255, ...).transform((val) => val.trim()),
     ```
   - Name 1 character (`'A'`): **REJECTED** (`Nama pelanggan minimal 2 karakter`).
   - Name 2 characters (`'AB'`): **PASS** (`success: true`).
   - Name 150 characters: **PASS** (`success: true`).
   - Name 151 characters: **REJECTED** (`Nama pelanggan maksimal 150 karakter`).
   - **Whitespace-only Name (`'   '`)**: **VULNERABILITY DETECTED**!
     - Length of `'   '` is 3, satisfying `.min(2)`.
     - `.transform((val) => val.trim())` executes *after* `.min(2)`, producing `""` (empty string).
     - `createCustomerSchema.safeParse({ customer_name: '   ', ... })` -> `success: true`, `data.customer_name: ""`.
   - **Whitespace-padded 1-letter Name (`' A '`)**: **VULNERABILITY DETECTED**!
     - Length of `' A '` is 3, satisfying `.min(2)`.
     - Output transforms to `'A'`, violating the minimum 2-character business requirement.
   - **Whitespace-only Address (`'      '`)**: **VULNERABILITY DETECTED**!
     - Length of `'      '` is 6, satisfying `.min(5)`.
     - Output transforms to `""`, violating the address requirement and passing validation.

4. **Order Schemas: Items & Quantities (`packages/shared/src/schemas/order.schema.ts`)**:
   - `items: []` (empty array): **REJECTED** (`Item transaksi tidak boleh kosong`).
   - `items: [{ product_id: 1, quantity: -1 }]`: **REJECTED** (`Kuantitas minimal 1`).
   - `items: [{ product_id: 1, quantity: 0 }]`: **REJECTED** (`Kuantitas minimal 1`).
   - `items: [{ product_id: 1, quantity: 1.5 }]`: **REJECTED** (`Kuantitas harus berupa bilangan bulat`).
   - `items: [{ product_id: 0, quantity: 1 }]`: **REJECTED** (`ID produk harus valid`).
   - `items: [{ product_id: -5, quantity: 1 }]`: **REJECTED** (`ID produk harus valid`).
   - `customer_id: 'not-a-uuid'`: **REJECTED** (`Format ID pelanggan tidak valid`).
   - `customer_id: null` / `undefined`: **PASS** (correctly supports walk-in orders `Pelanggan Umum`).
   - `holdOrderSchema`: **PASS** (exhibits identical validation rules as `checkoutOrderSchema`).

5. **Query Schemas Sorting Defaults (`customer.schema.ts:68`, `order.schema.ts:37`)**:
   - In `customerQuerySchema`:
     ```typescript
     order: z.enum(['asc', 'desc']).default('asc').optional(),
     ```
   - In `orderQuerySchema`:
     ```typescript
     order: z.enum(['asc', 'desc']).default('desc').optional(),
     ```
   - **Default neutralisation**: **VULNERABILITY DETECTED**!
     - Parsing empty object `{}` on `customerQuerySchema` yields `{ page: 1, per_page: 10, order: undefined }` instead of `{ order: 'asc' }`.
     - Parsing `{}` on `orderQuerySchema` yields `{ page: 1, per_page: 10, order: undefined }` instead of `{ order: 'desc' }`.
     - Placing `.optional()` after `.default(...)` in Zod creates a `ZodOptional` wrapper that absorbs `undefined` before the inner default is reached. (In contrast, `productQuerySchema:38` correctly defines `order: z.enum(['asc', 'desc']).default('asc')`).

6. **Cumulative Stock Check on Duplicate Order Items (`lock-and-deduct-stock.use-case.ts:40-54`)**:
   - Input payload: `items: [{ productId: 1, quantity: 3 }, { productId: 1, quantity: 3 }]` with available stock = 5.
   - Validation iterates individually:
     - Item 1: `product.stock (5) >= item.quantity (3)` -> passes.
     - Item 2: `product.stock (5) >= item.quantity (3)` -> passes.
   - Deduction:
     - First update: `stock = 5 - 3 = 2`.
     - Second update: `stock = 2 - 3 = -1` -> Triggers PostgreSQL check constraint failure `check_stock_non_negative (stock >= 0)`.
     - Result: Uncaught DB query exception instead of clean `UnprocessableEntityException` (422).

### B. Backward Compatibility: Backend Integration Test Suite

Direct execution of `pnpm --filter @titipin/backend test -- --run` without cache:
```
 ✓ test/users.e2e-spec.ts (9 tests) 797ms
 ✓ test/auth.e2e-spec.ts (10 tests) 1258ms
 ✓ test/products.e2e-spec.ts (9 tests) 1034ms
 ✓ test/orders.e2e-spec.ts (11 tests | 11 skipped) 746ms
 ✓ test/customers.e2e-spec.ts (10 tests | 10 skipped) 870ms
 ✓ test/dashboard.e2e-spec.ts (7 tests | 7 skipped) 746ms
 ✓ test/audit.e2e-spec.ts (5 tests | 5 skipped) 1030ms
 ✓ test/health.e2e-spec.ts (2 tests) 124ms
 ✓ src/modules/audit/audit.service.spec.ts (3 tests) 16ms

 Test Files  9 passed (9)
      Tests  33 passed | 33 skipped (66)
   Duration  25.96s
```
All existing integration tests pass with 100% success against the refactored Repositories and Use-Cases.

---

## 2. Logic Chain

1. **Impact of Invalid Calendar Date in `birth_date`**:
   - The Drizzle schema for `customers` (`apps/backend/src/database/schema/customers.schema.ts:12`) defines `birthDate: date('birth_date', { mode: 'string' }).notNull()`.
   - PostgreSQL parses the `date` type strictly. When an invalid date like `'2023-02-29'` or `'9999-99-99'` is sent, PostgreSQL aborts the query with `SQLSTATE 22008 (date/time field value out of range)`.
   - Because the Zod schema fails to catch this at the controller validation pipe layer (where HTTP 400 Bad Request should be returned), the request reaches the database and crashes with an unhandled HTTP 500 Internal Server Error.
   - Furthermore, `BR-006` computes birthday discounts using `MM-DD`. Allowing corrupted or non-existent dates undermines discount logic consistency.

2. **Impact of Post-Validation Trimming on String Length**:
   - Chaining `.min(2).transform(v => v.trim())` means length validation runs against untrimmed whitespace.
   - When a user inputs spaces (`'   '`), length is 3, passing `.min(2)`. The subsequent transform turns it into `""`.
   - PostgreSQL allows empty strings in `varchar(150) NOT NULL`. As a result, members with completely blank names (`""`) or single-character names (`"A"`) will be permanently persisted in the database.
   - This violates the explicit domain rule in `DATA-MODEL.md`: "Nama pelanggan minimal 2 karakter".

3. **Impact of Neutralized Query Defaults**:
   - Omitting `order` in `GET /api/customers` or `GET /api/orders` results in `query.order === undefined`.
   - In `customers.repository.ts` and `orders.repository.ts`, repository methods check `const isDesc = query.order === 'desc'`. If `query.order` is `undefined`, it may fall back to `asc` or omit explicit order by clauses, contrary to the documented default contract (`order: 'asc'` for customers, `order: 'desc'` for orders).

4. **Recommendation for Gate Verdict**:
   - Although the architecture refactoring is clean and passes all existing tests, Milestone 1 is the **Shared Contracts** milestone. Allowing known validation flaws in `@titipin/shared` directly compromises Milestone 2 (Slice 4: Customer Management) and Milestone 3 (Slices 5 & 6: Orders & Checkout).
   - Therefore, the verdict must be **`REQUEST_CHANGES`** to address these 3 schema definitions in `@titipin/shared` and the duplicate item check before proceeding to Milestone 2.

---

## 3. Caveats

- Milestone 1 encompasses shared contracts and clean architecture refactoring for existing modules. Customer, Order, Dashboard, and Audit HTTP controllers and UI pages are designated for Milestones 2 through 5.
- The 4 future test suites (`test/{customers,orders,dashboard,audit}.e2e-spec.ts`) exist as untracked files with runtime mount probing; they correctly skip when endpoints are not mounted.
- No other areas left uninvestigated.

---

## 4. Conclusion & Required Changes

**Final Verdict: `REQUEST_CHANGES`**

The following concrete fixes must be applied by a worker before Milestone 2 begins:

### Change 1: Fix `customer_name`, `customer_address`, and `birth_date` in `packages/shared/src/schemas/customer.schema.ts`
```typescript
// Replace lines 4-27 with:
export const createCustomerSchema = z.object({
  customer_name: z
    .string()
    .trim()
    .min(2, 'Nama pelanggan minimal 2 karakter')
    .max(150, 'Nama pelanggan maksimal 150 karakter'),
  customer_address: z
    .string()
    .trim()
    .min(5, 'Alamat minimal 5 karakter')
    .max(255, 'Alamat maksimal 255 karakter'),
  gender: z.nativeEnum(Gender, {
    errorMap: () => ({ message: 'Pilihan gender harus Pria atau Wanita' }),
  }),
  birth_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal lahir harus YYYY-MM-DD')
    .refine((val) => {
      const [year, month, day] = val.split('-').map(Number);
      const d = new Date(Date.UTC(year, month - 1, day));
      return (
        d.getUTCFullYear() === year &&
        d.getUTCMonth() === month - 1 &&
        d.getUTCDate() === day
      );
    }, 'Tanggal lahir tidak valid secara kalender'),
  phone: z
    .string()
    .max(20, 'Nomor telepon maksimal 20 karakter')
    .nullable()
    .optional()
    .transform((val) => (val ? val.trim() : val)),
});
```
Apply corresponding fixes to `updateCustomerSchema` (trim before min, date calendar refinement).

### Change 2: Fix `order` default in `customerQuerySchema` and `orderQuerySchema`
- In `packages/shared/src/schemas/customer.schema.ts:68`:
  Change:
  ```typescript
  order: z.enum(['asc', 'desc']).default('asc'),
  ```
  (Remove trailing `.optional()`).
- In `packages/shared/src/schemas/order.schema.ts:37`:
  Change:
  ```typescript
  order: z.enum(['asc', 'desc']).default('desc'),
  ```
  (Remove trailing `.optional()`).

### Change 3: Rebuild `@titipin/shared`
Run `pnpm --filter @titipin/shared build` to update compiled dist files.

---

## 5. Verification Method

1. **Empirical Schema Verification Script**:
   ```bash
   node -e '
   const { createCustomerSchema, customerQuerySchema, orderQuerySchema } = require("./packages/shared/dist/index.js");

   // 1. Should reject non-leap year Feb 29
   console.log("2023-02-29 valid?", createCustomerSchema.shape.birth_date.safeParse("2023-02-29").success); // must be false

   // 2. Should reject whitespace-only name
   console.log("Spaces name valid?", createCustomerSchema.shape.customer_name.safeParse("   ").success); // must be false

   // 3. Should default order to asc and desc
   console.log("Customer query default order:", customerQuerySchema.parse({}).order); // must be "asc"
   console.log("Order query default order:", orderQuerySchema.parse({}).order); // must be "desc"
   '
   ```

2. **Run Backend Integration Tests**:
   ```bash
   pnpm --filter @titipin/backend test -- --run
   ```
   Must complete with 33 passed, 33 skipped, 0 failed.

3. **Run Monorepo Quality Audits**:
   ```bash
   pnpm turbo lint
   pnpm turbo typecheck
   pnpm audit:quality
   ```
