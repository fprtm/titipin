import { Injectable, Inject } from '@nestjs/common';
import {
  eq,
  and,
  sql,
  desc,
  asc,
  gte,
  isNull,
  lt,
  count,
} from 'drizzle-orm';
import { DRIZZLE_ORM, DrizzleDatabase } from '../../../database/database.module';
import * as schema from '../../../database/schema';
import {
  DashboardPeriod,
  DashboardSummaryData,
  DashboardTrendItem,
} from '@titipin/shared';

@Injectable()
export class DashboardRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDatabase) {}

  private getStartDate(period: DashboardPeriod): Date {
    const now = new Date();
    const startDate = new Date(now);

    if (period === 'daily') {
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'quarterly') {
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      const currentMonth = startDate.getMonth();
      startDate.setMonth(currentMonth - (currentMonth % 3));
    } else if (period === 'yearly') {
      startDate.setMonth(0, 1);
      startDate.setHours(0, 0, 0, 0);
    } else {
      // monthly
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
    }

    return startDate;
  }

  async getSummary(period: DashboardPeriod): Promise<DashboardSummaryData> {
    const startDate = this.getStartDate(period);

    // 1. Transaction volume & sales amount
    const [stats] = await this.db
      .select({
        totalTransactions: count(),
        totalSalesAmount: sql<string>`COALESCE(SUM(${schema.orders.totalAmount}), 0)`,
      })
      .from(schema.orders)
      .where(gte(schema.orders.orderDate, startDate));

    const totalTx = stats?.totalTransactions ? Number(stats.totalTransactions) : 0;
    const totalSales = stats?.totalSalesAmount ? Number(stats.totalSalesAmount) : 0;

    // 2. Top 5 selling products
    const topRows = await this.db
      .select({
        productId: schema.orderItems.productId,
        productName: schema.products.productName,
        totalSold: sql<number>`CAST(COALESCE(SUM(${schema.orderItems.quantity}), 0) AS INTEGER)`,
        totalRevenue: sql<string>`COALESCE(SUM(${schema.orderItems.subtotal}), 0)`,
      })
      .from(schema.orderItems)
      .innerJoin(schema.orders, eq(schema.orderItems.orderId, schema.orders.id))
      .innerJoin(schema.products, eq(schema.orderItems.productId, schema.products.id))
      .where(gte(schema.orders.orderDate, startDate))
      .groupBy(schema.orderItems.productId, schema.products.productName)
      .orderBy(desc(sql`SUM(${schema.orderItems.quantity})`))
      .limit(5);

    const topProducts = topRows.map((r) => ({
      productId: r.productId,
      product_id: r.productId,
      productName: r.productName,
      product_name: r.productName,
      totalSold: Number(r.totalSold),
      total_sold: Number(r.totalSold),
      revenue: Number(r.totalRevenue),
    }));

    // 3. Slow moving products (bottom 5, prioritizing 0 sold)
    const slowRows = await this.db
      .select({
        productId: schema.products.id,
        productName: schema.products.productName,
        currentStock: schema.products.stock,
        totalSold: sql<number>`CAST(COALESCE(SUM(CASE WHEN ${schema.orders.orderDate} >= ${startDate} THEN ${schema.orderItems.quantity} ELSE 0 END), 0) AS INTEGER)`,
      })
      .from(schema.products)
      .leftJoin(schema.orderItems, eq(schema.products.id, schema.orderItems.productId))
      .leftJoin(schema.orders, eq(schema.orderItems.orderId, schema.orders.id))
      .where(isNull(schema.products.deletedAt))
      .groupBy(schema.products.id, schema.products.productName, schema.products.stock)
      .orderBy(
        asc(
          sql`COALESCE(SUM(CASE WHEN ${schema.orders.orderDate} >= ${startDate} THEN ${schema.orderItems.quantity} ELSE 0 END), 0)`,
        ),
        asc(schema.products.id),
      )
      .limit(5);

    const slowProducts = slowRows.map((r) => ({
      productId: r.productId,
      product_id: r.productId,
      productName: r.productName,
      product_name: r.productName,
      currentStock: r.currentStock,
      totalSold: Number(r.totalSold),
      total_sold: Number(r.totalSold),
      lastSoldDate: null,
    }));

    // 4. Low stock products (< 5)
    const lowStockRows = await this.db
      .select({
        id: schema.products.id,
        productCode: schema.products.productCode,
        productName: schema.products.productName,
        stock: schema.products.stock,
        price: schema.products.price,
      })
      .from(schema.products)
      .where(and(isNull(schema.products.deletedAt), lt(schema.products.stock, 5)))
      .orderBy(asc(schema.products.stock), asc(schema.products.id))
      .limit(10);

    const lowStockProducts = lowStockRows.map((r) => ({
      id: r.id,
      productCode: r.productCode,
      product_code: r.productCode,
      productName: r.productName,
      product_name: r.productName,
      stock: r.stock,
      price: r.price,
    }));

    return {
      period,
      total_transactions: totalTx,
      totalTransactions: totalTx,
      total_sales_amount: totalSales,
      totalSalesAmount: totalSales,
      top_products: topProducts,
      topProducts,
      slow_products: slowProducts,
      slowProducts,
      low_stock_products: lowStockProducts,
      lowStockProducts,
    };
  }

  async getTrend(period: DashboardPeriod): Promise<DashboardTrendItem[]> {
    const startDate = this.getStartDate(period);

    const rows = await this.db
      .select({
        date: sql<string>`TO_CHAR(${schema.orders.orderDate}, 'YYYY-MM-DD')`,
        transactions: sql<number>`CAST(COUNT(${schema.orders.id}) AS INTEGER)`,
        revenue: sql<string>`COALESCE(SUM(${schema.orders.totalAmount}), 0)`,
      })
      .from(schema.orders)
      .where(gte(schema.orders.orderDate, startDate))
      .groupBy(sql`TO_CHAR(${schema.orders.orderDate}, 'YYYY-MM-DD')`)
      .orderBy(asc(sql`TO_CHAR(${schema.orders.orderDate}, 'YYYY-MM-DD')`));

    return rows.map((r) => ({
      date: r.date,
      transactions: Number(r.transactions),
      revenue: Number(r.revenue),
    }));
  }
}
