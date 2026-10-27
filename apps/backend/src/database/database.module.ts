import { Global, Module, OnModuleDestroy, Inject, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
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
export class DatabaseModule implements OnModuleDestroy {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onModuleDestroy() {
    if (this.pool && typeof this.pool.end === 'function') {
      await this.pool.end();
    }
  }
}
