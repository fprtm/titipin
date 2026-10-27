import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditRepository } from './repositories/audit.repository';
import { RecordAuditLogUseCase } from './use-cases/record-audit-log.use-case';
import { FindAuditLogsUseCase } from './use-cases/find-audit-logs.use-case';

@Global()
@Module({
  providers: [
    AuditRepository,
    RecordAuditLogUseCase,
    FindAuditLogsUseCase,
    AuditService,
  ],
  exports: [
    AuditRepository,
    RecordAuditLogUseCase,
    FindAuditLogsUseCase,
    AuditService,
  ],
})
export class AuditModule {}
