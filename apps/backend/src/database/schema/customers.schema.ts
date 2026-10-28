import { pgTable, uuid, varchar, date, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const genderEnum = pgEnum('gender', ['Pria', 'Wanita']);

export const customers = pgTable(
  'customers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    customerName: varchar('customer_name', { length: 150 }).notNull(),
    customerAddress: varchar('customer_address', { length: 255 }).notNull(),
    gender: genderEnum('gender').notNull(),
    birthDate: date('birth_date', { mode: 'string' }),
    phone: varchar('phone', { length: 20 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_customers_name').on(table.customerName),
    index('idx_customers_name_trgm').using('gin', sql`${table.customerName} gin_trgm_ops`),
    index('idx_customers_phone_trgm').using('gin', sql`${table.phone} gin_trgm_ops`),
  ],
);
