# Original User Request

## 2026-10-27T17:20:59Z

Complete implementation of all remaining vertical slices (Slice 4 through Slice 9) for Titipin POS monorepo, refactoring the service layer into separated Repositories and single-responsibility Use-Cases, verified by dual-layer testing (Vitest e2e + Ego-Browser simulated UAT) and strict zero-defect code compliance.

Working directory: `/Users/yuma/Workspace/lab/titipin`
Integrity mode: development

## Requirements

### R1. Clean Architecture Refactoring: Repositories & Use-Cases Separation
Decouple data access from business logic across all backend modules:
1. **Dedicated Repositories (`repositories/*.repository.ts`)**: Encapsulate all Drizzle ORM queries, inserts, updates, transactions, and soft-delete filters (`UsersRepository`, `ProductsRepository`, `CustomersRepository`, `OrdersRepository`, `AuditRepository`, `DashboardRepository`). No direct `db.select()` / `db.insert()` calls inside services.
2. **Single-Responsibility Use-Cases (`use-cases/*.use-case.ts`)**: Decompose monolithic services into focused use-case classes (e.g. `CreateProductUseCase`, `ImportProductsUseCase`, `ProcessCheckoutUseCase`, `HoldDraftOrderUseCase`).
3. Maintain backward-compatible module facades so controllers and existing test suites continue functioning without regressions.

### R2. Slice 4: Customer & Membership Management (`TICKET-SLICE-4`)
1. Implement `CustomersRepository` and Use-Cases: `FindCustomersUseCase`, `CreateCustomerUseCase`, `UpdateCustomerUseCase`, `DeleteCustomerUseCase`.
2. REST API: `GET /api/customers` (search & pagination), `POST /api/customers` (cashier & admin), `GET /api/customers/:id`, `PUT /api/customers/:id` (admin), `DELETE /api/customers/:id` (soft-delete, admin).
3. Frontend `/customers` page: tactile glassmorphism table, member registration modal (gender pills, date picker, phone), soft delete dialog. All icons exclusively from `lucide-react`.

### R3. Slice 5 & Slice 6: POS Cashier Engine & Hold/Resume Cart Isolation (`TICKET-SLICE-5`, `TICKET-SLICE-6`)
1. REST API: `POST /api/orders/checkout` with PostgreSQL row locking (`FOR UPDATE`) for atomic stock deduction, member discount calculation (`BR-006`: 5% max Rp 50.000 for member birth date match), order activity logging (`ORDER_CREATED`).
2. Draft Cart Isolation per ADR-005: `POST /api/orders/hold`, `GET /api/orders/draft`, `DELETE /api/orders/draft` using isolated table `draft_orders` with `UNIQUE(user_id)`. Orders table strictly holds completed sales.
3. Frontend `/pos` page: Split-screen POS layout (product grid/search + responsive cart sidebar), quick payment keypad, change calculator, hold/resume drawer, member autocomplete.

### R4. Slice 7, Slice 8 & Slice 9: History, Dashboard Metrics & Audit Trail (`TICKET-SLICE-7`, `TICKET-SLICE-8`, `TICKET-SLICE-9`)
1. `orders` module (`TICKET-SLICE-7`): `GET /api/orders` (history filter by date/invoice), `GET /api/orders/:id`, thermal receipt printable view (`@media print` 80mm monospace formatting).
2. `dashboard` module (`TICKET-SLICE-8`): `GET /api/dashboard/metrics` (daily revenue, transaction count, low-stock count, active members), trend charts, top-selling items.
3. `audit` module (`TICKET-SLICE-9`): `GET /api/audit-logs` (Admin only), tamper-evident append-only verification, Docker production build verification (`docker-compose.prod.yml`).

## Acceptance Criteria

### Architectural Integrity & Code Quality
- [ ] Every backend module implements dedicated Repositories and Use-Cases; zero direct Drizzle queries in controllers or use-cases.
- [ ] `pnpm audit:quality` passes 100%: zero raw `<svg>` / emoji icons in frontend, zero ESLint 9 errors/warnings, zero TypeScript errors.
- [ ] `pnpm audit:links` passes 100% on all documentation links.
- [ ] All 9 automated integration test suites (`TEST-01` through `TEST-09`) pass with 100% success in Vitest.
- [ ] Clean Git Flow: each slice implemented on `feature/<name>`, merged with `--no-ff` into `develop`, and local feature branch removed.

### Functional & Visual Validation
- [ ] POS checkout atomically decrements stock, issues invoice, and handles insufficient stock with complete rollback (`TEST-03`).
- [ ] Member discount applies accurately when customer birth date matches transaction date (`BR-006`).
- [ ] Hold cart persists draft order without locking inventory stock (`TEST-04`).
- [ ] Soft-deleted products and customers are strictly excluded from POS search and order creation (`TEST-07`, `TEST-08`).
- [ ] Cashier is blocked with 403 Forbidden on all Admin-only endpoints (`TEST-09`).
- [ ] Complete browser journey simulated and validated with `ego-browser`.
