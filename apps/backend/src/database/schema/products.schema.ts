import {
  pgTable,
  bigint,
  varchar,
  numeric,
  integer,
  timestamp,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const products = pgTable(
  'products',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    productCode: varchar('product_code', { length: 20 }).notNull().unique(),
    productName: varchar('product_name', { length: 150 }).notNull(),
    stock: integer('stock').notNull().default(0),
    price: numeric('price', { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_products_search').on(table.productName, table.productCode),
    check('check_stock_non_negative', sql`${table.stock} >= 0`),
    check('check_price_positive', sql`${table.price} > 0`),
  ],
);
