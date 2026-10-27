import { Injectable, Inject } from '@nestjs/common';
import { and, eq, gte, lte, desc, count, SQL } from 'drizzle-orm';
import { DRIZZLE_ORM, DrizzleDatabase, DrizzleClient } from '../../../database/database.module';
import * as schema from '../../../database/schema';

export interface AuditFindAllParams {
  page?: number;
  perPage?: number;
  userId?: string;
  action?: string;
  entityType?: string;
  from?: string;
  to?: string;
}

export interface AuditRecordWithUser {
  id: number;
  userId: string | null;
  userName: string | null;
  action: string;
  entityType: string;
  entityId: string;
  payload: { before?: unknown; after?: unknown } | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

@Injectable()
export class AuditRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDatabase) {}

  private getClient(tx?: DrizzleClient): DrizzleClient {
    return tx ?? this.db;
  }

  async create(
    data: typeof schema.auditLogs.$inferInsert,
    tx?: DrizzleClient,
  ): Promise<typeof schema.auditLogs.$inferSelect> {
    const [created] = await this.getClient(tx)
      .insert(schema.auditLogs)
      .values(data)
      .returning();

    return created;
  }

  async findAll(
    params: AuditFindAllParams = {},
    tx?: DrizzleClient,
  ): Promise<{ items: AuditRecordWithUser[]; total: number }> {
    const page = Math.max(1, params.page ?? 1);
    const perPage = Math.min(100, Math.max(1, params.perPage ?? 10));
    const offset = (page - 1) * perPage;

    const conditions: SQL[] = [];

    if (params.userId) {
      conditions.push(eq(schema.auditLogs.userId, params.userId));
    }
    if (params.action) {
      conditions.push(eq(schema.auditLogs.action, params.action));
    }
    if (params.entityType) {
      conditions.push(eq(schema.auditLogs.entityType, params.entityType));
    }
    if (params.from) {
      const fromDate = new Date(params.from);
      if (!isNaN(fromDate.getTime())) {
        conditions.push(gte(schema.auditLogs.createdAt, fromDate));
      }
    }
    if (params.to) {
      const toDate = new Date(params.to);
      if (!isNaN(toDate.getTime())) {
        toDate.setHours(23, 59, 59, 999);
        conditions.push(lte(schema.auditLogs.createdAt, toDate));
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await this.getClient(tx)
      .select({ count: count() })
      .from(schema.auditLogs)
      .where(whereClause);

    const total = Number(countResult?.count ?? 0);

    const items = await this.getClient(tx)
      .select({
        id: schema.auditLogs.id,
        userId: schema.auditLogs.userId,
        userName: schema.users.name,
        action: schema.auditLogs.action,
        entityType: schema.auditLogs.entityType,
        entityId: schema.auditLogs.entityId,
        payload: schema.auditLogs.payload,
        ipAddress: schema.auditLogs.ipAddress,
        userAgent: schema.auditLogs.userAgent,
        createdAt: schema.auditLogs.createdAt,
      })
      .from(schema.auditLogs)
      .leftJoin(schema.users, eq(schema.auditLogs.userId, schema.users.id))
      .where(whereClause)
      .orderBy(desc(schema.auditLogs.createdAt))
      .limit(perPage)
      .offset(offset);

    return { items, total };
  }
}
