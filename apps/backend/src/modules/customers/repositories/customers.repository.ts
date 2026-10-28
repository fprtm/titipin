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
      birthDate?: string | null;
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
