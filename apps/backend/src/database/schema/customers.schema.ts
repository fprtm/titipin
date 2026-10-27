import { pgTable, uuid, varchar, date, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';

export const genderEnum = pgEnum('gender', ['Pria', 'Wanita']);

export const customers = pgTable(
  'customers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    customerName: varchar('customer_name', { length: 150 }).notNull(),
    customerAddress: varchar('customer_address', { length: 255 }).notNull(),
    gender: genderEnum('gender').notNull(),
    birthDate: date('birth_date', { mode: 'string' }).notNull(),
    phone: varchar('phone', { length: 20 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [index('idx_customers_name').on(table.customerName)],
);
