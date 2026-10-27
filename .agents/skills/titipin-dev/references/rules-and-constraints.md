# TITIPIN DEV — RULES, CONSTRAINTS & ANTI-PATTERNS
## Complete Policy Checklist for Agents & Engineers

This document defines the strict non-negotiable rules, styling conventions, and architectural anti-patterns that every AI Agent and engineer must adhere to in the **Titipin** repository.

---

## 1. ICON AUDIT & COMPONENT POLICIES

### ❌ Strict Icon Ban: No Raw SVG, No Unicode Emojis
1. **Never use inline SVG**:
   ```tsx
   // ❌ VIOLATION
   export const CartIcon = () => (
     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
       <path d="..." />
     </svg>
   );
   ```
2. **Never use emoji as UI icons**:
   ```tsx
   // ❌ VIOLATION
   <button>🗑️ Hapus</button>
   <span>📦 Stok: 10</span>
   ```
3. **Always use Lucide React**:
   ```tsx
   // ✅ APPROVED
   import { Trash2, Package, ShoppingBag, Plus, Minus, Search, Eye } from 'lucide-react';

   <button className="flex items-center gap-2">
     <Trash2 className="w-4 h-4 text-destructive" />
     Hapus
   </button>
   ```

### Icon Mapping Reference for Common Actions:
- **POS / Cart / Checkout**: `ShoppingCart`, `ShoppingBag`, `Receipt`, `CreditCard`, `Banknote`
- **Actions**: `Plus`, `Minus`, `Trash2`, `Edit`, `Search`, `Filter`, `RefreshCw`, `Printer`
- **Navigation**: `LayoutDashboard`, `Boxes`, `Users`, `History`, `ShieldCheck`, `LogOut`, `ArrowLeft`, `ChevronRight`
- **Status / Indicators**: `CheckCircle2`, `AlertTriangle`, `XCircle`, `Clock`, `Lock`, `Unlock`

---

## 2. FILE & VARIABLE NAMING CONVENTIONS (DESCRIPTIVE & EXPLICIT)

### 2.1 File & Directory Naming
* **Kebab-Case Strictly**: Seluruh nama file dan direktori multi-kata **wajib menggunakan kebab-case** (huruf kecil dipisahkan tanda strip `-`) untuk mencegah konflik case-sensitivity antara macOS APFS dan Linux ext4/CI runner:
  - **Backend Files**:
    - Modules: `products.module.ts`, `audit-logs.module.ts`
    - Controllers: `products.controller.ts`, `order-checkout.controller.ts`
    - Services: `products.service.ts`, `audit-logger.service.ts`
    - DTOs: `create-product.dto.ts`, `checkout-order.dto.ts`, `update-user-profile.dto.ts`
    - Schemas: `users.schema.ts`, `products.schema.ts`, `order-items.schema.ts`, `audit-logs.schema.ts`
    - Guards: `jwt-auth.guard.ts`, `roles.guard.ts`
    - Interceptors: `transform.interceptor.ts`, `logging.interceptor.ts`
    - Filters: `all-exceptions.filter.ts`
  - **Frontend Files**:
    - Pages: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx` dalam folder rute kebab-case (`app/(dashboard)/audit-logs/page.tsx`).
    - Komponen: `cart-drawer.tsx`, `product-card.tsx`, `thermal-receipt-modal.tsx`, `quantity-stepper.tsx`.
    - Hooks: `use-cart.ts`, `use-auth.ts`, `use-products.ts`, `use-debounce.ts`.
    - Lib/Utils: `api-client.ts`, `format-currency.ts`, `date-helpers.ts`.
  - **Shared Packages Files**:
    - Enums: `role.enum.ts`, `order-status.enum.ts`, `audit-action.enum.ts`.
    - Types: `api-response.interface.ts`, `pagination-meta.interface.ts`.

### 2.2 Variable & Identifier Naming Conventions
* **DILARANG KERAS Singkatan Kriptik / Samar**:
  - ❌ Dilarang: `p`, `c`, `o`, `val`, `temp`, `data1`, `res2`, `cb`, `el`, `it`.
  - ✅ Wajib eksplisit: `product`, `customer`, `activeOrder`, `formattedPrice`, `temporaryDraftOrder`, `handleSearchCallback`.
* **Aturan Khusus Identifiers**:
  - **Arrays & Collections**: Wajib berbentuk kata benda jamak (*plural*):
    `products`, `customerList`, `orderItems`, `activeTokens`.
  - **Booleans**: Wajib diawali prefix predikat (`is`, `has`, `should`, `can`):
    `isSubmitting`, `isLoading`, `hasSufficientStock`, `shouldPrintReceipt`, `canManageUsers`.
  - **Functions & Methods**: Wajib berupa kata kerja + objek (*verb-noun pattern*):
    `calculateTotalAmount()`, `validateStockAvailability()`, `fetchCustomerOrderHistory()`, `processCashPayment()`.
  - **Database Columns (PostgreSQL via Drizzle)**: Wajib `snake_case`:
    `order_number`, `unit_price`, `customer_id`, `created_at`, `deleted_at`.
  - **TypeScript Interfaces / Types / Classes**: Wajib `PascalCase`:
    `CreateProductDto`, `OrderResponse`, `ProductEntity`, `ApiResponse<T>`.
  - **Constants & Enums**: Wajib `UPPER_SNAKE_CASE` untuk nilai konstan:
    `MAX_RETRY_ATTEMPTS = 3`, `DEFAULT_PAGE_SIZE = 10`, `OrderActivityAction.ORDER_FINALIZED`.

---

## 3. STANDARD GIT BRANCHING & WORKFLOW BEST PRACTICES

### Branch Strategy (Git Flow / GitHub Flow)
- **`main`**: Production branch. Strictly clean, passing all CI checks, tagged with release versions (`v1.0.0`).
- **`develop`**: Active development and integration branch.
- **`feature/<name>`**: Feature branches, created from `develop`.
- **`fix/<name>`**: Bugfix branches, created from `develop` (or `main` for critical production hotfixes).

### Commit & Merge Guidelines
1. Branch naming: `feature/<slice-id>-<slug>` (e.g. `feature/slice-1-auth`).
2. Follow Conventional Commits:
   - `feat(...)`: New user-facing feature
   - `fix(...)`: Bug fix
   - `refactor(...)`: Code change that neither fixes a bug nor adds a feature
   - `docs(...)`: Documentation only changes
   - `test(...)`: Adding or updating tests
   - `chore(...)`: Tooling, dependencies, or infrastructure updates
3. Merge back into `develop` using non-fast-forward (`--no-ff`):
   ```bash
   git checkout develop
   git merge --no-ff feature/slice-1-auth -m "merge: feature/slice-1-auth into develop"
   ```
4. Delete the local feature branch immediately after successful merge:
   ```bash
   git branch -d feature/slice-1-auth
   ```

---

## 4. UI/UX STANDARDS & MOBILE-FIRST GLASSMORPHISM

### Mobile-First Standard
- Build mobile layout first (`w-full flex-col p-4`).
- Add responsive modifiers for larger screens:
  - Tablet: `md:grid-cols-2 md:p-6`
  - Desktop: `lg:grid-cols-3 lg:gap-6 lg:p-8`
- POS checkout screen on mobile: Bottom drawer / sheet for cart, full screen split view on desktop.

### Tactile Glassmorphism Token Usage
Always apply the pre-defined glass classes and OKLCH tokens:
- **Panels**: `glass-panel rounded-3xl p-6 sm:p-8 shadow-xl`
- **Cards**: `glass-card rounded-2xl p-5 hover:border-primary/40 transition-all`
- **Buttons**: `glass-button rounded-xl px-4 py-2 font-medium`
- **Corner Radii**: Strictly use `rounded-xl` (12px), `rounded-2xl` (16px), or `rounded-3xl` (24px). Avoid sharp 0px or small 4px corners for main UI containers.
- **Thermal Print Receipts**: Use `@media print` with monospace font, removing all sidebar, header, and navigation elements.

---

## 5. STRICT BACKEND & DATABASE CONSTRAINTS

1. **Atomic Concurrency for Checkout**:
   Always wrap checkout logic in an explicit database transaction (`db.transaction(...)`). Acquire pessimistic locks on stock rows:
   ```typescript
   await tx.execute(
     sql`SELECT id, stock FROM products WHERE id IN (${sql.join(productIds, sql`, `)}) FOR UPDATE`
   );
   ```
2. **Historical Price Snapshotting**:
   In `order_items`, store `unit_price` as captured at the exact moment of order completion. Never reference dynamic product price for historical billing.
3. **Zero Hard Deletes**:
   All master tables (`products`, `customers`, `users`) utilize soft delete via `deleted_at: timestamp`.
4. **Append-Only Write Audit Trail**:
   Every state mutation (`CREATE`, `UPDATE`, `DELETE`) on master entities must emit a record to `audit_logs` capturing `user_id`, `action`, `entity_type`, `entity_id`, `old_values`, `new_values`, `ip_address`, and `user_agent`.
5. **No Blind Env Access**:
   All environment variables must be validated on startup via `apps/backend/src/config/env.config.ts` (Zod validation).
