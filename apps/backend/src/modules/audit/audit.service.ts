import { Injectable } from '@nestjs/common';
import { AuditQueryInput } from '@titipin/shared';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { RecordAuditLogUseCase } from './use-cases/record-audit-log.use-case';
import { FindAuditLogsUseCase } from './use-cases/find-audit-logs.use-case';

@Injectable()
export class AuditService {
  constructor(
    private readonly recordAuditLogUseCase: RecordAuditLogUseCase,
    private readonly findAuditLogsUseCase: FindAuditLogsUseCase,
  ) {}

  async log(entry: CreateAuditLogDto) {
    return this.recordAuditLogUseCase.execute(entry);
  }

  async findAll(query: AuditQueryInput = { page: 1, per_page: 10 }) {
    return this.findAuditLogsUseCase.execute(query);
  }
}
