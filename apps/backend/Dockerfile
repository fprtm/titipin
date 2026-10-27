# Multi-stage Dockerfile for NestJS Backend
FROM node:20-alpine AS builder

WORKDIR /app

# Enable corepack and install pnpm
RUN corepack enable && corepack prepare pnpm@10.28.1 --activate

# Copy monorepo root configs
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages ./packages
COPY apps/backend ./apps/backend

# Install dependencies and build
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @titipin/shared build
RUN pnpm --filter @titipin/backend build

# Production runner stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@10.28.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages ./packages
COPY apps/backend/package.json ./apps/backend/package.json

RUN pnpm install --prod --frozen-lockfile
RUN pnpm --filter @titipin/shared build

COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY apps/backend/src/database ./apps/backend/src/database

WORKDIR /app/apps/backend

EXPOSE 3001

CMD ["node", "dist/main"]
