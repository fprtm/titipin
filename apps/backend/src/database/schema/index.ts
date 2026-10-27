import { relations } from 'drizzle-orm';
import { users } from './users.schema';
import { products } from './products.schema';
import { customers } from './customers.schema';
import { orders, orderItems, draftOrders, orderActivityLogs } from './orders.schema';
import { auditLogs } from './audit.schema';

// Re-export all tables & enums
export * from './users.schema';
export * from './products.schema';
export * from './customers.schema';
export * from './orders.schema';
export * from './audit.schema';

// ==========================================
// DRIZZLE RELATIONS (Deep Query API)
// ==========================================

export const usersRelations = relations(users, ({ many, one }) => ({
  orders: many(orders),
  draftOrder: one(draftOrders, {
    fields: [users.id],
    references: [draftOrders.userId],
  }),
  orderActivities: many(orderActivityLogs),
  auditLogs: many(auditLogs),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  orders: many(orders),
  draftOrders: many(draftOrders),
}));

export const productsRelations = relations(products, ({ many }) => ({
  orderItems: many(orderItems),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  creator: one(users, {
    fields: [orders.createdBy],
    references: [users.id],
  }),
  items: many(orderItems),
  activityLogs: many(orderActivityLogs),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const draftOrdersRelations = relations(draftOrders, ({ one }) => ({
  user: one(users, {
    fields: [draftOrders.userId],
    references: [users.id],
  }),
  customer: one(customers, {
    fields: [draftOrders.customerId],
    references: [customers.id],
  }),
}));

export const orderActivityLogsRelations = relations(orderActivityLogs, ({ one }) => ({
  order: one(orders, {
    fields: [orderActivityLogs.orderId],
    references: [orders.id],
  }),
  user: one(users, {
    fields: [orderActivityLogs.performedBy],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));
