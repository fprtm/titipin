import {
  pgTable,
  bigint,
  uuid,
  varchar,
  numeric,
  integer,
  timestamp,
  jsonb,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users.schema';
import { customers } from './customers.schema';
import { products } from './products.schema';

// Table: orders (Completed Transactions)
export const orders = pgTable(
  'orders',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    orderNumber: varchar('order_number', { length: 30 }).notNull().unique(),
    customerId: uuid('customer_id').references(() => customers.id),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    orderDate: timestamp('order_date', { withTimezone: true }).defaultNow().notNull(),
    totalAmount: numeric('total_amount', { precision: 14, scale: 2 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_orders_customer_date').on(table.customerId, table.orderDate),
    index('idx_orders_created_by').on(table.createdBy),
    index('idx_orders_date').on(table.orderDate),
  ],
);

// Table: order_items
export const orderItems = pgTable(
  'order_items',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    orderId: bigint('order_id', { mode: 'number' })
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    productId: bigint('product_id', { mode: 'number' })
      .notNull()
      .references(() => products.id),
    quantity: integer('quantity').notNull(),
    unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
    subtotal: numeric('subtotal', { precision: 14, scale: 2 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_order_items_order_id').on(table.orderId),
    index('idx_order_items_product_id').on(table.productId),
    check('check_order_quantity_positive', sql`${table.quantity} > 0`),
  ],
);

// Table: draft_orders (Isolated Hold Transactions)
export const draftOrders = pgTable(
  'draft_orders',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
    items: jsonb('items').$type<Array<{ product_id: number; quantity: number }>>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_draft_orders_user_id').on(table.userId)],
);

// Table: order_activity_logs (Per-Order Lifecycle Events)
export const orderActivityLogs = pgTable(
  'order_activity_logs',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    orderId: bigint('order_id', { mode: 'number' })
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    action: varchar('action', { length: 50 }).notNull(),
    performedBy: uuid('performed_by')
      .notNull()
      .references(() => users.id),
    details: jsonb('details'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_order_activity_logs_order_id').on(table.orderId)],
);
