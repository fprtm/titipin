# Project: Titipin POS Monorepo - Slices 4 through 9 & Clean Architecture Refactoring

## Architecture
- **Monorepo Structure**: Turborepo with pnpm workspaces
  - `packages/shared`: Shared Zod schemas, TypeScript types, enums, constants
  - `apps/backend`: NestJS 11 modular monolith with Drizzle ORM, PostgreSQL
  - `apps/frontend`: Next.js 15 App Router, React 19, Tailwind CSS with glassmorphism tokens, Lucide React icons
- **Clean Architecture Pattern**:
  - `repositories/*.repository.ts`: Encapsulates all Drizzle ORM queries, inserts, updates, transactions, and soft-delete filters. Accepts optional transaction context (`tx`).
  - `use-cases/*.use-case.ts`: Single-responsibility command/query handlers. Injects Repositories and other domain services. Zero direct Drizzle queries.
  - `*.service.ts`: Backward-compatible facade delegating to Use-Cases.
  - `*.controller.ts`: NestJS controllers handling HTTP routing, DTO validation pipes, guards (`RolesGuard`), and response formatting.
- **Concurrency & Concurrency Locking**:
  - PostgreSQL row-level pessimistic locking (`SELECT ... FOR UPDATE`) with deterministically sorted product IDs (`id ASC`) to prevent deadlocks.
  - All-or-nothing atomic transactions with stock deduction rollback on insufficient stock (`HTTP 422`).
- **Hold Cart Isolation (`ADR-005`)**:
  - `draft_orders` table with `UNIQUE(user_id)`. One active draft per cashier, without holding or locking physical inventory stock.
- **Dual Logging Strategy (`ADR-006`)**:
  - `order_activity_logs`: Transaction lifecycle events (`ORDER_CREATED`, `ORDER_HELD`, `ORDER_RESUMED`, `ORDER_FINALIZED`).
  - `audit_logs`: Central security and compliance audit trail for entity mutations. Admin-only read access.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Shared Contracts & Schemas | Zod schemas and TypeScript types for customers, orders, dashboard, and audit in `@titipin/shared` | M1 | Survey / `TICKET-SLICE-4..9` |
| 2 | Clean Arch: Users Decoupling | Extract `UsersRepository` & use-cases (`FindUsers`, `CreateUser`, `ResetPassword`, `DeactivateUser`), retain `UsersService` facade | M1 | `ORIGINAL_REQUEST.md § R1` |
| 3 | Clean Arch: Products Decoupling | Extract `ProductsRepository` & use-cases (`FindProducts`, `GetProductById`, `CreateProduct`, `UpdateProduct`, `DeleteProduct`, `ExportProducts`, `ImportProducts`, `LockAndDeductStock`), retain `ProductsService` facade | M1 | `ORIGINAL_REQUEST.md § R1` |
| 4 | Clean Arch: Auth & Audit Decoupling | Refactor `AuthService` and `AuditService` to use repositories and use-cases with zero direct Drizzle queries in services | M1 | `ORIGINAL_REQUEST.md § R1` |
| 5 | Customers Module Backend | Implement `CustomersRepository`, Use-Cases (`FindCustomers`, `GetCustomerById`, `CreateCustomer`, `UpdateCustomer`, `DeleteCustomer`), `CustomersService` facade, `CustomersController` (`GET`, `POST`, `GET :id`, `PUT :id`, `DELETE :id`) | M2 | `TICKET-SLICE-4` / `AC-CST-01` |
| 6 | Customers Frontend (`/customers`) | Glassmorphism table, member registration modal, edit modal, soft-delete dialog, exclusively `lucide-react` icons | M2 | `TICKET-SLICE-4` |
| 7 | POS Checkout Engine (`POST /api/orders` & `/checkout`) | Pessimistic locking (`FOR UPDATE`), sorted product IDs, atomic stock deduction, rollback on stock deficiency | M3 | `TICKET-SLICE-5` / `TEST-01..03` |
| 8 | Member Birthday Discount (`BR-006`) | 5% discount (max Rp 50.000) when member birth date matches transaction date (`MM-DD`) | M3 | `TICKET-SLICE-5` / `BR-006` |
| 9 | Walk-In Orders (`BR-013`) | Support `customer_id = null` with "Pelanggan Umum" invoice label and normal checkout flow | M3 | `TICKET-SLICE-5` / `TEST-02` |
| 10 | Hold/Resume Cart Isolation (`ADR-005`) | `POST /api/orders/hold`, `GET /api/orders/held` & `/draft`, `DELETE /api/orders/held` & `/draft`, `POST /api/orders/held/finalize` with `UNIQUE(user_id)` | M3 | `TICKET-SLICE-6` / `TEST-04` |
| 11 | POS Frontend (`/pos`) | Split-screen catalog + cart, walk-in/member autocomplete, birthday discount, quick cash keypad, change calculator, hold drawer | M3 | `TICKET-SLICE-5, 6` |
| 12 | Orders History & Invoices | `GET /api/orders` (filters by date/customer), `GET /api/orders/:id` (immutable price snapshots, activity log timeline) | M4 | `TICKET-SLICE-7` |
| 13 | Thermal Receipt Print View | 80mm monospace `@media print` thermal receipt view in `/orders` and `/pos` modals | M4 | `TICKET-SLICE-7` |
| 14 | Dashboard Metrics & Trends | `GET /api/dashboard/summary` & `/metrics`, `GET /api/dashboard/trend`, KPI cards, top 5, slow 5 (`BR-018`), low-stock `< 5` | M4 | `TICKET-SLICE-8` |
| 15 | Audit Trail Read Endpoint | `GET /api/audit-logs` (Admin only, 403 Forbidden for Cashier), filter by user/action/entity/date | M4 | `TICKET-SLICE-9` / `TEST-09` |
| 16 | Frontend `/orders`, `/dashboard`, `/audit-logs` | Orders history view, Dashboard metrics & CSS visualizer, Audit logs diff viewer | M4 | `TICKET-SLICE-7, 8, 9` |
| 17 | Database Seeder Expansion | Expand `apps/backend/src/database/seeds/index.ts` to seed 2 accounts, 20+ products, 15+ members, 30+ orders | M4 | `TICKET-SLICE-9` |
| 18 | Production Dockerization | Standalone Next.js config, multi-stage `Dockerfile` for backend & frontend, `docker-compose.prod.yml` build validation | M4 | `TICKET-SLICE-9` |
| 19 | Vitest Test Suite Completion (TEST-01..09) | Full 9 automated integration test suites passing 100% in Vitest | M5 | `ACCEPTANCE-CRITERIA.md` |
| 20 | Dual-Layer Ego-Browser Simulated UAT | Automated end-to-end browser journey simulation validating cashier and admin workflows | M5 | `ORIGINAL_REQUEST.md § AC` |
| 21 | Quality & Link Compliance | 100% pass for `pnpm audit:quality` (0 inline SVG, 0 emoji, lint, typecheck) and `pnpm audit:links` | M5 | `ACCEPTANCE-CRITERIA.md` |
| 22 | Clean Git Flow Verification | Verify all feature branches merged `--no-ff` into `develop` and local branches cleaned up | M5 | `ORIGINAL_REQUEST.md § AC` |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Shared Contracts & Clean Architecture Refactoring | `@titipin/shared` schemas/types; `UsersRepository`, `ProductsRepository`, `AuditRepository`, use-cases & facades | none | DONE |
| M2 | Slice 4: Customer & Membership Management | `CustomersRepository`, use-cases, controller, REST API, `/customers` glassmorphism UI | M1 | DONE |
| M3 | Slices 5 & 6: POS Engine & Hold Cart Isolation | `OrdersRepository`, checkout with row-locking, `BR-006` birthday discount, `draft_orders` isolation, `/pos` UI, `TEST-01..05` | M1, M2 | PLANNED |
| M4 | Slices 7, 8 & 9: History, Dashboard, Audit, Seeder & Docker | Orders history & thermal print, Dashboard metrics & trends, Audit logs API & UI, Seeder (20+ products, 15+ members, 30+ orders), Dockerfiles | M1, M2, M3 | PLANNED |
| M5 | Final Verification & Ego-Browser UAT | 100% Vitest integration tests (TEST-01..09), quality/links audit 100%, adversarial hardening, ego-browser scripted UAT, Clean Git Flow | M1, M2, M3, M4 | PLANNED |

## Interface Contracts

### `@titipin/shared` Contracts
- `createCustomerSchema`: `{ customer_name: string (min 2, max 150), customer_address: string (min 5, max 255), gender: 'Pria' | 'Wanita', birth_date: string (YYYY-MM-DD), phone?: string | null }`
- `updateCustomerSchema`: `createCustomerSchema.partial()`
- `checkoutOrderSchema`: `{ customer_id?: string | null, items: Array<{ product_id: number (positive int), quantity: number (positive int) }> }`
- `holdOrderSchema`: same payload as checkout
- `dashboardQuerySchema`: `{ period: 'daily' | 'monthly' | 'quarterly' }`
- `auditQuerySchema`: `{ user_id?: string, action?: string, entity_type?: string, from?: string, to?: string, page?: number, per_page?: number }`

### ProductsModule <-> OrdersModule
- `productsService.lockAndDeductStock(tx: DrizzleTransaction, items: Array<{ productId: number, quantity: number }>): Promise<Array<{ id: number, productName: string, unitPrice: number, quantity: number }>>`
  - Acquires `SELECT ... FOR UPDATE` on products sorted by `id ASC`.
  - Verifies `deletedAt === null` and `stock >= quantity`.
  - Decrements `stock = stock - quantity`.
  - Returns locked product snapshot with current master unit price.
  - Throws `UnprocessableEntityException` if stock is deficient or product is deleted.

### CustomersModule <-> OrdersModule
- `customersRepository.findById(id: string, includeDeleted?: boolean): Promise<Customer | null>`
  - Used by `ProcessCheckoutUseCase` to look up customer for `BR-006` birthday discount.
  - If birth date (`MM-DD`) matches order date (`MM-DD`), calculates 5% discount (capped at Rp 50.000).

### OrdersModule <-> AuditModule
- `auditService.log(entry: CreateAuditLogDto): Promise<void>`
  - Records central audit logs on `ORDER_CREATED`, `CUSTOMER_CREATED`, etc.

## Code Layout
- `packages/shared/src/`
  - `schemas/`: `customer.schema.ts`, `order.schema.ts`, `dashboard.schema.ts`, `audit.schema.ts`
  - `types/`: `customer.types.ts`, `order.types.ts`, `dashboard.types.ts`, `audit.types.ts`
- `apps/backend/src/modules/`
  - `users/`: `repositories/users.repository.ts`, `use-cases/*.use-case.ts`, `users.service.ts`, `users.controller.ts`
  - `products/`: `repositories/products.repository.ts`, `use-cases/*.use-case.ts`, `products.service.ts`, `products.controller.ts`
  - `customers/`: `repositories/customers.repository.ts`, `use-cases/*.use-case.ts`, `customers.service.ts`, `customers.controller.ts`
  - `orders/`: `repositories/orders.repository.ts`, `use-cases/*.use-case.ts`, `orders.service.ts`, `orders.controller.ts`
  - `dashboard/`: `repositories/dashboard.repository.ts`, `use-cases/*.use-case.ts`, `dashboard.service.ts`, `dashboard.controller.ts`
  - `audit/`: `repositories/audit.repository.ts`, `use-cases/*.use-case.ts`, `audit.service.ts`, `audit.controller.ts`
- `apps/backend/src/database/seeds/index.ts`
- `apps/backend/Dockerfile`
- `apps/frontend/Dockerfile`
- `apps/frontend/src/app/(dashboard)/`
  - `customers/page.tsx`
  - `pos/page.tsx`
  - `orders/page.tsx`, `orders/[id]/page.tsx`
  - `dashboard/page.tsx`
  - `audit-logs/page.tsx`
