# TITIPIN DEV — CHEATSHEET & OPERATIONAL RUNBOOK
## Essential CLI Commands for Turborepo, Database & Testing

This cheatsheet provides the standard command workflows for developers and AI agents operating in the **Titipin** monorepo.

---

## 1. QUICKSTART RUNNING GUIDE ($\le 6$ COMMANDS)

From an empty machine / zero database:
```bash
# 1. Clone repository
git clone https://github.com/fprtm/titipin.git && cd titipin

# 2. Copy environment templates
cp .env.example .env && cp apps/backend/.env.example apps/backend/.env && cp apps/frontend/.env.example apps/frontend/.env

# 3. Install all workspace dependencies
pnpm install

# 4. Spin up local PostgreSQL 16 container
docker compose up -d db

# 5. Run Drizzle database migrations and inject seeds
pnpm db:migrate && pnpm db:seed

# 6. Launch development servers (Backend :3001 & Frontend :3000)
pnpm dev
```

---

## 2. MONOREPO MANAGEMENT (TURBOREPO)

Run these commands from the monorepo root:

```bash
# Start all services concurrently in dev mode
pnpm dev

# Build all packages and applications for production
pnpm build

# Run ESLint 9 Flat Config across the entire workspace
pnpm lint

# Run TypeScript typechecks across the entire workspace
pnpm typecheck

# Execute all automated test suites (Vitest / Jest)
pnpm test

# Generate code coverage reports
pnpm test:cov
```

To target a specific package or app:
```bash
pnpm --filter @titipin/backend <command>
pnpm --filter @titipin/frontend <command>
pnpm --filter @titipin/shared <command>
```

---

## 3. DATABASE OPERATIONS (DRIZZLE ORM)

```bash
# Generate SQL migration diffs from TypeScript schemas
pnpm db:generate

# Apply pending SQL migrations to PostgreSQL
pnpm db:migrate

# Seed database with initial admin, cashier, products, members & orders
pnpm db:seed

# Launch Drizzle Studio Web GUI (inspect tables & rows)
pnpm db:studio
```

---

## 4. DOCKER & INFRASTRUCTURE

```bash
# Start local PostgreSQL in background
docker compose up -d db

# Stop local PostgreSQL container
docker compose down

# View database container logs
docker compose logs -f db

# Spin up full-stack production containers
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 5. CODE QUALITY AUDIT SCRIPT

Before finishing any task or slice, run this verification sequence:
```bash
# 1. Check for forbidden raw SVG icons
grep -rn "<svg" apps/frontend/src/ || echo "✅ No raw SVG icons found"

# 2. Check for missing environment variables
pnpm --filter @titipin/backend test

# 3. Ensure no TypeScript errors exist
pnpm turbo typecheck

# 4. Verify formatting
pnpm turbo lint
```
