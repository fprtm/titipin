# Dispatch for Worker M2 (Slice 4: Customers & Membership Management)

## Mission
Implement Milestone 2: Slice 4 (Customers & Membership Management) end-to-end:
1. Backend Clean Architecture: `CustomersRepository`, 5 Use-Cases (`FindCustomersUseCase`, `GetCustomerByIdUseCase`, `CreateCustomerUseCase`, `UpdateCustomerUseCase`, `DeleteCustomerUseCase`), `CustomersService` facade, `CustomersController`, `CustomersModule` registration, and `ZodValidationPipe` adjustment to 422 (`UnprocessableEntityException`).
2. Frontend `/customers` page: mobile-first glassmorphic dashboard table, KPI summary cards, member registration modal, edit modal, soft-delete dialog, and unit/component tests in `apps/frontend/test/customers.test.tsx`.
3. 100% compliance: ZERO raw SVG, zero inline SVG, zero unicode emoji (exclusively `lucide-react`).
4. Strict Git Flow: `feature/slice-4-customers` branched from `develop`, verified, and merged `--no-ff` into `develop`.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Context & Inputs
- Project Root: `/Users/yuma/Workspace/lab/titipin`
- ORIGINAL_REQUEST: `/Users/yuma/Workspace/lab/titipin/.agents/teamwork/ORIGINAL_REQUEST.md`
- PROJECT Blueprint: `/Users/yuma/Workspace/lab/titipin/.agents/teamwork/orchestrator_1/PROJECT.md`
- Skill Reference: `/Users/yuma/.gemini/config/skills/titipin-dev/SKILL.md`
- Explorer Reports:
  - Backend Architecture: `/Users/yuma/Workspace/lab/titipin/.agents/teamwork/explorer_m2_1/handoff.md`
  - Frontend Glassmorphism: `/Users/yuma/Workspace/lab/titipin/.agents/teamwork/explorer_m2_2/handoff.md`
  - Test & Git Flow: `/Users/yuma/Workspace/lab/titipin/.agents/teamwork/explorer_m2_3/handoff.md`
- Shared Contracts: `packages/shared/src/schemas/customer.schema.ts`, `packages/shared/src/types/customer.types.ts`
- E2E Test Suite: `apps/backend/test/customers.e2e-spec.ts`

## File Ownership
- `apps/backend/src/modules/customers/**`
- `apps/backend/src/common/pipes/zod-validation.pipe.ts`
- `apps/backend/src/app.module.ts` (if updating module imports)
- `apps/frontend/src/app/(dashboard)/customers/**`
- `apps/frontend/src/components/customers/**` (if modularized)
- `apps/frontend/test/customers.test.tsx` (or `apps/frontend/src/app/(dashboard)/customers/customers.test.tsx`)

## Execution Steps
1. Switch to git branch `feature/slice-4-customers` off `develop`.
2. Implement backend repository, use-cases, service facade, controller, and module registration per Explorer M2-1's handoff. Ensure `ZodValidationPipe` throws `UnprocessableEntityException` for validation errors (returning 422).
3. Run backend tests: `pnpm --filter @titipin/backend test apps/backend/test/customers.e2e-spec.ts`. Verify all 10 tests pass.
4. Implement frontend `/customers` page and components per Explorer M2-2's handoff using exclusively `lucide-react` icons and glassmorphism design tokens.
5. Verify frontend quality:
   - Run `grep -rn "<svg" apps/frontend/src/app/(dashboard)/customers` -> must return 0.
   - Run frontend tests.
6. Run full verification:
   - `pnpm turbo lint`
   - `pnpm turbo typecheck`
   - `pnpm test`
7. Merge feature branch into `develop` with `--no-ff`:
   - `git checkout develop`
   - `git merge --no-ff feature/slice-4-customers -m "feat(customers): implement slice 4 customers and membership management"`
   - `git branch -d feature/slice-4-customers`
8. Write detailed handoff report in `/Users/yuma/Workspace/lab/titipin/.agents/teamwork/worker_m2/handoff.md`.


## 2026-10-27T21:25:37Z
You are Worker M2 for Milestone 2 (Slice 4: Customers & Membership Management).
Your working directory is: /Users/yuma/Workspace/lab/titipin/.agents/teamwork/worker_m2
Read your instructions in: /Users/yuma/Workspace/lab/titipin/.agents/teamwork/worker_m2/DISPATCH.md
Also read:
- /Users/yuma/Workspace/lab/titipin/.agents/teamwork/ORIGINAL_REQUEST.md
- /Users/yuma/Workspace/lab/titipin/.agents/teamwork/orchestrator_1/PROJECT.md
- /Users/yuma/.gemini/config/skills/titipin-dev/SKILL.md
- Explorer M2-1 Handoff: /Users/yuma/Workspace/lab/titipin/.agents/teamwork/explorer_m2_1/handoff.md
- Explorer M2-2 Handoff: /Users/yuma/Workspace/lab/titipin/.agents/teamwork/explorer_m2_2/handoff.md
- Explorer M2-3 Handoff: /Users/yuma/Workspace/lab/titipin/.agents/teamwork/explorer_m2_3/handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Implement Slice 4 backend (Clean Architecture repositories, use-cases, controller, module, zod validation pipe) and frontend (/customers glassmorphic dashboard with 100% Lucide React icons, zero raw SVG, zero emoji).
Verify backend and frontend tests pass, run turbo typecheck/lint, merge feature branch feature/slice-4-customers with --no-ff into develop, delete the feature branch, write your comprehensive completion report to /Users/yuma/Workspace/lab/titipin/.agents/teamwork/worker_m2/handoff.md, and notify orchestrator when done.
