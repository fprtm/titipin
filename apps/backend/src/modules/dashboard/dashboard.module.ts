import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { DashboardRepository } from './repositories/dashboard.repository';
import { GetDashboardSummaryUseCase } from './use-cases/get-dashboard-summary.use-case';
import { GetDashboardTrendUseCase } from './use-cases/get-dashboard-trend.use-case';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [DashboardController],
  providers: [
    DashboardRepository,
    GetDashboardSummaryUseCase,
    GetDashboardTrendUseCase,
    DashboardService,
  ],
  exports: [DashboardRepository, DashboardService],
})
export class DashboardModule {}
