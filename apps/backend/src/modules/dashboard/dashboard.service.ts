import { Injectable } from '@nestjs/common';
import { GetDashboardSummaryUseCase } from './use-cases/get-dashboard-summary.use-case';
import { GetDashboardTrendUseCase } from './use-cases/get-dashboard-trend.use-case';
import { DashboardPeriod, DashboardSummaryData, DashboardTrendItem } from '@titipin/shared';

@Injectable()
export class DashboardService {
  constructor(
    private readonly getDashboardSummaryUseCase: GetDashboardSummaryUseCase,
    private readonly getDashboardTrendUseCase: GetDashboardTrendUseCase,
  ) {}

  async getSummary(period: DashboardPeriod): Promise<DashboardSummaryData> {
    return this.getDashboardSummaryUseCase.execute(period);
  }

  async getTrend(period: DashboardPeriod): Promise<DashboardTrendItem[]> {
    return this.getDashboardTrendUseCase.execute(period);
  }
}
