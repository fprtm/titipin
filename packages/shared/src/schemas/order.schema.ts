import { z } from 'zod';

export const createOrderItemSchema = z.object({
  product_id: z.coerce.number().int('ID produk harus berupa bilangan bulat').positive('ID produk harus valid'),
  quantity: z.coerce.number().int('Kuantitas harus berupa bilangan bulat').min(1, 'Kuantitas minimal 1'),
});

export type CreateOrderItemSchemaInput = z.infer<typeof createOrderItemSchema>;

export const createOrderSchema = z.object({
  customer_id: z
    .string()
    .uuid('Format ID pelanggan tidak valid')
    .nullable()
    .optional(),
  items: z
    .array(createOrderItemSchema)
    .min(1, 'Item transaksi tidak boleh kosong'),
});

export type CreateOrderSchemaInput = z.infer<typeof createOrderSchema>;

export const checkoutOrderSchema = createOrderSchema;
export type CheckoutOrderSchemaInput = z.infer<typeof checkoutOrderSchema>;

export const holdOrderSchema = createOrderSchema;
export type HoldOrderSchemaInput = z.infer<typeof holdOrderSchema>;

export const orderQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(10),
  from: z.string().optional(),
  to: z.string().optional(),
  customer_id: z.string().uuid().optional(),
  search: z.string().optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc').optional(),
});

export type OrderQueryInput = z.infer<typeof orderQuerySchema>;
