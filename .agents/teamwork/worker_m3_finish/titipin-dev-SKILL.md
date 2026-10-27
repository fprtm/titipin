# Titipin POS Development & Codebase Mastery Skill (Local Copy)

Monorepo: Turborepo + pnpm workspaces.
Backend: NestJS 11, Drizzle ORM, PostgreSQL.
Frontend: Next.js 15 App Router, React 19, Tailwind CSS, Lucide React.
Shared: `@titipin/shared`.

## Primary Directives & Absolute Constraints
1. **NO HARDCODED ICONS (STRICTLY FORBIDDEN)**:
   - Never render inline SVG elements (`<svg ...>...</svg>`), raw SVG strings, or unicode emoji icons in any component.
   - Always import and use icons exclusively from `lucide-react`.
2. **STANDARD BRANCHING BEST PRACTICES**:
   - Branch: `feature/<feature-name>`.
   - Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`).
   - Merge back into `develop` with non-fast-forward: `git merge --no-ff feature/...`.
3. **MOBILE-FIRST RESPONSIVE GLASSMORPHISM**:
   - Layout starts full-width on mobile (`w-full`), enhancing on `md:` and `lg:`.
   - Design tokens: `.glass-panel`, `.glass-card`, `.glass-button`, `rounded-xl`, `rounded-2xl`, `rounded-3xl`.
4. **ZERO HALLUCINATION & STRICT DATA ALIGNMENT**:
   - Align with OpenAPI, ADRs, DATA-MODEL.md.
