import { Injectable, Inject } from '@nestjs/common';
import {
  eq,
  and,
  sql,
  desc,
  asc,
  count,
  SQL,
  gte,
  lte,
} from 'drizzle-orm';
import { DRIZZLE_ORM, DrizzleDatabase, DrizzleClient } from '../../../database/database.module';
import * as schema from '../../../database/schema';
import { OrderQueryInput, OrderDetailData } from '@titipin/shared';

@Injectable()
export class OrdersRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDatabase) {}

  getClient(tx?: DrizzleClient): DrizzleClient {
    return tx ?? this.db;
  }

  async transaction<T>(callback: (tx: DrizzleClient) => Promise<T>): Promise<T> {
    return this.db.transaction(callback);
  }

  async generateOrderNumber(tx?: DrizzleClient, date: Date = new Date()): Promise<string> {
    const client = this.getClient(tx);
    const yyyy = date.getFullYear().toString();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const datePrefix = `INV-${yyyy}${mm}${dd}-`;

    // Acquire PostgreSQL advisory transaction lock to prevent duplicate order numbers under concurrency
    await client.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${datePrefix}))`);

    const latest = await client
      .select({ orderNumber: schema.orders.orderNumber })
      .from(schema.orders)
      .where(sql`${schema.orders.orderNumber} LIKE ${datePrefix + '%'}`)
      .orderBy(desc(schema.orders.orderNumber))
      .limit(1);

    let nextSeq = 1;
    if (latest.length > 0 && latest[0].orderNumber) {
      const parts = latest[0].orderNumber.split('-');
      if (parts.length === 3) {
        const lastSeq = parseInt(parts[2], 10);
        if (!isNaN(lastSeq)) {
          nextSeq = lastSeq + 1;
        }
      }
    }

    return `${datePrefix}${String(nextSeq).padStart(4, '0')}`;
  }

  async createOrder(
    data: {
      orderNumber: string;
      customerId: string | null;
      createdBy: string;
      totalAmount: string;
      orderDate?: Date;
    },
    tx?: DrizzleClient,
  ): Promise<typeof schema.orders.$inferSelect> {
    const [newOrder] = await this.getClient(tx)
      .insert(schema.orders)
      .values({
        orderNumber: data.orderNumber,
        customerId: data.customerId,
        createdBy: data.createdBy,
        totalAmount: data.totalAmount,
        orderDate: data.orderDate ?? new Date(),
      })
      .returning();

    return newOrder;
  }

  async createOrderItems(
    items: Array<{
      orderId: number;
      productId: number;
      quantity: number;
      unitPrice: string;
      subtotal: string;
    }>,
    tx?: DrizzleClient,
  ): Promise<void> {
    if (items.length === 0) return;
    await this.getClient(tx).insert(schema.orderItems).values(items);
  }

  async createActivityLog(
    data: {
      orderId: number;
      action: string;
      performedBy: string;
      details?: Record<string, unknown> | null;
    },
    tx?: DrizzleClient,
  ): Promise<void> {
    await this.getClient(tx).insert(schema.orderActivityLogs).values({
      orderId: data.orderId,
      action: data.action,
      performedBy: data.performedBy,
      details: data.details ?? null,
    });
  }

  async findDraftByUserId(
    userId: string,
    tx?: DrizzleClient,
  ): Promise<typeof schema.draftOrders.$inferSelect | null> {
    const [draft] = await this.getClient(tx)
      .select()
      .from(schema.draftOrders)
      .where(eq(schema.draftOrders.userId, userId))
      .limit(1);

    return draft ?? null;
  }

  async saveDraftOrder(
    data: {
      userId: string;
      customerId: string | null;
      items: Array<{ product_id: number; quantity: number }>;
    },
    tx?: DrizzleClient,
  ): Promise<typeof schema.draftOrders.$inferSelect> {
    const [draft] = await this.getClient(tx)
      .insert(schema.draftOrders)
      .values({
        userId: data.userId,
        customerId: data.customerId,
        items: data.items,
      })
      .returning();

    return draft;
  }

  async deleteDraftByUserId(userId: string, tx?: DrizzleClient): Promise<void> {
    await this.getClient(tx)
      .delete(schema.draftOrders)
      .where(eq(schema.draftOrders.userId, userId));
  }

  async findAll(
    query: OrderQueryInput,
    tx?: DrizzleClient,
  ): Promise<{ items: OrderDetailData[]; total: number }> {
    const page = Math.max(1, query.page || 1);
    const perPage = Math.max(1, Math.min(100, query.per_page || 10));
    const offset = (page - 1) * perPage;

    const conditions: SQL[] = [];

    if (query.customer_id) {
      conditions.push(eq(schema.orders.customerId, query.customer_id));
    }
    if (query.from) {
      const fromDate = query.from.includes('T') ? new Date(query.from) : new Date(`${query.from}T00:00:00.000Z`);
      conditions.push(gte(schema.orders.orderDate, fromDate));
    }
    if (query.to) {
      const toDate = query.to.includes('T') ? new Date(query.to) : new Date(`${query.to}T23:59:59.999Z`);
      conditions.push(lte(schema.orders.orderDate, toDate));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await this.getClient(tx)
      .select({ count: count() })
      .from(schema.orders)
      .where(whereClause);
    const total = countResult?.count ? Number(countResult.count) : 0;

    const rows = await this.getClient(tx)
      .select({
        id: schema.orders.id,
        orderNumber: schema.orders.orderNumber,
        customerId: schema.orders.customerId,
        customerName: schema.customers.customerName,
        createdBy: schema.orders.createdBy,
        createdByName: schema.users.name,
        orderDate: schema.orders.orderDate,
        totalAmount: schema.orders.totalAmount,
        createdAt: schema.orders.createdAt,
        updatedAt: schema.orders.updatedAt,
      })
      .from(schema.orders)
      .leftJoin(schema.customers, eq(schema.orders.customerId, schema.customers.id))
      .leftJoin(schema.users, eq(schema.orders.createdBy, schema.users.id))
      .where(whereClause)
      .orderBy(desc(schema.orders.orderDate))
      .limit(perPage)
      .offset(offset);

    const items: OrderDetailData[] = rows.map((row) => ({
      id: row.id,
      orderNumber: row.orderNumber,
      order_number: row.orderNumber,
      customerId: row.customerId,
      customer_id: row.customerId,
      customerName: row.customerId ? (row.customerName ?? 'Pelanggan') : 'Pelanggan Umum',
      customer_name: row.customerId ? (row.customerName ?? 'Pelanggan') : 'Pelanggan Umum',
      createdBy: row.createdBy,
      created_by: row.createdBy,
      createdByName: row.createdByName,
      created_by_name: row.createdByName,
      cashierName: row.createdByName,
      orderDate: row.orderDate.toISOString(),
      order_date: row.orderDate.toISOString(),
      totalAmount: Number(row.totalAmount),
      total_amount: Number(row.totalAmount),
      items: [],
      createdAt: row.createdAt.toISOString(),
      created_at: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      updated_at: row.updatedAt.toISOString(),
    }));

    return { items, total };
  }

  async findById(id: number, tx?: DrizzleClient): Promise<OrderDetailData | null> {
    const [orderRow] = await this.getClient(tx)
      .select({
        id: schema.orders.id,
        orderNumber: schema.orders.orderNumber,
        customerId: schema.orders.customerId,
        customerName: schema.customers.customerName,
        createdBy: schema.orders.createdBy,
        createdByName: schema.users.name,
        orderDate: schema.orders.orderDate,
        totalAmount: schema.orders.totalAmount,
        createdAt: schema.orders.createdAt,
        updatedAt: schema.orders.updatedAt,
      })
      .from(schema.orders)
      .leftJoin(schema.customers, eq(schema.orders.customerId, schema.customers.id))
      .leftJoin(schema.users, eq(schema.orders.createdBy, schema.users.id))
      .where(eq(schema.orders.id, id))
      .limit(1);

    if (!orderRow) return null;

    const itemRows = await this.getClient(tx)
      .select({
        id: schema.orderItems.id,
        orderId: schema.orderItems.orderId,
        productId: schema.orderItems.productId,
        quantity: schema.orderItems.quantity,
        unitPrice: schema.orderItems.unitPrice,
        subtotal: schema.orderItems.subtotal,
        productName: schema.products.productName,
        productCode: schema.products.productCode,
      })
      .from(schema.orderItems)
      .leftJoin(schema.products, eq(schema.orderItems.productId, schema.products.id))
      .where(eq(schema.orderItems.orderId, id));

    const activityRows = await this.getClient(tx)
      .select({
        id: schema.orderActivityLogs.id,
        orderId: schema.orderActivityLogs.orderId,
        action: schema.orderActivityLogs.action,
        performedBy: schema.orderActivityLogs.performedBy,
        performedByName: schema.users.name,
        details: schema.orderActivityLogs.details,
        createdAt: schema.orderActivityLogs.createdAt,
      })
      .from(schema.orderActivityLogs)
      .leftJoin(schema.users, eq(schema.orderActivityLogs.performedBy, schema.users.id))
      .where(eq(schema.orderActivityLogs.orderId, id))
      .orderBy(asc(schema.orderActivityLogs.createdAt));

    const mappedItems = itemRows.map((it) => ({
      id: it.id,
      orderId: it.orderId,
      order_id: it.orderId,
      productId: it.productId,
      product_id: it.productId,
      productName: it.productName ?? undefined,
      product_name: it.productName ?? undefined,
      productCode: it.productCode ?? undefined,
      product_code: it.productCode ?? undefined,
      quantity: it.quantity,
      unitPrice: Number(it.unitPrice),
      unit_price: Number(it.unitPrice),
      subtotal: Number(it.subtotal),
    }));

    const mappedActivities = activityRows.map((act) => ({
      id: act.id,
      orderId: act.orderId,
      order_id: act.orderId,
      action: act.action,
      performedBy: act.performedBy,
      performed_by: act.performedBy,
      performedByName: act.performedByName ?? undefined,
      performed_by_name: act.performedByName ?? undefined,
      details: act.details as Record<string, unknown> | null,
      createdAt: act.createdAt.toISOString(),
      created_at: act.createdAt.toISOString(),
    }));

    return {
      id: orderRow.id,
      orderNumber: orderRow.orderNumber,
      order_number: orderRow.orderNumber,
      customerId: orderRow.customerId,
      customer_id: orderRow.customerId,
      customerName: orderRow.customerId ? (orderRow.customerName ?? 'Pelanggan') : 'Pelanggan Umum',
      customer_name: orderRow.customerId ? (orderRow.customerName ?? 'Pelanggan') : 'Pelanggan Umum',
      createdBy: orderRow.createdBy,
      created_by: orderRow.createdBy,
      createdByName: orderRow.createdByName,
      created_by_name: orderRow.createdByName,
      cashierName: orderRow.createdByName,
      orderDate: orderRow.orderDate.toISOString(),
      order_date: orderRow.orderDate.toISOString(),
      totalAmount: Number(orderRow.totalAmount),
      total_amount: Number(orderRow.totalAmount),
      items: mappedItems,
      activityLogs: mappedActivities,
      activity_logs: mappedActivities,
      createdAt: orderRow.createdAt.toISOString(),
      created_at: orderRow.createdAt.toISOString(),
      updatedAt: orderRow.updatedAt.toISOString(),
      updated_at: orderRow.updatedAt.toISOString(),
    };
  }
}
