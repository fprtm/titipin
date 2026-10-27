import { Injectable } from '@nestjs/common';
import { DashboardRepository } from '../repositories/dashboard.repository';
import { DashboardPeriod, DashboardTrendItem } from '@titipin/shared';

@Injectable()
export class GetDashboardTrendUseCase {
  constructor(private readonly dashboardRepository: DashboardRepository) {}

  async execute(period: DashboardPeriod = 'monthly'): Promise<DashboardTrendItem[]> {
    return this.dashboardRepository.getTrend(period);
  }
}
