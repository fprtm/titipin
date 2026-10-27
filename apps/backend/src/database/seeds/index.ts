import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import * as schema from '../schema';
import { envConfig } from '../../config/env.config';
import { Role, AuditAction } from '@titipin/shared';

async function seed() {
  console.log('🌱 Starting database seeding...');

  const pool = new Pool({
    connectionString: envConfig.DATABASE_URL,
  });

  const database = drizzle(pool, { schema });

  try {
    const saltRounds = 10;

    // 1. Seed Admin User
    const existingAdmin = await database
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, 'admin@titipin.id'))
      .limit(1);

    if (existingAdmin.length === 0) {
      const adminPasswordHash = await bcrypt.hash('Admin123!', saltRounds);
      const [adminUser] = await database
        .insert(schema.users)
        .values({
          name: 'Super Admin',
          email: 'admin@titipin.id',
          password: adminPasswordHash,
          role: Role.ADMIN,
        })
        .returning();

      await database.insert(schema.auditLogs).values({
        userId: adminUser.id,
        action: AuditAction.USER_CREATED,
        entityType: 'users',
        entityId: adminUser.id,
        payload: {
          before: null,
          after: { email: adminUser.email, role: adminUser.role },
        },
        ipAddress: '127.0.0.1',
        userAgent: 'Seeder/CLI',
      });

      console.log(`✅ Seeded Admin User: ${adminUser.email} (${adminUser.id})`);
    } else {
      console.log('ℹ️ Admin user already exists, skipping.');
    }

    // 2. Seed Cashier User
    const existingCashier = await database
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, 'kasir@titipin.id'))
      .limit(1);

    if (existingCashier.length === 0) {
      const cashierPasswordHash = await bcrypt.hash('Kasir123!', saltRounds);
      const [cashierUser] = await database
        .insert(schema.users)
        .values({
          name: 'Kasir Utama',
          email: 'kasir@titipin.id',
          password: cashierPasswordHash,
          role: Role.CASHIER,
        })
        .returning();

      await database.insert(schema.auditLogs).values({
        userId: cashierUser.id,
        action: AuditAction.USER_CREATED,
        entityType: 'users',
        entityId: cashierUser.id,
        payload: {
          before: null,
          after: { email: cashierUser.email, role: cashierUser.role },
        },
        ipAddress: '127.0.0.1',
        userAgent: 'Seeder/CLI',
      });

      console.log(`✅ Seeded Cashier User: ${cashierUser.email} (${cashierUser.id})`);
    } else {
      console.log('ℹ️ Cashier user already exists, skipping.');
    }

    console.log('🎉 Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

seed();
