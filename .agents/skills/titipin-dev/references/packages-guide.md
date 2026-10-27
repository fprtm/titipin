# TITIPIN DEV — SHARED PACKAGES & TOOLING GUIDE
## Shared Contracts, TypeScript Configurations & ESLint 9 Flat Config

This guide outlines the architecture, configuration, and boundaries of shared packages in `packages/`.

---

## 1. STRUKTUR PACKAGES WORKSPACE

Monorepo memiliki 3 shared packages di dalam folder `packages/`:

```
packages/
├── shared/                  # @titipin/shared: Domain types, contracts, enums
│   ├── src/
│   │   ├── enums/           # Role, Gender, OrderStatus, AuditAction
│   │   ├── types/           # ApiResponse, ApiErrorResponse, PaginationMeta, DTO interfaces
│   │   └── index.ts         # Central barrel export
│   ├── package.json
│   ├── tsconfig.json
│   └── tsup.config.ts       # Dual ESM & CJS bundling with .d.ts emission
├── eslint-config/           # @titipin/eslint-config: Shared ESLint 9 Flat Configs
│   ├── base.js              # Base JavaScript/TypeScript strict lint rules
│   ├── nest.js              # Backend-specific NestJS lint rules
│   ├── next.js              # Frontend-specific React/Next.js rules
│   └── package.json
└── typescript-config/       # @titipin/typescript-config: Shared tsconfig bases
    ├── base.json            # Base compiler options (strict, ES2023, bundler resolution)
    ├── nest.json            # Decorator metadata & CommonJS/NodeNext for NestJS
    ├── next.json            # JSX preserve & Next.js App Router compiler settings
    └── package.json
```

---

## 2. PAKET `@titipin/shared`

### 2.1 Tanggung Jawab Paket
Paket ini menjadi **single source of truth** bagi kontrak tipe yang digunakan bersama oleh backend (`apps/backend`) dan frontend (`apps/frontend`):
- **Enums**:
  ```typescript
  export enum Role {
    ADMIN = 'ADMIN',
    CASHIER = 'CASHIER',
  }

  export enum Gender {
    PRIA = 'Pria',
    WANITA = 'Wanita',
  }

  export enum OrderStatus {
    PENDING = 'PENDING',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
    HELD = 'HELD',
  }
  ```
- **Response Interfaces**:
  ```typescript
  export interface ApiResponse<T> {
    success: true;
    message?: string;
    data: T;
    meta?: PaginationMeta;
  }

  export interface ApiErrorResponse {
    success: false;
    message: string;
    errors?: Record<string, string[]>;
  }

  export interface PaginationMeta {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  }
  ```

### 2.2 Konfigurasi Build (`tsup.config.ts`)
Menggunakan `tsup` untuk kompilasi ultra-cepat dengan output ESM dan CJS serta deklarasi tipe `.d.ts`:
```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
});
```

---

## 3. ATURAN BOUNDARY (WORKSPACE DEPENDENCY RULES)

1. **Arah Dependensi**:
   - `apps/backend` boleh mengimpor `@titipin/shared`, `@titipin/typescript-config`, `@titipin/eslint-config`.
   - `apps/frontend` boleh mengimpor `@titipin/shared`, `@titipin/typescript-config`, `@titipin/eslint-config`.
   - `packages/*` **DILARANG KERAS** mengimpor dari `apps/backend` atau `apps/frontend`.
2. **Deklarasi Workspace di `package.json`**:
   Gunakan protokol `workspace:*` pada file `package.json`:
   ```json
   "dependencies": {
     "@titipin/shared": "workspace:*"
   }
   ```
