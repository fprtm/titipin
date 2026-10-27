import { Injectable, Inject, ServiceUnavailableException } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module';

export interface HealthCheckResult {
  status: 'ok' | 'error';
  timestamp: string;
  database: 'connected' | 'disconnected';
}

@Injectable()
export class HealthService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async check(): Promise<HealthCheckResult> {
    const timestamp = new Date().toISOString();
    try {
      await this.pool.query('SELECT 1');
      return {
        status: 'ok',
        timestamp,
        database: 'connected',
      };
    } catch (error) {
      throw new ServiceUnavailableException({
        status: 'error',
        timestamp,
        database: 'disconnected',
        error: (error as Error).message,
      });
    }
  }
}
