---
name: titipin-dev
description: >-
  Expert guide, architectural rules, coding standards, and operational runbook for developing in the Titipin POS and Order Management monorepo. Use this skill whenever building, modifying, reviewing, testing, or debugging frontend (Next.js 15), backend (NestJS 11), Drizzle ORM, database migrations, Tailwind CSS UI components, shared packages, or writing automated tests for the Titipin repository.
---

# Titipin POS Development & Codebase Mastery Skill

This skill guides AI agents and engineers working within the **Titipin** codebase — a modern, production-grade Point of Sale (POS) and Order Management System structured as a **Turborepo** monorepo using **pnpm workspaces**.

## Primary Directives & Absolute Constraints

When working in this repository, you **MUST ALWAYS** follow these core rules:

1. **NO HARDCODED ICONS (STRICTLY FORBIDDEN)**:
   - **Never** render inline SVG elements (`<svg ...>...</svg>`), raw SVG strings, or unicode emoji icons in any component.
   - **Always** import and use icons exclusively from `lucide-react`:
     ```tsx
     import { ShoppingCart, User, AlertTriangle, CheckCircle2 } from 'lucide-react';
     ```
2. **STANDARD BRANCHING BEST PRACTICES**:
   - Always branch off `develop` using `feature/<feature-name>` (or `fix/<bug-name>`).
   - Use Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`).
   - Merge back into `develop` with non-fast-forward: `git merge --no-ff feature/...`.
   - Delete the local feature branch immediately after successful merge.
3. **MOBILE-FIRST RESPONSIVE GLASSMORPHISM**:
   - Mobile-first approach: layout starts full-width on mobile (`w-full`), enhancing on `md:` and `lg:`.
   - Design tokens: `.glass-panel`, `.glass-card`, `.glass-button`, `rounded-xl`, `rounded-2xl`, `rounded-3xl`.
   - Thermal receipt print layout support via `@media print`.
4. **ZERO HALLUCINATION & STRICT DATA ALIGNMENT**:
   - All models, types, and endpoints must strictly match [DATA-MODEL.md](../../../docs/architecture/DATA-MODEL.md) and [openapi.yaml](../../../docs/api/openapi.yaml).
   - Use types and schemas from `@titipin/shared`.

---

## Modular Knowledge Base & Reference Guides

To master specific layers of the codebase, consult the dedicated guides below:

- [1. Rules, Anti-Patterns & UI Constraints](./references/rules-and-constraints.md): Icon ban policy, branch workflow, forbidden strings, and glassmorphic token rules.
- [2. Backend Architecture & Coding Conventions](./references/backend-guide.md): NestJS modular monolith, Controller/Service/Drizzle pattern, validation pipes, guards, interceptors, concurrency locking with `FOR UPDATE`, and append-only audit logs.
- [3. Frontend Architecture & Styling Guide](./references/frontend-guide.md): Next.js 15 App Router, Server vs Client components, TanStack Query v5 conventions, Axios mutex queue, form validation, thermal print CSS, and Lucide React standards.
- [4. Shared Packages & Tooling](./references/packages-guide.md): `@titipin/shared` contracts, TypeScript configs, ESLint 9 Flat Config, and package boundaries.
- [5. Testing Strategy & Test Suites](./references/testing-guide.md): 10 Critical Integration Test Suites, Supertest setup, database transaction rollback in tests, and Vitest component testing.
- [6. Cheatsheet & CLI Commands](./references/cheatsheet-commands.md): Step-by-step commands for setup, migrations, seeds, dev server, and testing.

---

## Standard Development Workflow

### Step 1: Branch Preparation
```bash
git checkout develop
git pull origin develop
git checkout -b feature/<slice-or-feature-name>
```

### Step 2: Implement & Audit
- Write domain models and schemas in Drizzle (`apps/backend/src/database/schema/`).
- Export contracts and types in `packages/shared/src/`.
- Implement API controllers, services, guards, and integration tests in `apps/backend/`.
- Build UI components using `lucide-react` and glassmorphic styling in `apps/frontend/`.
- **Audit Step**: Verify no `<svg` or emoji exists in frontend code:
  ```bash
  grep -rn "<svg" apps/frontend/src/
  ```

### Step 3: Local Verification
```bash
pnpm turbo lint
pnpm turbo typecheck
pnpm turbo test
```

### Step 4: Merge & Cleanup
```bash
git checkout develop
git merge --no-ff feature/<slice-or-feature-name> -m "merge: feature/<slice-or-feature-name> into develop"
git branch -d feature/<slice-or-feature-name>
```
