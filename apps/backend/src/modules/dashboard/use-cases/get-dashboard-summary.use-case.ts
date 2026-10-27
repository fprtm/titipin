import { Injectable } from '@nestjs/common';
import { DashboardRepository } from '../repositories/dashboard.repository';
import { DashboardPeriod, DashboardSummaryData } from '@titipin/shared';

@Injectable()
export class GetDashboardSummaryUseCase {
  constructor(private readonly dashboardRepository: DashboardRepository) {}

  async execute(period: DashboardPeriod = 'daily'): Promise<DashboardSummaryData> {
    return this.dashboardRepository.getSummary(period);
  }
}
