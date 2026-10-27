import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { envConfig } from '../../config/env.config';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditRepository } from './repositories/audit.repository';
import { RecordAuditLogUseCase } from './use-cases/record-audit-log.use-case';
import { FindAuditLogsUseCase } from './use-cases/find-audit-logs.use-case';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { DatabaseModule } from '../../database/database.module';

@Global()
@Module({
  imports: [
    DatabaseModule,
    JwtModule.register({
      secret: envConfig.JWT_SECRET,
    }),
  ],
  controllers: [AuditController],
  providers: [
    AuditRepository,
    RecordAuditLogUseCase,
    FindAuditLogsUseCase,
    AuditService,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [
    AuditRepository,
    RecordAuditLogUseCase,
    FindAuditLogsUseCase,
    AuditService,
  ],
})
export class AuditModule {}
