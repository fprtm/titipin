# Technical Investigation & Architectural Handoff Report
## Milestone 2 — Slice 4: Customers & Membership Management Backend

---

## 1. Observation

### 1.1 Current State of the Codebase
- **Customer Database Schema**:
  - Located at `apps/backend/src/database/schema/customers.schema.ts` (lines 5–19) and deployed in migration `apps/backend/drizzle/0000_rainy_snowbird.sql` (lines 30–40).
  - Table: `customers`
    - `id`: `uuid('id').defaultRandom().primaryKey()`
    - `customerName`: `varchar('customer_name', { length: 150 }).notNull()`
    - `customerAddress`: `varchar('customer_address', { length: 255 }).notNull()`
    - `gender`: `genderEnum('gender').notNull()` where enum values are `'Pria' | 'Wanita'`
    - `birthDate`: `date('birth_date', { mode: 'string' }).notNull()` (formatted `YYYY-MM-DD`)
    - `phone`: `varchar('phone', { length: 20 })` (nullable, no database UNIQUE constraint)
    - `createdAt`: `timestamp('created_at', { withTimezone: true }).defaultNow().notNull()`
    - `updatedAt`: `timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()`
    - `deletedAt`: `timestamp('deleted_at', { withTimezone: true })` (nullable, soft-delete timestamp)
  - Index: `idx_customers_name` on `customer_name` (`apps/backend/src/database/schema/customers.schema.ts:18`).
  - Drizzle Relations in `apps/backend/src/database/schema/index.ts` (lines 29–32):
    ```typescript
    export const customersRelations = relations(customers, ({ many }) => ({
      orders: many(orders),
      draftOrders: many(draftOrders),
    }));
    ```

- **Customers Module Absence**:
  - The directory `apps/backend/src/modules/customers/` does NOT exist yet.
  - `apps/backend/src/app.module.ts` (lines 10–17) only imports `DatabaseModule`, `AuditModule`, `HealthModule`, `AuthModule`, `UsersModule`, and `ProductsModule`.
  - When running `pnpm --filter @titipin/backend test`, all 10 tests in `apps/backend/test/customers.e2e-spec.ts` are skipped because the initial probe receives `"Cannot GET /api/customers"` (`customers.e2e-spec.ts:58`).

- **Shared Contracts & Schemas**:
  - `packages/shared/src/schemas/customer.schema.ts` exports:
    - `createCustomerSchema`: validates `customer_name` (2..150 chars), `customer_address` (5..255 chars), `gender` (`Gender.Pria` | `Gender.Wanita`), `birth_date` (`/^\d{4}-\d{2}-\d{2}$/`), `phone` (optional/nullable, max 20).
    - `updateCustomerSchema`: partial of create schema.
    - `customerQuerySchema`: `page` (min 1, default 1), `per_page` (min 1, max 100, default 10), `search` (optional string), `sort` (optional string), `order` (`'asc' | 'desc'`, default `'asc'`).
  - `packages/shared/src/types/customer.types.ts` exports:
    - `CustomerItem`: contains both camelCase fields (`customerName`, `customerAddress`, `birthDate`) and optional snake_case aliases (`customer_name`, `customer_address`, `birth_date`, `created_at`, `updated_at`, `deleted_at`).
    - `CreateCustomerInput`, `UpdateCustomerInput`, `CustomerListResponse`, `CustomerDetailResponse`.
  - `packages/shared/src/enums/audit-action.enum.ts` exports:
    - `AuditAction.CUSTOMER_CREATED = 'CUSTOMER_CREATED'`
    - `AuditAction.CUSTOMER_UPDATED = 'CUSTOMER_UPDATED'`
    - `AuditAction.CUSTOMER_DELETED = 'CUSTOMER_DELETED'`

- **Test Suite Expectations (`apps/backend/test/customers.e2e-spec.ts`)**:
  - Line 67: Unauthenticated request to `/api/customers` returns `401 Unauthorized`.
  - Line 76: Admin registers new member via `POST /api/customers` -> returns `201 Created` with `{ success: true, data: { id, customer_name, customer_address, gender, birth_date, ... } }`.
  - Line 107: Cashier can also register a new member via `POST /api/customers` -> returns `201 Created`.
  - Line 130: Both Cashier and Admin can search and list active customers with pagination metadata via `GET /api/customers?search=...` -> returns `200 OK` with `{ success: true, data: [...], meta: { page: 1, ... } }`.
  - Line 148: Cashier and Admin can retrieve customer profile by UUID via `GET /api/customers/:id` -> returns `200 OK`.
  - Line 164: Admin updates member profile via `PUT /api/customers/:id` -> returns `200 OK`.
  - Line 186: Cashier is blocked with `403 Forbidden` from updating member via `PUT /api/customers/:id`.
  - Line 202: Cashier is blocked with `403 Forbidden` from deleting member via `DELETE /api/customers/:id`.
  - Line 215: Admin soft-deletes member via `DELETE /api/customers/:id` -> returns `200 OK` with `{ success: true }`. Subsequently, `GET /api/customers/:id` returns `404 Not Found`, and search query excludes the deleted member.
  - Line 244–297: Validation rejects invalid inputs with `422 Unprocessable Entity` (invalid gender, invalid birth_date format, short name < 2 chars, short address < 5 chars).

- **Critical Bug / Discrepancy Found in Validation Pipe**:
  - `apps/backend/src/common/pipes/zod-validation.pipe.ts` lines 22–25:
    ```typescript
    if (!result.success) {
      const formattedErrors = this.formatZodError(result.error);
      throw new BadRequestException({
        message: 'Validasi gagal',
        errors: formattedErrors,
      });
    }
    ```
  - `BadRequestException` throws HTTP **400**, whereas:
    1. `apps/backend/test/customers.e2e-spec.ts` line 260 explicitly tests: `expect(resGender.status).toBe(422)`.
    2. `apps/backend/test/orders.e2e-spec.ts` line 407 explicitly tests: `expect(resNegative.status).toBe(422)`.
    3. `docs/architecture/FOUNDATION.md` line 321 specifies that Zod schema validation errors return `HTTP 422 Unprocessable Entity`.
  - Unless `ZodValidationPipe` throws `UnprocessableEntityException` (or is mapped accordingly), the validation tests in `customers.e2e-spec.ts` will fail with 400 instead of 422.

---

## 2. Logic Chain

1. **Clean Architecture Separation (M1 Parity)**:
   - In `products` and `users`, queries and Drizzle mutations are strictly confined to `repositories/*.repository.ts`.
   - Use-cases encapsulate a single business action (`FindCustomersUseCase`, `GetCustomerByIdUseCase`, `CreateCustomerUseCase`, `UpdateCustomerUseCase`, `DeleteCustomerUseCase`), injecting repositories and `AuditService`.
   - `CustomersService` acts strictly as an injection facade for other modules (`OrdersModule`, `DashboardModule`) and controllers.
   - Controllers handle HTTP routing, guard application, parameter validation (`ParseUUIDPipe`), and body validation (`ZodValidationPipe`).

2. **Access Control (RBAC)**:
   - All endpoints require authentication (`JwtAuthGuard`, `RolesGuard`).
   - `GET /api/customers`, `GET /api/customers/:id`, and `POST /api/customers`: Cashier and Admin must both have access. By omitting the `@Roles()` decorator or declaring `@Roles(Role.ADMIN, Role.CASHIER)`, `RolesGuard` permits both roles.
   - `PUT /api/customers/:id` and `DELETE /api/customers/:id`: Must be decorated with `@Roles(Role.ADMIN)`. A Cashier attempting either operation will be rejected with `403 Forbidden` by `RolesGuard` (satisfying tests at lines 186 and 202).

3. **Soft-Delete Lifecycle & Filter Integrity**:
   - `DELETE /api/customers/:id` must not execute SQL `DELETE`. It must set `deletedAt = new Date()`, `updatedAt = new Date()`.
   - `findAll` and `findById` must by default add condition `isNull(customers.deletedAt)`.
   - If a customer record has `deletedAt IS NOT NULL`, `findById` returns `null`, causing `GetCustomerByIdUseCase`, `UpdateCustomerUseCase`, and `DeleteCustomerUseCase` to throw `NotFoundException('Pelanggan tidak ditemukan')` (HTTP 404).
   - In search queries (`findAll`), deleted customers are omitted from both the count query and the result set.

4. **DTO Mapping & Compatibility**:
   - The shared type `CustomerItem` defines both camelCase and snake_case properties.
   - A pure mapper function `mapCustomerToItem(row: typeof schema.customers.$inferSelect): CustomerItem` ensures dates are serialized as ISO strings and both property formats are populated.
   - The global `TransformInterceptor` automatically transforms `{ items, meta }` returned by `FindCustomersUseCase` into `{ success: true, data: items, meta }`, satisfying `customers.e2e-spec.ts` line 140.

5. **Inter-Module Contract with `OrdersModule` (Milestone 3 Bridge)**:
   - Milestone 3 requires `customersRepository.findById(id: string)` to check if a member's birth date (`MM-DD`) matches the order date (`MM-DD`) for `BR-006` (5% member birthday discount up to Rp 50.000).
   - Providing an optional `includeDeleted: boolean = false` and optional transaction context `tx?: DrizzleClient` ensures `OrdersService.checkout()` can safely query the customer inside its atomic transaction.

---

## 3. Caveats

- **Phone Number Uniqueness**: In `customers.schema.ts` and PostgreSQL migration `0000_rainy_snowbird.sql`, `phone` is `varchar(20)` and is **nullable without a UNIQUE constraint**. In Indonesian retail contexts, family members may share a single phone number. Neither `openapi.yaml` nor `customers.e2e-spec.ts` requires a 409 Conflict for duplicate phone numbers. However, if business requires uniqueness in future, a soft-delete-aware check (`findByPhone` where `deleted_at is null`) can be added to `CreateCustomerUseCase`.
- **ZodValidationPipe Status Code**: Updating `ZodValidationPipe` from `BadRequestException` to `UnprocessableEntityException` affects any route using `ZodValidationPipe`. Verification of the entire test suite confirms that existing tests either expect 422 for Zod failures or do not test Zod validation with 400. This change is safe and directly required by `customers.e2e-spec.ts` and `orders.e2e-spec.ts`.
- **Search Parameter Scope**: In `FindCustomersUseCase`, `query.search` searches case-insensitively using `ilike(customers.customerName, searchTerm)` and `ilike(customers.phone, searchTerm)`. Since `customer_name` has an index (`idx_customers_name`), this matches both specification and query efficiency.

---

## 4. Conclusion & Complete Implementation Blueprint

To implement Milestone 2 (Slice 4 Backend), the following 9 files must be created or updated in `apps/backend/src/`:

### 4.1 `apps/backend/src/modules/customers/repositories/customers.repository.ts`
```typescript
import { Injectable, Inject } from '@nestjs/common';
import {
  eq,
  and,
  isNull,
  or,
  ilike,
  asc,
  desc,
  count,
  SQL,
} from 'drizzle-orm';
import { DRIZZLE_ORM, DrizzleDatabase, DrizzleClient } from '../../../database/database.module';
import * as schema from '../../../database/schema';
import { CustomerQueryInput } from '@titipin/shared';

@Injectable()
export class CustomersRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDatabase) {}

  private getClient(tx?: DrizzleClient): DrizzleClient {
    return tx ?? this.db;
  }

  async findAll(
    query: CustomerQueryInput,
    tx?: DrizzleClient,
  ): Promise<{ items: (typeof schema.customers.$inferSelect)[]; total: number }> {
    const page = Math.max(1, query.page || 1);
    const perPage = Math.max(1, Math.min(100, query.per_page || 10));
    const offset = (page - 1) * perPage;

    const conditions: SQL[] = [isNull(schema.customers.deletedAt)];

    if (query.search && query.search.trim() !== '') {
      const searchTerm = `%${query.search.trim()}%`;
      const searchCondition = or(
        ilike(schema.customers.customerName, searchTerm),
        ilike(schema.customers.phone, searchTerm),
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    const whereClause = and(...conditions);

    // Sorting
    let orderByExpression;
    const isDesc = query.order === 'desc';
    if (query.sort === 'birth_date' || query.sort === 'birthDate') {
      orderByExpression = isDesc ? desc(schema.customers.birthDate) : asc(schema.customers.birthDate);
    } else if (query.sort === 'created_at' || query.sort === 'createdAt') {
      orderByExpression = isDesc ? desc(schema.customers.createdAt) : asc(schema.customers.createdAt);
    } else {
      orderByExpression = isDesc ? desc(schema.customers.customerName) : asc(schema.customers.customerName);
    }

    const [totalRecord] = await this.getClient(tx)
      .select({ count: count() })
      .from(schema.customers)
      .where(whereClause);

    const total = totalRecord?.count ? Number(totalRecord.count) : 0;

    const items = await this.getClient(tx)
      .select()
      .from(schema.customers)
      .where(whereClause)
      .orderBy(orderByExpression)
      .limit(perPage)
      .offset(offset);

    return { items, total };
  }

  async findById(
    id: string,
    includeDeleted = false,
    tx?: DrizzleClient,
  ): Promise<typeof schema.customers.$inferSelect | null> {
    const conditions: SQL[] = [eq(schema.customers.id, id)];
    if (!includeDeleted) {
      conditions.push(isNull(schema.customers.deletedAt));
    }

    const [customer] = await this.getClient(tx)
      .select()
      .from(schema.customers)
      .where(and(...conditions))
      .limit(1);

    return customer ?? null;
  }

  async findByPhone(
    phone: string,
    tx?: DrizzleClient,
  ): Promise<typeof schema.customers.$inferSelect | null> {
    const [customer] = await this.getClient(tx)
      .select()
      .from(schema.customers)
      .where(and(eq(schema.customers.phone, phone.trim()), isNull(schema.customers.deletedAt)))
      .limit(1);

    return customer ?? null;
  }

  async create(
    data: {
      customerName: string;
      customerAddress: string;
      gender: 'Pria' | 'Wanita';
      birthDate: string;
      phone?: string | null;
    },
    tx?: DrizzleClient,
  ): Promise<typeof schema.customers.$inferSelect> {
    const [newCustomer] = await this.getClient(tx)
      .insert(schema.customers)
      .values(data)
      .returning();

    return newCustomer;
  }

  async update(
    id: string,
    data: Partial<typeof schema.customers.$inferInsert>,
    tx?: DrizzleClient,
  ): Promise<typeof schema.customers.$inferSelect | null> {
    const [updated] = await this.getClient(tx)
      .update(schema.customers)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(schema.customers.id, id))
      .returning();

    return updated ?? null;
  }

  async softDelete(id: string, tx?: DrizzleClient): Promise<void> {
    await this.getClient(tx)
      .update(schema.customers)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.customers.id, id));
  }

  async countActive(tx?: DrizzleClient): Promise<number> {
    const [record] = await this.getClient(tx)
      .select({ count: count() })
      .from(schema.customers)
      .where(isNull(schema.customers.deletedAt));

    return record?.count ? Number(record.count) : 0;
  }
}
```

---

### 4.2 Use-Cases

#### `apps/backend/src/modules/customers/use-cases/find-customers.use-case.ts`
```typescript
import { Injectable } from '@nestjs/common';
import { CustomerItem, CustomerQueryInput, Gender } from '@titipin/shared';
import * as schema from '../../../database/schema';
import { CustomersRepository } from '../repositories/customers.repository';

export function mapCustomerToItem(cust: typeof schema.customers.$inferSelect): CustomerItem {
  const createdAtStr = cust.createdAt.toISOString();
  const updatedAtStr = cust.updatedAt.toISOString();
  const deletedAtStr = cust.deletedAt ? cust.deletedAt.toISOString() : null;

  return {
    id: cust.id,
    customerName: cust.customerName,
    customerAddress: cust.customerAddress,
    gender: cust.gender as Gender,
    birthDate: cust.birthDate,
    phone: cust.phone,
    createdAt: createdAtStr,
    updatedAt: updatedAtStr,
    deletedAt: deletedAtStr,
    // snake_case aliases for client / OpenAPI / Vitest compatibility
    customer_name: cust.customerName,
    customer_address: cust.customerAddress,
    birth_date: cust.birthDate,
    created_at: createdAtStr,
    updated_at: updatedAtStr,
    deleted_at: deletedAtStr,
  };
}

@Injectable()
export class FindCustomersUseCase {
  constructor(private readonly customersRepository: CustomersRepository) {}

  async execute(query: CustomerQueryInput) {
    const page = Math.max(1, query.page || 1);
    const perPage = Math.max(1, Math.min(100, query.per_page || 10));

    const { items, total } = await this.customersRepository.findAll(query);
    const totalPages = Math.ceil(total / perPage) || 1;

    return {
      items: items.map(mapCustomerToItem),
      meta: {
        page,
        per_page: perPage,
        total_items: total,
        total_pages: totalPages,
      },
    };
  }
}
```

#### `apps/backend/src/modules/customers/use-cases/get-customer-by-id.use-case.ts`
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { CustomerItem } from '@titipin/shared';
import { CustomersRepository } from '../repositories/customers.repository';
import { mapCustomerToItem } from './find-customers.use-case';

@Injectable()
export class GetCustomerByIdUseCase {
  constructor(private readonly customersRepository: CustomersRepository) {}

  async execute(id: string): Promise<CustomerItem> {
    const customer = await this.customersRepository.findById(id);

    if (!customer) {
      throw new NotFoundException('Pelanggan tidak ditemukan');
    }

    return mapCustomerToItem(customer);
  }
}
```

#### `apps/backend/src/modules/customers/use-cases/create-customer.use-case.ts`
```typescript
import { Injectable } from '@nestjs/common';
import { AuditAction, CreateCustomerInput, CustomerItem } from '@titipin/shared';
import { CustomersRepository } from '../repositories/customers.repository';
import { AuditService } from '../../audit/audit.service';
import { mapCustomerToItem } from './find-customers.use-case';

@Injectable()
export class CreateCustomerUseCase {
  constructor(
    private readonly customersRepository: CustomersRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    dto: CreateCustomerInput,
    actorId?: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<CustomerItem> {
    const name = (dto.customer_name || dto.customerName || '').trim();
    const address = (dto.customer_address || dto.customerAddress || '').trim();
    const gender = dto.gender;
    const birthDate = dto.birth_date || dto.birthDate || '';
    const phone = dto.phone ? dto.phone.trim() : null;

    const newCustomer = await this.customersRepository.create({
      customerName: name,
      customerAddress: address,
      gender,
      birthDate,
      phone,
    });

    if (actorId) {
      await this.auditService.log({
        userId: actorId,
        action: AuditAction.CUSTOMER_CREATED,
        entityType: 'CUSTOMER',
        entityId: newCustomer.id,
        newValues: {
          id: newCustomer.id,
          customerName: newCustomer.customerName,
          customerAddress: newCustomer.customerAddress,
          gender: newCustomer.gender,
          birthDate: newCustomer.birthDate,
          phone: newCustomer.phone,
        },
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      });
    }

    return mapCustomerToItem(newCustomer);
  }
}
```

#### `apps/backend/src/modules/customers/use-cases/update-customer.use-case.ts`
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, CustomerItem, UpdateCustomerInput } from '@titipin/shared';
import * as schema from '../../../database/schema';
import { CustomersRepository } from '../repositories/customers.repository';
import { AuditService } from '../../audit/audit.service';
import { mapCustomerToItem } from './find-customers.use-case';

@Injectable()
export class UpdateCustomerUseCase {
  constructor(
    private readonly customersRepository: CustomersRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    id: string,
    dto: UpdateCustomerInput,
    actorId?: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<CustomerItem> {
    const existing = await this.customersRepository.findById(id);

    if (!existing) {
      throw new NotFoundException('Pelanggan tidak ditemukan');
    }

    const updateValues: Partial<typeof schema.customers.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (dto.customer_name !== undefined || dto.customerName !== undefined) {
      updateValues.customerName = (dto.customer_name ?? dto.customerName)!.trim();
    }
    if (dto.customer_address !== undefined || dto.customerAddress !== undefined) {
      updateValues.customerAddress = (dto.customer_address ?? dto.customerAddress)!.trim();
    }
    if (dto.gender !== undefined) {
      updateValues.gender = dto.gender;
    }
    if (dto.birth_date !== undefined || dto.birthDate !== undefined) {
      updateValues.birthDate = (dto.birth_date ?? dto.birthDate)!;
    }
    if (dto.phone !== undefined) {
      updateValues.phone = dto.phone ? dto.phone.trim() : null;
    }

    const updated = await this.customersRepository.update(id, updateValues);

    if (!updated) {
      throw new NotFoundException('Pelanggan tidak ditemukan');
    }

    if (actorId) {
      await this.auditService.log({
        userId: actorId,
        action: AuditAction.CUSTOMER_UPDATED,
        entityType: 'CUSTOMER',
        entityId: id,
        oldValues: {
          customerName: existing.customerName,
          customerAddress: existing.customerAddress,
          gender: existing.gender,
          birthDate: existing.birthDate,
          phone: existing.phone,
        },
        newValues: {
          customerName: updated.customerName,
          customerAddress: updated.customerAddress,
          gender: updated.gender,
          birthDate: updated.birthDate,
          phone: updated.phone,
        },
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      });
    }

    return mapCustomerToItem(updated);
  }
}
```

#### `apps/backend/src/modules/customers/use-cases/delete-customer.use-case.ts`
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction } from '@titipin/shared';
import { CustomersRepository } from '../repositories/customers.repository';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class DeleteCustomerUseCase {
  constructor(
    private readonly customersRepository: CustomersRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    id: string,
    actorId?: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<{ success: boolean; message: string }> {
    const existing = await this.customersRepository.findById(id);

    if (!existing) {
      throw new NotFoundException('Pelanggan tidak ditemukan');
    }

    await this.customersRepository.softDelete(id);

    if (actorId) {
      await this.auditService.log({
        userId: actorId,
        action: AuditAction.CUSTOMER_DELETED,
        entityType: 'CUSTOMER',
        entityId: id,
        oldValues: {
          customerName: existing.customerName,
          deletedAt: existing.deletedAt,
        },
        newValues: {
          deletedAt: new Date().toISOString(),
        },
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      });
    }

    return {
      success: true,
      message: 'Data pelanggan berhasil dihapus',
    };
  }
}
```

---

### 4.3 `apps/backend/src/modules/customers/customers.service.ts`
```typescript
import { Injectable } from '@nestjs/common';
import {
  CustomerItem,
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerQueryInput,
} from '@titipin/shared';
import { FindCustomersUseCase } from './use-cases/find-customers.use-case';
import { GetCustomerByIdUseCase } from './use-cases/get-customer-by-id.use-case';
import { CreateCustomerUseCase } from './use-cases/create-customer.use-case';
import { UpdateCustomerUseCase } from './use-cases/update-customer.use-case';
import { DeleteCustomerUseCase } from './use-cases/delete-customer.use-case';

@Injectable()
export class CustomersService {
  constructor(
    private readonly findCustomersUseCase: FindCustomersUseCase,
    private readonly getCustomerByIdUseCase: GetCustomerByIdUseCase,
    private readonly createCustomerUseCase: CreateCustomerUseCase,
    private readonly updateCustomerUseCase: UpdateCustomerUseCase,
    private readonly deleteCustomerUseCase: DeleteCustomerUseCase,
  ) {}

  async findAll(query: CustomerQueryInput) {
    return this.findCustomersUseCase.execute(query);
  }

  async findById(id: string): Promise<CustomerItem> {
    return this.getCustomerByIdUseCase.execute(id);
  }

  async create(
    dto: CreateCustomerInput,
    actorId?: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<CustomerItem> {
    return this.createCustomerUseCase.execute(dto, actorId, metadata);
  }

  async update(
    id: string,
    dto: UpdateCustomerInput,
    actorId?: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<CustomerItem> {
    return this.updateCustomerUseCase.execute(id, dto, actorId, metadata);
  }

  async delete(
    id: string,
    actorId?: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<{ success: boolean; message: string }> {
    return this.deleteCustomerUseCase.execute(id, actorId, metadata);
  }
}
```

---

### 4.4 `apps/backend/src/modules/customers/customers.controller.ts`
```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  Role,
  CustomerItem,
  createCustomerSchema,
  CreateCustomerInput,
  updateCustomerSchema,
  UpdateCustomerInput,
  customerQuerySchema,
  CustomerQueryInput,
} from '@titipin/shared';

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  async findAll(@Query(new ZodValidationPipe(customerQuerySchema)) query: CustomerQueryInput) {
    return this.customersService.findAll(query);
  }

  @Get(':id')
  async findById(@Param('id', new ParseUUIDPipe()) id: string): Promise<CustomerItem> {
    return this.customersService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(createCustomerSchema)) dto: CreateCustomerInput,
    @CurrentUser('id') actorId: string,
    @Req() req: Request,
  ): Promise<CustomerItem> {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    return this.customersService.create(dto, actorId, { ipAddress, userAgent });
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateCustomerSchema)) dto: UpdateCustomerInput,
    @CurrentUser('id') actorId: string,
    @Req() req: Request,
  ): Promise<CustomerItem> {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    return this.customersService.update(id, dto, actorId, { ipAddress, userAgent });
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  async delete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('id') actorId: string,
    @Req() req: Request,
  ): Promise<{ success: boolean; message: string }> {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    return this.customersService.delete(id, actorId, { ipAddress, userAgent });
  }
}
```

---

### 4.5 `apps/backend/src/modules/customers/customers.module.ts`
```typescript
import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { CustomersRepository } from './repositories/customers.repository';
import { FindCustomersUseCase } from './use-cases/find-customers.use-case';
import { GetCustomerByIdUseCase } from './use-cases/get-customer-by-id.use-case';
import { CreateCustomerUseCase } from './use-cases/create-customer.use-case';
import { UpdateCustomerUseCase } from './use-cases/update-customer.use-case';
import { DeleteCustomerUseCase } from './use-cases/delete-customer.use-case';
import { DatabaseModule } from '../../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DatabaseModule, AuditModule, AuthModule],
  controllers: [CustomersController],
  providers: [
    CustomersRepository,
    FindCustomersUseCase,
    GetCustomerByIdUseCase,
    CreateCustomerUseCase,
    UpdateCustomerUseCase,
    DeleteCustomerUseCase,
    CustomersService,
  ],
  exports: [
    CustomersService,
    CustomersRepository,
    FindCustomersUseCase,
    GetCustomerByIdUseCase,
    CreateCustomerUseCase,
    UpdateCustomerUseCase,
    DeleteCustomerUseCase,
  ],
})
export class CustomersModule {}
```

---

### 4.6 Registration in `apps/backend/src/app.module.ts`
Add `CustomersModule` to the `imports` array of `AppModule`:
```typescript
import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { AuditModule } from './modules/audit/audit.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProductsModule } from './modules/products/products.module';
import { CustomersModule } from './modules/customers/customers.module';

@Module({
  imports: [
    DatabaseModule,
    AuditModule,
    HealthModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    CustomersModule,
  ],
})
export class AppModule {}
```

---

### 4.7 Correction in `apps/backend/src/common/pipes/zod-validation.pipe.ts`
Replace `BadRequestException` with `UnprocessableEntityException` on schema failure:
```typescript
import { PipeTransform, ArgumentMetadata, UnprocessableEntityException, Injectable } from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema?: ZodSchema) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    const targetSchema =
      this.schema ??
      (metadata?.metatype && typeof metadata.metatype === 'function' && 'schema' in metadata.metatype
        ? (metadata.metatype as unknown as { schema: ZodSchema }).schema
        : undefined);

    if (!targetSchema) {
      return value;
    }

    const result = targetSchema.safeParse(value);
    if (!result.success) {
      const formattedErrors = this.formatZodError(result.error);
      throw new UnprocessableEntityException({
        message: 'Validasi gagal',
        errors: formattedErrors,
      });
    }

    return result.data;
  }

  private formatZodError(error: ZodError): Record<string, string[]> {
    const errors: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const path = issue.path.join('.') || 'root';
      if (!errors[path]) {
        errors[path] = [];
      }
      errors[path].push(issue.message);
    }
    return errors;
  }
}
```

---

## 5. Verification Method

Once implemented, the verification procedure consists of:

1. **E2E Test Execution**:
   Run Vitest targeting the customer test suite:
   ```bash
   pnpm --filter @titipin/backend test test/customers.e2e-spec.ts
   ```
   **Expected Outcome**: All 10 tests pass (0 skipped, 0 failed).

2. **Full Regression Test Suite**:
   Run the complete backend test suite to ensure no regressions across Auth, Users, Products, Orders, Audit, Dashboard, and Stress tests:
   ```bash
   pnpm --filter @titipin/backend test
   ```
   **Expected Outcome**: 100% test files pass.

3. **Typecheck & Lint Audit**:
   Ensure strict zero-defect compliance with TypeScript and ESLint:
   ```bash
   pnpm turbo lint
   pnpm turbo typecheck
   ```
   **Expected Outcome**: 0 errors, 0 warnings.

4. **Invalidation Conditions**:
   - `test/customers.e2e-spec.ts` reports 400 instead of 422 on invalid inputs (indicates `ZodValidationPipe` was not updated to `UnprocessableEntityException`).
   - Cashier role receives 403 when creating customers (`POST /api/customers` must allow both Admin and Cashier).
   - Cashier role is allowed to update or delete customers (must be blocked with 403 Forbidden).
   - Soft-deleted customers appear in `GET /api/customers?search=...` (indicates `isNull(deletedAt)` was omitted from repository query).
