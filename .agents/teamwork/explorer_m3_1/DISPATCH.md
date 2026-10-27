# Dispatch for Explorer M3-1 (Backend POS Engine & Concurrency Locking)

## Mission
Investigate the backend architecture and implementation plan for Milestone 3 (Slices 5 & 6: POS Engine & Hold Cart Isolation).

## Context & Inputs
- Project Root: `/Users/yuma/Workspace/lab/titipin`
- ORIGINAL_REQUEST: `/Users/yuma/Workspace/lab/titipin/.agents/teamwork/ORIGINAL_REQUEST.md`
- PROJECT Blueprint: `/Users/yuma/Workspace/lab/titipin/.agents/teamwork/orchestrator_1/PROJECT.md`
- Skill Reference: `/Users/yuma/.gemini/config/skills/titipin-dev/SKILL.md`
- Existing module: `apps/backend/src/modules/orders/`
- Products lock: `apps/backend/src/modules/products/`
- Customers lookup: `apps/backend/src/modules/customers/`
- Test suite: `apps/backend/test/orders.e2e-spec.ts`
- Database schema: `apps/backend/src/database/schema/orders.ts`, `draft_orders.ts` (if existing or to check)

## Tasks
1. Inspect database schema for `orders`, `order_items`, `order_activity_logs`, and check if `draft_orders` table exists or needs creation per ADR-005 (`UNIQUE(user_id)`).
2. Inspect `OrdersRepository` requirements: encapsulating orders creation, line items insertion, order activity logs, and draft cart persistence.
3. Review `lockAndDeductStock` in `ProductsRepository` / `ProductsService` to ensure deadlock-free locking (`id ASC`) and atomic transaction rollback on insufficient stock (HTTP 422).
4. Review Member Birthday Discount (`BR-006`): 5% discount (max Rp 50.000) when member birth date matches transaction date (`MM-DD`).
5. Review Walk-in Orders (`BR-013`): `customer_id = null` with "Pelanggan Umum".
6. Plan single-responsibility use-cases (`ProcessCheckoutUseCase`, `HoldDraftOrderUseCase`, `GetDraftOrderUseCase`, `DiscardDraftOrderUseCase`, `ResumeDraftOrderUseCase`) and `OrdersService` facade.
7. Detail controller endpoints and DTO validations.
8. Write comprehensive blueprint to `/Users/yuma/Workspace/lab/titipin/.agents/teamwork/explorer_m3_1/handoff.md`.
