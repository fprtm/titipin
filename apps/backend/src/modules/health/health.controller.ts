import { Controller, Get } from '@nestjs/common';
import { HealthService, HealthCheckResult } from './health.service';
import { BypassTransform } from '../../common/decorators/bypass-transform.decorator';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @BypassTransform()
  async getHealth(): Promise<HealthCheckResult> {
    return this.healthService.check();
  }
}
