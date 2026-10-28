import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import * as client from 'prom-client';
import { PG_POOL } from '../../database/database.module';

@Injectable()
export class MetricsService {
  private readonly registry: client.Registry;
  public readonly httpRequestCounter: client.Counter<string>;
  public readonly httpRequestDuration: client.Histogram<string>;
  public readonly pgPoolTotal: client.Gauge<string>;
  public readonly pgPoolIdle: client.Gauge<string>;
  public readonly pgPoolWaiting: client.Gauge<string>;

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {
    this.registry = new client.Registry();

    // Default system & Node.js process metrics (CPU, heap memory, GC, event loop)
    client.collectDefaultMetrics({
      register: this.registry,
      prefix: 'titipin_',
    });

    // HTTP Request Counter
    this.httpRequestCounter = new client.Counter({
      name: 'titipin_http_requests_total',
      help: 'Total number of HTTP requests processed by Titipin backend',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    // HTTP Request Duration Histogram
    this.httpRequestDuration = new client.Histogram({
      name: 'titipin_http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    // Database Connection Pool Gauges
    this.pgPoolTotal = new client.Gauge({
      name: 'titipin_pg_pool_total_connections',
      help: 'Total PostgreSQL client connections currently allocated',
      registers: [this.registry],
    });

    this.pgPoolIdle = new client.Gauge({
      name: 'titipin_pg_pool_idle_connections',
      help: 'Number of idle PostgreSQL connections available in pool',
      registers: [this.registry],
    });

    this.pgPoolWaiting = new client.Gauge({
      name: 'titipin_pg_pool_waiting_clients',
      help: 'Number of queries waiting for an available PostgreSQL client',
      registers: [this.registry],
    });
  }

  async getMetrics(): Promise<string> {
    if (this.pool) {
      this.pgPoolTotal.set(this.pool.totalCount || 0);
      this.pgPoolIdle.set(this.pool.idleCount || 0);
      this.pgPoolWaiting.set(this.pool.waitingCount || 0);
    }
    return this.registry.metrics();
  }

  getContentType(): string {
    return this.registry.contentType;
  }
}
