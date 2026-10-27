import { z } from 'zod';

export const createProductSchema = z.object({
  product_code: z
    .string()
    .min(1, 'Kode produk wajib diisi')
    .max(20, 'Kode produk maksimal 20 karakter')
    .transform((val) => val.trim().toUpperCase()),
  product_name: z
    .string()
    .min(1, 'Nama produk wajib diisi')
    .max(150, 'Nama produk maksimal 150 karakter')
    .transform((val) => val.trim()),
  stock: z.coerce.number().int('Stok harus berupa bilangan bulat').min(0, 'Stok minimal 0'),
  price: z.coerce.number().min(0.01, 'Harga produk harus lebih besar dari 0'),
});

export type CreateProductSchemaInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = z.object({
  product_name: z
    .string()
    .min(1, 'Nama produk wajib diisi')
    .max(150, 'Nama produk maksimal 150 karakter')
    .transform((val) => val.trim())
    .optional(),
  stock: z.coerce.number().int('Stok harus berupa bilangan bulat').min(0, 'Stok minimal 0').optional(),
  price: z.coerce.number().min(0.01, 'Harga produk harus lebih besar dari 0').optional(),
});

export type UpdateProductSchemaInput = z.infer<typeof updateProductSchema>;

export const productQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  sort: z.enum(['name', 'price', 'stock']).default('name'),
  order: z.enum(['asc', 'desc']).default('asc'),
});

export type ProductQueryInput = z.infer<typeof productQuerySchema>;
