# Titipin POS Development & Codebase Mastery Skill
Source: /Users/yuma/.gemini/config/skills/titipin-dev/SKILL.md

Core Methodology:
- Titipin POS monorepo (Turborepo + pnpm workspaces) with NestJS 11 backend, Next.js 15 frontend, Drizzle ORM, PostgreSQL.
- Pessimistic locking (FOR UPDATE) with sorted IDs (asc(id)) for concurrency safety during checkout.
- Multi-item rollback on insufficient stock or invalid item.
- Vitest testing framework for backend integration and e2e tests.
