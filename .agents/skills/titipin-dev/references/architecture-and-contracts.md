# TITIPIN DEV — ARCHITECTURE & SHARED CONTRACTS
## System Topology, Contracts, Error Handling & Data Models

This reference outlines the technical contracts, response standards, Drizzle ORM schemas, and data flow patterns in **Titipin POS**.

---

## 1. HIGH-LEVEL TOPOLOGY & PORTS

- **Frontend**: Next.js 15 App Router (`apps/frontend`), running on port **3000**.
  - Server state: TanStack Query v5.
  - Client transport: Axios with mutex queue for refresh token synchronization.
  - SSR Guard: `middleware.ts` running at edge to validate session cookies.
- **Backend**: NestJS 11+ (`apps/backend`), running on port **3001**.
  - Global route prefix: `/api`.
  - Global pipes, filters, and interceptors registered in `main.ts`.
  - Modular Monolith: `auth`, `products`, `customers`, `orders`, `dashboard`, `audit`.
- **Database**: PostgreSQL 16, running on port **5432**.
  - Managed via Drizzle ORM + Drizzle Kit.

---

## 2. API CONTRACT STANDARDS

### Success Response Envelope
All successful API endpoints must return a consistent JSON payload:
```typescript
export interface ApiResponse<T> {
  success: true;
  message?: string;
  data: T;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}
```

### Error Response Envelope & Nested Validation Errors
All error responses from NestJS must adhere to:
```typescript
export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}
```

Example nested validation error response:
```json
{
  "success": false,
  "message": "Validasi input gagal",
  "errors": {
    "items.0.quantity": ["Kuantitas harus lebih besar dari 0"],
    "items.1.quantity": ["Kuantitas melebihi sisa stok yang tersedia (stok: 2)"]
  }
}
```

---

## 3. DRIZZLE ORM DATABASE SCHEMAS

The relational data model consists of 8 core tables:

1. `users`: System accounts (`ADMIN`, `CASHIER`), hashed passwords, refresh token hashes, soft delete.
2. `customers`: Member directory with unique phone numbers, customer codes, names, genders, emails.
3. `products`: Product catalog with SKU, barcode, name, price, stock, category, soft delete.
4. `orders`: Transactions with unique `order_number`, customer relation (nullable for walk-in), total amount, status (`PENDING`, `COMPLETED`, `CANCELLED`, `HELD`).
5. `order_items`: Line items with historical `unit_price`, `quantity`, `subtotal`.
6. `order_activity_logs`: Timeline log of order status transitions (`ORDER_CREATED`, `ORDER_HELD`, etc.).
7. `audit_logs`: Centralized audit trail for all write mutations with JSON diff.
8. `held_orders`: Draft transactions stored when cashiers hold customer orders.

---

## 4. SEEDER REQUISITES

The programmatic database seeder (`pnpm db:seed`) must deterministically insert:
- **1 Admin User**: `admin@titipin.id` (Password: `Admin123!`, Role: `ADMIN`)
- **1 Cashier User**: `kasir@titipin.id` (Password: `Kasir123!`, Role: `CASHIER`)
- **20+ Products**: Realistic items across F&B, Retail, Stationery with diverse stock and prices.
- **15+ Customers**: Realistic Indonesian customer profiles with unique phone numbers.
- **30+ Orders**: Diverse transaction history with historical line items, timestamps, and customer relations.
