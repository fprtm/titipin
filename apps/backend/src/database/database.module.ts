import { Global, Module, OnModuleInit, OnModuleDestroy, Inject, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema/index';
import { envConfig } from '../config/env.config';

export const PG_POOL = 'PG_POOL';
export const DRIZZLE_ORM = 'DRIZZLE_ORM';
export type DrizzleDatabase = NodePgDatabase<typeof schema>;
export type DrizzleTx = Parameters<Parameters<DrizzleDatabase['transaction']>[0]>[0];
export type DrizzleClient = DrizzleDatabase | DrizzleTx;

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      useFactory: () => {
        const pool = new Pool({
          connectionString: envConfig.DATABASE_URL,
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 10000,
        });
        pool.on('error', (poolError: Error) => {
          const logger = new Logger('DatabasePool');
          logger.error('Unexpected error on idle PostgreSQL client', poolError.stack || poolError.message);
        });
        return pool;
      },
    },
    {
      provide: DRIZZLE_ORM,
      inject: [PG_POOL],
      useFactory: (pool: Pool) => {
        return drizzle(pool, { schema });
      },
    },
  ],
  exports: [PG_POOL, DRIZZLE_ORM],
})
export class DatabaseModule implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('DatabaseModule');

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onModuleInit() {
    try {
      await this.pool.query('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
      this.logger.log('PostgreSQL pg_trgm extension verified & enabled for high-performance GIN search');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Could not initialize pg_trgm extension: ${msg}`);
    }
  }

  async onModuleDestroy() {
    if (this.pool && typeof this.pool.end === 'function') {
      await this.pool.end();
    }
  }
}
