import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  Role,
  dashboardQuerySchema,
  DashboardQueryInput,
} from '@titipin/shared';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @Roles(Role.ADMIN, Role.CASHIER)
  async getSummary(
    @Query(new ZodValidationPipe(dashboardQuerySchema)) query: DashboardQueryInput,
  ) {
    return this.dashboardService.getSummary(query.period);
  }

  // Dual-path alias: GET /api/dashboard/metrics
  @Get('metrics')
  @Roles(Role.ADMIN, Role.CASHIER)
  async getMetrics(
    @Query(new ZodValidationPipe(dashboardQuerySchema)) query: DashboardQueryInput,
  ) {
    return this.dashboardService.getSummary(query.period);
  }

  @Get('trend')
  @Roles(Role.ADMIN, Role.CASHIER)
  async getTrend(
    @Query(new ZodValidationPipe(dashboardQuerySchema)) query: DashboardQueryInput,
  ) {
    return this.dashboardService.getTrend(query.period);
  }
}
