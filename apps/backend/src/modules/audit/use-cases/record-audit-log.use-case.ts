import { Injectable, Logger } from '@nestjs/common';
import { AuditRepository } from '../repositories/audit.repository';
import { CreateAuditLogDto } from '../dto/create-audit-log.dto';
import type { DrizzleClient } from '../../../database/database.module';

@Injectable()
export class RecordAuditLogUseCase {
  private readonly logger = new Logger(RecordAuditLogUseCase.name);

  constructor(private readonly auditRepository: AuditRepository) {}

  async execute(entry: CreateAuditLogDto, tx?: DrizzleClient) {
    try {
      const payload = entry.payload ?? {
        before: entry.oldValues,
        after: entry.newValues,
      };

      const created = await this.auditRepository.create(
        {
          userId: entry.userId ?? null,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          payload,
          ipAddress: entry.ipAddress ?? null,
          userAgent: entry.userAgent ?? null,
        },
        tx,
      );

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
