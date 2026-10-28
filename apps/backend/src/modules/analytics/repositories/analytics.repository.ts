import { Injectable, Inject } from '@nestjs/common';
import {
  sql,
  asc,
  gte,
} from 'drizzle-orm';
import { DRIZZLE_ORM, DrizzleDatabase } from '../../../database/database.module';
import * as schema from '../../../database/schema';
import {
  DashboardPeriod,
  SalesTrendPoint,
  HourlyTrafficItem,
  DayOfWeekItem,
  ProductAffinityItem,
  CustomerSegmentAnalytics,
} from '@titipin/shared';

@Injectable()
export class AnalyticsRepository {
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

  async getTrendPoints(period: DashboardPeriod): Promise<SalesTrendPoint[]> {
    const startDate = this.getStartDate(period);
    const MONTH_NAMES = [
      'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
      'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
    ];

    if (period === 'daily') {
      const rows = await this.db
        .select({
          hour: sql<string>`TO_CHAR(${schema.orders.orderDate}, 'HH24:00')`,
          transactions: sql<number>`CAST(COUNT(${schema.orders.id}) AS INTEGER)`,
          revenue: sql<string>`COALESCE(SUM(${schema.orders.totalAmount}), 0)`,
        })
        .from(schema.orders)
        .where(gte(schema.orders.orderDate, startDate))
        .groupBy(sql`TO_CHAR(${schema.orders.orderDate}, 'HH24:00')`)
        .orderBy(asc(sql`TO_CHAR(${schema.orders.orderDate}, 'HH24:00')`));

      return rows.map((r) => {
        const tx = Number(r.transactions);
        const rev = Number(r.revenue);
        return {
          date: r.hour,
          label: r.hour,
          revenue: rev,
          transactions: tx,
          aov: tx > 0 ? Math.round(rev / tx) : 0,
        };
      });
    }

    if (period === 'yearly') {
      const rows = await this.db
        .select({
          monthKey: sql<string>`TO_CHAR(${schema.orders.orderDate}, 'YYYY-MM')`,
          monthNum: sql<string>`TO_CHAR(${schema.orders.orderDate}, 'MM')`,
          transactions: sql<number>`CAST(COUNT(${schema.orders.id}) AS INTEGER)`,
          revenue: sql<string>`COALESCE(SUM(${schema.orders.totalAmount}), 0)`,
        })
        .from(schema.orders)
        .where(gte(schema.orders.orderDate, startDate))
        .groupBy(
          sql`TO_CHAR(${schema.orders.orderDate}, 'YYYY-MM')`,
          sql`TO_CHAR(${schema.orders.orderDate}, 'MM')`,
        )
        .orderBy(asc(sql`TO_CHAR(${schema.orders.orderDate}, 'YYYY-MM')`));

      return rows.map((r) => {
        const mIdx = parseInt(r.monthNum, 10) - 1;
        const label = MONTH_NAMES[mIdx] || r.monthKey;
        const tx = Number(r.transactions);
        const rev = Number(r.revenue);
        return {
          date: r.monthKey,
          label,
          revenue: rev,
          transactions: tx,
          aov: tx > 0 ? Math.round(rev / tx) : 0,
        };
      });
    }

    if (period === 'quarterly') {
      const rows = await this.db
        .select({
          weekStart: sql<string>`TO_CHAR(DATE_TRUNC('week', ${schema.orders.orderDate}), 'YYYY-MM-DD')`,
          weekNum: sql<string>`TO_CHAR(${schema.orders.orderDate}, 'IW')`,
          transactions: sql<number>`CAST(COUNT(${schema.orders.id}) AS INTEGER)`,
          revenue: sql<string>`COALESCE(SUM(${schema.orders.totalAmount}), 0)`,
        })
        .from(schema.orders)
        .where(gte(schema.orders.orderDate, startDate))
        .groupBy(
          sql`DATE_TRUNC('week', ${schema.orders.orderDate})`,
          sql`TO_CHAR(DATE_TRUNC('week', ${schema.orders.orderDate}), 'YYYY-MM-DD')`,
          sql`TO_CHAR(${schema.orders.orderDate}, 'IW')`,
        )
        .orderBy(asc(sql`DATE_TRUNC('week', ${schema.orders.orderDate})`));

      return rows.map((r) => {
        const tx = Number(r.transactions);
        const rev = Number(r.revenue);
        return {
          date: r.weekStart,
          label: `Mg ${r.weekNum}`,
          revenue: rev,
          transactions: tx,
          aov: tx > 0 ? Math.round(rev / tx) : 0,
        };
      });
    }

    // Default: monthly (daily points)
    const rows = await this.db
      .select({
        dayKey: sql<string>`TO_CHAR(${schema.orders.orderDate}, 'YYYY-MM-DD')`,
        dayNum: sql<string>`TO_CHAR(${schema.orders.orderDate}, 'DD')`,
        monthNum: sql<string>`TO_CHAR(${schema.orders.orderDate}, 'MM')`,
        transactions: sql<number>`CAST(COUNT(${schema.orders.id}) AS INTEGER)`,
        revenue: sql<string>`COALESCE(SUM(${schema.orders.totalAmount}), 0)`,
      })
      .from(schema.orders)
      .where(gte(schema.orders.orderDate, startDate))
      .groupBy(
        sql`TO_CHAR(${schema.orders.orderDate}, 'YYYY-MM-DD')`,
        sql`TO_CHAR(${schema.orders.orderDate}, 'DD')`,
        sql`TO_CHAR(${schema.orders.orderDate}, 'MM')`,
      )
      .orderBy(asc(sql`TO_CHAR(${schema.orders.orderDate}, 'YYYY-MM-DD')`));

    return rows.map((r) => {
      const mIdx = parseInt(r.monthNum, 10) - 1;
      const monthLabel = MONTH_NAMES[mIdx] || '';
      const tx = Number(r.transactions);
      const rev = Number(r.revenue);
      return {
        date: r.dayKey,
        label: `${r.dayNum} ${monthLabel}`.trim(),
        revenue: rev,
        transactions: tx,
        aov: tx > 0 ? Math.round(rev / tx) : 0,
      };
    });
  }

  async getHourlyTraffic(period: DashboardPeriod): Promise<HourlyTrafficItem[]> {
    const startDate = this.getStartDate(period);

    const rows = await this.db
      .select({
        hour: sql<string>`TO_CHAR(${schema.orders.orderDate}, 'HH24:00')`,
        transactions: sql<number>`CAST(COUNT(${schema.orders.id}) AS INTEGER)`,
        revenue: sql<string>`COALESCE(SUM(${schema.orders.totalAmount}), 0)`,
      })
      .from(schema.orders)
      .where(gte(schema.orders.orderDate, startDate))
      .groupBy(sql`TO_CHAR(${schema.orders.orderDate}, 'HH24:00')`)
      .orderBy(asc(sql`TO_CHAR(${schema.orders.orderDate}, 'HH24:00')`));

    const totalTx = rows.reduce((sum, r) => sum + Number(r.transactions), 0);

    return rows.map((r) => {
      const tx = Number(r.transactions);
      return {
        hour: r.hour,
        transactions: tx,
        revenue: Number(r.revenue),
        percentage: totalTx > 0 ? Math.round((tx / totalTx) * 100) : 0,
      };
    });
  }

  async getDayOfWeekTraffic(period: DashboardPeriod): Promise<DayOfWeekItem[]> {
    const startDate = this.getStartDate(period);
    const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

    const rows = await this.db
      .select({
        dayIndex: sql<number>`CAST(EXTRACT(DOW FROM ${schema.orders.orderDate}) AS INTEGER)`,
        transactions: sql<number>`CAST(COUNT(${schema.orders.id}) AS INTEGER)`,
        revenue: sql<string>`COALESCE(SUM(${schema.orders.totalAmount}), 0)`,
      })
      .from(schema.orders)
      .where(gte(schema.orders.orderDate, startDate))
      .groupBy(sql`EXTRACT(DOW FROM ${schema.orders.orderDate})`)
      .orderBy(asc(sql`EXTRACT(DOW FROM ${schema.orders.orderDate})`));

    return rows.map((r) => {
      const tx = Number(r.transactions);
      const rev = Number(r.revenue);
      return {
        dayIndex: r.dayIndex,
        dayName: DAY_NAMES[r.dayIndex] || `Hari ${r.dayIndex}`,
        transactions: tx,
        revenue: rev,
        avgOrderValue: tx > 0 ? Math.round(rev / tx) : 0,
      };
    });
  }

  async getProductAffinityPairs(limit = 5): Promise<ProductAffinityItem[]> {
    // Market Basket Analysis: identify products frequently ordered together
    const rows = await this.db.execute(sql`
      SELECT 
        oi1.product_id AS prod_a_id, 
        p1.product_name AS prod_a_name,
        oi2.product_id AS prod_b_id, 
        p2.product_name AS prod_b_name,
        CAST(COUNT(DISTINCT oi1.order_id) AS INTEGER) AS co_count,
        CAST(SUM(CAST(oi1.subtotal AS NUMERIC) + CAST(oi2.subtotal AS NUMERIC)) AS NUMERIC) AS combined_rev
      FROM order_items oi1
      JOIN order_items oi2 ON oi1.order_id = oi2.order_id AND oi1.product_id < oi2.product_id
      JOIN products p1 ON oi1.product_id = p1.id
      JOIN products p2 ON oi2.product_id = p2.id
      WHERE p1.deleted_at IS NULL AND p2.deleted_at IS NULL
      GROUP BY oi1.product_id, p1.product_name, oi2.product_id, p2.product_name
      ORDER BY co_count DESC, combined_rev DESC
      LIMIT ${limit};
    `);

    interface AffinityRow {
      prod_a_id: number | string;
      prod_a_name: string;
      prod_b_id: number | string;
      prod_b_name: string;
      co_count: number | string;
      combined_rev: number | string;
    }

    return ((rows.rows as unknown as AffinityRow[]) || []).map((r) => ({
      productAId: Number(r.prod_a_id),
      productAName: String(r.prod_a_name),
      productBId: Number(r.prod_b_id),
      productBName: String(r.prod_b_name),
      coOccurrenceCount: Number(r.co_count),
      combinedRevenue: Number(r.combined_rev),
      suggestedDiscountPercent: 10, // 10% recommended promotional bundling discount
    }));
  }

  async getCustomerSegmentAnalytics(period: DashboardPeriod): Promise<CustomerSegmentAnalytics> {
    const startDate = this.getStartDate(period);

    const segmentRows = await this.db
      .select({
        isMember: sql<boolean>`${schema.orders.customerId} IS NOT NULL`,
        transactions: sql<number>`CAST(COUNT(${schema.orders.id}) AS INTEGER)`,
        revenue: sql<string>`COALESCE(SUM(${schema.orders.totalAmount}), 0)`,
      })
      .from(schema.orders)
      .where(gte(schema.orders.orderDate, startDate))
      .groupBy(sql`${schema.orders.customerId} IS NOT NULL`);

    let memberOrders = 0;
    let memberRevenue = 0;
    let walkInOrders = 0;
    let walkInRevenue = 0;

    for (const r of segmentRows) {
      if (r.isMember) {
        memberOrders = Number(r.transactions);
        memberRevenue = Number(r.revenue);
      } else {
        walkInOrders = Number(r.transactions);
        walkInRevenue = Number(r.revenue);
      }
    }

    const totalRevenue = memberRevenue + walkInRevenue;
    const memberRevenueSharePercent = totalRevenue > 0 ? Math.round((memberRevenue / totalRevenue) * 100) : 0;
    const memberAov = memberOrders > 0 ? Math.round(memberRevenue / memberOrders) : 0;
    const walkInAov = walkInOrders > 0 ? Math.round(walkInRevenue / walkInOrders) : 0;

    // Birthday discount utilization
    const bdayResult = await this.db.execute(sql`
      SELECT 
        CAST(COUNT(DISTINCT o.id) AS INTEGER) AS bday_tx_count,
        CAST(COALESCE(SUM(
          CASE 
            WHEN c.birth_date IS NOT NULL 
              AND EXTRACT(MONTH FROM c.birth_date) = EXTRACT(MONTH FROM o.order_date)
              AND EXTRACT(DAY FROM c.birth_date) = EXTRACT(DAY FROM o.order_date)
            THEN 1 
            ELSE 0 
          END
        ), 0) AS INTEGER) AS bday_orders
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE o.order_date >= ${startDate}
        AND EXTRACT(MONTH FROM c.birth_date) = EXTRACT(MONTH FROM o.order_date)
        AND EXTRACT(DAY FROM c.birth_date) = EXTRACT(DAY FROM o.order_date);
    `);

    interface BirthdayRow {
      bday_tx_count: number | string;
      bday_orders: number | string;
    }

    const bdayRow = (bdayResult.rows as unknown as BirthdayRow[])?.[0];
    const bdayOrders = Number(bdayRow?.bday_tx_count || 0);

    return {
      memberOrders,
      memberRevenue,
      memberAov,
      walkInOrders,
      walkInRevenue,
      walkInAov,
      memberRevenueSharePercent,
      birthdayDiscountOrdersCount: bdayOrders,
      birthdayDiscountTotalGiven: bdayOrders * 5000, // estimated aggregate discount
    };
  }
}
