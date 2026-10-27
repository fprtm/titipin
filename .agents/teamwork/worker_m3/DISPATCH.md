# Dispatch for Worker M3 (Slices 5 & 6: POS Cashier Engine & Hold Cart Isolation)

## Mission
Implement Milestone 3 end-to-end:
1. Backend POS Engine & Draft Isolation:
   - Ensure `ProductsRepository.lockProductsForUpdate` has `.orderBy(asc(schema.products.id))` for deterministic lock ordering.
   - Implement `OrdersRepository` (`apps/backend/src/modules/orders/repositories/orders.repository.ts`) handling orders, order items, draft orders (`ADR-005`), and order activity logs (`ADR-006`).
   - Implement 7 Use-Cases: `ProcessCheckoutUseCase`, `HoldDraftOrderUseCase`, `GetDraftOrderUseCase`, `DiscardDraftOrderUseCase`, `ResumeDraftOrderUseCase`, `FindOrdersUseCase`, `GetOrderByIdUseCase`.
   - Implement `OrdersService` facade and `OrdersController` with route aliases (`/api/orders` & `/checkout`, `/draft` & `/held`, `/held/finalize`).
   - Register `OrdersModule` in `AppModule`.
   - Ensure birthday discount `BR-006` (5% capped at Rp 50.000 when `MM-DD` matches order date), walk-in `BR-013` ('Pelanggan Umum'), and draft isolation `BR-012` (reject 2nd hold with 422).
2. Frontend `/pos` Terminal:
   - Implement split-screen POS catalog + cart terminal in `apps/frontend/src/app/(dashboard)/pos/page.tsx` and modular components under `apps/frontend/src/components/pos/`.
   - Include payment keypad modal, real-time change calculator, hold/resume drawer, thermal receipt preview modal, and member quick-registration modal.
   - STRICT COMPLIANCE: 100% icons from `lucide-react`. Zero raw `<svg>`, zero unicode emoji.
   - Write component tests in `apps/frontend/src/app/(dashboard)/pos/pos.test.tsx`.
3. Clean Git Flow:
   - Branch: `git checkout -b feature/slice-5-6-pos-engine develop`
   - Implement & verify all backend tests (`apps/backend/test/orders.e2e-spec.ts` 11/11 pass).
   - Verify frontend tests pass, `pnpm turbo lint` (0 errors), `pnpm turbo typecheck` (0 errors), `pnpm audit:quality` (100%), `pnpm audit:links` (100%).
   - Merge back into `develop` with `--no-ff`: `git checkout develop && git merge --no-ff feature/slice-5-6-pos-engine -m "feat(pos): implement slices 5 and 6 pos engine and hold cart isolation"`.
   - Delete local branch: `git branch -d feature/slice-5-6-pos-engine`.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Context & Inputs
- Project Root: `/Users/yuma/Workspace/lab/titipin`
- ORIGINAL_REQUEST: `/Users/yuma/Workspace/lab/titipin/.agents/teamwork/ORIGINAL_REQUEST.md`
- PROJECT Blueprint: `/Users/yuma/Workspace/lab/titipin/.agents/teamwork/orchestrator_1/PROJECT.md`
- Skill Reference: `/Users/yuma/.gemini/config/skills/titipin-dev/SKILL.md`
- Explorer Handoffs:
  - Backend: `/Users/yuma/Workspace/lab/titipin/.agents/teamwork/explorer_m3_1/handoff.md`
  - Frontend: `/Users/yuma/Workspace/lab/titipin/.agents/teamwork/explorer_m3_2/handoff.md`
  - Concurrency & Tests: `/Users/yuma/Workspace/lab/titipin/.agents/teamwork/explorer_m3_3/handoff.md`
- Test Suite: `apps/backend/test/orders.e2e-spec.ts`

## File Ownership
- `apps/backend/src/modules/orders/**`
- `apps/backend/src/modules/products/repositories/products.repository.ts` (adding orderBy)
- `apps/backend/src/app.module.ts` (mounting OrdersModule)
- `apps/frontend/src/app/(dashboard)/pos/**`
- `apps/frontend/src/components/pos/**`
- `apps/frontend/src/hooks/use-pos-cart.ts`
- `apps/frontend/src/app/(dashboard)/pos/pos.test.tsx`


## 2026-10-27T22:00:32Z
You are Worker M3 for Milestone 3 (Slices 5 & 6: POS Engine & Hold Cart Isolation).
Your working directory is: /Users/yuma/Workspace/lab/titipin/.agents/teamwork/worker_m3
Read your instructions in: /Users/yuma/Workspace/lab/titipin/.agents/teamwork/worker_m3/DISPATCH.md
Also read:
- /Users/yuma/Workspace/lab/titipin/.agents/teamwork/ORIGINAL_REQUEST.md
- /Users/yuma/Workspace/lab/titipin/.agents/teamwork/orchestrator_1/PROJECT.md
- /Users/yuma/.gemini/config/skills/titipin-dev/SKILL.md
- Backend Explorer: /Users/yuma/Workspace/lab/titipin/.agents/teamwork/explorer_m3_1/handoff.md
- Frontend Explorer: /Users/yuma/Workspace/lab/titipin/.agents/teamwork/explorer_m3_2/handoff.md
- Concurrency & Tests Explorer: /Users/yuma/Workspace/lab/titipin/.agents/teamwork/explorer_m3_3/handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Implement Slice 5 & 6 backend (Orders Clean Architecture repositories, use-cases, controller, module, deterministic row locking, ADR-005 draft cart isolation, BR-006 birthday discount) and frontend (/pos split-screen catalog + cart, quick cash keypad, change calculator, hold drawer, 100% Lucide React icons, zero raw SVG, zero emoji).
Verify backend (orders.e2e-spec.ts 11/11 pass) and frontend tests pass, run turbo typecheck/lint/quality audit, merge feature branch feature/slice-5-6-pos-engine with --no-ff into develop, delete the feature branch, write your comprehensive completion report to /Users/yuma/Workspace/lab/titipin/.agents/teamwork/worker_m3/handoff.md, and notify orchestrator when done.
