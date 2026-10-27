import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE_ORM, DrizzleDatabase } from '../../database/database.module';
import * as schema from '../../database/schema';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDatabase) {}

  async log(entry: CreateAuditLogDto) {
    try {
      const payload = entry.payload ?? {
        before: entry.oldValues,
        after: entry.newValues,
      };

      const [created] = await this.db
        .insert(schema.auditLogs)
        .values({
          userId: entry.userId ?? null,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          payload,
          ipAddress: entry.ipAddress ?? null,
          userAgent: entry.userAgent ?? null,
        })
        .returning();

      return created;
    } catch (error) {
      this.logger.error(
        `Failed to record audit log: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}
