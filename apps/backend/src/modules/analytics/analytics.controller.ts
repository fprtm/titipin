import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  Role,
  dashboardQuerySchema,
  DashboardQueryInput,
} from '@titipin/shared';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @Roles(Role.ADMIN)
  async getOverview(
    @Query(new ZodValidationPipe(dashboardQuerySchema)) query: DashboardQueryInput,
  ) {
    return this.analyticsService.getOverview(query.period);
  }

  @Get('trend')
  @Roles(Role.ADMIN)
  async getTrend(
    @Query(new ZodValidationPipe(dashboardQuerySchema)) query: DashboardQueryInput,
  ) {
    return this.analyticsService.getTrend(query.period);
  }

  @Get('peak-hours')
  @Roles(Role.ADMIN)
  async getPeakHours(
    @Query(new ZodValidationPipe(dashboardQuerySchema)) query: DashboardQueryInput,
  ) {
    return this.analyticsService.getPeakHours(query.period);
  }

  @Get('bundling-suggestions')
  @Roles(Role.ADMIN)
  async getBundlingSuggestions() {
    return this.analyticsService.getBundlingSuggestions();
  }

  @Get('customer-segments')
  @Roles(Role.ADMIN)
  async getCustomerSegments(
    @Query(new ZodValidationPipe(dashboardQuerySchema)) query: DashboardQueryInput,
  ) {
    return this.analyticsService.getCustomerSegments(query.period);
  }
}
