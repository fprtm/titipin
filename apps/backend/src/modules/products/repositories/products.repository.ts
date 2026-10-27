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
  inArray,
  sql,
  SQL,
} from 'drizzle-orm';
import { DRIZZLE_ORM, DrizzleDatabase, DrizzleClient } from '../../../database/database.module';
import * as schema from '../../../database/schema';
import { ProductQueryInput } from '@titipin/shared';

@Injectable()
export class ProductsRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDatabase) {}

  private getClient(tx?: DrizzleClient): DrizzleClient {
    return tx ?? this.db;
  }

  async findAll(
    query: ProductQueryInput,
    tx?: DrizzleClient,
  ): Promise<{ items: (typeof schema.products.$inferSelect)[]; total: number }> {
    const page = Math.max(1, query.page || 1);
    const perPage = Math.max(1, Math.min(100, query.per_page || 10));
    const offset = (page - 1) * perPage;

    const conditions: SQL[] = [isNull(schema.products.deletedAt)];

    if (query.search && query.search.trim() !== '') {
      const searchTerm = `%${query.search.trim()}%`;
      const searchCondition = or(
        ilike(schema.products.productName, searchTerm),
        ilike(schema.products.productCode, searchTerm),
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    const whereClause = and(...conditions);

    // Sorting
    let orderByExpression;
    const isDesc = query.order === 'desc';
    if (query.sort === 'price') {
      orderByExpression = isDesc ? desc(schema.products.price) : asc(schema.products.price);
    } else if (query.sort === 'stock') {
      orderByExpression = isDesc ? desc(schema.products.stock) : asc(schema.products.stock);
    } else {
      orderByExpression = isDesc ? desc(schema.products.productName) : asc(schema.products.productName);
    }

    const [totalRecord] = await this.getClient(tx)
      .select({ count: count() })
      .from(schema.products)
      .where(whereClause);

    const total = totalRecord?.count ? Number(totalRecord.count) : 0;

    const items = await this.getClient(tx)
      .select()
      .from(schema.products)
      .where(whereClause)
      .orderBy(orderByExpression)
      .limit(perPage)
      .offset(offset);

    return { items, total };
  }

  async findById(
    id: number,
    includeDeleted = false,
    tx?: DrizzleClient,
  ): Promise<typeof schema.products.$inferSelect | null> {
    const conditions: SQL[] = [eq(schema.products.id, id)];
    if (!includeDeleted) {
      conditions.push(isNull(schema.products.deletedAt));
    }

    const [product] = await this.getClient(tx)
      .select()
      .from(schema.products)
      .where(and(...conditions))
      .limit(1);

    return product ?? null;
  }

  async findByCode(
    code: string,
    tx?: DrizzleClient,
  ): Promise<typeof schema.products.$inferSelect | null> {
    const [product] = await this.getClient(tx)
      .select()
      .from(schema.products)
      .where(eq(schema.products.productCode, code.trim().toUpperCase()))
      .limit(1);

    return product ?? null;
  }

  async findAllActive(tx?: DrizzleClient): Promise<(typeof schema.products.$inferSelect)[]> {
    return this.getClient(tx)
      .select()
      .from(schema.products)
      .where(isNull(schema.products.deletedAt))
      .orderBy(asc(schema.products.productName));
  }

  async create(
    data: {
      productCode: string;
      productName: string;
      stock: number;
      price: string;
    },
    tx?: DrizzleClient,
  ): Promise<typeof schema.products.$inferSelect> {
    const [newProduct] = await this.getClient(tx)
      .insert(schema.products)
      .values(data)
      .returning();

    return newProduct;
  }

  async update(
    id: number,
    data: Partial<typeof schema.products.$inferInsert>,
    tx?: DrizzleClient,
  ): Promise<typeof schema.products.$inferSelect | null> {
    const [updated] = await this.getClient(tx)
      .update(schema.products)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(schema.products.id, id))
      .returning();

    return updated ?? null;
  }

  async softDelete(id: number, tx?: DrizzleClient): Promise<void> {
    await this.getClient(tx)
      .update(schema.products)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.products.id, id));
  }

  async lockProductsForUpdate(
    ids: number[],
    tx: DrizzleClient,
  ): Promise<(typeof schema.products.$inferSelect)[]> {
    if (ids.length === 0) return [];
    // Sort ascending to prevent deadlock
    const sortedIds = Array.from(new Set(ids)).sort((a, b) => a - b);

    const lockedProducts = await tx
      .select()
      .from(schema.products)
      .where(and(inArray(schema.products.id, sortedIds), isNull(schema.products.deletedAt)))
      .orderBy(asc(schema.products.id))
      .for('update');

    return lockedProducts;
  }

  async deductStock(
    id: number,
    quantity: number,
    tx: DrizzleClient,
  ): Promise<typeof schema.products.$inferSelect> {
    const [updated] = await tx
      .update(schema.products)
      .set({
        stock: sql`${schema.products.stock} - ${quantity}`,
        updatedAt: new Date(),
      })
      .where(eq(schema.products.id, id))
      .returning();

    return updated;
  }
}
